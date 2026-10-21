// Tokens chapters 6 and 7: the nearest-piece puzzle accepts every piece tied at the top, and the workbench counts the
// prompt it shows, for every mix of parts.
import { beforeAll, describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { BUDGETS, PARTS, PROMPTS, REQUIRED, fit, full, fullPrompts, promptOf } from '../../src/lib/tokens/workbench';
import { MAP_FILE, candidates, closest, queryIndexOf, queryVector, questionOf, type Candidate } from '../../src/lib/tokens/neighbours';
import { openIndex, type Config, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { STEPS as CH6, setUp } from '../../src/content/tokens/06-meaning-by-neighbours';
import { STEPS as CH7 } from '../../src/content/tokens/07-workbench';

const OPTIONAL = PARTS.filter((p) => !p.required).map((p) => p.id);

describe('chapter 6: which piece is closest', () => {
  let index: RagIndex, cfg: Config;
  beforeAll(async () => { index = await openIndex(diskLoader); cfg = await index.load(MAP_FILE); });

  const puzzle = CH6.find((s) => s.id === 'closest')!;
  const state = (pick: number | null) => ({ p1: 0, pick, tried: [], quiz: null });

  it('accepts every piece tied at the highest cosine and rejects the rest', () => {
    const cs: Candidate[] = [{ id: 3, score: 0.5, shared: 1 }, { id: 7, score: 0.8, shared: 0 }, { id: 9, score: 0.8, shared: 4 }, { id: 12, score: 0.79, shared: 2 }];
    expect(closest(cs)).toEqual([7, 9]);
    setUp(cs);
    for (const c of cs) expect(puzzle.predicate(state(c.id)), `${c.id}`).toBe(c.score === 0.8);
    expect(puzzle.predicate(state(null))).toBe(false);
    expect(puzzle.predicate(puzzle.solution!(state(3)))).toBe(true);
  });

  it('on RAG’s vectors: four pieces, the nearest by meaning and the wordiest, and only the top ones pass', () => {
    const q = questionOf('k2-volume-price');
    const cs = candidates(cfg, queryVector(index, queryIndexOf(index, q.id)), q.query);
    expect(cs).toHaveLength(4);
    expect(new Set(cs.map((c) => c.id)).size).toBe(4);
    const top = Math.max(...cs.map((c) => c.score));
    setUp(cs);
    for (const c of cs) expect(puzzle.predicate(state(c.id)), `${c.id}`).toBe(c.score === top);
    // the lesson: the piece sharing the most words is not the closest
    const wordiest = cs.reduce((a, c) => (c.shared > a.shared ? c : a));
    expect(closest(cs)).not.toContain(wordiest.id);
  });
});

describe('chapter 7: the workbench', () => {
  it('every mix of optional parts counts exactly the assembled text', () => {
    expect(PROMPTS).toHaveLength(2 ** OPTIONAL.length);
    for (const on of PROMPTS) {
      const text = PARTS.filter((p) => on.includes(p.id)).map((p) => p.text).join('\n\n');
      expect(promptOf(on)).toBe(text);
      for (const b of BUDGETS) expect(fit(on, b).tokens, on.join(',')).toBe(encode(text).length);
    }
  });

  it('a prompt is done when it fits, keeps the needed parts and has no room for another', () => {
    for (const b of BUDGETS) {
      const done = fullPrompts(b);
      expect(done.length, `${b}`).toBeGreaterThan(0);
      for (const on of done) {
        expect(fit(on, b).ok).toBe(true);
        for (const id of OPTIONAL.filter((x) => !on.includes(x))) expect(fit([...on, id], b).fits).toBe(false);
      }
    }
    // the copy says only the needed parts fit the lowest budget, and more than one mix fits the highest
    expect(fullPrompts(BUDGETS[0])).toEqual([REQUIRED]);
    expect(fullPrompts(BUDGETS[BUDGETS.length - 1]).length).toBeGreaterThan(1);
    expect(full(PARTS.map((p) => p.id), 10_000)).toBe(true);
  });

  it('each puzzle starts broken and Show me solves it', () => {
    const s = { p1: 0, on: [] as string[], budget: BUDGETS[0], quiz: null };
    for (const id of ['trim', 'raise']) {
      const step = CH7.find((x) => x.id === id)!;
      const start = step.setup!(s);
      expect(step.predicate(start), id).toBe(false);
      expect(step.predicate(step.solution!(start)), id).toBe(true);
    }
  });
});
