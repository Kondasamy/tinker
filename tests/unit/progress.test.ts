import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  completed,
  completedAt,
  markDone,
  loadChapter,
  saveChapter,
  lastModule,
  navMark,
} from '../../src/lib/progress';

const CH = [
  { id: 'one', unlocks: ['docs'] },
  { id: 'two', unlocks: ['retriever', 'llm'] },
  { id: 'three', unlocks: ['reranker'] },
  { id: 'four', unlocks: [] },
];

// Persists across "reloads": progress.ts holds no in-memory state, so re-reading the store is a reload.
function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const throwing = new Proxy(
  {},
  {
    get() {
      throw new Error('SecurityError');
    },
  },
);

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('progress with storage', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = memoryStorage();
  });

  it('survives reload', () => {
    markDone('rag', 'one');
    saveChapter('rag', 'two', { k: 4 });
    expect(completed('rag')).toEqual(['one']);
    expect(loadChapter('rag', 'two')).toEqual({ k: 4 });
  });

  it('marks chapters done, current, skipped or todo', () => {
    markDone('rag', 'one');
    const marks = CH.map(c => navMark(CH, c.id, 'three', completed('rag')));
    expect(marks).toEqual(['done', 'skipped', 'current', 'todo']);
  });

  it('ignores a corrupt entry', () => {
    localStorage.setItem('rag-progress-v1', '{nope');
    expect(completed('rag')).toEqual([]);
  });

  it('keeps each module under its own key, RAG under the one it always had', () => {
    markDone('rag', 'one');
    markDone('tool-calling', 'a');
    saveChapter('tool-calling', 'a', { k: 1 });
    expect(JSON.parse(localStorage.getItem('rag-progress-v1')!).done).toEqual(['one']);
    expect(JSON.parse(localStorage.getItem('tool-calling-progress-v1')!).done).toEqual(['a']);
    expect(completed('rag')).toEqual(['one']);
    expect(loadChapter('rag', 'a')).toBeUndefined();
  });

  it('reads a record saved before `at` and `recall` existed', () => {
    localStorage.setItem(
      'rag-progress-v1',
      JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: { '03-what-is-rag': { index: 3 } } }),
    );
    expect(completed('rag')).toEqual(['01-history', '02-why-not-stuff-it']);
    expect(loadChapter('rag', '03-what-is-rag')).toEqual({ index: 3 });
    expect(completedAt('rag')).toEqual({});
  });

  it('records when a chapter was first finished', () => {
    markDone('rag', 'one');
    const at = completedAt('rag').one;
    expect(at).toBeGreaterThan(0);
    markDone('rag', 'one');
    expect(completedAt('rag').one).toBe(at);
  });

  it('remembers the module saved most recently', () => {
    expect(lastModule()).toBeUndefined();
    saveChapter('rag', 'one', {});
    expect(lastModule()).toBe('rag');
    saveChapter('tool-calling', 'a', {});
    expect(lastModule()).toBe('tool-calling');
  });
});

describe('progress without storage', () => {
  it('works when localStorage is missing', () => {
    expect(() => markDone('rag', 'one')).not.toThrow();
    expect(completed('rag')).toEqual([]);
    expect(lastModule()).toBeUndefined();
  });

  it('works when localStorage throws, and saves nothing', () => {
    (globalThis as { localStorage?: unknown }).localStorage = throwing;
    expect(() => {
      markDone('rag', 'one');
      saveChapter('rag', 'two', { k: 1 });
    }).not.toThrow();
    expect(completed('rag')).toEqual([]);
    expect(completedAt('rag')).toEqual({});
    expect(loadChapter('rag', 'two')).toBeUndefined();
    expect(lastModule()).toBeUndefined();
  });
});
