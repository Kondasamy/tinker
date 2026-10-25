// Load balancing's simulator (KTD7): a per-request event simulator over Larkspur's hand-written sale
// (data/load-balancing/traffic.json). A balancer sends each request to one of the shop's servers by a rule; each server
// works on one request per slot, at its own speed, and queues the rest. From the trouble time a server may be slow, dead
// or slow but answering (gray failure). Health checks pull a server after N misses; sticky sessions keep a customer on
// the server holding their cart; hedging sends a second copy after a set wait. Every number comes from
// data/load-balancing/assumptions.json, Larkspur's planning numbers: a labelled assumption, never a measurement.
import data from '../../../data/load-balancing/assumptions.json' with { type: 'json' };
import traffic from '../../../data/load-balancing/traffic.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';
import { percentile } from './percentile';
import { picker, type Rule } from './rules';

export const ASSUMPTIONS = data;
export const SERVERS = traffic.servers;
export const CUSTOMERS = traffic.customers;
export const PHASES = traffic.phases;
export const SALE = PHASES[1];
export type ServerState = 'fine' | 'slow' | 'dead' | 'gray';
export const STATES: ServerState[] = ['fine', 'slow', 'dead', 'gray'];
export const STATE_NAME: Record<ServerState, string> = {
  fine: 'Fine',
  slow: 'Slow',
  dead: 'Dead',
  gray: 'Slow but answering',
};
/** misses before a server is pulled (0: no health checks) and hedge waits (0: no hedging), the controls' lists */
export const MISSES = data.checkMisses;
export const HEDGES = data.hedgeWaits;

/** A request: when it arrives (ms), whose it is, and its work at a fine server (ms). */
export interface Request {
  id: number;
  t: number;
  customer: number;
  work: number;
}
/** The sale's requests, drawn once from the seed: Poisson arrivals at each phase's rate, a customer each, and a work
 * time spread evenly around the mean. Every rule sees the same requests. */
export const REQUESTS: Request[] = (() => {
  const rand = mulberry32(traffic.seed),
    out: Request[] = [];
  for (const p of PHASES)
    for (let t = p.fromMs; ; ) {
      t += (-Math.log(1 - rand()) / p.perSecond) * 1000;
      if (t >= p.toMs) break;
      out.push({
        id: out.length,
        t,
        customer: Math.floor(rand() * CUSTOMERS.length),
        work: data.serviceMs * (1 - data.workSpread + 2 * data.workSpread * rand()),
      });
    }
  return out;
})();

export interface Policy {
  rule: Rule;
  /** how many of SERVERS are in use, from the first */
  servers: number;
  /** each server's state from the trouble time; absent is fine */
  states: Partial<Record<string, ServerState>>;
  /** misses before a server is pulled from rotation; 0 runs no health checks */
  checks: number;
  /** a customer's requests stay on the server that served their first */
  sticky: boolean;
  /** a second copy goes to another server once a request has waited this long; 0 sends none */
  hedgeMs: number;
  /** only the requests that arrive before this (ms) */
  until: number;
}
export const BASE: Policy = {
  rule: 'round-robin',
  servers: SERVERS.length,
  states: {},
  checks: 0,
  sticky: false,
  hedgeMs: 0,
  until: SALE.toMs,
};
export const policyOf = (p: Partial<Policy>): Policy => ({ ...BASE, ...p, states: { ...p.states } });
export const stateOf = (p: Policy, s: number): ServerState => p.states[SERVERS[s].id] ?? 'fine';

/** One copy of a request sent to a server: it ends answered (ok) or given up on after the timeout. */
export interface Job {
  req: number;
  server: number;
  copy: 0 | 1;
  sentAt: number;
  endAt: number;
  ok: boolean;
}
/** A request as the customer saw it: the server first chosen, the wait, and whether any copy answered. */
export interface Served extends Request {
  server: number;
  ms: number;
  end: number;
  ok: boolean;
  hedged: boolean;
}
export interface Result {
  policy: Policy;
  served: Served[];
  jobs: Job[];
  /** each server's share of the requests the rule sent it first, 0..1 */
  shares: number[];
  /** copies sent in all, hedges included */
  sent: number;
  failed: number;
  /** requests that reached a server without the customer's cart, which was on another server */
  cartsLost: number;
  /** when each server was pulled from rotation (ms), Infinity if never */
  pulledAt: number[];
  p50: number;
  p99: number;
  /** the last moment anything happened (ms) */
  end: number;
}

/** When health checks pull server s: probes go every checkEveryMs; dead and slow servers miss from the trouble time,
 * and the Nth miss in a row is known checkTimeoutMs after its probe. Gray and fine servers always pass. */
export function pulledAt(p: Policy, s: number): number {
  const st = stateOf(p, s);
  if (!p.checks || (st !== 'dead' && st !== 'slow')) return Infinity;
  const first = Math.ceil(data.troubleAtMs / data.checkEveryMs);
  return (first + p.checks - 1) * data.checkEveryMs + data.checkTimeoutMs;
}

// events at one moment: answers and give-ups free the balancer's view first, then deaths, hedges and arrivals
const ORDER = { done: 0, timeout: 1, death: 2, hedge: 3, arrive: 4 } as const;
type Ev = { t: number; seq: number; kind: keyof typeof ORDER; n: number };
const before = (a: Ev, b: Ev) => a.t - b.t || ORDER[a.kind] - ORDER[b.kind] || a.seq - b.seq;

/** A binary heap of events, earliest first. */
class Heap {
  private a: Ev[] = [];
  get size() {
    return this.a.length;
  }
  push(e: Ev) {
    const a = this.a;
    a.push(e);
    for (let i = a.length - 1; i > 0; ) {
      const up = (i - 1) >> 1;
      if (before(a[up], a[i]) <= 0) break;
      [a[up], a[i]] = [a[i], a[up]];
      i = up;
    }
  }
  pop(): Ev {
    const a = this.a,
      top = a[0],
      last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < a.length && before(a[l], a[m]) < 0) m = l;
        if (r < a.length && before(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Runs the sale under a policy. */
export function simulate(p: Policy, requests: Request[] = REQUESTS): Result {
  const reqs = requests.filter(r => r.t < p.until),
    n = p.servers,
    pick = picker(
      p.rule,
      SERVERS.map(s => s.weight),
      traffic.seed + 1,
    ),
    pulled = SERVERS.map((_, s) => pulledAt(p, s)),
    outstanding = SERVERS.map(() => 0),
    busy = SERVERS.map(() => 0),
    queues: number[][] = SERVERS.map(() => []),
    working: Set<number>[] = SERVERS.map(() => new Set()),
    dead = SERVERS.map(() => false),
    jobs: Job[] = [],
    copies = new Map<number, number[]>(),
    served = new Map<number, Served>(),
    cart = new Map<number, number>(),
    heap = new Heap();
  let seq = 0,
    cartsLost = 0,
    end = 0;
  const at = (t: number, kind: Ev['kind'], i: number) => heap.push({ t, seq: seq++, kind, n: i });
  const inRotation = (t: number, but?: number) => {
    const c = [...Array(n).keys()].filter(s => t < pulled[s] && s !== but);
    // with every server pulled the balancer fails open and tries them all
    return c.length ? c : [...Array(n).keys()].filter(s => s !== but);
  };
  const start = (j: number, t: number) => {
    const job = jobs[j],
      st = stateOf(p, job.server),
      slow = (st === 'slow' || st === 'gray') && t >= data.troubleAtMs;
    busy[job.server]++;
    working[job.server].add(j);
    at(t + reqs[job.req].work * (slow ? data.slowFactor : 1), 'done', j);
  };
  const send = (r: number, s: number, copy: 0 | 1, t: number) => {
    const j = jobs.push({ req: r, server: s, copy, sentAt: t, endAt: Infinity, ok: false }) - 1;
    (copies.get(r) ?? copies.set(r, []).get(r)!).push(j);
    outstanding[s]++;
    if (dead[s]) at(t + data.timeoutMs, 'timeout', j);
    else if (busy[s] < SERVERS[s].slots) start(j, t);
    else queues[s].push(j);
  };
  const finish = (r: number, t: number, ok: boolean) => {
    const s = served.get(r)!;
    Object.assign(s, { ms: t - s.t, end: t, ok });
    if (!ok) return;
    // a copy still queued is cancelled; one already being worked on runs to the end
    for (const j of copies.get(r)!) {
      const q = queues[jobs[j].server].indexOf(j);
      if (q < 0) continue;
      queues[jobs[j].server].splice(q, 1);
      outstanding[jobs[j].server]--;
      jobs[j].endAt = t;
    }
  };
  for (const [i, r] of reqs.entries()) at(r.t, 'arrive', i);
  for (let s = 0; s < n; s++) if (stateOf(p, s) === 'dead') at(data.troubleAtMs, 'death', s);
  while (heap.size) {
    const e = heap.pop(),
      t = e.t;
    end = Math.max(end, t);
    if (e.kind === 'arrive') {
      const r = reqs[e.n],
        c = inRotation(t),
        held = cart.get(r.customer);
      const s = p.sticky && held !== undefined && c.includes(held) ? held : pick(c, outstanding);
      // the cart lives on the server the customer was last sent to; a hedge copy only reads
      if (held !== undefined && held !== s) cartsLost++;
      cart.set(r.customer, s);
      served.set(e.n, { ...r, server: s, ms: 0, end: Infinity, ok: false, hedged: false });
      send(e.n, s, 0, t);
      if (p.hedgeMs) at(t + p.hedgeMs, 'hedge', e.n);
    } else if (e.kind === 'hedge') {
      const s = served.get(e.n)!;
      if (s.end < Infinity) continue;
      s.hedged = true;
      send(e.n, pick(inRotation(t, s.server), outstanding), 1, t);
    } else if (e.kind === 'death') {
      // everything on a dead server hangs until its customer gives up
      dead[e.n] = true;
      for (const j of [...working[e.n], ...queues[e.n]]) at(Math.max(t, jobs[j].sentAt + data.timeoutMs), 'timeout', j);
      working[e.n].clear();
      queues[e.n] = [];
    } else {
      const job = jobs[e.n];
      if (e.kind === 'done') {
        if (!working[job.server].delete(e.n)) continue; // its server died while it worked
        busy[job.server]--;
        const q = queues[job.server].shift();
        if (q !== undefined) start(q, t);
      }
      outstanding[job.server]--;
      Object.assign(job, { endAt: t, ok: e.kind === 'done' });
      const s = served.get(job.req)!;
      if (s.end < Infinity) continue; // another copy answered first
      if (job.ok) finish(job.req, t, true);
      else {
        // failed only once every copy has, and no hedge is still to come
        const all = copies.get(job.req)!.map(j => jobs[j]),
          hedgeDue = p.hedgeMs > 0 && all.length < 2 && t < s.t + p.hedgeMs;
        if (!hedgeDue && all.every(j => j.endAt < Infinity && !j.ok)) finish(job.req, t, false);
      }
    }
  }
  const list = [...served.values()].sort((a, b) => a.id - b.id),
    ms = list.map(s => s.ms),
    first = SERVERS.map((_, s) => list.filter(x => x.server === s).length);
  return {
    policy: p,
    served: list,
    jobs,
    shares: first.map(c => (list.length ? c / list.length : 0)),
    sent: jobs.length,
    failed: list.filter(s => !s.ok).length,
    cartsLost,
    pulledAt: pulled.map((x, s) => (s < n ? x : Infinity)),
    p50: list.length ? percentile(ms, 50) : 0,
    p99: list.length ? percentile(ms, 99) : 0,
    end,
  };
}

const runs = new Map<string, Result>();
/** A policy's run, computed once per page. */
export function runOf(p: Policy): Result {
  const k = JSON.stringify([
    p.rule,
    p.servers,
    SERVERS.map((_, s) => stateOf(p, s)),
    p.checks,
    p.sticky,
    p.hedgeMs,
    p.until,
  ]);
  if (!runs.has(k)) runs.set(k, simulate(p));
  return runs.get(k)!;
}

/** Requests sent to server s (first copies and hedges) that are waiting or being worked on at time t. */
export const waitingAt = (r: Result, s: number, t: number) =>
  r.jobs.filter(j => j.server === s && j.sentAt <= t && t < j.endAt).length;
/** Requests the customer has had an answer to (or given up on) by time t. */
export const landedBy = (r: Result, t: number) => r.served.filter(s => s.end <= t);
