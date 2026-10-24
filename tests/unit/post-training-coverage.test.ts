// Post-training's recorded candidates (KTD12): every question has an answer the full grader passes, every answer has
// a note, every gaming answer is reachable (it passes the weak grader and fails the full one), and the set stays in budget.
import { describe, expect, it } from 'vitest';
import { FULL, QUESTIONS, RULES, WEAK, passes, refOf } from '../../src/lib/post-training/graders';
import { RULE_SETS, WINNERS, outcome } from '../../src/lib/post-training/workbench';

const BUDGET = 30;

describe('post-training candidates', () => {
  it.each(QUESTIONS.map(q => q.id))(
    '%s: 4–6 answers, notes, a probability sum of 1, one passing the full grader',
    id => {
      const q = QUESTIONS.find(x => x.id === id)!;
      expect(q.candidates.length).toBeGreaterThanOrEqual(4);
      expect(q.candidates.length).toBeLessThanOrEqual(6);
      for (const c of q.candidates) {
        expect(c.note.trim(), c.id).not.toBe('');
        expect(c.note.includes('\n')).toBe(false);
      }
      expect(refOf(id).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      expect(q.candidates.some(c => FULL.every(r => passes(r, id, c.text)))).toBe(true);
      expect(q.candidates.filter(c => c.best)).toHaveLength(1);
    },
  );

  it('the best answer passes the full grader; every gaming answer passes the weak one and fails the full one', () => {
    for (const q of QUESTIONS)
      for (const c of q.candidates) {
        if (c.best)
          expect(
            FULL.every(r => passes(r, q.id, c.text)),
            `${q.id} ${c.id}`,
          ).toBe(true);
        if (c.gaming) {
          expect(
            WEAK.every(r => passes(r, q.id, c.text)),
            `${q.id} ${c.id}`,
          ).toBe(true);
          expect(
            FULL.every(r => passes(r, q.id, c.text)),
            `${q.id} ${c.id}`,
          ).toBe(false);
        }
      }
    expect(QUESTIONS.filter(q => q.kind === 'checkable').every(q => q.candidates.some(c => c.gaming))).toBe(true);
  });

  it('the tone question’s answers all pass the full grader, so it cannot tell them apart', () => {
    for (const q of QUESTIONS.filter(x => x.kind === 'tone'))
      for (const c of q.candidates) expect(FULL.every(r => passes(r, q.id, c.text))).toBe(true);
  });

  it(`stays within ${BUDGET} answers`, () => {
    expect(QUESTIONS.reduce((n, q) => n + q.candidates.length, 0)).toBeLessThanOrEqual(BUDGET);
  });

  it('every rule is used by some rule set, and every rule set runs', () => {
    expect(RULE_SETS).toHaveLength(2 ** RULES.length);
    for (const s of RULE_SETS) expect(() => outcome(s)).not.toThrow();
  });
});

describe('the workbench’s winners', () => {
  it('WINNERS is non-empty, and no winner lets a gaming answer win any question', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const s of WINNERS)
      for (const row of outcome(s).rows) {
        expect(row.best, `${s.join('+')} ${row.question}`).toBe(true);
        expect(row.gamed).toBe(false);
      }
  });

  it('the weak grader is not a winner: gaming answers win', () => {
    const o = outcome(WEAK);
    expect(o.rows.some(r => r.gamed)).toBe(true);
    expect(WINNERS).not.toContainEqual(WEAK);
    expect(WINNERS).toContainEqual(FULL);
  });
});
