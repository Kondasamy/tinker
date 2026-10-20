import { describe, it, expect } from 'vitest';
import { RECALL } from '../../src/content/rag/recall';
import { RAG_MODULE } from '../../src/content/rag/module';

describe('RAG recall bank', () => {
  const chapters = RAG_MODULE.chapters.map(c => c.id);

  it('every item belongs to a RAG chapter, and every chapter has three to five items', () => {
    for (const i of RECALL) expect(chapters, i.id).toContain(i.chapter);
    for (const c of chapters) expect(RECALL.filter(i => i.chapter === c).length, c).toBeGreaterThanOrEqual(3);
    for (const c of chapters) expect(RECALL.filter(i => i.chapter === c).length, c).toBeLessThanOrEqual(5);
  });

  it('every item has one correct option and a why line per option', () => {
    for (const i of RECALL) {
      expect(Number.isInteger(i.correct) && i.correct >= 0 && i.correct < i.options.length, i.id).toBe(true);
      expect(i.why, i.id).toHaveLength(i.options.length);
      expect(new Set(i.options).size, i.id).toBe(i.options.length);
      for (const w of i.why) expect(w.trim(), i.id).not.toBe('');
    }
  });

  it('ids are unique, and exactly one item is pinned, first in the bank', () => {
    expect(new Set(RECALL.map(i => i.id)).size).toBe(RECALL.length);
    expect(RECALL.filter(i => i.pin).map(i => i.id)).toEqual([RECALL[0].id]);
  });

  it('numbers come from the data, never undefined or NaN', () => {
    for (const i of RECALL) expect(`${i.question} ${i.options.join(' ')}`, i.id).not.toMatch(/undefined|NaN|Infinity/);
  });
});
