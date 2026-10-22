// Reasoning's recorded answers (KTD12): every question × effort a chapter or the workbench can reach has an answer with
// its one-line note, every recorded answer is reachable, and the recording stays within its budget of 120.
import { describe, expect, it } from 'vitest';
import { DOMAINS, WORKBENCH_DOMAINS, combos, answer, RECORDED } from '../../src/lib/reasoning/engine';

describe('reasoning recordings coverage (R3, KTD12)', () => {
  it.each(Object.keys(DOMAINS))('%s: every question × effort has a recorded answer', id => {
    for (const [q, e] of combos(DOMAINS[id])) expect(() => answer(q, e), `${id} ${q} ${e}`).not.toThrow();
  });

  it('the workbench: every question × effort', () => {
    for (const [q, e] of combos(WORKBENCH_DOMAINS)) expect(() => answer(q, e), `${q} ${e}`).not.toThrow();
  });

  it('every recorded answer is reachable from a chapter or the workbench', () => {
    const reached = new Set(
      [...Object.values(DOMAINS), WORKBENCH_DOMAINS].flatMap(d => combos(d).map(([q, e]) => `${q}|${e}`)),
    );
    expect(RECORDED.filter(k => !reached.has(k))).toEqual([]);
  });

  it('every answer carries a one-line note, and none = no thinking', () => {
    for (const k of RECORDED) {
      const [q, e] = k.split('|');
      const a = answer(q, e as never);
      expect(a.note.trim(), k).not.toBe('');
      expect(a.note.includes('\n'), k).toBe(false);
      expect(a.answer.trim(), k).not.toBe('');
      if (e === 'none') expect(a.thinking, k).toBe('');
    }
  });

  it('stays within the budget of 120 answers', () => {
    expect(RECORDED.length).toBeLessThanOrEqual(120);
  });
});
