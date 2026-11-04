// Tools in production's engine (KTD3). Larkspur's four fictional MCP servers and their sixty tools
// (data/tools-in-production/servers.json), a word-matching tool search that stands in for a real one (labelled), the
// tokens each way of loading costs, a fingerprint per tool definition, a check for orders hidden in a description, and
// whether a server lets a sign-in pass through. Everything here runs for real in the browser; the sizes are hand-set.
import DATA from '../../../data/tools-in-production/servers.json' with { type: 'json' };
import STORY from '../../../data/tools-in-production/story.json' with { type: 'json' };

export interface ToolDef {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}
export interface Tool extends ToolDef {
  /** server.name, unique across servers (the spec suggests prefixing by server) */
  id: string;
  server: string;
  /** hand-set size of its definition in the prompt */
  tokens: number;
  /** the board tools: the painted outline's shape */
  shape?: string;
}
export interface Server {
  id: string;
  name: string;
  url: string;
  owner: string;
}
export interface Request {
  id: string;
  text: string;
  /** the tool a person at Larkspur would use */
  tool: string;
}

export const SERVERS: Server[] = DATA.servers.map(({ tools: _t, ...s }) => s);
export const TOOLS: Tool[] = DATA.servers.flatMap(s =>
  s.tools.map(t => ({ ...(t as Omit<Tool, 'id' | 'server'>), id: `${s.id}.${t.name}`, server: s.id })),
);
/** the twelve tools with an outline on the board, three per server, in board order */
export const BOARD: Tool[] = TOOLS.filter(t => t.shape);
export const SEARCH_TOKENS = DATA.searchTokens;
export const REQUESTS: Request[] = STORY.requests;
export const toolOf = (id: string) => {
  const t = TOOLS.find(x => x.id === id);
  if (!t) throw new Error(`unknown tool: ${id}`);
  return t;
};
export const serverOf = (id: string) => SERVERS.find(s => s.id === id)!;
export const requestOf = (id: string) => REQUESTS.find(r => r.id === id)!;
/** the short name shown for a tool: its server's name and its own */
export const labelOf = (id: string) => `${serverOf(toolOf(id).server).name} · ${toolOf(id).name}`;

/* ---------- loading every tool, or searching ---------- */

/** Every tool's definition, in every prompt. */
export const EAGER_TOKENS = TOOLS.reduce((n, t) => n + t.tokens, 0);

const STOP = new Set(
  'a an the to of for in on at by is are it its and or be can from this that with now what where how one show'.split(
    ' ',
  ),
);
/** Plain stems: lower case, filler dropped, a crude plural strip. */
export function stems(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (STOP.has(w) || w.length < 3) continue;
    out.add(w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
  }
  return out;
}
/** What a search reads of a tool: its name's words and its description, as the real tool search does. */
const words = (t: ToolDef) => stems(`${t.name.replace(/_/g, ' ')} ${t.description ?? ''}`);
/** How many of the request's stems the tool shares, its name's words counting double. */
export function score(text: string, t: ToolDef): number {
  const name = stems(t.name.replace(/_/g, ' ')),
    all = words(t);
  return [...stems(text)].reduce((n, w) => n + (name.has(w) ? 2 : all.has(w) ? 1 : 0), 0);
}
export const FOUND = 3;
/** A word-matching stand-in for a tool search: the three best matches in `pool`, first in the catalogue on a tie. */
export function search(text: string, pool: Tool[] = TOOLS, defs: (t: Tool) => ToolDef = t => t): string[] {
  return pool
    .map((t, i) => ({ id: t.id, n: score(text, defs(t)), i }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, FOUND)
    .map(x => x.id);
}
/** The search tool plus the tools it found. */
export const lazyTokens = (found: string[]) => SEARCH_TOKENS + found.reduce((n, id) => n + toolOf(id).tokens, 0);

/** The hand-written example run with every tool loaded: the tool it picked for its request. */
export const EAGER_RUN = STORY.eagerRun;

/* ---------- fingerprints and drift ---------- */

/** The definition as one string, keys sorted at every level, so the same definition always reads the same. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}
/** A tool's fingerprint: FNV-1a (32-bit) over its name, description and input shape, as 8 hex digits. Any change to
 * what the model reads changes it. shortcut: a 32-bit hash is fine for a toy board; a real pin would use SHA-256. */
export function fingerprint(t: ToolDef): string {
  const s = canonical({ name: t.name, description: t.description ?? '', inputSchema: t.inputSchema ?? {} });
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface Change {
  tool: string;
  /** an input field renamed */
  rename?: { from: string; to: string };
  /** a new description */
  description?: string;
}
/** The tool's definition after a server's change. */
export function changed(t: ToolDef, c: Change): ToolDef {
  let inputSchema = t.inputSchema;
  if (c.rename && inputSchema) {
    const props = inputSchema.properties as Record<string, unknown>;
    const req = (inputSchema.required as string[] | undefined) ?? [];
    inputSchema = {
      ...inputSchema,
      properties: Object.fromEntries(
        Object.entries(props).map(([k, v]) => [k === c.rename!.from ? c.rename!.to : k, v]),
      ),
      required: req.map(k => (k === c.rename!.from ? c.rename!.to : k)),
    };
  }
  return { ...t, description: c.description ?? t.description, inputSchema };
}
/** QuickPost's overnight rename (chapters 3 and 4). */
export const OVERNIGHT = STORY.overnight as Change;
/** A tool drifted: its fingerprint today differs from the one approved. */
export const drifted = (approved: ToolDef, today: ToolDef) => fingerprint(approved) !== fingerprint(today);

/* ---------- orders hidden in a description ---------- */

const HIDDEN = [/<important>/i, /do not (tell|mention)/i, /~\//, /\.ssh\b/i, /before using this tool/i];
/** Whether a description carries orders for the model rather than a plain account of the tool. A toy check over a few
 * telltale phrases (Invariant Labs' example among them): a real one is a person reading it, helped by a scanner. */
export const poisoned = (t: ToolDef) => HIDDEN.some(r => r.test(t.description ?? ''));
/** The part of a description a person would see in a short list: its first sentence. */
export const shortOf = (t: ToolDef) => (t.description ?? '').split(/(?<=\.)\s/)[0];

/* ---------- who is calling ---------- */

/** A sign-in pass: issued for one server (its audience), or the one shared key every server was set up to accept. */
export interface Pass {
  for: string | 'shared';
}
/** Whether `server` lets this pass in: the shared key opens every door; a server's own pass opens only its own. */
export const accepts = (server: string, pass: Pass) => pass.for === 'shared' || pass.for === server;
