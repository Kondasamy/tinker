// Recall questions and quiz feedback (KTD6, KTD7). Pure, so the unit tests run it without a DOM.

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
