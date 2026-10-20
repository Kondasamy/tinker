import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { feedback, UNSURE, recapPool, shuffled, resumeAttempt, warmupItems, WARMUP_GAP, type RecallItem } from '../../src/lib/recall';
import { recordRecall, recallResults, saveChapter, markDone, completed, loadAttempt, saveAttempt } from '../../src/lib/progress';

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

// U4: which items a recap asks, in what order, and when a warm-up is due
const item = (id: string, chapter: string, pin?: boolean): RecallItem =>
  ({ id, chapter, question: `${id}?`, options: ['x', 'y'], correct: 0, why: ['right', 'wrong'], ...(pin ? { pin } : {}) });
const BANK = [item('a1', 'c1'), item('a2', 'c1'), item('b1', 'c2'), item('b2', 'c2'), item('c3', 'c3'), item('d1', 'c4')];
const H = 3600_000, NOW = 100 * 24 * H;

describe('recap selection', () => {
  it('asks only items from finished chapters', () => {
    expect(recapPool(BANK, ['c1', 'c2']).map(i => i.id)).toEqual(['a1', 'a2', 'b1', 'b2']);
    expect(recapPool(BANK, [])).toEqual([]);
  });

  it('a seeded shuffle is stable for its seed, and a permutation', () => {
    const ids = BANK.map(i => i.id);
    expect(shuffled(ids, 42)).toEqual(shuffled(ids, 42));
    expect([...shuffled(ids, 42)].sort()).toEqual([...ids].sort());
    expect(ids.some((_, s) => shuffled(ids, s + 1).join() !== shuffled(ids, 42).join())).toBe(true);
    expect(ids).toEqual(['a1', 'a2', 'b1', 'b2', 'c3', 'd1']);   // input untouched
  });

  it('resumes a saved attempt as it was', () => {
    const saved = { seed: 7, ids: ['b1', 'a1'], pos: 1 };
    expect(resumeAttempt(saved, BANK, ['c1', 'c2'], 99)).toBe(saved);
  });

  it('discards a saved attempt whose items left the bank, and reseeds', () => {
    const fresh = resumeAttempt({ seed: 7, ids: ['gone', 'a1'], pos: 1 }, BANK, ['c1'], 99);
    expect(fresh).toEqual({ seed: 99, ids: shuffled(['a1', 'a2'], 99), pos: 0 });
    expect(resumeAttempt(undefined, BANK, ['c1'], 99)).toEqual(fresh);
    expect(resumeAttempt({ seed: 7, ids: [], pos: 0 }, BANK, ['c1'], 99)).toEqual(fresh);
  });

  it('the attempt lives in the module’s progress record, and old records have none', () => {
    (globalThis as { localStorage?: unknown }).localStorage = memoryStorage();
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['c1'], saved: {} }));
    expect(loadAttempt('rag')).toBeUndefined();
    saveAttempt('rag', { seed: 3, ids: ['a1'], pos: 0 });
    expect(loadAttempt('rag')).toEqual({ seed: 3, ids: ['a1'], pos: 0 });
    expect(completed('rag')).toEqual(['c1']);
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: [], saved: {}, recap: { ids: 'junk' } }));
    expect(loadAttempt('rag')).toBeUndefined();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

describe('warm-up', () => {
  const ids = (xs: RecallItem[]) => xs.map(i => i.id);

  it('is due for a chapter finished 21 hours ago, not 2 hours ago', () => {
    expect(ids(warmupItems(BANK, { c3: NOW - 21 * H }, {}, NOW))).toEqual(['c3']);
    expect(warmupItems(BANK, { c3: NOW - 2 * H }, {}, NOW)).toEqual([]);
    expect(WARMUP_GAP).toBe(20 * H);
  });

  it('a first visit, or a chapter with no finish time, has none', () => {
    expect(warmupItems(BANK, {}, {}, NOW)).toEqual([]);
  });

  it('asks at most three, missed items first', () => {
    const at = { c1: NOW - 30 * H, c2: NOW - 30 * H }, old = NOW - 25 * H;
    const got = ids(warmupItems(BANK, at, { b2: { right: false, unsure: false, at: old }, a1: { right: true, unsure: false, at: old } }, NOW));
    expect(got).toHaveLength(3);
    expect(got[0]).toBe('b2');
    expect(got).not.toContain('a1');   // right last time: it waits behind the unseen ones
  });

  it('one per return: any answer in the last 20 hours (a warm-up or the recap) means none', () => {
    const at = { c1: NOW - 30 * H };
    expect(warmupItems(BANK, at, { a1: { right: false, unsure: false, at: NOW - H } }, NOW)).toEqual([]);
    expect(warmupItems(BANK, at, { b1: { right: true, unsure: false, at: NOW - 19 * H } }, NOW)).toEqual([]);
    expect(ids(warmupItems(BANK, at, { a1: { right: false, unsure: false, at: NOW - 21 * H } }, NOW))).toEqual(['a1', 'a2']);
  });

  it('a pinned item is always included while unmastered', () => {
    const bank = [...BANK, item('p', 'c2', true)];
    const at = { c1: NOW - 30 * H, c2: NOW - 2 * H }, old = NOW - 25 * H;   // its chapter is finished, even if not yet due
    expect(ids(warmupItems(bank, at, { p: { right: false, unsure: false, at: old } }, NOW))[0]).toBe('p');
    expect(ids(warmupItems(bank, at, { p: { right: false, unsure: true, at: old } }, NOW))[0]).toBe('p');
    expect(ids(warmupItems(bank, at, {}, NOW))[0]).toBe('p');
    expect(ids(warmupItems(bank, at, { p: { right: true, unsure: false, at: old } }, NOW))).not.toContain('p');
    // a pin alone never makes a warm-up due
    expect(warmupItems([item('p', 'c2', true)], at, {}, NOW)).toEqual([]);
  });
});
