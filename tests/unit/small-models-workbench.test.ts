// Small models' chapter 7 workbench and the chapters' read-offs (U13).
import { describe, expect, it } from 'vitest';
import { BEST, CHOICES, KINDS, PLANS, POINTS, solved, totals, WINNERS } from '../../src/lib/small-models/workbench';
import { THRESHOLDS } from '../../src/lib/small-models/router';
import { planOf, START } from '../../src/content/small-models/07-routing-policy';
import { gapOutcome } from '../../src/content/small-models/02-learning-from-a-teacher';
import { agreeOutcome } from '../../src/content/small-models/03-how-close-is-the-student';
import { riseOutcome } from '../../src/content/small-models/05-fall-back-when-unsure';
import { shipOutcome } from '../../src/content/small-models/06-gate-the-switch';
import { SMALL_MODELS_MODULE } from '../../src/content/small-models/module';
import metaJson from '../../public/data/lm/meta.json' with { type: 'json' };

describe('the routing-policy workbench', () => {
  it('walks every plan: choices per kind × thresholds', () => {
    expect(PLANS).toHaveLength(CHOICES.length ** KINDS.length * THRESHOLDS.length);
  });
  it('WINNERS is non-empty and every member scores the best', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(totals(w).score).toBeCloseTo(BEST, 9);
    expect(PLANS.filter(p => !solved(p)).every(p => totals(p).score < BEST)).toBe(true);
  });
  it('the starting plan (one router for everything) is not a winner', () => {
    expect(solved(START)).toBe(false);
  });
  it('a score is points per right answer minus cost', () => {
    const t = totals(START);
    expect(t.score).toBeCloseTo(POINTS * t.right - t.cost, 9);
  });
  it('planOf falls back on unknown choices and thresholds from a saved run', () => {
    expect(planOf({ lookups: 'nope' as never, threshold: 0.33 })).toEqual(START);
    expect(planOf({ ...START, hard: 'large' }).hard).toBe('large');
  });
});

describe('the chapters’ read-offs match what the data shows', () => {
  it('chapter 2: the student ends a little behind the teacher on held-out text', () => {
    const m = metaJson as unknown as { heldout: { loss: number }; student: { heldout: { loss: number } } };
    expect(gapOutcome(m.student.heldout.loss - m.heldout.loss)).toBe(1);
  });
  it('chapter 3: agreement falls in the middle band', () => {
    expect(agreeOutcome((metaJson as unknown as { student: { agreement: number } }).student.agreement)).toBe(1);
  });
  it('chapter 5: the router at the top costs more than all-large', () => expect(riseOutcome()).toBe(0));
  it('chapter 6: a cheaper router ships', () => expect(shipOutcome()).toBe(0));
});

describe('the module', () => {
  it('is Advanced, after Fine-tuning and Evals, with seven chapters', () => {
    expect(SMALL_MODELS_MODULE.level).toBe('Advanced');
    expect(SMALL_MODELS_MODULE.prereqs).toEqual(['fine-tuning', 'evals']);
    expect(SMALL_MODELS_MODULE.chapters).toHaveLength(7);
  });
});
