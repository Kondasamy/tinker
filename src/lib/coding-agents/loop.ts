// The coding-agent loop (KTD8): read, edit, run. Each turn the agent's recorded action for what it saw comes back, and
// the host carries it out on the fixture repo, live: the search runs over the files, a read costs its tokens, an edit
// applies a real patch (or the hunks a person kept), and `npm test` runs the real checks over the real version. Forked
// from Computer use's loop: only the agent's choices are recorded. The host stages are host settings: protected test
// files, the run allow-list and asking a person first change what the host does, never what the agent is told.
import TICKETS from '../../../data/coding-agents/tickets.json' with { type: 'json' };
import HOST from '../../../data/coding-agents/host.json' with { type: 'json' };
import { combosOf } from '../tools/host';
import { BASE, CODE, TESTS, fullOf, patchOf, textOf, version, type Changing } from './repo';
import { hitsText, search, tokensOf, type Hit } from './search';
import { allPass, runTests, verdict, type TestResult } from './tests';
import { lookup, NORECORD, RECORDING, signature, type Recording } from './turns';

export interface Ticket {
  case: string;
  id: string;
  from: string;
  says: string;
  /** done only once a branch is pushed */
  push: boolean;
}
export const TICKET_LIST = TICKETS.tickets as Ticket[];
export const CASES = TICKET_LIST.map(t => t.case);
export const ticketOf = (c: string) => TICKET_LIST.find(t => t.case === c)!;
export { HOST };

export interface Setup {
  case: string;
  /** the agent is given a search tool */
  search: boolean;
  /** a person reviews each edit and keeps these hunks (bit i: hunk i); null: no review, the patch goes in whole */
  review: number | null;
  /** the host refuses edits to test files */
  protect: boolean;
  /** the host runs only allow-listed commands and refuses the never-list */
  allow: boolean;
  /** the host asks a person before a command off the allow-list */
  ask: boolean;
}
export const DEFAULTS: Omit<Setup, 'case'> = { search: true, review: null, protect: false, allow: false, ask: false };
export const toolsOf = (s: Pick<Setup, 'search'>) => (s.search ? 'read,edit,run,search' : 'read,edit,run');

/** The finite values each chapter's controls can take; the coverage test runs every combination. */
export type Domain = { [K in keyof Setup]?: Setup[K][] };
export const combos = (d: Domain) => combosOf<Setup>(d);
/** Every hunk subset of a three-hunk patch. */
export const MASKS = [0, 1, 2, 3, 4, 5, 6, 7];
export const DOMAINS: Record<string, Domain> = {
  '01-read-edit-run': { case: ['bulk'] },
  '02-finding-the-file': { case: ['bulk'], search: [false, true] },
  '03-a-patch-not-a-rewrite': { case: ['bulk'], review: MASKS },
  '04-red-to-green': { case: ['bulk'], review: [null, ...MASKS] },
  '05-green-by-cheating': { case: ['cheat'], protect: [false, true] },
  '06-what-it-may-run': { case: ['ship'], allow: [false, true], ask: [false, true] },
};
/** Chapter 7: every host policy over the queue of tickets. */
export const WORKBENCH_DOMAINS: Domain = {
  case: CASES,
  protect: [false, true],
  allow: [false, true],
  ask: [false, true],
};

export type Tier = 'allow' | 'ask' | 'never';
/** A command's tier: its longest matching prefix; a command no tier names is never allowed. */
export function tierOf(cmd: string): Tier {
  let best: Tier = 'never',
    len = -1;
  for (const [tier, prefixes] of Object.entries(HOST.tiers) as [Tier, string[]][])
    for (const p of prefixes)
      if (cmd.startsWith(p) && p.length > len) {
        best = tier;
        len = p.length;
      }
  return best;
}
export const isProtected = (path: string) => HOST.protected.some(p => path.startsWith(p));

export type RunOutcome = 'ok' | 'refused' | 'denied';
export type EditOutcome = 'ok' | 'reviewed' | 'refused';
export type Step =
  | { kind: 'search'; text: string; query: string; hits: Hit[]; tokens: number }
  | { kind: 'read'; text: string; path: string; tokens: number }
  | {
      kind: 'edit';
      text: string;
      path: Changing;
      patch: string;
      /** the hunks applied (all, the reviewer's, or none when refused) */
      mask: number;
      from: string;
      to: string;
      outcome: EditOutcome;
    }
  | {
      kind: 'run';
      text: string;
      cmd: string;
      tier: Tier;
      outcome: RunOutcome;
      /** a test run's live results */
      tests?: TestResult[];
      /** the versions the tests ran on */
      code?: string;
      testFile?: string;
    }
  | { kind: 'done'; text: string }
  | { kind: 'norecord'; signature: string };

export interface Run {
  status: 'done' | 'stopped' | 'norecord';
  case: string;
  setup: Setup;
  steps: Step[];
  signatures: string[];
  hist: string[];
  /** tokens of everything the agent was shown from the repo */
  tokens: number;
  /** times the host asked a person */
  prompts: number;
  /** the versions the run ends on */
  code: string;
  tests: string;
  /** the ticket is really done: the original tests pass on the code, the tests are untouched, nothing on the
   * never-list ran, and a push the ticket asked for happened */
  right: boolean;
}

/** The most turns one run may take: a guard against a looping recording, not a lesson. */
export const MAX_TURNS = 16;

export function run(rec: Recording, setup: Partial<Setup> & { case: string }): Run {
  const s: Setup = { ...DEFAULTS, ...setup };
  const files: Record<Changing, string> = { ...BASE },
    steps: Step[] = [],
    signatures: string[] = [],
    hist: string[] = [];
  const current = (path: string) => (path === CODE || path === TESTS ? version(path, files[path]).text : textOf(path));
  let tokens = 0,
    prompts = 0;
  const end = (status: Run['status']): Run => {
    const runs = steps.filter((x): x is Extract<Step, { kind: 'run' }> => x.kind === 'run');
    const right =
      status === 'done' &&
      allPass(runTests(files[CODE])) &&
      files[TESTS] === BASE[TESTS] &&
      !runs.some(r => r.tier === 'never' && r.outcome === 'ok') &&
      (!ticketOf(s.case).push || runs.some(r => r.tier === 'ask' && r.outcome === 'ok'));
    return {
      status,
      case: s.case,
      setup: s,
      steps,
      signatures,
      hist,
      tokens,
      prompts,
      code: files[CODE],
      tests: files[TESTS],
      right,
    };
  };

  for (let turn = 0; ; turn++) {
    if (turn >= MAX_TURNS) return end('stopped');
    const sig = signature({ case: s.case, hist, rules: toolsOf(s) });
    signatures.push(sig);
    const t = lookup(rec, sig);
    if (t === NORECORD) {
      steps.push({ kind: 'norecord', signature: sig });
      return end('norecord');
    }
    const a = t.act;
    if (!a) {
      steps.push({ kind: 'done', text: t.text });
      return end('done');
    }
    if ('search' in a) {
      const hits = search(a.search),
        cost = tokensOf(hitsText(hits));
      tokens += cost;
      steps.push({ kind: 'search', text: t.text, query: a.search, hits, tokens: cost });
      hist.push(`search:${a.search}`);
    } else if ('read' in a) {
      const cost = tokensOf(current(a.read));
      tokens += cost;
      steps.push({ kind: 'read', text: t.text, path: a.read, tokens: cost });
      hist.push(`read:${a.read}`);
    } else if ('edit' in a) {
      const p = patchOf(a.edit),
        from = files[p.path];
      if (from !== p.from) throw new Error(`patch ${p.id} is for ${p.path}@${p.from}, the repo holds @${from}`);
      const all = p.subsets.length - 1;
      const outcome: EditOutcome = s.protect && isProtected(p.path) ? 'refused' : s.review === null ? 'ok' : 'reviewed';
      const mask = outcome === 'refused' ? 0 : outcome === 'reviewed' ? s.review! & all : all;
      const to = p.subsets[mask];
      files[p.path] = to;
      steps.push({ kind: 'edit', text: t.text, path: p.path, patch: p.id, mask, from, to, outcome });
      hist.push(`edit:${p.path}:${outcome}${outcome === 'refused' ? '' : `:${to}`}`);
    } else {
      const cmd = a.run,
        tier = tierOf(cmd);
      let outcome: RunOutcome;
      if (tier === 'allow') outcome = 'ok';
      else if (s.allow && tier === 'never') outcome = 'refused';
      else if (s.ask) {
        prompts++;
        outcome = HOST.approve.includes(cmd) ? 'ok' : 'denied';
      } else outcome = s.allow ? 'refused' : 'ok';
      if (cmd === HOST.test && outcome === 'ok') {
        const tests = runTests(files[CODE], files[TESTS]);
        steps.push({ kind: 'run', text: t.text, cmd, tier, outcome, tests, code: files[CODE], testFile: files[TESTS] });
        hist.push(`run:${cmd}:${verdict(tests)}`);
      } else {
        steps.push({ kind: 'run', text: t.text, cmd, tier, outcome });
        hist.push(`run:${cmd}:${outcome}`);
      }
    }
  }
}

/** The patch in full, for a step that names one. */
export const fullPatch = (id: string) => fullOf(patchOf(id));

export type Policy = Pick<Setup, 'protect' | 'allow' | 'ask'>;
export interface Metrics {
  tickets: number;
  right: number;
  prompts: number;
  runs: Run[];
}
/** Run the queue of tickets under one host policy: how many are really done, and how often a person was asked. */
export function metrics(p: Partial<Policy> = {}, rec: Recording = RECORDING): Metrics {
  const runs = CASES.map(c => run(rec, { ...p, case: c }));
  return {
    tickets: runs.length,
    right: runs.filter(r => r.right).length,
    prompts: runs.reduce((n, r) => n + r.prompts, 0),
    runs,
  };
}
