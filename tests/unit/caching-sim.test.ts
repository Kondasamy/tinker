// Caching's edge-cache simulator (KTD9) and chapter 7's workbench: the scenarios the chapters teach, read off real runs
// of the trace, so a change to the trace or the rules that breaks a lesson fails here.
import { describe, expect, it } from 'vitest';
import {
  EDGES,
  KINDS,
  MOMENTS,
  OFF,
  REQUESTS,
  TTLS,
  policyOf,
  simulate,
  tripsAt,
  type Policy,
} from '../../src/lib/caching/sim';
import { LIMITS, POLICIES, WINNERS, meets, scoreOf } from '../../src/lib/caching/workbench';

const DAY = TTLS.at(-1)!;
const long = (p: Partial<Policy> = {}) => policyOf({ ttl: { price: DAY, photo: DAY, stock: DAY }, ...p });

describe('the edge-cache simulator', () => {
  it('with caching off, every request reaches the depot', () => {
    const r = simulate(OFF);
    expect(r.requests).toBe(REQUESTS.length);
    expect(r.trips).toBe(r.requests);
    expect(r.hitRate).toBe(0);
    expect(r.stale).toBe(0);
  });

  it('a copy kept nearby turns repeat requests into hits that skip the trip', () => {
    const off = simulate(OFF),
      on = simulate(long());
    expect(on.hitRate).toBeGreaterThan(0.8);
    expect(on.meanMs).toBeLessThan(off.meanMs / 2);
    // the first request of the day at each warehouse is a miss: the shelf starts empty
    for (const e of EDGES) expect(on.served.find(s => s.edge === e && s.t === 0)!.outcome).toBe('miss');
  });

  it('a TTL past the price change serves stale prices; a purge at the change brings them to zero', () => {
    expect(simulate(long()).staleBy.price).toBeGreaterThan(0);
    expect(simulate(long({ purge: true })).staleBy.price).toBe(0);
  });

  it('a shorter TTL serves fewer stale prices, at the cost of more trips', () => {
    const a = simulate(long()),
      b = simulate(long({ ttl: { price: TTLS[1], photo: DAY, stock: DAY } }));
    expect(b.staleBy.price).toBeGreaterThan(0);
    expect(b.staleBy.price).toBeLessThan(a.staleBy.price);
    expect(b.trips).toBeGreaterThan(a.trips);
  });

  it('a versioned name serves the new photo fresh after a change, with no purge', () => {
    expect(simulate(long()).staleBy.photo).toBeGreaterThan(0);
    const v = simulate(long({ versioned: true }));
    expect(v.staleBy.photo).toBe(0);
    for (const e of EDGES)
      expect(v.served.find(s => s.edge === e && s.t === MOMENTS.newPhoto && s.key === 'photo:hinge')!.outcome).toBe(
        'miss',
      );
  });

  it('during the flash sale, coalescing sends one depot trip per key per warehouse, against many without it', () => {
    const base = long({ purge: true });
    const without = simulate(base),
      withIt = simulate({ ...base, coalesce: true });
    for (const e of EDGES) {
      expect(tripsAt(without, MOMENTS.sale, e, 'price:hinge')).toBeGreaterThan(3);
      expect(tripsAt(withIt, MOMENTS.sale, e, 'price:hinge')).toBe(1);
    }
    expect(without.ticks[MOMENTS.sale].overloaded).toBe(true);
    expect(withIt.ticks[MOMENTS.sale].overloaded).toBe(false);
  });

  it('stale-while-revalidate serves an expired copy within its window and revalidates once', () => {
    const p = policyOf({
      ttl: { price: DAY, photo: DAY, stock: TTLS[1] },
      purge: true,
      coalesce: true,
      swr: true,
    });
    const r = simulate(p);
    const swr = r.served.filter(s => s.outcome === 'swr');
    expect(swr.length).toBeGreaterThan(0);
    for (const s of swr) {
      const same = r.served.filter(x => x.t === s.t && x.edge === s.edge && x.key === s.key);
      expect(same.filter(x => x.trip).length).toBe(1);
      expect(s.ms).toBe(r.served.find(x => x.outcome === 'hit')!.ms);
    }
    // without it, the same expiries make customers wait for the trip
    const plain = simulate({ ...p, swr: false });
    expect(plain.meanMs).toBeGreaterThan(r.meanMs);
  });

  it('is deterministic', () => {
    expect(simulate(long({ coalesce: true }))).toEqual(simulate(long({ coalesce: true })));
  });
});

describe('the workbench', () => {
  it('covers every policy the controls can make', () => {
    expect(POLICIES.length).toBe(TTLS.length ** KINDS.length * 4);
    for (const p of POLICIES) expect(() => scoreOf(p)).not.toThrow();
  });

  it('WINNERS is non-empty, and every winner meets the staleness limits with the best hit rate', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    const best = Math.max(...POLICIES.filter(meets).map(scoreOf));
    for (const w of WINNERS) {
      expect(meets(w)).toBe(true);
      expect(scoreOf(w)).toBe(best);
      const r = simulate(w);
      for (const k of KINDS) expect(r.staleBy[k] / r.readsBy[k]).toBeLessThanOrEqual(LIMITS[k]);
    }
  });

  it('caching everything for a day with no purge breaks a limit', () => {
    expect(meets(long())).toBe(false);
  });
});
