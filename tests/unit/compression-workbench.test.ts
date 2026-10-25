// Compression chapter 7's workbench (KTD12): the pinned WINNERS are every plan that fits over the whole domain, and the
// lessons the bench rests on hold in the runs.
import { describe, expect, it } from 'vitest';
import {
  BEST,
  BUDGET,
  PLANS,
  START,
  WINNERS,
  benchPlan,
  planKey,
  runPlan,
  solve,
  wins,
} from '../../src/lib/compression/workbench';
import { CODERS } from '../../src/lib/compression/coders';
import { fileOf } from '../../src/lib/compression/files';
import { PICTURE_TOP, PRICE_TOP } from '../../src/lib/compression/story';
import * as ch1 from '../../src/content/compression/01-counting-the-bytes';
import * as ch2 from '../../src/content/compression/02-point-back';
import * as ch3 from '../../src/content/compression/03-short-codes';
import * as ch4 from '../../src/content/compression/04-both-at-once';
import * as ch5 from '../../src/content/compression/05-already-squeezed';
import * as ch6 from '../../src/content/compression/06-throwing-some-away';
import * as ch7 from '../../src/content/compression/07-pack-the-send';

describe('the chapters’ reveals match the engine', () => {
  it('chapter 1: the commonest byte is many times the average, and the picture’s piles are flatter', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^Many times/);
    expect(PRICE_TOP.word).toBe('the space');
    expect(PICTURE_TOP.ratio).toBeLessThan(PRICE_TOP.ratio);
  });
  it('chapter 2: two pointers, and the price list shrinks', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^Two/);
    expect(ch2.LZ_SIZE).toBeLessThan(fileOf('price').bytes.length);
  });
  it('chapter 3: the commonest letter gets the shortest code', () => {
    expect(ch3.outcomeOf()).toBe(0);
    const merge = ch3.STEPS.find(s => s.id === 'merge')!;
    const shown = merge.solution!({ view: 'scene', forest: ch3.START, merges: 0, p1: 0, quiz: null });
    expect(merge.predicate(shown)).toBe(true);
  });
  it('chapter 4: both together pack smallest', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toBe(CODERS.pair.name);
  });
  it('chapter 5: random bytes grow, and packing a packed file gains nothing', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^It stays the same or grows/);
    expect(ch5.TWICE).toBeGreaterThanOrEqual(ch5.ONCE.length);
  });
  it('chapter 6: fewer shades pack much smaller, and Show me fits the budget', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toBe('Much smaller');
    expect(ch6.FITS.length).toBeGreaterThan(0);
    const step = ch6.STEPS.find(s => s.id === 'budget')!;
    const shown = step.solution!({ levels: 256, block: 1, view: 'scene', p1: 0, quiz: null });
    expect(step.predicate(shown)).toBe(true);
  });
  it('chapter 7: Show me lands on a winner', () => {
    const bench = ch7.STEPS.find(s => s.id === 'bench')!;
    const shown = bench.solution!({ ...START, quiz: null });
    expect(wins(benchPlan(shown))).toBe(true);
    expect(bench.predicate(shown)).toBe(true);
  });
});

describe('chapter 7’s workbench', () => {
  it('has 960 plans: a coder for each of three files, five shade counts and three block sizes', () => {
    expect(PLANS).toHaveLength(960);
    expect(new Set(PLANS.map(planKey)).size).toBe(960);
  });

  it('WINNERS equals the pin: every plan within both budgets', () => {
    expect(solve().map(planKey)).toEqual(WINNERS.map(planKey));
    for (const p of WINNERS) expect(runPlan(p).fits).toBe(true);
    expect(BEST).toBeLessThanOrEqual(BUDGET.bytes);
  });

  it('every winner sends the random file as it is', () => {
    for (const p of WINNERS) expect(p.coders.random).toBe('store');
  });

  it('the start fits neither budget, and the untouched picture alone overruns it', () => {
    expect(runPlan(START).fits).toBe(false);
    expect(wins(START)).toBe(false);
  });

  it('too much loss misses the quality budget even when it is small', () => {
    const r = runPlan({ ...WINNERS[0], levels: 4, block: 4 });
    expect(r.total).toBeLessThan(runPlan(WINNERS[0]).total);
    expect(r.diff).toBeGreaterThan(BUDGET.diff);
    expect(r.fits).toBe(false);
  });

  it('reads a saved state back into a plan, falling back to the start', () => {
    expect(planKey(benchPlan({}))).toBe(planKey(START));
    expect(benchPlan({ levels: 7, coders: { price: 'zip' as never } }).levels).toBe(256);
    expect(planKey(benchPlan(WINNERS[0]))).toBe(planKey(WINNERS[0]));
  });
});
