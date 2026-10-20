// Progress lives in localStorage only (KTD10), one record per module (KTD3). Every access is guarded so the site works without storage.
// RAG's key is `rag-progress-v1`, the one it always had; fields added later are optional, so old records still read.
const key = (module: string) => `${module}-progress-v1`;
const LAST = 'tinker-last-module';

export interface RecallResult { right: boolean; unsure: boolean; at: number }
interface Progress { done: string[]; saved: Record<string, unknown>; at?: Record<string, number>; recall?: Record<string, RecallResult> }

function read(module: string): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(key(module)) ?? 'null');
    if (p && Array.isArray(p.done) && p.saved && typeof p.saved === 'object') return p;
  } catch { /* no storage, or corrupt entry: start fresh */ }
  return { done: [], saved: {} };
}

function write(module: string, p: Progress) {
  try { localStorage.setItem(key(module), JSON.stringify(p)); } catch { /* storage unavailable: nothing is saved */ }
}

export const completed = (module: string): string[] => read(module).done;

/** When each chapter was first finished (ms). Chapters finished before this was recorded are absent. */
export function completedAt(module: string): Record<string, number> {
  const at = read(module).at;
  return at && typeof at === 'object' ? at : {};
}

export function markDone(module: string, id: string) {
  const p = read(module);
  if (!p.done.includes(id)) write(module, { ...p, done: [...p.done, id], at: { ...completedAt(module), [id]: Date.now() } });
}

export const loadChapter = <T>(module: string, id: string): T | undefined => read(module).saved[id] as T | undefined;

export function saveChapter(module: string, id: string, data: unknown) {
  const p = read(module);
  write(module, { ...p, saved: { ...p.saved, [id]: data } });
  try { localStorage.setItem(LAST, module); } catch { /* storage unavailable */ }
}

/** The latest result per recall item. It sits outside chapter runs, so a chapter Reset never wipes it (KTD7). */
export function recallResults(module: string): Record<string, RecallResult> {
  const r = read(module).recall;
  return r && typeof r === 'object' ? r : {};
}

export function recordRecall(module: string, itemId: string, result: { right: boolean; unsure: boolean }) {
  const p = read(module);
  write(module, { ...p, recall: { ...recallResults(module), [itemId]: { ...result, at: Date.now() } } });
}

/** The module the reader saved a chapter in most recently. */
export function lastModule(): string | undefined {
  try { return localStorage.getItem(LAST) ?? undefined; } catch { return undefined; }
}

interface ChapterLike { id: string }

export type NavMark = 'done' | 'current' | 'skipped' | 'todo';

export function navMark(chapters: readonly ChapterLike[], id: string, currentId: string, done: readonly string[]): NavMark {
  if (id === currentId) return 'current';
  if (done.includes(id)) return 'done';
  const i = chapters.findIndex(c => c.id === id), cur = chapters.findIndex(c => c.id === currentId);
  return i < cur ? 'skipped' : 'todo';
}
