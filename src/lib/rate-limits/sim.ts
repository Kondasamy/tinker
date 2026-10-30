// Rate limits' simulator (KTD6): Larkspur's stock API over a hand-made trace (data/rate-limits/traces.json), in
// milliseconds, deterministic. Each request meets the limiter at the door (none, a fixed window, one token bucket, or
// one bucket per partner key); a request it lets through reaches the server, which answers at most `capacity` in any
// one second and otherwise falls over for `downMs`, answering no one (hand-set). A refused client may try again: at
// once every 200 ms, after the reply's Retry-After, or after a backoff (with or without jitter). The scene and the
// Requests tab both read one run, so they never disagree.
import data from '../../../data/rate-limits/traces.json' with { type: 'json' };
import { fullBucket, levelOf, retryAfterS, take, type Bucket } from './bucket';
import { roomOf, windowTake, type Counter } from './window';
import { delayOf, type Retry } from './backoff';

export const CAPACITY = data.server.capacity;
export const DOWN_MS = data.server.downMs;
export type TraceId = keyof typeof data.traces;
export type Key = keyof typeof data.partners;
export const PARTNERS = data.partners;
export const nameOf = (k: string) => (PARTNERS as Record<string, { name: string }>)[k]?.name ?? k;
export const isQuiet = (k: string) => (PARTNERS as Record<string, { quiet: boolean }>)[k]?.quiet ?? true;

export interface Req {
  id: string;
  key: string;
  at: number;
  /** 1 for the first try, then 2, 3… */
  n: number;
}
/** ok: served; limited: 429 at the door; down: the server had fallen over */
export type Verdict = 'ok' | 'limited' | 'down';
export interface Hit extends Req {
  verdict: Verdict;
  /** for a 429: ms until the limiter would let one through */
  waitMs?: number;
}

export type Limiter =
  | { kind: 'none' }
  | { kind: 'window'; limit: number; ms: number }
  | { kind: 'bucket'; size: number; refill: number; perKey?: boolean };
export type Client = { kind: 'give-up' } | { kind: 'at-once' } | { kind: 'listen' } | ({ kind: 'backoff' } & Retry);
/** a client that ignores the 429 tries again this often */
export const AT_ONCE_MS = 200;
const MAX_TRIES = 200;

export interface Scene {
  trace?: TraceId;
  limiter: Limiter;
  client?: Client;
  /** requests the reader sent (the live barrel) */
  extra?: Req[];
  /** how long the run lasts; the trace's length by default */
  ms?: number;
}

/** The trace's requests, in time order, each with its own id. */
export function traceOf(id: TraceId): Req[] {
  const out: Req[] = [];
  for (const s of data.traces[id].segments as {
    key: string;
    from?: number;
    to?: number;
    every?: number;
    at?: number;
    count?: number;
    spread?: number;
  }[]) {
    if (s.every !== undefined)
      for (let t = s.from!; t < s.to!; t += s.every) out.push({ id: '', key: s.key, at: t, n: 1 });
    else for (let i = 0; i < s.count!; i++) out.push({ id: '', key: s.key, at: s.at! + i * s.spread!, n: 1 });
  }
  out.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
  return out.map((r, i) => ({ ...r, id: `${r.key}-${i}` }));
}
export const traceMs = (id: TraceId) => data.traces[id].ms;

/** A level the scene draws: tokens (or room) left in one barrel at a moment. */
export interface Mark {
  at: number;
  barrel: string;
  level: number;
}
export interface Run {
  scene: Scene;
  ms: number;
  hits: Hit[];
  marks: Mark[];
  /** the barrels drawn, in order: 'all' for a shared one, else partner keys */
  barrels: string[];
  downs: [number, number][];
}

/** Which barrel a key's requests spend from. */
const barrelOf = (l: Limiter, key: string) => (l.kind === 'bucket' && l.perKey ? key : 'all');
/** The size a barrel holds when full. */
export const sizeOf = (l: Limiter) => (l.kind === 'bucket' ? l.size : l.kind === 'window' ? l.limit : 0);

/** Runs the scene. */
export function simulate(scene: Scene): Run {
  const l = scene.limiter,
    client = scene.client ?? { kind: 'give-up' },
    ms = scene.ms ?? (scene.trace ? traceMs(scene.trace) : 0);
  const first = [...(scene.trace ? traceOf(scene.trace) : []), ...(scene.extra ?? [])].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  );
  const keys = [...new Set(first.map(r => r.key))].sort(
    (a, b) => Object.keys(PARTNERS).indexOf(a) - Object.keys(PARTNERS).indexOf(b),
  );
  const barrels = l.kind === 'none' ? [] : l.kind === 'bucket' && l.perKey ? keys : ['all'];
  const buckets = new Map<string, Bucket>(barrels.map(b => [b, fullBucket(sizeOf(l), 0)]));
  const counters = new Map<string, Counter>(barrels.map(b => [b, { start: 0, count: 0 }]));
  const pending = [...first],
    hits: Hit[] = [],
    marks: Mark[] = [],
    downs: [number, number][] = [];
  let served: number[] = [],
    downUntil = -1;
  // a retry joins the line in time order
  const push = (r: Req) => {
    let i = pending.length;
    while (i > 0 && pending[i - 1].at > r.at) i--;
    pending.splice(i, 0, r);
  };
  while (pending.length) {
    const r = pending.shift()!;
    if (r.at > ms) break;
    if (r.at < downUntil) {
      hits.push({ ...r, verdict: 'down' });
      continue;
    }
    let ok = true,
      waitMs = 0;
    if (l.kind !== 'none') {
      const b = barrelOf(l, r.key);
      if (l.kind === 'bucket') {
        const t = take(buckets.get(b)!, r.at, l.size, l.refill);
        buckets.set(b, t.bucket);
        ({ ok, waitMs } = t);
        marks.push({ at: r.at, barrel: b, level: t.bucket.tokens });
      } else {
        const t = windowTake(counters.get(b)!, r.at, l.limit, l.ms);
        counters.set(b, t.counter);
        ({ ok, waitMs } = t);
        marks.push({ at: r.at, barrel: b, level: l.limit - t.counter.count });
      }
    }
    if (!ok) {
      hits.push({ ...r, verdict: 'limited', waitMs });
      if (r.n >= MAX_TRIES) continue;
      const wait =
        client.kind === 'at-once'
          ? AT_ONCE_MS
          : client.kind === 'listen'
            ? retryAfterS(waitMs) * 1000
            : client.kind === 'backoff'
              ? delayOf(client, r.id.replace(/#\d+$/, ''), r.n)
              : null;
      if (wait !== null) push({ ...r, id: `${r.id.replace(/#\d+$/, '')}#${r.n + 1}`, at: r.at + wait, n: r.n + 1 });
      continue;
    }
    served = served.filter(t => t > r.at - 1000);
    if (served.length + 1 > CAPACITY) {
      downUntil = r.at + DOWN_MS;
      downs.push([r.at, downUntil]);
      served = [];
      hits.push({ ...r, verdict: 'down' });
      continue;
    }
    served.push(r.at);
    hits.push({ ...r, verdict: 'ok' });
  }
  return { scene, ms, hits, marks, barrels, downs };
}

// runs are pure; the chapters ask for the same ones many times
const cache = new Map<string, Run>();
export function runOf(scene: Scene): Run {
  if (scene.extra) return simulate(scene);
  const k = JSON.stringify(scene);
  let r = cache.get(k);
  if (!r) cache.set(k, (r = simulate(scene)));
  return r;
}

/** A barrel's tokens (or a window's room) at time t. */
export function levelAt(run: Run, barrel: string, t: number) {
  const l = run.scene.limiter,
    size = sizeOf(l);
  let m: Mark | undefined;
  for (const x of run.marks) {
    if (x.at > t) break;
    if (x.barrel === barrel) m = x;
  }
  if (l.kind === 'bucket') return levelOf(m ? { tokens: m.level, at: m.at } : fullBucket(size, 0), t, size, l.refill);
  if (l.kind === 'window')
    return m ? roomOf({ start: Math.floor(m.at / l.ms) * l.ms, count: size - m.level }, t, size, l.ms) : size;
  return 0;
}

/** The Retry-After (whole seconds) on the last 429 in the second up to t, if any. */
export function retryAfterOf(run: Run, t: number) {
  const h = run.hits.findLast(x => x.verdict === 'limited' && x.at <= t && x.at > t - 1000);
  return h ? retryAfterS(h.waitMs!) : undefined;
}
export const isDown = (run: Run, t: number) => run.downs.some(([a, b]) => t >= a && t < b);

export interface Tally {
  sent: number;
  ok: number;
  limited: number;
  down: number;
}
const tallyOf = (hits: Hit[]): Tally => ({
  sent: hits.length,
  ok: hits.filter(h => h.verdict === 'ok').length,
  limited: hits.filter(h => h.verdict === 'limited').length,
  down: hits.filter(h => h.verdict === 'down').length,
});
/** Every hit in [from, to). */
export const hitsIn = (run: Run, from: number, to: number) => run.hits.filter(h => h.at >= from && h.at < to);
/** The tally over [from, to), for one partner or all. */
export const tally = (run: Run, from = 0, to = run.ms + 1, key?: string) =>
  tallyOf(hitsIn(run, from, to).filter(h => !key || h.key === key));
/** A partner's first tries that got through, as a share of its first tries. */
export function successOf(run: Run, key: string) {
  const firsts = run.hits.filter(h => h.key === key && h.n === 1);
  return firsts.length ? firsts.filter(h => h.verdict === 'ok').length / firsts.length : 1;
}
/** The keys that sent anything, in the partners' order. */
export const keysOf = (run: Run) => Object.keys(PARTNERS).filter(k => run.hits.some(h => h.key === k));

/** The most retries that land in any one 100 ms: how hard the stampede hits. */
export function peakRetries(run: Run) {
  const bins = new Map<number, number>();
  for (const h of run.hits) if (h.n > 1) bins.set(Math.floor(h.at / 100), (bins.get(Math.floor(h.at / 100)) ?? 0) + 1);
  return Math.max(0, ...bins.values());
}
/** When the last client was finally served (ms), or null if some never were. */
export function allServedAt(run: Run) {
  const firsts = new Set(run.hits.filter(h => h.n === 1).map(h => h.id));
  const done = run.hits.filter(h => h.verdict === 'ok');
  if (new Set(done.map(h => h.id.replace(/#\d+$/, ''))).size < firsts.size) return null;
  return Math.max(...done.map(h => h.at));
}
/** The most requests served in any one second (sliding). */
export function busiestSecond(run: Run) {
  const ok = run.hits.filter(h => h.verdict === 'ok').map(h => h.at);
  let best = 0;
  for (let i = 0, j = 0; i < ok.length; i++) {
    while (ok[i] - ok[j] >= 1000) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
}

/** “0:59.5”: a time on the trace's clock. */
export function clock(ms: number) {
  const tenths = Math.round(Math.max(0, ms) / 100),
    m = Math.floor(tenths / 600),
    r = (tenths - m * 600) / 10;
  return `${m}:${r < 10 ? '0' : ''}${tenths % 10 ? r.toFixed(1) : r.toFixed(0)}`;
}
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The chapters' runs (pinned in data/rate-limits/pinned.json). */
export const SCENES = {
  /** ch. 1: no limit; the runaway script floods the server */
  flood: { trace: 'flood', limiter: { kind: 'none' } },
  /** ch. 2: forty a minute, counted per minute */
  edge: { trace: 'edge', limiter: { kind: 'window', limit: 40, ms: 60_000 } },
  /** ch. 4: a burst against a slow barrel; the client retries at once, or listens */
  ignore: { trace: 'burst', limiter: { kind: 'bucket', size: 10, refill: 0.5 }, client: { kind: 'at-once' } },
  listen: { trace: 'burst', limiter: { kind: 'bucket', size: 10, refill: 0.5 }, client: { kind: 'listen' } },
  /** ch. 6: one shared barrel against one per partner key */
  shared: { trace: 'share', limiter: { kind: 'bucket', size: 20, refill: 10 } },
  perKey: { trace: 'share', limiter: { kind: 'bucket', size: 20, refill: 10, perKey: true } },
} satisfies Record<string, Scene>;
/** ch. 5: thirty shop tablets reconnect at once against one barrel, retrying by the policy */
export const crowdOf = (r: Retry): Scene => ({
  trace: 'crowd',
  limiter: { kind: 'bucket', size: 10, refill: 5 },
  client: { kind: 'backoff', ...r },
});
/** ch. 3: the live barrel the reader floods */
export const LIVE = { size: 10, drips: [1, 2, 3, 4, 5], drip: 2 };
export const liveOf = (sent: number[], drip: number, now: number): Scene => ({
  limiter: { kind: 'bucket', size: LIVE.size, refill: drip },
  extra: sent.map((at, i) => ({ id: `you-${i}`, key: 'quickfix', at, n: 1 })),
  ms: now,
});
