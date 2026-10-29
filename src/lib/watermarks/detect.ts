// The checker (KTD3): counts green tokens using only the key, no model. It always re-reads the text
// (encode(decode(ids))), the tokens a reader's copy gives, and counts each distinct (previous, token) pair once.
import { decode, encode } from '../lm/bpe';
import { isGreen, KEY } from './greenlist';

/** Below this many scored pairs the checker won't say. */
export const MIN_PAIRS = 16;
/** At or above this z the text is called marked. */
export const LINE = 4;

export interface Check {
  /** Distinct (previous, token) pairs scored. */
  pairs: number;
  green: number;
  /** null when too short to say. */
  z: number | null;
  verdict: 'marked' | 'unsure' | 'too short to say';
}

/** z-score of the green count against chance (γ), over the distinct pairs in `ids` as given. */
export function score(ids: number[], gamma: number, key = KEY): Check {
  const seen = new Set<number>();
  let green = 0;
  for (let i = 1; i < ids.length; i++) {
    const pair = ids[i - 1] * 65536 + ids[i];
    if (seen.has(pair)) continue;
    seen.add(pair);
    if (isGreen(ids[i - 1], ids[i], gamma, key)) green++;
  }
  const pairs = seen.size;
  if (pairs < MIN_PAIRS) return { pairs, green, z: null, verdict: 'too short to say' };
  const z = (green - gamma * pairs) / Math.sqrt(pairs * gamma * (1 - gamma));
  return { pairs, green, z, verdict: z >= LINE ? 'marked' : 'unsure' };
}

/** Checks text, as a reader would paste it. */
export const checkText = (text: string, gamma: number, key = KEY) => score(encode(text), gamma, key);

/** Checks a reply's ids the only way the checker can: through its text. */
export const check = (ids: number[], gamma: number, key = KEY) => checkText(decode(ids), gamma, key);
