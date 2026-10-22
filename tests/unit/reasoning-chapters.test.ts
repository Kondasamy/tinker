// What the reasoning chapters say about the recorded answers holds: each chapter's narration is checked against the data
// it describes, and the registry entry is complete.
import { describe, expect, it } from 'vitest';
import { moduleOf } from '../../src/lib/modules';
import { HINT_PAIR, SPLIT, ofKind, run, sweep } from '../../src/lib/reasoning/engine';
import { outcome as dialOutcome } from '../../src/content/reasoning/03-the-effort-dial';

describe('reasoning chapters', () => {
  it('is live, Intermediate, after Evals, with seven chapters and a recall item per chapter, one pinned', () => {
    const m = moduleOf('reasoning');
    expect(m).toMatchObject({ status: 'live', level: 'Intermediate', prereqs: ['evals'] });
    expect(m.chapters).toHaveLength(7);
    for (const c of m.chapters)
      expect(m.recall!.filter(i => i.chapter === c.id).length, c.id).toBeGreaterThanOrEqual(3);
    expect(m.recall!.filter(i => i.pin)).toHaveLength(1);
  });

  it('chapter 1: the quick answer is wrong and the thinking answer right', () => {
    expect(run(SPLIT, 'none').right).toBe(false);
    expect(run(SPLIT, 'medium').right).toBe(true);
  });

  it('chapter 2: the thinking outweighs the answer at medium', () => {
    const r = run(SPLIT, 'medium');
    expect(r.thinkingTokens).toBeGreaterThan(1.25 * r.answerTokens);
  });

  it('chapter 3: rises then flattens; high fixes one question and breaks another', () => {
    expect(dialOutcome()).toBe(1);
    const ids = ofKind('multistep').map(q => q.id);
    const fixed = ids.filter(q => !run(q, 'medium').right && run(q, 'high').right);
    const broke = ids.filter(q => run(q, 'medium').right && !run(q, 'high').right);
    expect([fixed.length, broke.length]).toEqual([1, 1]);
  });

  it('chapter 4: all right at low, worse at high', () => {
    const [low, high] = sweep(
      ofKind('distractor').map(q => q.id),
      ['low', 'high'],
    );
    expect(low.right).toBe(low.of);
    expect(high.right).toBeLessThan(low.right);
  });

  it('chapter 5: the lookup thinks far less than the delivery date at high', () => {
    const [easy, hard] = HINT_PAIR.map(q => run(q, 'high').thinkingTokens);
    expect(easy).toBeLessThan(0.8 * hard);
  });
});
