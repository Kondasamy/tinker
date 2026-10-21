// The modelled sandbox (KTD9, R14): a pure function of policy + command, no real code runs. It models a filesystem
// (mounts with read-only or writable modes, hidden paths), network egress (off, an allow-list through a proxy, or open)
// and a secret (readable in the sandbox's env, or added by the proxy and never visible to the agent). Everything a
// chapter shows is derived from exec(); nothing here reaches the network or the disk.
import FILES_JSON from '../../../data/sandboxing/files.json';

/** A mount: a path prefix the sandbox exposes, read-only or writable. Longest matching prefix wins. */
export type Mode = 'ro' | 'rw';
export interface Mount { prefix: string; mode: Mode }
export interface Policy {
  /** off: the command runs on the host, with the developer's full access, so nothing is denied or blocked */
  sandboxed: boolean;
  mounts: Mount[];
  /** paths the sandbox hides: a read is denied even when a mount would otherwise expose it */
  hidden: string[];
  /** off: no network; allowlist: only the allowed hosts, through the proxy; open: any host */
  egress: 'off' | 'allowlist' | 'open';
  /** the hosts the proxy lets out (hostnames) */
  allow: string[];
  /** the secret is in the sandbox's environment, so a command can read it; else only the proxy holds it */
  secretInEnv: boolean;
}

/** The files the sandbox can hold, each with its contents. The secret and the private key are the prizes an attack is after. */
export interface FileDef { path: string; label: string; secret?: boolean; private?: boolean; content: string }
export const FILES = FILES_JSON as FileDef[];
const fileAt = (path: string) => FILES.find((f) => f.path === path);
/** Larkspur's API token: the secret the proxy guards (fact-free stand-in, set here, never a real key). */
export const SECRET = FILES.find((f) => f.secret)!.content;
/** Larkspur's own host: a request here is not exfiltration unless it smuggles stolen data out. */
export const LARKSPUR_HOST = 'api.larkspur.co';

/** How a command ended, as the agent hears it. denied: the filesystem; blocked: the network egress. */
export type Outcome = 'ok' | 'denied' | 'blocked' | 'error';

/** A command the agent runs through a tool. `run` is a build step; the rest touch files and the network. */
export type Command =
  | { tool: 'run'; cmd: string }
  | { tool: 'read_file'; path: string }
  | { tool: 'write_file'; path: string; body: string }
  | { tool: 'fetch'; host: string; body: string };

export interface ExecResult {
  outcome: Outcome;
  /** what the agent is told back */
  text: string;
  /** a file read's contents, as the agent now holds them (so a later fetch can carry them out) */
  read?: string;
  /** a request that left the sandbox: its host and body, for the goal checks */
  left?: { host: string; body: string };
  /** a write that landed, for the goal checks */
  wrote?: { path: string };
}

const hostUrl = (host: string) => (host.startsWith('http') ? safeHost(host) : host);
function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

/** The mount whose prefix is the longest match for `path`, or undefined when none exposes it. */
function mountOf(policy: Policy, path: string): Mount | undefined {
  return policy.mounts.filter((m) => path === m.prefix || path.startsWith(m.prefix.endsWith('/') ? m.prefix : `${m.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}
const isHidden = (policy: Policy, path: string) => policy.hidden.some((h) => path === h || path.startsWith(h.endsWith('/') ? h : `${h}/`));

/** Run a command under a policy. Pure: the same policy and command always give the same result. */
export function exec(policy: Policy, cmd: Command): ExecResult {
  // on the host nothing is enforced: every command runs with full access
  if (!policy.sandboxed) return hostExec(cmd);
  switch (cmd.tool) {
    case 'run':
      // a build step touches only the working copy; it always runs inside the sandbox
      return { outcome: 'ok', text: `Ran: ${cmd.cmd}` };
    case 'read_file': {
      if (isHidden(policy, cmd.path)) return deny(`${cmd.path} is hidden from the sandbox. Nothing was read.`);
      const m = mountOf(policy, cmd.path);
      if (!m) return deny(`${cmd.path} is outside every mount the sandbox exposes. Nothing was read.`);
      const f = fileAt(cmd.path);
      if (!f) return { outcome: 'error', text: `There is no file at ${cmd.path}.` };
      return { outcome: 'ok', text: `Read ${cmd.path}.`, read: contentIn(policy, f) };
    }
    case 'write_file': {
      const m = mountOf(policy, cmd.path);
      if (!m) return deny(`${cmd.path} is outside every mount the sandbox exposes. Nothing was written.`);
      if (m.mode === 'ro') return deny(`${cmd.path} is on a read-only mount. Nothing was written.`);
      return { outcome: 'ok', text: `Wrote ${cmd.path}.`, wrote: { path: cmd.path } };
    }
    case 'fetch': {
      const host = hostUrl(cmd.host);
      if (policy.egress === 'off') return block(`The sandbox has no network. The request to ${host} did not leave.`);
      if (policy.egress === 'allowlist' && !policy.allow.includes(host))
        return block(`${host} is not on the proxy's allow-list, so the request did not leave.`);
      // the proxy adds the secret only on allowed requests, and the agent never sees it
      const body = injectSecret(policy, host, cmd.body);
      return { outcome: 'ok', text: `Request to ${host} left the sandbox.`, left: { host, body } };
    }
  }
}

/** The host: nothing is enforced, so every command succeeds and a read returns the real contents. */
function hostExec(cmd: Command): ExecResult {
  switch (cmd.tool) {
    case 'run': return { outcome: 'ok', text: `Ran: ${cmd.cmd}` };
    case 'read_file': {
      const f = fileAt(cmd.path);
      return f ? { outcome: 'ok', text: `Read ${cmd.path}.`, read: f.content } : { outcome: 'error', text: `There is no file at ${cmd.path}.` };
    }
    case 'write_file': return { outcome: 'ok', text: `Wrote ${cmd.path}.`, wrote: { path: cmd.path } };
    case 'fetch': { const host = hostUrl(cmd.host); return { outcome: 'ok', text: `Request to ${host} left the machine.`, left: { host, body: cmd.body } }; }
  }
}

/** What a read of this file gives the agent: the secret only when it is in the sandbox's env. */
function contentIn(policy: Policy, f: FileDef): string {
  if (f.secret && !policy.secretInEnv) return '<the proxy holds this secret; it is not in the sandbox>';
  return f.content;
}
/** On an allowed request the proxy appends the secret; the agent's own body never held it. */
function injectSecret(policy: Policy, host: string, body: string): string {
  if (!policy.secretInEnv && policy.allow.includes(host)) return `${body} [proxy added auth]`;
  return body;
}

const deny = (text: string): ExecResult => ({ outcome: 'denied', text });
const block = (text: string): ExecResult => ({ outcome: 'blocked', text });

/** The file presets a chapter can mount, each a named filesystem the controls pick between. */
export const PRESETS = {
  // the host sees everything (used when the sandbox is off; the fields are ignored there)
  open: { mounts: [{ prefix: '/', mode: 'rw' as Mode }], hidden: [] },
  // the working copy is writable, the data and secret are read-only, the keys are hidden (the secret too when proxied: see policyOf)
  scoped: { mounts: [{ prefix: '/work', mode: 'rw' as Mode }, { prefix: '/data', mode: 'ro' as Mode }, { prefix: '/secret', mode: 'ro' as Mode }, { prefix: '/etc', mode: 'ro' as Mode }], hidden: ['/keys'] },
  // the trifecta fix for chapter 5: the same scoped box, but the private data is not mounted at all
  nodata: { mounts: [{ prefix: '/work', mode: 'rw' as Mode }, { prefix: '/secret', mode: 'ro' as Mode }, { prefix: '/etc', mode: 'ro' as Mode }], hidden: ['/keys'] },
} as const;
export type Files = keyof typeof PRESETS;
