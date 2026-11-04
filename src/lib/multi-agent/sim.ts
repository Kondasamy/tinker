// Multi-agent's engine (KTD3): a deterministic toy of a lead agent and up to five helpers building Larkspur's supplier
// report from hand-written catalogues (data/multi-agent/jobs.json). No model runs: who reads what, how many tokens and
// minutes it costs, which reply bounces, who waits on whom, and which number is misread all follow fixed, hand-set rules,
// so every chapter's outcome is pinned (data/multi-agent/pinned.json) and re-derived in tests/unit/multi-agent.test.ts.
import DATA from '../../../data/multi-agent/jobs.json' with { type: 'json' };
import type { Msg } from '../iso/flat';

export interface Catalogue {
  supplier: string;
  price: number;
}
export interface Job {
  id: string;
  name: string;
  /** how many catalogues (the first n) the job reads */
  catalogues: number;
  /** whether the parts must talk: helpers wait on each other's work */
  talk: boolean;
  /** the catalogue whose price gets misread when a run carries a slip (a decimal point lost) */
  slip: number;
  /** the most tokens the job may spend */
  budget: number;
  /** the most minutes it may take */
  deadline: number;
}
export type Brief = 'vague' | 'detailed';
export interface Setup {
  /** 0: the lead works alone */
  helpers: number;
  brief: Brief;
  /** the lead re-reads each reply against its catalogue before merging */
  check: boolean;
  /** the lead stops waiting after a set time and steps in */
  timeout?: boolean;
}
/** What a chapter's run brings in: a misread number, a reply in the wrong shape. */
export interface Scenario {
  slip?: boolean;
  malformed?: boolean;
}
/** ok: seated; bounced: the wrong shape sprang back, then a resend seated; wrong: a misread number merged unchecked;
 * caught: the check set a misread reply aside and re-read it; held: still waiting on another helper */
export type ReplyKind = 'ok' | 'bounced' | 'wrong' | 'caught' | 'held';
export interface Result {
  /** catalogues handed to each reader: [the lead's own, helper 1, …] (the lead's is 0 when it has helpers) */
  loads: number[];
  /** helpers who read another helper's slice again (a vague brief) */
  dup: number[];
  /** catalogues read at least once */
  read: number;
  /** catalogues nobody read: left on the cart or fallen off a full desk */
  left: number;
  /** of those, fallen off a desk that ran out of room */
  spilled: number;
  /** one reply per reader (desk 0 is the lead's own) */
  replies: { desk: number; kind: ReplyKind }[];
  /** helpers waiting on each other in a circle (a deadlock), else [] */
  hold: number[];
  timedOut: boolean;
  finished: boolean;
  correct: boolean;
  tokens: number;
  /** null: never finished */
  minutes: number | null;
  /** the timeline, for the second view */
  msgs: Msg[];
}

export const ROOM = DATA.room;
export const TOKENS = DATA.tokens;
export const MINUTES = DATA.minutes;
export const CATALOGUES: Catalogue[] = DATA.catalogues;
export const JOBS: Job[] = DATA.jobs;
export const SLIP = DATA.slip;
export const WAITS = DATA.waits;
export const MAX_HELPERS = 5;
export const jobOf = (id: string) => JOBS.find(j => j.id === id)!;
export const money = (n: number) => n.toFixed(2);
/** A misread price: the decimal point lost, so ten times the catalogue's. */
export const misread = (catalogue: number) => CATALOGUES[catalogue - 1].price * SLIP.factor;

/** Each reader's slice of the first n catalogues (1-based, contiguous); the first n % k slices take one more. */
export function slices(n: number, k: number): number[][] {
  const out: number[][] = [];
  let at = 1;
  for (let i = 0; i < k; i++) {
    const size = Math.floor(n / k) + (i < n % k ? 1 : 0);
    out.push(Array.from({ length: size }, (_, j) => at + j));
    at += size;
  }
  return out;
}

/** The helpers in a circle of waits (each waiting on the next), sorted; [] when the waits end somewhere. */
export function findCycle(waits: number[][]): number[] {
  const next = new Map(waits.map(([a, b]) => [a, b]));
  for (const start of next.keys()) {
    const seen: number[] = [];
    let at: number | undefined = start;
    while (at !== undefined && !seen.includes(at)) {
      seen.push(at);
      at = next.get(at);
    }
    if (at !== undefined) return seen.slice(seen.indexOf(at)).sort((a, b) => a - b);
  }
  return [];
}

/** A helper's reply in the agreed shape: who, how many rows, the cheapest supplier and its price. */
export interface Reply {
  from: string;
  rows: number;
  cheapest: string;
  price: number;
}
/** What a reply would have to fix to fit the agreed shape ([] when it fits). */
export function validate(x: unknown): string[] {
  const r = (x ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  if (typeof r.from !== 'string') out.push('from is not a name');
  if (!Number.isInteger(r.rows)) out.push('rows is not a whole number');
  if (typeof r.cheapest !== 'string') out.push('cheapest is not a supplier');
  if (typeof r.price !== 'number') out.push('price is not a number');
  return out;
}

/** Who is handed which catalogues: each reader's slice (as the lead meant it), what each was given (a vague brief
 * gives helper 2 helper 1's slice again) and which helpers got a copy. */
export const assign = (job: Job, s: Setup) => {
  const k = s.helpers;
  const sl = slices(job.catalogues, Math.max(1, k));
  // a vague brief: helper 2 picks the same catalogues as helper 1, and slice 2 stays on the cart
  const vague = k >= 2 && s.brief === 'vague';
  return { sl, given: vague ? sl.map((x, i) => (i === 1 ? sl[0] : x)) : sl, dup: vague ? [2] : [] };
};

/** The reply helper i (1-based) sends for its slice. */
export function replyOf(job: Job, s: Setup, i: number): Reply {
  const mine = assign(job, s).given[i - 1].slice(0, ROOM);
  // more helpers than catalogues: a helper with nothing to read sends an empty reply
  if (!mine.length) return { from: `Helper ${i}`, rows: 0, cheapest: 'none', price: 0 };
  const best = mine.reduce((a, b) => (CATALOGUES[b - 1].price < CATALOGUES[a - 1].price ? b : a));
  return {
    from: `Helper ${i}`,
    rows: mine.length,
    cheapest: CATALOGUES[best - 1].supplier,
    price: CATALOGUES[best - 1].price,
  };
}
/** Helper 2's first reply in the malformed scenario: the price in words. */
export const MALFORMED = {
  ...replyOf(jobOf('report'), { helpers: 3, brief: 'detailed', check: false }, DATA.malformed.helper),
  price: DATA.malformed.price,
};

/** Run a job: who reads what, what comes back, what it costs. */
export function run(job: Job, s: Setup, sc: Scenario = {}): Result {
  const k = s.helpers;
  const { given, dup } = assign(job, s);
  const readers = k === 0 ? [0] : given.map((_, i) => i + 1);
  const reads = given.map(x => x.slice(0, ROOM));
  const covered = new Set(reads.flat());
  const spilled = given.reduce((n, x) => n + Math.max(0, x.length - ROOM), 0);
  const loads = k === 0 ? [given[0].length] : [0, ...given.map(x => x.length)];
  const hold =
    job.talk && k >= 2 ? findCycle(WAITS.filter(w => w.helper <= k && w.on <= k).map(w => [w.helper, w.on])) : [];
  const stuck = hold.length > 0 && !s.timeout;
  const timedOut = hold.length > 0 && !!s.timeout;
  const slipAt = sc.slip ? reads.findIndex(x => x.includes(job.slip)) : -1;
  const bounced = sc.malformed && k >= DATA.malformed.helper ? DATA.malformed.helper : -1;
  const replies = readers.map((desk, i) => ({
    desk,
    kind: (stuck && hold.includes(desk)
      ? 'held'
      : i === slipAt
        ? s.check
          ? 'caught'
          : 'wrong'
        : desk === bounced
          ? 'bounced'
          : 'ok') as ReplyKind,
  }));
  const longest = Math.max(...reads.map(x => x.length));
  const minutes = stuck
    ? null
    : (k ? MINUTES.brief + MINUTES.merge : 0) +
      MINUTES.read * longest +
      (s.check ? MINUTES.check : 0) +
      (bounced > 0 ? MINUTES.resend : 0) +
      (timedOut ? MINUTES.timeout : 0);
  const tokens =
    TOKENS.lead +
    k * TOKENS.helper +
    TOKENS.read * reads.reduce((n, x) => n + x.length, 0) +
    (s.check ? TOKENS.check * readers.length : 0);
  const left = job.catalogues - covered.size;
  return {
    loads,
    dup,
    read: covered.size,
    left,
    spilled,
    replies,
    hold,
    timedOut,
    finished: !stuck,
    correct: !stuck && left === 0 && !replies.some(r => r.kind === 'wrong'),
    tokens,
    minutes,
    msgs: timeline(job, s, sc, { reads, replies, hold, stuck, spilled, dup }),
  };
}

const range = (x: number[]) => (x.length ? `catalogues ${x[0]}–${x.at(-1)}` : 'nothing');
function timeline(
  job: Job,
  s: Setup,
  sc: Scenario,
  r: { reads: number[][]; replies: Result['replies']; hold: number[]; stuck: boolean; spilled: number; dup: number[] },
): Msg[] {
  const out: Msg[] = [];
  if (s.helpers === 0) {
    out.push({ from: 'lead', to: 'lead', kind: 'request', text: `Read ${range(r.reads[0])}` });
    if (r.spilled)
      out.push({ from: 'lead', to: 'lead', kind: 'error', text: `Out of room: ${r.spilled} unread`, stamp: 'STOPPED' });
  } else {
    r.reads.forEach((_, i) => {
      const brief =
        s.brief === 'vague'
          ? 'Find screw prices'
          : `Read ${range(assign(job, s).given[i])}; reply rows, cheapest, price`;
      out.push({ from: 'lead', to: `h${i + 1}`, kind: 'request', text: brief, batch: 1 });
    });
    for (const w of WAITS)
      if (r.hold.includes(w.helper))
        out.push({
          from: `h${w.helper}`,
          to: `h${w.on}`,
          kind: 'blocked',
          text: `Waiting for ${w.for}`,
          stamp: 'WAITING',
          batch: 2,
        });
    if (r.hold.length && !r.stuck)
      out.push({
        from: 'lead',
        to: `h${r.hold[0]}`,
        kind: 'error',
        text: 'Timeout: I’ll fetch the rate sheet',
        stamp: 'STOPPED',
      });
    for (const { desk, kind } of r.replies) {
      if (kind === 'held') continue;
      const rep = replyOf(job, s, desk);
      if (kind === 'bounced')
        out.push({
          from: `h${desk}`,
          to: 'lead',
          kind: 'error',
          text: `Price: ${MALFORMED.price}`,
          stamp: 'INVALID',
          batch: 3,
        });
      const price = kind === 'wrong' || kind === 'caught' ? money(misread(job.slip)) : money(rep.price);
      out.push({
        from: `h${desk}`,
        to: 'lead',
        kind: 'result',
        text: `${rep.rows} rows; cheapest ${rep.cheapest} ${price}`,
        batch: 3,
      });
    }
  }
  if (s.check)
    for (const { desk, kind } of r.replies)
      if (kind !== 'held')
        out.push({
          from: 'lead',
          to: desk ? `h${desk}` : 'lead',
          kind: kind === 'caught' ? 'error' : 'request',
          text:
            kind === 'caught'
              ? `Check: catalogue ${job.slip} says ${money(CATALOGUES[job.slip - 1].price)}`
              : 'Check against catalogue',
          stamp: kind === 'caught' ? 'FAIL' : 'PASS',
        });
  if (sc.slip && !s.check && r.replies.some(x => x.kind === 'wrong'))
    out.push({
      from: 'lead',
      to: 'lead',
      kind: 'result',
      text: `Merged ${money(misread(job.slip))} unchecked`,
      stamp: 'FAIL',
    });
  return out;
}

/** Workbench rules: the lead's timeout is always set, and every job carries a misread number to catch. */
export const benchRun = (job: Job, s: Setup) => run(job, { ...s, timeout: true }, { slip: true });
/** Right, within the job's budget and in time. */
export function wins(job: Job, s: Setup): boolean {
  const r = benchRun(job, s);
  return r.correct && r.tokens <= job.budget && r.minutes !== null && r.minutes <= job.deadline;
}
/** Every setup that wins a job, in the bench's order (helpers, then brief, then check). */
export function winnersOf(job: Job): Setup[] {
  const out: Setup[] = [];
  for (let helpers = 0; helpers <= MAX_HELPERS; helpers++)
    for (const brief of ['vague', 'detailed'] as Brief[])
      for (const check of [false, true]) if (wins(job, { helpers, brief, check })) out.push({ helpers, brief, check });
  return out;
}
export const WINNERS: Record<string, Setup[]> = Object.fromEntries(JOBS.map(j => [j.id, winnersOf(j)]));
