// The Context host (KTD7): runs Larkspur sessions question by question, assembling each window, refusing one over the
// budget, looking up the recorded turn for what the model saw, and metering tokens, cache hits and cost. Only the
// model's turns are recorded; windows, counts, hits, costs and memory files are computed here.
import { combosOf } from '../tools/host';
import {
  cacheHit,
  cost,
  entryOf,
  LIFETIME_MINUTES,
  marks,
  type Breakpoint,
  type Cached,
  type Hit,
  type Lifetime,
} from './cache';
import { readNotes, writeNote, type Notes } from './memory';
import { lookup, NORECORD, RECORDING, signature, type Recording, type Turn } from './turns';
import {
  assemble,
  caseOf,
  count,
  MEMORY,
  ORDER_TOOL_NAMES,
  SEARCH,
  seen,
  type Exchange,
  type Form,
  type Window,
} from './window';

/** none: no documents; top: the case's fact among its distractors; stuff: every document up front; fetch: the model searches */
export type Retrieval = 'none' | 'top' | 'stuff' | 'fetch';
export type Place = 'early' | 'middle' | 'late';
export interface Setup {
  /** conversations in order, each a list of case ids; memory is the only thing that crosses from one to the next */
  sessions: string[][];
  /** the order tools are offered (signature) */
  tools: boolean;
  system: 'plain' | 'dated';
  retrieval: Retrieval;
  /** top: where the needed fact sits among the distractors, and how many there are (signature, through the docs) */
  place: Place;
  distractors: number;
  history: Form;
  /** memory tool offered, and notes read at each session's start (signature) */
  memory: boolean;
  /** host-only: the window's token budget, the reply's room included */
  budget: number;
  /** host-only: where cache breakpoints sit, how long an entry lives, minutes between calls */
  breakpoints: Breakpoint[];
  lifetime: Lifetime;
  gap: number;
}
/** Tokens the host keeps free for the reply: the reply shares the window's budget (facts: everything counts). */
export const REPLY_ROOM = 150;
export const DEFAULTS: Setup = {
  sessions: [['free-shipping']],
  tools: false,
  system: 'plain',
  retrieval: 'top',
  place: 'early',
  distractors: 0,
  history: 'full',
  memory: false,
  budget: 8000,
  breakpoints: ['end'],
  lifetime: '5m',
  gap: 1,
};

export type Domain = { [K in keyof Setup]?: Setup[K][] };
const SESSION = ['refund-window', 'free-shipping', 'sensor-warranty'];
const singles = SESSION.map(c => [[c]]);
/** The workbench: Larkspur's context policy over one three-question session. Host-only knobs add no turns. */
export const WORKBENCH_DOMAINS: Domain = {
  sessions: [[SESSION]],
  retrieval: ['stuff', 'fetch'],
  history: ['full', 'cleared', 'summary'],
  breakpoints: [[], ['end']],
};
/** Every chapter's finite controls, one per recording file. */
export const DOMAINS: Record<string, Domain> = {
  '01-whats-in-the-window': {
    sessions: [[['free-shipping']], [['refund-window', 'free-shipping']]],
    tools: [false, true],
    retrieval: ['none', 'top'],
  },
  '02-more-isnt-better': {
    sessions: singles,
    retrieval: ['top'],
    distractors: [0, 4, 12],
    place: ['early', 'middle', 'late'],
  },
  '03-fetch-when-needed': { sessions: singles, retrieval: ['stuff', 'fetch'] },
  '04-order-for-the-cache': {
    sessions: [[SESSION]],
    tools: [true],
    retrieval: ['stuff'],
    system: ['plain', 'dated'],
    breakpoints: [['tools', 'system', 'end'], ['end']],
  },
  '05-clearing-the-desk': { sessions: [[SESSION]], retrieval: ['fetch'], history: ['full', 'cleared', 'summary'] },
  '06-memory': { sessions: [[['enterprise-hello'], ['enterprise-refund']]], memory: [false, true] },
  '07-workbench': WORKBENCH_DOMAINS,
};
export const combos = (d: Domain) => combosOf<Setup>(d);

/** One model call: the window it saw, the turn it gave, and what it cost. */
export interface Meter {
  session: number;
  case: string;
  window: Window;
  signature: string;
  turn: Turn;
  hit: Hit;
  output: number;
  cost: number;
}
export interface Answer {
  session: number;
  case: string;
  text: string;
  right: boolean;
}
export interface Run {
  status: 'done' | 'norecord' | 'over-budget';
  meter: Meter[];
  answers: Answer[];
  signatures: string[];
  /** the memory files when the run ended */
  notes: Notes;
  /** the window the host refused, or the signature nothing was recorded for */
  refused?: Window;
  missing?: string;
}

/** The documents placed before the question: the fact first, in the middle or last among the first N distractors. */
export function topDocs(id: string, place: Place, n: number): string[] {
  const c = caseOf(id);
  if (!c.fact) return [];
  const d = c.distractors.slice(0, n),
    at = place === 'early' ? 0 : place === 'late' ? d.length : Math.floor(d.length / 2);
  return [...d.slice(0, at), c.fact, ...d.slice(at)];
}
/** What the search returns: the fact and its most confusable neighbour. */
export const searchResults = (id: string) => {
  const c = caseOf(id);
  return c.fact ? [c.fact, ...c.distractors.slice(0, 1)] : [];
};

export function run(rec: Recording = RECORDING, setup: Partial<Setup> = {}): Run {
  const s = { ...DEFAULTS, ...setup };
  const tools = [
    ...(s.tools ? ORDER_TOOL_NAMES : []),
    ...(s.retrieval === 'fetch' ? [SEARCH.name] : []),
    ...(s.memory ? [MEMORY.name] : []),
  ];
  const meter: Meter[] = [],
    answers: Answer[] = [],
    signatures: string[] = [];
  let notes: Notes = {};
  const end = (status: Run['status'], extra: Partial<Run> = {}): Run => ({
    status,
    meter,
    answers,
    signatures,
    notes,
    ...extra,
  });

  for (const [si, session] of s.sessions.entries()) {
    const memory = readNotes(notes, s.memory),
      past: Exchange[] = [];
    // a later session comes long after the cache has expired; each entry is stamped with when it was written or read
    let cache: (Cached & { at: number })[] = [],
      t = 0;

    for (const id of session) {
      const now: Exchange = {
        case: id,
        docs: s.retrieval === 'top' ? topDocs(id, s.place, s.distractors) : [],
        found: [],
      };
      for (;;) {
        const view = { system: s.system, tools, memory, stuff: s.retrieval === 'stuff', form: s.history, past, now };
        const window = assemble(view);
        // The host refuses an over-budget window: no model turn is looked up, so the budget stays out of the signature.
        if (window.tokens + REPLY_ROOM > s.budget) return end('over-budget', { refused: window });
        const sig = signature(seen(view));
        signatures.push(sig);
        const turn = lookup(rec, sig);
        if (turn === NORECORD) return end('norecord', { missing: sig });
        cache = cache.filter(c => t - c.at <= LIFETIME_MINUTES[s.lifetime]);
        const hit = cacheHit(cache, window.parts, s.breakpoints);
        cache.push({ ...entryOf(hit, window.parts, marks(window.parts, s.breakpoints)), at: t });
        t += s.gap;
        const output = count(turn.text);
        meter.push({
          session: si,
          case: id,
          window,
          signature: sig,
          turn,
          hit,
          output,
          cost: cost(hit, output, s.lifetime),
        });
        // One search per question; the host returns the passages and the model answers from them.
        if (turn.search && tools.includes(SEARCH.name) && !now.found.length) {
          now.call = `${turn.text} search_docs ${JSON.stringify({ query: turn.search })}`;
          now.found = searchResults(id);
          continue;
        }
        if (turn.memo && tools.includes(MEMORY.name)) notes = writeNote(notes, turn.memo);
        now.answer = turn.text;
        answers.push({ session: si, case: id, text: turn.text, right: turn.right ?? false });
        break;
      }
      past.push(now);
    }
  }
  return end('done');
}

/** Totals over a run's calls. */
export const totals = (r: Run) => ({
  tokens: r.meter.reduce((n, m) => n + m.window.tokens + m.output, 0),
  cost: r.meter.reduce((n, m) => n + m.cost, 0),
  right: r.answers.filter(a => a.right).length,
});
