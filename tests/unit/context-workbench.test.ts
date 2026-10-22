// Chapters 5–7 (R10.5–7): what their copy says is read off the runs, so these pin the runs the copy depends on.
import { describe, expect, it } from 'vitest';
import { totals } from '../../src/lib/context/loop';
import { CHEAPEST, FORMS, measure } from '../../src/content/context/05-clearing-the-desk';
import { R as memoryRun } from '../../src/content/context/06-memory';
import { POLICIES, STUFF_ALL, WINNERS, byCase, play, score, solved } from '../../src/content/context/07-workbench';

describe('chapter 5: clearing the desk', () => {
  it('clearing and the summary send fewer tokens and keep every answer right', () => {
    const full = measure('full', false);
    for (const f of FORMS.filter(f => f !== 'full')) {
      expect(measure(f, false).tokens, f).toBeLessThan(full.tokens);
      expect(measure(f, false).right, f).toBe(measure(f, false).of);
    }
    expect(full.right).toBe(full.of);
  });
  it('with the cache on, the full history is cheapest: clearing breaks the cached prefix', () => {
    expect(CHEAPEST).toBe('full');
    expect(measure('cleared', true).cost).toBeGreaterThan(measure('full', true).cost);
    expect(measure('cleared', true).written).toBeGreaterThan(measure('full', true).written);
  });
});

describe('chapter 6: memory', () => {
  it('the second session is right only with the memory note', () => {
    expect(memoryRun(false).answers[1].right).toBe(false);
    expect(memoryRun(true).answers[1].right).toBe(true);
    expect(Object.keys(memoryRun(true).notes).every(f => f.startsWith('/memories/'))).toBe(true);
  });
});

describe('chapter 7: the workbench', () => {
  it('walks every policy, each a finished run', () => {
    expect(POLICIES).toHaveLength(12);
    for (const p of POLICIES) expect(play(p).status, JSON.stringify(p)).toBe('done');
  });
  it('every policy’s totals equal the sum over its cases', () => {
    for (const p of POLICIES) {
      const rows = byCase(play(p)),
        t = totals(play(p));
      expect(rows.map(r => r.case)).toEqual(['refund-window', 'free-shipping', 'sensor-warranty']);
      expect(rows.reduce((n, r) => n + r.tokens, 0)).toBe(t.tokens);
      expect(rows.reduce((n, r) => n + r.cost, 0)).toBeCloseTo(t.cost, 6);
      expect(rows.reduce((n, r) => n + r.right, 0)).toBe(t.right);
    }
  });
  it('some policy beats stuffing everything on both answer quality and cost', () => {
    const base = score(STUFF_ALL);
    expect(POLICIES.some(p => score(p).right > base.right && score(p).cost < base.cost)).toBe(true);
  });
  it('the puzzle accepts every policy with the most right answers at the lowest cost, and not the first policy', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(WINNERS[0]).toEqual({ retrieval: 'fetch', history: 'full', cache: true }); // the chapter's closing narration names it
    for (const w of WINNERS)
      for (const p of POLICIES) {
        expect(score(w).right).toBeGreaterThanOrEqual(score(p).right);
        if (score(p).right === score(w).right) expect(score(w).cost).toBeLessThanOrEqual(score(p).cost);
      }
    expect(solved(STUFF_ALL)).toBe(false);
  });
});
