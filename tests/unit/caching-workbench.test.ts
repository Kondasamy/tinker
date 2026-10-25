// Caching's chapters against the simulator (KTD12): every reveal says what the runs show, Show me lands on a winner, and
// the bench reads any saved state back into a policy it can run.
import { describe, expect, it } from 'vitest';
import { KINDS, TTLS } from '../../src/lib/caching/sim';
import { START, WINNERS, benchPolicy, wins } from '../../src/lib/caching/workbench';
import * as ch1 from '../../src/content/caching/01-far-is-slow';
import * as ch2 from '../../src/content/caching/02-keep-a-copy';
import * as ch3 from '../../src/content/caching/03-how-long-is-it-fresh';
import * as ch4 from '../../src/content/caching/04-take-it-back';
import * as ch5 from '../../src/content/caching/05-everyone-at-once';
import * as ch7 from '../../src/content/caching/07-cache-policy';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: West waits longer than North', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^Longer/);
  });
  it('chapter 2: the first request of the morning misses', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^A miss/);
  });
  it('chapter 3: a 15-minute TTL leaves far fewer stale prices, but some', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^Far fewer, but some/);
  });
  it('chapter 4: a purge leaves no stale prices; versioned names leave no stale photos but stale prices', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^None/);
    expect(ch4.runOfWay('versioned').staleBy.photo).toBe(0);
    expect(ch4.runOfWay('versioned').staleBy.price).toBeGreaterThan(0);
  });
  it('chapter 5: coalescing sends about one trip per item per warehouse; swr cuts the wait and adds stale stock', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^About one per item/);
    const coal = ch5.runWith(true, false),
      swr = ch5.runWith(true, true);
    expect(swr.meanMs).toBeLessThan(coal.meanMs);
    expect(swr.staleBy.stock).toBeGreaterThan(coal.staleBy.stock);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, view: 'scene' as const, quiz: null };
  it('Show me lands on a policy in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS.some(w => JSON.stringify(w) === JSON.stringify(benchPolicy(shown)))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(wins(benchPolicy(START))).toBe(false);
  });
  it('a saved state with unknown values falls back to the start', () => {
    const p = benchPolicy({ ttl: { price: 7, photo: TTLS[1], stock: 'x' as never }, purge: 'yes' as never });
    expect(p.ttl.price).toBe(START.ttl.price);
    expect(p.ttl.photo).toBe(TTLS[1]);
    expect(p.ttl.stock).toBe(START.ttl.stock);
    expect(p.purge).toBe(START.purge);
    for (const k of KINDS) expect(TTLS).toContain(p.ttl[k]);
  });
});
