// Recommendations' chapters against the engine (KTD10): every reveal says what the data shows, the moments the e2e flow
// walks to hold, the recall bank's claims about the bench hold, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { BASE } from '../../src/lib/recommendations/factorise';
import { BLENDS, EXPLORES, ROUNDS, loopOf } from '../../src/lib/recommendations/loop';
import { METHODS, SCORES } from '../../src/lib/recommendations/score';
import {
  COVERAGE_MIN,
  START,
  WINNERS,
  benchOf,
  benchScore,
  meets,
  wins,
} from '../../src/lib/recommendations/workbench';
import { nearestAisle } from '../../src/content/recommendations/kit';
import * as ch1 from '../../src/content/recommendations/01-the-bestsellers-shelf';
import * as ch2 from '../../src/content/recommendations/02-people-like-you';
import * as ch3 from '../../src/content/recommendations/03-bought-together';
import * as ch4 from '../../src/content/recommendations/04-hidden-tastes';
import * as ch5 from '../../src/content/recommendations/05-new-shopper-new-product';
import * as ch6 from '../../src/content/recommendations/06-the-loop';
import * as ch7 from '../../src/content/recommendations/07-tune-the-shelf';

describe('the chapters’ reveals match the data', () => {
  it('chapter 1: both shelves are the one bestsellers ranking', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^Nearly the same/);
    expect(ch1.SHARED).toBeGreaterThan(0);
  });
  it('chapter 2: people like them find the hidden next order; bestsellers don’t', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^Yes/);
    expect(ch2.shelfFor('popular')).not.toContain(ch2.NEXT.id);
    expect(ch2.ALIKE).toHaveLength(3);
  });
  it('chapter 3: the printer brings warehouse kit, and bought together finds the most', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^Warehouse kit/);
    expect(ch3.BEST).toBe(true);
  });
  it('chapter 4: the warehouse corner is reachable, and Ash’s own taste finds their next order', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^Yes/);
    expect(nearestAisle(BASE.users[ch4.OTHER.id]!)).toBe(ch4.TOWARD);
    expect(nearestAisle(BASE.users[ch4.FIRST.id]!)).not.toBe(ch4.TOWARD);
    const map = ch4.STEPS[0];
    expect(
      map.predicate(map.solution!({ shopper: ch4.FIRST.id, you: null, p1: null, view: 'scene', quiz: null })),
    ).toBe(true);
  });
  it('chapter 5: the new product ranks nowhere, then low', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^Nowhere/);
    expect(ch5.RANK).toBeGreaterThan(5);
  });
  it('chapter 6: without exploration the map narrows below the rule; one random slot holds it', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^They fade/);
    expect(ch6.NARROW).toBeLessThan(COVERAGE_MIN);
    expect(ch6.HELD).toBeGreaterThanOrEqual(COVERAGE_MIN);
    expect(ch6.roundOf(0, ROUNDS).shelf).toHaveLength(5);
  });
});

describe('the recall bank’s claims', () => {
  it('no setting without random slots keeps the floor; the two named settings do', () => {
    for (const blend of BLENDS) expect(meets({ blend, explore: 0 })).toBe(false);
    expect(meets({ blend: 0, explore: 2 })).toBe(true);
    expect(meets({ blend: 0.5, explore: 1 })).toBe(true);
  });
  it('bestsellers find the fewest next orders', () => {
    for (const m of METHODS) if (m !== 'popular') expect(SCORES[m].hits).toBeGreaterThan(SCORES.popular.hits);
  });
  it('a random slot costs hits: within a blend, more slots never find more at round 0', () => {
    for (const blend of BLENDS) {
      const h = EXPLORES.map(e => loopOf(blend, e).rounds[0].hits);
      expect(h[0]).toBeGreaterThanOrEqual(h.at(-1)!);
    }
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, view: 'scene' as const, quiz: null };
  it('Show me lands on a setting in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(benchOf(shown));
  });
  it('the start is not a winner, and a losing setting names its reason', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
    expect(benchScore(START).coverage).toBeLessThan(COVERAGE_MIN);
  });
});
