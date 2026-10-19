import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { completed, markDone, loadChapter, saveChapter, navMark } from '../../src/lib/progress';

const CH = [
  { id: 'one', unlocks: ['docs'] },
  { id: 'two', unlocks: ['retriever', 'llm'] },
  { id: 'three', unlocks: ['reranker'] },
  { id: 'four', unlocks: [] },
];

// Persists across "reloads": progress.ts holds no in-memory state, so re-reading the store is a reload.
function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
const throwing = new Proxy({}, { get() { throw new Error('SecurityError'); } });

afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

describe('progress with storage', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = memoryStorage(); });

  it('survives reload', () => {
    markDone('one');
    saveChapter('two', { k: 4 });
    expect(completed()).toEqual(['one']);
    expect(loadChapter('two')).toEqual({ k: 4 });
  });

  it('marks chapters done, current, skipped or todo', () => {
    markDone('one');
    const marks = CH.map(c => navMark(CH, c.id, 'three', completed()));
    expect(marks).toEqual(['done', 'skipped', 'current', 'todo']);
  });

  it('ignores a corrupt entry', () => {
    localStorage.setItem('rag-progress-v1', '{nope');
    expect(completed()).toEqual([]);
  });
});

describe('progress without storage', () => {
  it('works when localStorage is missing', () => {
    expect(() => markDone('one')).not.toThrow();
    expect(completed()).toEqual([]);
  });

  it('works when localStorage throws, and saves nothing', () => {
    (globalThis as { localStorage?: unknown }).localStorage = throwing;
    expect(() => { markDone('one'); saveChapter('two', { k: 1 }); }).not.toThrow();
    expect(completed()).toEqual([]);
    expect(loadChapter('two')).toBeUndefined();
  });
});
