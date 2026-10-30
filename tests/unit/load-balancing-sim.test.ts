// Load balancing's simulator (KTD7, KTD12): the lessons the chapters teach, read off real runs of the sale and pinned in
// data/load-balancing/pinned.json, so a change to the traffic, the numbers or the rules that moves a lesson fails here.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/load-balancing/pinned.json' with { type: 'json' };
import { percentile } from '../../src/lib/load-balancing/percentile';
import {
  ASSUMPTIONS,
  HEDGES,
  MISSES,
  PHASES,
  REQUESTS,
  SERVERS,
  policyOf,
  simulate,
} from '../../src/lib/load-balancing/sim';
import { RULES } from '../../src/lib/load-balancing/rules';
import { BENCHES, BEST, LIMITS, WINNERS, benchPolicy, solve, wins } from '../../src/lib/load-balancing/workbench';
import { fact } from '../../src/lib/load-balancing/facts';
import { CHECKS } from '../../src/content/load-balancing/05-same-customer';
import { REAL_EXTRA } from '../../src/content/load-balancing/07-route-the-sale';

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const ms = (x: number) => Math.round(x);
const GRAY = { dogwood: 'gray' } as const;

/** Every pinned effect, fresh. */
function pins() {
  const run = (p: Parameters<typeof policyOf>[0]) => simulate(policyOf(p));
  const ash = (until = PHASES[1].toMs) => run({ servers: 1, until });
  return {
    shares: Object.fromEntries(RULES.map(rule => [rule, run({ rule, states: GRAY, checks: 2 }).shares.map(r4)])),
    ceiling: { morningP99: ms(ash(PHASES[0].toMs).p99), saleP50: ms(ash().p50), saleP99: ms(ash().p99) },
    slow: Object.fromEntries(RULES.map(rule => [rule, ms(run({ rule, states: { birch: 'slow' } }).p99)])),
    slowFailed: Object.fromEntries(RULES.map(rule => [rule, run({ rule, states: { birch: 'slow' } }).failed])),
    dead: MISSES.map(checks => {
      const r = run({ states: { cedar: 'dead' }, checks });
      return { checks, failed: r.failed, pulledAt: r.pulledAt[2] === Infinity ? null : r.pulledAt[2] };
    }),
    sticky: {
      off: run({}).cartsLost,
      on: run({ sticky: true }).cartsLost,
      dies: run({ sticky: true, states: { cedar: 'dead' }, checks: 2 }).cartsLost,
    },
    hedge: HEDGES.map(hedgeMs => {
      const r = run({ rule: 'least', states: GRAY, hedgeMs });
      return { hedgeMs, p50: ms(r.p50), p99: ms(r.p99), sent: r.sent };
    }),
  };
}

describe('percentile', () => {
  it('is nearest rank: p50 of 1..100 is 50, p99 is 99, p100 the largest', () => {
    const xs = Array.from({ length: 100 }, (_, i) => 100 - i);
    expect(percentile(xs, 50)).toBe(50);
    expect(percentile(xs, 99)).toBe(99);
    expect(percentile(xs, 100)).toBe(100);
    expect(percentile([7], 99)).toBe(7);
  });
  it('throws on an empty list', () => expect(() => percentile([], 50)).toThrow());
});

describe('the sale', () => {
  it('is drawn from the seed: the same requests every time, all in the sale window', () => {
    expect(REQUESTS.length).toBeGreaterThan(300);
    expect(REQUESTS.every((r, i) => i === 0 || r.t >= REQUESTS[i - 1].t)).toBe(true);
    expect(REQUESTS.at(-1)!.t).toBeLessThan(PHASES.at(-1)!.toMs);
    expect(SERVERS.length).toBeLessThanOrEqual(6);
  });
  it('every rule sends every request once, and every request ends', () => {
    for (const rule of RULES) {
      const r = simulate(policyOf({ rule }));
      expect(r.served).toHaveLength(REQUESTS.length);
      expect(r.sent).toBe(REQUESTS.length);
      expect(r.served.every(s => s.ok && s.end < Infinity)).toBe(true);
    }
  });
});

describe('the lessons (pinned)', () => {
  const fresh = pins();
  it('matches data/load-balancing/pinned.json', () => {
    const { note: _, ...pins } = pinned;
    expect(fresh).toEqual(pins);
  });
  it('round robin over equal servers gives equal counts, ±1', () => {
    const r = simulate(policyOf({ servers: 3, states: {} })),
      counts = [0, 1, 2].map(s => r.served.filter(x => x.server === s).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
  it('one server hits its ceiling in the sale', () => {
    expect(fresh.ceiling.saleP99).toBeGreaterThan(3 * fresh.ceiling.morningP99);
  });
  it('round robin feeds a 5× slower server till customers give up; counting waiting requests steers around it; two choices come close', () => {
    expect(fresh.slowFailed['round-robin']).toBeGreaterThan(0);
    expect(fresh.slowFailed.least).toBe(0);
    expect(fresh.slowFailed.two).toBe(0);
    expect(fresh.slow['round-robin']).toBeGreaterThan(3 * fresh.slow.least);
    expect(fresh.slow.two).toBeLessThanOrEqual(1.3 * fresh.slow.least);
  });
  it('a gray server passes health checks: round robin and weighted keep its share, waiting-count rules cut it', () => {
    const dog = (rule: string) => fresh.shares[rule][3];
    expect(dog('round-robin')).toBeCloseTo(0.25, 1);
    expect(dog('weighted')).toBeCloseTo(0.2, 2);
    expect(dog('least')).toBeLessThan(0.15);
    expect(dog('two')).toBeLessThan(0.15);
    expect(simulate(policyOf({ states: GRAY, checks: 1 })).pulledAt[3]).toBe(Infinity);
  });
  it('a dead server is pulled after N misses; requests sent before then fail, more with more misses', () => {
    const [off, ...on] = fresh.dead;
    expect(off.pulledAt).toBeNull();
    expect(on.every(d => d.failed < off.failed)).toBe(true);
    expect(on.map(d => d.failed)).toEqual([...on.map(d => d.failed)].sort((a, b) => a - b));
  });
  it('sticky sessions keep carts until their server dies', () => {
    expect(fresh.sticky.on).toBe(0);
    expect(fresh.sticky.off).toBeGreaterThan(100);
    expect(fresh.sticky.dies).toBeGreaterThan(0);
  });
  it('hedging at the pinned wait cuts p99 and sends more requests; too early floods the servers', () => {
    const [off, early, mid] = fresh.hedge;
    expect(mid.p99).toBeLessThan(off.p99 / 1.5);
    expect(mid.sent).toBeGreaterThan(off.sent);
    expect(early.sent - off.sent).toBeGreaterThan(3 * (mid.sent - off.sent));
  });
});

describe('the give-up', () => {
  it('no answered request took longer than the timeout, in any chapter run or workbench setup', () => {
    const p = policyOf,
      runs = [
        ...RULES.flatMap(rule => [
          p({ rule }),
          p({ rule, states: { birch: 'slow' } }),
          p({ rule, states: GRAY, checks: 2 }),
        ]),
        ...MISSES.flatMap(checks => [
          p({ states: { cedar: 'dead' }, checks }),
          p({ states: { cedar: 'dead', ...GRAY }, checks }),
        ]),
        p({ sticky: true }),
        p({ sticky: true, states: { cedar: 'dead' }, checks: 2 }),
        ...HEDGES.map(hedgeMs => p({ rule: 'least', states: GRAY, hedgeMs })),
        p({ servers: 1, until: PHASES[0].toMs }),
        p({ servers: 1 }),
        ...BENCHES.map(benchPolicy),
      ];
    for (const r of runs.map(x => simulate(x))) {
      expect(r.served.filter(s => s.ok).every(s => s.ms <= ASSUMPTIONS.timeoutMs)).toBe(true);
      expect(r.served.filter(s => !s.ok).every(s => Math.round(s.ms) === ASSUMPTIONS.timeoutMs)).toBe(true);
    }
  });
});

describe('the workbench', () => {
  it('WINNERS and BEST equal a fresh solve over every bench', () => {
    expect(BENCHES).toHaveLength(64);
    const s = solve();
    expect(BEST).toBe(s.best);
    expect(WINNERS).toEqual(s.winners);
    expect(WINNERS.every(wins)).toBe(true);
  });
  it('the start fails, and every winner counts waiting requests', () => {
    expect(wins({ rule: 'round-robin', checks: 0, hedgeMs: 0 })).toBe(false);
    expect(WINNERS.every(w => w.rule === 'least' || w.rule === 'two')).toBe(true);
  });
});

describe('toy vs real', () => {
  it('chapter 5 pulls after AWS’s default miss count, one the slider offers', () => {
    expect(CHECKS).toBe(Number(fact('health-checks').value));
    expect(MISSES).toContain(CHECKS);
  });
  it('chapter 7’s note holds: the team’s cap on extra copies is looser than Google’s test needed', () => {
    expect(REAL_EXTRA).toBe(Number(fact('hedge-benchmark').value));
    expect(LIMITS.extraShare).toBeGreaterThan(REAL_EXTRA);
  });
});
