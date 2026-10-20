import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { feedback, UNSURE, type RecallItem } from '../../src/lib/recall';
import { recordRecall, recallResults, saveChapter, markDone, completed } from '../../src/lib/progress';

const ITEM: RecallItem = {
  id: 'rag-window', chapter: '02-why-not-stuff-it', question: 'Q?', options: ['a', 'b', 'c'], correct: 1,
  why: ['a is a myth.', 'b is right.', 'c mixes up cost and speed.'],
};
const Q = { options: ITEM.options, correct: 1, explanation: 'Because b.' };

describe('feedback for a pick', () => {
  it('a wrong pick gets that option’s why line', () => {
    expect(feedback({ ...Q, why: ITEM.why }, 2)).toEqual({ stamp: 'NOT QUITE', text: 'c mixes up cost and speed.' });
  });
  it('the right pick gets its own why line', () => {
    expect(feedback({ ...Q, why: ITEM.why }, 1)).toEqual({ stamp: 'RIGHT', text: 'b is right.' });
  });
  it('falls back to the explanation without why lines (existing quizzes)', () => {
    expect(feedback(Q, 0)).toEqual({ stamp: 'NOT QUITE', text: 'Because b.' });
    expect(feedback(Q, 1)).toEqual({ stamp: 'RIGHT', text: 'Because b.' });
    expect(feedback({ ...Q, why: ['only one'] }, 2)?.text).toBe('Because b.');
  });
  it('“not sure” reveals the answer and explanation with no stamp', () => {
    expect(feedback({ ...Q, why: ITEM.why }, UNSURE)).toEqual({ stamp: null, text: 'Because b.', answer: 'b' });
  });
  it('nothing before a pick', () => {
    expect(feedback(Q, null)).toBeNull();
  });
});

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe('recall store', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = memoryStorage(); });
  afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; vi.useRealTimers(); });

  it('is empty before anything is recorded, and for an old record', () => {
    expect(recallResults('rag')).toEqual({});
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['01-history'], saved: {} }));
    expect(recallResults('rag')).toEqual({});
  });

  it('keeps the latest result and its time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    recordRecall('rag', 'q1', { right: false, unsure: false });
    vi.setSystemTime(2000);
    recordRecall('rag', 'q1', { right: true, unsure: false });
    recordRecall('rag', 'q2', { right: false, unsure: true });
    expect(recallResults('rag')).toEqual({
      q1: { right: true, unsure: false, at: 2000 },
      q2: { right: false, unsure: true, at: 2000 },
    });
  });

  it('stores results under the module’s own key', () => {
    recordRecall('tool-calling', 'q1', { right: true, unsure: false });
    expect(recallResults('rag')).toEqual({});
    expect(JSON.parse(localStorage.getItem('tool-calling-progress-v1')!).recall.q1.right).toBe(true);
    expect(localStorage.getItem('rag-progress-v1')).toBeNull();
  });

  it('survives saving a chapter run (a Reset saves the reset run) and finishing chapters', () => {
    recordRecall('rag', 'q1', { right: true, unsure: false });
    saveChapter('rag', '01-history', { index: 0, state: {}, starts: [{}], fails: 0 });
    markDone('rag', '01-history');
    expect(recallResults('rag').q1.right).toBe(true);
    expect(completed('rag')).toEqual(['01-history']);
  });

  it('does not throw without storage', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(() => recordRecall('rag', 'q1', { right: true, unsure: false })).not.toThrow();
    expect(recallResults('rag')).toEqual({});
  });
});
