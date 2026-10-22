// Chapter 5 puzzles against the real index: each preset is broken, its one lever fixes it, and the two
// quality meters (recall@k, verdict) move independently in the scenarios the narration claims.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { createSession, run } from '../../src/lib/rag/engine';
import { resolveConfig } from '../../src/lib/rag/lattice';
import {
  initialCanvas,
  outcome,
  unlockedThrough,
  type CanvasQuestion,
  type Knobs,
} from '../../src/components/canvas/state';
import { blendParts, recallOf } from '../../src/components/panels/logic';
import { FIXES, PRESETS } from '../../src/content/rag/05-accuracy';

const questions: CanvasQuestion[] = ['ch4', 'ch5'].flatMap(c =>
  JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')),
);
const Q = (id: string) => questions.find(q => q.id === id)!;

let index: RagIndex;
beforeAll(async () => {
  index = await openIndex(diskLoader);
});

/** Verdict and recall for a chapter-5 canvas (every block through chapter 5 on the track). */
async function at(q: string, knobs: Knobs) {
  await index.load(resolveConfig(knobs).file);
  const o = outcome(index, createSession(index), initialCanvas(unlockedThrough('05-accuracy'), knobs), Q(q));
  return { verdict: o.answer!.verdict, recall: recallOf(o.record!).value };
}
const preset = (p: keyof typeof PRESETS, more: Partial<Knobs> = {}) =>
  at(PRESETS[p].q, { ...PRESETS[p].knobs, ...more });

describe('chapter 5 puzzles', () => {
  for (const p of Object.keys(FIXES) as (keyof typeof FIXES)[]) {
    it(`${p}: broken by default, fixed by its lever`, async () => {
      expect((await preset(p)).verdict).not.toBe('correct');
      expect((await preset(p, FIXES[p])).verdict).toBe('correct');
    });
  }

  it('stale policy: only the year filter fixes it at top-k 5', async () => {
    expect((await preset('filter', { rerank: true })).verdict).toBe('wrong');
    expect((await preset('filter', { order: 'edges' })).verdict).toBe('wrong');
  });

  it('top-k: fails at 1, solves at 5 and 6, buried again from 7', async () => {
    const v = await Promise.all([1, 4, 5, 6, 7, 10].map(topK => preset('topK', { topK })));
    expect(v.map(x => x.verdict)).toEqual(['notfound', 'notfound', 'correct', 'correct', 'notfound', 'notfound']);
  });

  it('hidden needle: rerank fixes it as well as best-at-both-ends order', async () => {
    expect((await preset('needle', { rerank: true })).verdict).toBe('correct');
  });

  it('distractor: any keyword weight from 20% fixes it; 10% does not', async () => {
    expect((await preset('distractor', { hybrid: 0.1 })).verdict).toBe('wrong');
    for (const hybrid of [0.2, 0.5, 1]) expect((await preset('distractor', { hybrid })).verdict).toBe('correct');
  });

  it('broken sentence: every overlap above 0% fixes it', async () => {
    for (const overlap of [10, 25, 50]) expect((await preset('overlap', { overlap })).verdict).toBe('correct');
  });

  it('mid-sentence cut: overlap does not rescue it, the sentence chunker does', async () => {
    for (const overlap of [10, 25, 50]) expect((await preset('strategy', { overlap })).verdict).not.toBe('correct');
  });

  it('vague question: nothing but the rewrite flips it', async () => {
    for (const more of [{ topK: 1 }, { topK: 10 }, { rerank: true }, { hybrid: 0.5 }, { order: 'edges' as const }])
      expect((await preset('rewrite', more)).verdict, JSON.stringify(more)).not.toBe('correct');
  });
});

describe('meters move independently', () => {
  it('recall rises with no change in the verdict (opening: top-k 3 to 5)', async () => {
    const [k3, k5] = [await preset('open'), await preset('filter')];
    expect([k3.recall, k3.verdict]).toEqual([0, 'wrong']);
    expect([k5.recall, k5.verdict]).toEqual([1, 'wrong']);
  });

  it('the verdict flips with no change in recall (hidden needle, best at both ends)', async () => {
    const [before, after] = [await preset('needle'), await preset('needle', FIXES.needle)];
    expect(before).toEqual({ recall: 1, verdict: 'notfound' });
    expect(after).toEqual({ recall: 1, verdict: 'correct' });
  });
});

describe('show the math', () => {
  it('blendParts reproduces the engine’s hybrid score for the top chunk', async () => {
    await index.load('sentence-32.bin');
    const r = run(index, index.get('sentence-32.bin')!, { question: Q('card-data-retention'), topK: 5, hybrid: 0.3 });
    const id = r.stages.hybrid.ids[0];
    const b = blendParts(r, id);
    expect(b.w).toBe(0.3);
    expect(b.blended).toBeCloseTo(r.stages.hybrid.scores[0], 5);
    expect(b.nv).toBeGreaterThanOrEqual(0);
    expect(b.nb).toBeLessThanOrEqual(1);
  });

  it('recallOf counts cut gold sentences as retrieved', () => {
    const rec = {
      recall: {
        k: 3,
        value: 0,
        gold: [
          { sentence: 'a', status: 'split', chunkIds: [1] },
          { sentence: 'b', status: 'missing', chunkIds: [] },
        ],
      },
    };
    expect(recallOf(rec as never)).toEqual({ k: 3, found: 1, total: 2, value: 0.5 });
  });
});
