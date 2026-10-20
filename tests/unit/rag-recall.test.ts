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

  // index range, why per option, unique ids and options, one pin first: the registry checks every live module (registry.test.ts)
  it('every why line says something', () => {
    for (const i of RECALL) for (const w of i.why) expect(w.trim(), i.id).not.toBe('');
  });

  it('numbers come from the data, never undefined or NaN', () => {
    for (const i of RECALL) expect(`${i.question} ${i.options.join(' ')}`, i.id).not.toMatch(/undefined|NaN|Infinity/);
  });
});
