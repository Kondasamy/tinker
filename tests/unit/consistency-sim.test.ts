// Consistency's replica simulator (U25, KTD10): three replicas of each stock count, replication lag, a partition the
// reader can switch on, R/W quorums and two conflict rules. Each test is one of the plan's scenarios, on a small
// hand-made morning or on the module's own.
import { describe, expect, it } from 'vitest';
import {
  EVENTS,
  MOMENTS,
  PRODUCTS,
  REPS,
  STOCK,
  TICKS,
  policyOf,
  simulate,
  type Event,
} from '../../src/lib/consistency/sim';
import { WINNERS, meets, refusedOf } from '../../src/lib/consistency/workbench';
import { FACTS } from '../../src/lib/consistency/facts';

const ev = (t: number, kind: Event['kind'], at: Event['at'], product: Event['product'], who = 'x'): Event => ({
  t,
  kind,
  at,
  product,
  who,
});
const ONE = policyOf({ r: 1, w: 1, rule: 'lww' });
const QUORUM = policyOf({ r: 2, w: 2, rule: 'lww' });

describe('replication', () => {
  it('a sale reaches the other replicas after the lag; a look before then is stale', () => {
    const r = simulate(ONE);
    const look = (t: number) => r.outcomes.find(o => o.t === t && o.kind === 'look')!;
    expect(look(MOMENTS.staleLook).stale).toBe(true);
    expect(look(MOMENTS.caughtUp).stale).toBe(false);
    expect(r.ticks[MOMENTS.staleLook].boards.west.hinge).toBe(STOCK.hinge);
    expect(r.ticks[MOMENTS.caughtUp].boards.west.hinge).toBe(STOCK.hinge - 1);
  });

  it('with no partition and R + W > N, there are no stale reads and no oversell', () => {
    // a morning with no two orders at once
    const seq = [
      ev(1, 'order', 'north', 'hinge'),
      ev(2, 'look', 'west', 'hinge'),
      ev(3, 'order', 'east', 'hinge'),
      ev(4, 'order', 'west', 'drill'),
      ev(5, 'order', 'north', 'drill'),
      ev(6, 'look', 'east', 'drill'),
    ];
    for (const [r, w] of [
      [2, 2],
      [1, 3],
      [3, 1],
    ]) {
      const res = simulate(policyOf({ r, w, rule: 'lww' }), seq);
      expect(res.stale).toBe(0);
      expect(res.oversold.drill + res.oversold.hinge).toBe(0);
    }
    // the same morning with R = W = 1 reads stale and sells the drill press twice
    const loose = simulate(ONE, seq);
    expect(loose.stale).toBeGreaterThan(0);
    expect(loose.oversold.drill).toBe(1);
  });

  it('every replica agrees once the messages have arrived', () => {
    for (const p of [ONE, QUORUM, { ...ONE, partition: true }]) {
      const r = simulate(p),
        last = r.ticks[TICKS - 1];
      for (const pr of PRODUCTS) expect(new Set(REPS.map(x => last.boards[x][pr])).size).toBe(1);
    }
  });
});

describe('the partition', () => {
  it('with W = 1 the drill press sells twice; with W = 2 the cut-off side refuses the order', () => {
    const open = simulate({ ...ONE, partition: true });
    expect(open.oversold.drill).toBe(1);
    expect(open.outcomes.filter(o => o.product === 'drill' && o.result === 'sold')).toHaveLength(2);
    const right = simulate({ ...policyOf({ r: 1, w: 2, rule: 'lww' }), partition: true });
    expect(right.oversold.drill).toBe(0);
    const dev = right.outcomes.find(o => o.t === MOMENTS.westSells)!;
    expect(dev.result).toBe('refused');
    expect(right.outcomes.find(o => o.t === MOMENTS.northSells)!.result).toBe('sold');
  });

  it('the line is cut only inside the window, and only when switched on', () => {
    const r = simulate({ ...ONE, partition: true });
    for (const k of r.ticks) expect(k.cut).toBe(k.t >= 6 && k.t < 14);
    expect(simulate(ONE).ticks.some(k => k.cut)).toBe(false);
  });
});

describe('who wins', () => {
  it('last-writer-wins loses one of two concurrent decrements; reservations at a primary lose none', () => {
    const two = [ev(1, 'order', 'north', 'hinge'), ev(1, 'order', 'west', 'hinge')];
    const lww = simulate(QUORUM, two);
    expect(lww.sold.hinge).toBe(2);
    expect(lww.final.hinge).toBe(STOCK.hinge - 1);
    expect(lww.lost.hinge).toBe(1);
    const res = simulate(policyOf({ r: 2, w: 2, rule: 'primary' }), two);
    expect(res.sold.hinge).toBe(2);
    expect(res.final.hinge).toBe(STOCK.hinge - 2);
    expect(res.lost.hinge).toBe(0);
  });

  it('the last hinge: two buyers at once both get receipts under last-writer-wins, one under reservations', () => {
    const at = (p: ReturnType<typeof simulate>) =>
      p.outcomes.filter(o => o.t === MOMENTS.lastHinge && o.result === 'sold').length;
    expect(at(simulate(ONE))).toBe(2);
    expect(at(simulate(QUORUM))).toBe(2);
    expect(simulate(ONE).oversold.hinge).toBe(1);
    const res = simulate(policyOf({ r: 1, w: 1, rule: 'primary' }));
    expect(at(res)).toBe(1);
    expect(res.oversold.hinge).toBe(0);
    expect(res.outcomes.find(o => o.t === MOMENTS.lastHinge && o.result !== 'sold')!.result).toBe('soldout');
  });

  it('reservations refuse an order that cannot reach the primary', () => {
    const r = simulate({ ...policyOf({ r: 1, w: 1, rule: 'primary' }), partition: true });
    expect(r.outcomes.find(o => o.t === MOMENTS.westSells)!.result).toBe('refused');
    expect(r.oversold.drill).toBe(0);
  });
});

describe('reading your own write', () => {
  const priya = (sticky: boolean, p = ONE) =>
    simulate({ ...p, sticky }).outcomes.find(o => o.t === MOMENTS.priyaLooks)!;
  it('fails during the lag when the reload lands on another warehouse', () => {
    expect(priya(false).ryw).toBe(false);
    expect(priya(false).served).toBe('west');
  });
  it('holds when the read goes to the warehouse that took her order', () => {
    expect(priya(true).ryw).toBe(true);
    expect(priya(true).served).toBe('north');
  });
  it('holds with R + W > N wherever the read lands', () => {
    expect(priya(false, QUORUM).ryw).toBe(true);
  });
});

describe('the morning', () => {
  it('every event lies inside the day', () => {
    for (const e of EVENTS) expect(e.t >= 0 && e.t < TICKS).toBe(true);
  });
});

describe('chapter 7’s workbench', () => {
  it('WINNERS have zero oversells on the drill press and the fewest refused orders', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    const best = Math.min(...WINNERS.map(refusedOf));
    for (const w of WINNERS) {
      expect(simulate(w).oversold.drill).toBe(0);
      expect(meets(w)).toBe(true);
      expect(refusedOf(w)).toBe(best);
    }
  });
});

describe('facts', () => {
  it('every fact has a claim and an https source', () => {
    for (const f of FACTS) {
      expect(f.claim.length).toBeGreaterThan(20);
      expect(f.source).toMatch(/^https:\/\//);
    }
  });
});
