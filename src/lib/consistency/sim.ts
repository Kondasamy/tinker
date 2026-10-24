// Consistency's replica simulator (KTD10): each of Larkspur's three warehouses keeps a copy (a replica) of every
// product's stock count. A hand-written morning of orders and stock checks (data/consistency/day.json) runs a minute (a
// tick) at a time. A change made at one warehouse reaches the others after Larkspur's assumed lag
// (data/consistency/assumptions.json, a labelled assumption, never a measurement); while the line to a cut-off warehouse
// is down, messages across it wait and arrive once it is back.
//
// Within a tick everything is concurrent: every read happens first, then every write, so two orders in the same minute
// both read the count before either writes. Reads and writes reach R and W replicas, nearest first (Dynamo's quorums);
// a warehouse that cannot reach enough replicas refuses. Two conflict rules:
// - lww: last writer wins. Each order reads the count, writes count - 1 with a newer stamp, and every replica keeps the
//   highest stamp it has seen, so a decrement based on an old read can vanish (a lost update).
// - primary: reservations at North. Every order is decided at the primary, one at a time, and a warehouse that cannot
//   reach it refuses; the primary then copies the new count to W replicas (itself first) and tells the warehouse.
import day from '../../../data/consistency/day.json' with { type: 'json' };
import data from '../../../data/consistency/assumptions.json' with { type: 'json' };

export const ASSUMPTIONS = data;
export type Rep = 'north' | 'east' | 'west';
export type Product = 'hinge' | 'drill';
export type Rule = 'lww' | 'primary';
export const REPS: Rep[] = ['north', 'east', 'west'];
export const PRODUCTS: Product[] = ['hinge', 'drill'];
export const RULES: Rule[] = ['lww', 'primary'];
/** N: every product has a replica at each warehouse */
export const N = REPS.length;
/** the R and W values the controls step over */
export const QUORUMS = [1, 2, 3] as const;
export const TICKS = day.ticks;
export const MOMENTS = day.moments;
export const STOCK = day.stock as Record<Product, number>;
export const PRIMARY = data.primary as Rep;
export const LAG = data.lagTicks;

export interface Event {
  t: number;
  kind: 'order' | 'look';
  at: Rep;
  product: Product;
  who: string;
}
export interface Partition {
  from: number;
  to: number;
  cut: Rep;
}
export const EVENTS = day.events as Event[];
export const PARTITIONS = day.partitions as Partition[];

/** A product's setting: how many replicas a read and a write must reach, and the conflict rule. */
export interface Setting {
  r: number;
  w: number;
  rule: Rule;
}
export interface Policy {
  hinge: Setting;
  drill: Setting;
  /** the morning's outage happens */
  partition: boolean;
  /** a customer's reads go to the warehouse that took their last order */
  sticky: boolean;
}
/** One setting for both products. */
export const policyOf = (s: Setting, extra: Partial<Policy> = {}): Policy => ({
  hinge: { ...s },
  drill: { ...s },
  partition: false,
  sticky: false,
  ...extra,
});

/** A tick's clock time, "10:07". */
export const clock = (t: number) => {
  const [h, m] = data.startsAt.split(':').map(Number),
    all = h * 60 + m + t * data.tickMinutes;
  return `${String(Math.floor(all / 60)).padStart(2, '0')}:${String(all % 60).padStart(2, '0')}`;
};

/** The others, in the order a warehouse asks them. */
export const peersOf = (r: Rep) => REPS.filter(x => x !== r);
/** The warehouse cut off at tick t, if the line is down. */
export const cutAt = (t: number, partition: boolean, windows = PARTITIONS) =>
  partition ? windows.find(w => t >= w.from && t < w.to)?.cut : undefined;
const linked = (a: Rep, b: Rep, cut: Rep | undefined) => a === b || !cut || (a !== cut && b !== cut);

/** sold: a receipt; refused: not enough replicas reachable; soldout: the count read 0. A look is read or unavailable. */
export type Result = 'sold' | 'refused' | 'soldout' | 'read' | 'unavailable';
export interface Outcome extends Event {
  result: Result;
  /** the replica that answered a look (sticky reads move it) */
  served: Rep;
  /** the count the order or look saw */
  seen?: number;
  /** a look that returned an older count than the newest one written before this minute */
  stale: boolean;
  /** a look by a customer who ordered this product earlier: whether it shows their order */
  ryw?: boolean;
  /** a sale whose decrement the final count does not include */
  lost: boolean;
}
export interface TickState {
  t: number;
  /** the line to `cutOff` is down */
  cut: boolean;
  cutOff?: Rep;
  /** each warehouse's count at the end of the minute */
  boards: Record<Rep, Record<Product, number>>;
  /** messages on their way at the end of the minute, by the warehouse they are going to */
  inFlight: Record<Rep, number>;
  /** the same messages by wire, "from>to" */
  wires: Record<string, number>;
  outcomes: Outcome[];
}
export interface Run {
  policy: Policy;
  ticks: TickState[];
  outcomes: Outcome[];
  sold: Record<Product, number>;
  oversold: Record<Product, number>;
  /** sales the final count does not include */
  lost: Record<Product, number>;
  final: Record<Product, number>;
  refused: Record<Product, number>;
  soldOut: Record<Product, number>;
  /** looks that saw an old count */
  stale: number;
  /** looks by a customer that did not show their own order */
  rywMisses: number;
  unavailable: number;
}

interface Version {
  value: number;
  /** a global write counter: larger is newer (last writer wins keeps the largest) */
  stamp: number;
  /** the stamp of the version this write was based on */
  base: number;
}
interface Msg {
  to: Rep;
  from: Rep;
  product: Product;
  v: Version;
  due: number;
}
const per = <K extends string, V>(ks: K[], f: (k: K) => V) =>
  Object.fromEntries(ks.map(k => [k, f(k)])) as Record<K, V>;

/** Runs the morning under a policy. */
export function simulate(policy: Policy, events: Event[] = EVENTS, windows: Partition[] = PARTITIONS): Run {
  const init = per(PRODUCTS, p => ({ value: STOCK[p], stamp: 0, base: -1 }));
  const reps = per(REPS, () => per(PRODUCTS, p => init[p]));
  const writes: (Version & { product: Product; o: Outcome })[] = [];
  let pending: Msg[] = [],
    stamp = 0;
  const outcomes: Outcome[] = [],
    ticks: TickState[] = [];
  const lastWrite = new Map<string, { at: Rep; stamp: number }>();
  const keep = (r: Rep, p: Product, v: Version) => {
    if (v.stamp > reps[r][p].stamp) reps[r][p] = v;
  };
  for (let t = 0; t < TICKS; t++) {
    const cut = cutAt(t, policy.partition, windows),
      reach = (from: Rep, list: Rep[]) => list.filter(x => linked(from, x, cut));
    pending = pending.filter(m => {
      if (m.due > t || !linked(m.from, m.to, cut)) return true;
      keep(m.to, m.product, m.v);
      return false;
    });
    const newest = per(PRODUCTS, p => Math.max(0, ...writes.filter(w => w.product === p).map(w => w.stamp)));
    const now = events.filter(e => e.t === t);
    // reads first: all of this minute's orders and looks see the replicas as the minute began
    const read = (e: Event, at: Rep) => {
      const set = reach(at, [at, ...peersOf(at)]).slice(0, policy[e.product].r);
      if (set.length < policy[e.product].r) return undefined;
      return set.map(x => reps[x][e.product]).reduce((a, b) => (b.stamp > a.stamp ? b : a));
    };
    const seen = now.map(e => {
      if (e.kind === 'look') {
        const mine = lastWrite.get(`${e.who}|${e.product}`);
        return { at: policy.sticky && mine ? mine.at : e.at, v: undefined as Version | undefined, mine };
      }
      return { at: e.at, v: undefined as Version | undefined, mine: undefined };
    });
    now.forEach((e, i) => {
      if (e.kind === 'look' || policy[e.product].rule === 'lww') seen[i].v = read(e, seen[i].at);
    });
    const here: Outcome[] = [];
    now.forEach((e, i) => {
      const s = policy[e.product],
        base = { ...e, served: seen[i].at, stale: false, lost: false };
      if (e.kind === 'look') {
        const v = seen[i].v,
          mine = seen[i].mine;
        here.push(
          v
            ? {
                ...base,
                result: 'read',
                seen: v.value,
                stale: v.stamp < newest[e.product],
                ...(mine ? { ryw: v.stamp >= mine.stamp } : {}),
              }
            : { ...base, result: 'unavailable' },
        );
        return;
      }
      // the writer, the replicas that must take the write with it, and what it decides from
      let writer: Rep, from: Version | undefined;
      if (s.rule === 'lww') [writer, from] = [e.at, seen[i].v];
      else [writer, from] = [PRIMARY, linked(e.at, PRIMARY, cut) ? reps[PRIMARY][e.product] : undefined];
      const set = reach(writer, [writer, ...peersOf(writer)]).slice(0, s.w);
      if (!from || set.length < s.w) return here.push({ ...base, result: 'refused' });
      if (from.value <= 0) return here.push({ ...base, result: 'soldout', seen: from.value });
      const v: Version = { value: from.value - 1, stamp: ++stamp, base: from.stamp };
      const o: Outcome = { ...base, result: 'sold', seen: from.value };
      here.push(o);
      // with reservations the ordering warehouse learns the new count from the primary's reply
      const now = new Set<Rep>([...set, e.at]);
      for (const r of now) keep(r, e.product, v);
      for (const r of REPS) if (!now.has(r)) pending.push({ to: r, from: writer, product: e.product, v, due: t + LAG });
      writes.push({ ...v, product: e.product, o });
      lastWrite.set(`${e.who}|${e.product}`, { at: e.at, stamp: v.stamp });
    });
    outcomes.push(...here);
    ticks.push({
      t,
      cut: !!cut,
      ...(cut ? { cutOff: cut } : {}),
      boards: per(REPS, r => per(PRODUCTS, p => reps[r][p].value)),
      inFlight: per(REPS, r => pending.filter(m => m.to === r).length),
      wires: pending.reduce<Record<string, number>>((a, m) => {
        a[`${m.from}>${m.to}`] = (a[`${m.from}>${m.to}`] ?? 0) + 1;
        return a;
      }, {}),
      outcomes: here,
    });
  }
  // the final count is the newest write (every replica converges to it); a sale off its chain of bases was lost
  const final = per(PRODUCTS, p => {
    const ws = writes.filter(w => w.product === p);
    if (!ws.length) return STOCK[p];
    let cur = ws.reduce((a, b) => (b.stamp > a.stamp ? b : a));
    const kept = new Set<number>([cur.stamp]);
    for (let b = cur.base; b > 0; b = cur.base) {
      cur = ws.find(w => w.stamp === b)!;
      kept.add(b);
    }
    for (const w of ws) w.o.lost = !kept.has(w.stamp);
    return ws.reduce((a, b) => (b.stamp > a.stamp ? b : a)).value;
  });
  const count = (p: Product, r: Result) => outcomes.filter(o => o.product === p && o.result === r).length;
  const sold = per(PRODUCTS, p => count(p, 'sold'));
  return {
    policy,
    ticks,
    outcomes,
    sold,
    oversold: per(PRODUCTS, p => Math.max(0, sold[p] - STOCK[p])),
    lost: per(PRODUCTS, p => outcomes.filter(o => o.product === p && o.lost).length),
    final,
    refused: per(PRODUCTS, p => count(p, 'refused')),
    soldOut: per(PRODUCTS, p => count(p, 'soldout')),
    stale: outcomes.filter(o => o.stale).length,
    rywMisses: outcomes.filter(o => o.ryw === false).length,
    unavailable: outcomes.filter(o => o.result === 'unavailable').length,
  };
}

const runs = new Map<string, Run>();
/** A policy's run over the module's morning, computed once per page. */
export function runOf(p: Policy): Run {
  const k = JSON.stringify(p);
  if (!runs.has(k)) runs.set(k, simulate(p));
  return runs.get(k)!;
}

export const REP_NAME: Record<Rep, string> = { north: 'North', east: 'East', west: 'West' };
export const PRODUCT_NAME: Record<Product, string> = { hinge: 'hinge', drill: 'drill press' };
export const RULE_NAME: Record<Rule, string> = { lww: 'Last writer wins', primary: 'Reservations at North' };
/** "1 hinge", "3 hinges", "0 drill presses". */
export const unitsOf = (n: number, p: Product) =>
  `${n} ${p === 'hinge' ? (n === 1 ? 'hinge' : 'hinges') : n === 1 ? 'drill press' : 'drill presses'}`;
