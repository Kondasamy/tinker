// Progress lives in localStorage only (KTD10). Every access is guarded so the site works without storage.
const KEY = 'rag-progress-v1';

interface Progress { done: string[]; saved: Record<string, unknown> }

function read(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (p && Array.isArray(p.done) && p.saved && typeof p.saved === 'object') return p;
  } catch { /* no storage, or corrupt entry: start fresh */ }
  return { done: [], saved: {} };
}

function write(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable: nothing is saved */ }
}

export const completed = (): string[] => read().done;

export function markDone(id: string) {
  const p = read();
  if (!p.done.includes(id)) write({ ...p, done: [...p.done, id] });
}

export const loadChapter = <T>(id: string): T | undefined => read().saved[id] as T | undefined;

export function saveChapter(id: string, data: unknown) {
  const p = read();
  write({ ...p, saved: { ...p.saved, [id]: data } });
}

export function clearProgress() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

interface ChapterLike { id: string; unlocks: readonly string[] }

/** Blocks unlocked by every chapter before `id`: what a jump-ahead canvas starts with. */
export function seedUnlocks(chapters: readonly ChapterLike[], id: string): string[] {
  const i = chapters.findIndex(c => c.id === id);
  return chapters.slice(0, Math.max(i, 0)).flatMap(c => c.unlocks);
}

/** Saved state wins; only a chapter with nothing saved is seeded. Never writes. */
export function restoreOrSeed<T>(chapters: readonly ChapterLike[], id: string, seed: (unlocked: string[]) => T): T {
  return loadChapter<T>(id) ?? seed(seedUnlocks(chapters, id));
}

export type NavMark = 'done' | 'current' | 'skipped' | 'todo';

export function navMark(chapters: readonly ChapterLike[], id: string, currentId: string, done: readonly string[]): NavMark {
  if (id === currentId) return 'current';
  if (done.includes(id)) return 'done';
  const i = chapters.findIndex(c => c.id === id), cur = chapters.findIndex(c => c.id === currentId);
  return i < cur ? 'skipped' : 'todo';
}
