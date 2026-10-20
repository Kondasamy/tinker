// Recall questions and quiz feedback (KTD6, KTD7). Pure, so the unit tests run it without a DOM.
import type { RecallResult } from './progress';

/** One question in a module's recall bank (`src/content/<module>/recall.ts`). */
export interface RecallItem {
  id: string;
  /** the chapter that teaches it */
  chapter: string;
  question: string;
  options: string[];
  correct: number;
  /** one line per option: why it is right, or the misconception behind it */
  why: string[];
  /** always in the warm-up */
  pin?: boolean;
}

/** The pick a quiz stores for "I'm not sure": not an option index, and never a miss. */
export const UNSURE = -1;

interface Question { options: string[]; correct: number; explanation: string; why?: string[] }
export interface Feedback { stamp: 'RIGHT' | 'NOT QUITE' | null; text: string; answer?: string }

/** What a pick shows: that option's `why` line (falling back to the explanation), or for "not sure" the answer, unstamped. */
export function feedback({ options, correct, explanation, why }: Question, pick: number | null): Feedback | null {
  if (pick === null) return null;
  if (pick === UNSURE) return { stamp: null, text: explanation, answer: options[correct] };
  return { stamp: pick === correct ? 'RIGHT' : 'NOT QUITE', text: why?.[pick] ?? explanation };
}

/** One recap run: its seed, the order it asks in, and how far the reader got. Saved with the module's progress (KTD7). */
export interface Attempt { seed: number; ids: string[]; pos: number }

/** Items the reader can be asked: those from chapters they finished. */
export const recapPool = (bank: RecallItem[], done: readonly string[]) => bank.filter(i => done.includes(i.chapter));

/** A Fisher-Yates shuffle driven by mulberry32, so one seed always gives one order. */
export function shuffled<T>(xs: readonly T[], seed: number): T[] {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** The saved attempt while every item in it is still in the bank; otherwise a new one from `seed`. */
export function resumeAttempt(saved: Attempt | undefined, bank: RecallItem[], done: readonly string[], seed: number): Attempt {
  if (saved && saved.ids.length && saved.ids.every(id => bank.some(i => i.id === id))) return saved;
  return { seed, ids: shuffled(recapPool(bank, done).map(i => i.id), seed), pos: 0 };
}

/** "Coming back later" (R13): a chapter must be this old, and an item this long unasked, before a warm-up asks it. */
export const WARMUP_GAP = 20 * 60 * 60 * 1000;

/**
 * The warm-up, or [] when none is due: up to `max` items from chapters finished at least WARMUP_GAP ago. One per return:
 * a reader who answered any of the module's questions in the last WARMUP_GAP (a warm-up or the recap) gets none.
 * A pinned item the reader has not got right yet always comes first; a pin alone never makes a warm-up due.
 * Chapters with no finish time (finished before times were kept) are never due.
 */
export function warmupItems(bank: RecallItem[], at: Record<string, number>, results: Record<string, RecallResult>, now: number, max = 3): RecallItem[] {
  const old = (t: number | undefined) => t !== undefined && now - t >= WARMUP_GAP;
  if (Object.values(results).some(r => !old(r.at))) return [];
  const due = bank.filter(i => old(at[i.chapter]));
  if (!due.length) return [];
  const pinned = (i: RecallItem) => !!i.pin && at[i.chapter] !== undefined && !results[i.id]?.right;
  const rank = (i: RecallItem) => {
    const r = results[i.id];
    return pinned(i) ? 0 : !r ? 3 : r.right ? 4 : r.unsure ? 2 : 1;   // missed, then not sure, then unseen, then known
  };
  const pool = [...new Set([...bank.filter(pinned), ...due])];
  // stable sort: ties keep bank order, oldest answer first
  return pool.sort((p, q) => rank(p) - rank(q) || (results[p.id]?.at ?? 0) - (results[q.id]?.at ?? 0)).slice(0, max);
}
