// Caching's edge-cache simulator (KTD9): one depot (the origin) and three regional warehouses (the edges) serve a
// hand-written day of requests, a quarter hour (a tick) at a time. Freshness follows RFC 9111 (a copy is fresh while its
// age is within its TTL) and stale-while-revalidate follows RFC 5861. Every wait comes from Larkspur's planning numbers in
// data/caching/assumptions.json: a labelled assumption, never a measurement.
import data from '../../../data/caching/assumptions.json' with { type: 'json' };
import trace from '../../../data/caching/trace.json' with { type: 'json' };

export const ASSUMPTIONS = data;
export type Kind = 'price' | 'photo' | 'stock';
export type Edge = 'north' | 'east' | 'west';
export const KINDS: Kind[] = ['price', 'photo', 'stock'];
export const EDGES: Edge[] = ['north', 'east', 'west'];
export const TICKS = trace.ticks;
export const MOMENTS = trace.moments;

/** A request: the tick it arrives in, the warehouse it reaches and the key it asks for ("price:hinge"). */
export interface Request {
  t: number;
  edge: Edge;
  key: string;
}
export const kindOf = (key: string) => key.split(':')[0] as Kind;

/** The trace's rows, expanded in order: each tick, steady rows first, then bursts, warehouse by warehouse. */
export const REQUESTS: Request[] = (() => {
  const out: Request[] = [];
  for (let t = 0; t < TICKS; t++) {
    for (const s of trace.steady)
      if (t >= s.from && t <= s.to && (t - s.from) % s.every === 0)
        for (const edge of s.edges as Edge[]) for (let i = 0; i < s.count; i++) out.push({ t, edge, key: s.key });
    for (const b of trace.bursts)
      if (b.at === t)
        for (const edge of b.edges as Edge[])
          for (const key of b.keys) for (let i = 0; i < b.count; i++) out.push({ t, edge, key });
  }
  return out;
})();
const CHANGES = trace.changes as Record<string, number[]>;
/** The depot's version of a key at tick t: how many changes it has had by then (a change lands at the tick's start). */
export const versionAt = (key: string, t: number) => (CHANGES[key] ?? []).filter(c => c <= t).length;

/** TTLs, in ticks, the controls step over: none, 15 minutes, 1 hour, 4 hours, a whole day. */
export const TTLS = [0, 1, 4, 16, TICKS] as const;
export const TTL_NAMES = ['none', '15 min', '1 hour', '4 hours', '1 day'] as const;
export const ttlName = (ttl: number) => TTL_NAMES[(TTLS as readonly number[]).indexOf(ttl)] ?? `${ttl} ticks`;

export interface Policy {
  /** how many ticks a copy stays fresh, per kind; 0 keeps no copy */
  ttl: Record<Kind, number>;
  /** staff purge a key at every warehouse when they change it (prices and photos only) */
  purge: boolean;
  /** photos get a new name with every change, so a page asks for the new one */
  versioned: boolean;
  /** concurrent misses for one key at one warehouse share one trip */
  coalesce: boolean;
  /** an expired copy may be served for a window while one trip fetches a fresh one */
  swr: boolean;
}
export const OFF: Policy = {
  ttl: { price: 0, photo: 0, stock: 0 },
  purge: false,
  versioned: false,
  coalesce: false,
  swr: false,
};
export const policyOf = (p: Partial<Policy>): Policy => ({ ...OFF, ...p, ttl: { ...OFF.ttl, ...p.ttl } });

/** A trip's round time from a warehouse to the depot and back, before any queue, ms. */
export const tripMs = (e: Edge) => data.depotMs + (data.distanceKm[e] / 100) * data.msPer100Km;
/** The wait every trip in a tick adds when the depot is past its capacity, ms. */
export const queueDelay = (trips: number) => Math.max(0, trips - data.capacity) * data.queueMs;
/** A tick's clock time, "10:15". */
export const clock = (t: number) => {
  const m = data.dayStartsHour * 60 + t * data.tickMinutes;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** hit: a fresh copy; swr: an expired copy served while one trip revalidates; miss: a trip to the depot; wait: shares
 * another request's trip (coalescing). */
export type Outcome = 'hit' | 'swr' | 'miss' | 'wait';
export interface Served extends Request {
  kind: Kind;
  outcome: Outcome;
  /** this request sent a trip to the depot (a miss, or the one revalidation behind an swr) */
  trip: boolean;
  /** the copy served is older than the depot's */
  stale: boolean;
  ms: number;
}
export interface EdgeTick {
  requests: number;
  hits: number;
  misses: number;
  stale: number;
  trips: number;
  /** kinds with a copy on the shelf at the end of the tick, and those older than the depot's */
  shelf: Kind[];
  oldShelf: Kind[];
}
export interface Tick {
  t: number;
  trips: number;
  overloaded: boolean;
  edges: Record<Edge, EdgeTick>;
}
export interface Result {
  policy: Policy;
  served: Served[];
  ticks: Tick[];
  requests: number;
  trips: number;
  /** share served from a copy (hits and stale-while-revalidate), 0..1 */
  hitRate: number;
  stale: number;
  staleBy: Record<Kind, number>;
  readsBy: Record<Kind, number>;
  hitsBy: Record<Kind, number>;
  meanMs: number;
  worstMs: number;
  peakTrips: number;
  overloadedTicks: number;
}

interface Copy {
  version: number;
  stored: number;
}
const perKind = (f: (k: Kind) => number) => Object.fromEntries(KINDS.map(k => [k, f(k)])) as Record<Kind, number>;

/** Runs the day under a policy. A trip fetched in a tick lands on the shelf at the tick's end, so requests in the same
 * tick all find the shelf as it was: without coalescing, each one that misses makes its own trip. A copy stored at tick
 * s is fresh through tick s + ttl. */
export function simulate(policy: Policy, requests: Request[] = REQUESTS): Result {
  const shelves = Object.fromEntries(EDGES.map(e => [e, new Map<string, Copy>()])) as Record<Edge, Map<string, Copy>>;
  const served: Served[] = [],
    ticks: Tick[] = [];
  const nameOf = (key: string, t: number) =>
    policy.versioned && kindOf(key) === 'photo' ? `${key}@${versionAt(key, t)}` : key;
  for (let t = 0; t < TICKS; t++) {
    if (policy.purge)
      for (const [key, at] of Object.entries(CHANGES))
        if (at.includes(t) && data.purgeable.includes(kindOf(key))) for (const e of EDGES) shelves[e].delete(key);
    const landing = new Map<string, { edge: Edge; name: string; version: number }>(),
      now: Served[] = [];
    for (const r of requests) {
      if (r.t !== t) continue;
      const kind = kindOf(r.key),
        ttl = policy.ttl[kind],
        name = nameOf(r.key, t),
        current = versionAt(r.key, t),
        copy = ttl > 0 ? shelves[r.edge].get(name) : undefined,
        age = copy ? t - copy.stored : Infinity,
        fetching = landing.has(`${r.edge}|${name}`);
      let outcome: Outcome, version: number;
      if (copy && age <= ttl) [outcome, version] = ['hit', copy.version];
      else if (copy && policy.swr && age <= ttl + data.swrTicks) [outcome, version] = ['swr', copy.version];
      else if (policy.coalesce && fetching) [outcome, version] = ['wait', current];
      else [outcome, version] = ['miss', current];
      const trip = (outcome === 'swr' && !fetching) || outcome === 'miss';
      // a trip is in flight for the rest of the tick; with no TTL its reply is never kept
      if (trip) landing.set(`${r.edge}|${name}`, { edge: r.edge, name, version: ttl > 0 ? current : -1 });
      now.push({ ...r, kind, outcome, trip, stale: version < current, ms: 0 });
    }
    const trips = now.filter(s => s.trip).length,
      delay = queueDelay(trips);
    for (const s of now)
      s.ms = s.outcome === 'hit' || s.outcome === 'swr' ? data.edgeMs : data.edgeMs + tripMs(s.edge) + delay;
    for (const l of landing.values())
      if (l.version >= 0) shelves[l.edge].set(l.name, { version: l.version, stored: t });
    served.push(...now);
    const edges = Object.fromEntries(
      EDGES.map(e => {
        const mine = now.filter(s => s.edge === e),
          kept = [...shelves[e].entries()].filter(
            ([name, c]) => t - c.stored <= policy.ttl[kindOf(name)] + (policy.swr ? data.swrTicks : 0),
          );
        const old = kept.filter(([name, c]) => c.version < versionAt(name.split('@')[0], t));
        return [
          e,
          {
            requests: mine.length,
            hits: mine.filter(s => s.outcome === 'hit' || s.outcome === 'swr').length,
            misses: mine.filter(s => s.outcome === 'miss' || s.outcome === 'wait').length,
            stale: mine.filter(s => s.stale).length,
            trips: mine.filter(s => s.trip).length,
            shelf: KINDS.filter(k => kept.some(([n]) => kindOf(n) === k)),
            oldShelf: KINDS.filter(k => old.some(([n]) => kindOf(n) === k)),
          },
        ];
      }),
    ) as Record<Edge, EdgeTick>;
    ticks.push({ t, trips, overloaded: trips > data.capacity, edges });
  }
  const n = served.length,
    fromCopy = (s: Served) => s.outcome === 'hit' || s.outcome === 'swr',
    of = (k: Kind) => served.filter(s => s.kind === k);
  return {
    policy,
    served,
    ticks,
    requests: n,
    trips: served.filter(s => s.trip).length,
    hitRate: n ? served.filter(fromCopy).length / n : 0,
    stale: served.filter(s => s.stale).length,
    staleBy: perKind(k => of(k).filter(s => s.stale).length),
    readsBy: perKind(k => of(k).length),
    hitsBy: perKind(k => of(k).filter(fromCopy).length),
    meanMs: n ? served.reduce((a, s) => a + s.ms, 0) / n : 0,
    worstMs: Math.max(0, ...served.map(s => s.ms)),
    peakTrips: Math.max(0, ...ticks.map(x => x.trips)),
    overloadedTicks: ticks.filter(x => x.overloaded).length,
  };
}

/** Trips to the depot in tick t, from one warehouse and for one key if given. */
export const tripsAt = (r: Result, t: number, edge?: Edge, key?: string) =>
  r.served.filter(s => s.t === t && s.trip && (!edge || s.edge === edge) && (!key || s.key === key)).length;

const runs = new Map<string, Result>();
/** A policy's run, computed once per page. */
export function runOf(p: Policy): Result {
  const k = JSON.stringify([KINDS.map(x => p.ttl[x]), p.purge, p.versioned, p.coalesce, p.swr]);
  if (!runs.has(k)) runs.set(k, simulate(p));
  return runs.get(k)!;
}
