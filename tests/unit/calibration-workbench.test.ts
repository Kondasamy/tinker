// Calibration's stand-in answer set and chapter 7's workbench: every answer graded and labelled, the set overconfident
// as written, and WINNERS equal to the pin.
import { describe, expect, it } from 'vitest';
import { ANSWERS, KIND_IDS, THRESHOLDS, itemsOf, ofKind, right } from '../../src/lib/calibration/answers';
import { LEAST, PLANS, WINNERS, planKey, solve, solved, totals } from '../../src/lib/calibration/workbench';
import { accuracy, coverage, meanConf } from '../../src/lib/calibration/score';
import data from '../../data/calibration/answers.json' with { type: 'json' };

describe('the stand-in answers', () => {
  it('about sixty, each with a confidence in [0, 1], a note and a kind, ids unique', () => {
    expect(ANSWERS.length).toBe(60);
    expect(new Set(ANSWERS.map(a => a.id)).size).toBe(ANSWERS.length);
    for (const a of ANSWERS) {
      expect(a.confidence).toBeGreaterThanOrEqual(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
      expect(a.note.length).toBeGreaterThan(3);
      expect(KIND_IDS).toContain(a.kind);
    }
    expect(data.note).toMatch(/stand-in/);
  });
  it('each note’s verdict agrees with the live grade', () => {
    for (const a of ANSWERS) expect(a.note.startsWith(right(a) ? 'Right' : 'Wrong'), a.id).toBe(true);
  });
  it('is overconfident as written: it says more than it gets right, overall and in every kind', () => {
    expect(meanConf(itemsOf())).toBeGreaterThan(accuracy(itemsOf()));
    for (const k of KIND_IDS) expect(meanConf(itemsOf(ofKind(k)))).toBeGreaterThan(accuracy(itemsOf(ofKind(k))));
  });
  it('coverage falls and accuracy rises as the hand-over threshold rises (chapter 6)', () => {
    const c = THRESHOLDS.map(t => coverage(itemsOf(), t));
    for (let i = 1; i < c.length; i++) {
      expect(c[i].coverage).toBeLessThan(c[i - 1].coverage);
      expect(c[i].accuracy).toBeGreaterThan(c[i - 1].accuracy);
    }
  });
});

describe('the workbench', () => {
  it('WINNERS equals the pin, recomputed over every plan', () => {
    const w = solve();
    expect(w.map(planKey).sort()).toEqual(WINNERS.map(planKey).sort());
    expect(totals(w[0]).handed).toBe(LEAST);
    expect(PLANS.length).toBe(45 ** 3);
  });
  it('the same threshold everywhere breaks the desk’s capacity: the answer is per kind', () => {
    const uniform = WINNERS.map(p => Object.fromEntries(KIND_IDS.map(k => [k, { ...p[k], threshold: 0.9 }])));
    for (const p of uniform) expect(totals(p as typeof WINNERS[number]).fits).toBe(false);
    expect(new Set(WINNERS[0] && KIND_IDS.map(k => WINNERS[0][k].threshold)).size).toBeGreaterThan(1);
  });
  it('sending everything at T = 1 keeps no rule but the capacity', () => {
    const p = Object.fromEntries(KIND_IDS.map(k => [k, { T: 1, threshold: 0 }])) as (typeof WINNERS)[number];
    expect(solved(p)).toBe(false);
    expect(totals(p).fits).toBe(true);
  });
});
