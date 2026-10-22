// Chapter 4's puzzle (R10.4): every ordering that reaches the best cache hit rate is accepted, computed over all of them.
import { describe, expect, it } from 'vitest';
import {
  BEST,
  HOUSE,
  ORDERS,
  WINNERS,
  price,
  solved,
  type Block,
} from '../../src/content/context/04-order-for-the-cache';

describe('chapter 4: order for the cache', () => {
  it('walks every ordering of the five blocks', () => {
    expect(ORDERS).toHaveLength(120);
    expect(new Set(ORDERS.map(o => o.join())).size).toBe(120);
  });

  it('accepts exactly the orderings that reach the best hit rate, and more than one of them', () => {
    for (const o of ORDERS) expect(solved(o), o.join()).toBe(price(o).read === BEST);
    expect(WINNERS.length).toBeGreaterThan(1);
  });

  it('the winners put the stable blocks first, then the conversation, then the time stamp', () => {
    for (const o of WINNERS) expect(o.slice(3)).toEqual<Block[]>(['chat', 'time']);
    expect(WINNERS).toHaveLength(6); // the three stable blocks in any order
  });

  it('the house order is broken: the stamp near the top throws the rest away', () => {
    expect(solved(HOUSE)).toBe(false);
    expect(price(HOUSE).read).toBeLessThan(BEST);
  });

  it('cache hits make the session cheaper than no cache, and the first call never hits', () => {
    const p = price(WINNERS[0]);
    expect(p.hits[0].read).toBe(0);
    expect(p.cost).toBeLessThan(p.full);
  });
});
