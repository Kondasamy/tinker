// Transformers' trace (KTD10): one forward pass of Larkspur mini read as the chapters show it, the
// pieces read, the top next tokens at every position and every attention matrix. Nothing is recorded.
import data from '../../../data/transformers/prompts.json' with { type: 'json' };
import { decode, encode } from '../lm/bpe';
import { forward, softmax, type Model } from '../lm/model';

export interface Candidate { id: number; text: string; p: number }
export interface Trace {
  /** The pieces the model read: the prompt's last ctx (32) tokens. */
  tokens: { id: number; text: string }[];
  truncated: boolean;
  /** At each position, the k likeliest next tokens, most likely first. */
  top: Candidate[][];
  /** [layer][head][query t][key s], as forward() gives it. */
  attention: number[][][][];
}

/** A chapter prompt and the next token it is shown with (in the model's top 5; the test holds that). */
export interface Prompt { id: string; text: string; expected: string }
export const PROMPTS: Prompt[] = data.prompts;
/** The head chapter 4 names, and its score measured over every document window (see wordStart). */
export const HEAD = data.head;

export function topK(probs: ArrayLike<number>, k: number): Candidate[] {
  return Array.from(probs, (p, id) => ({ id, p }))
    .sort((a, b) => b.p - a.p || a.id - b.id)
    .slice(0, k)
    .map((c) => ({ ...c, text: decode([c.id]) }));
}

export function trace(model: Model, prompt: string, k = 5): Trace {
  const out = forward(model, encode(prompt));
  return {
    tokens: out.ids.map((id) => ({ id, text: decode([id]) })),
    truncated: out.truncated,
    top: out.logits.map((lg) => topK(softmax(lg), k)),
    attention: out.attention,
  };
}

/** A piece starts a word unless it begins with a letter or digit (then it continues the word before). */
const startsWord = (id: number) => !/^[a-z0-9]/i.test(decode([id]));

/**
 * How much a head looks back to the start of the current word: the mean attention from each piece
 * that continues a word to the piece where that word began, against what spreading evenly would give
 * (1 / (t + 1)). Pieces whose word began before the window are skipped.
 */
export function wordStart(ids: number[], head: number[][]): { score: number; uniform: number; n: number } {
  let score = 0, uniform = 0, n = 0;
  for (let t = 1; t < ids.length; t++) {
    if (startsWord(ids[t])) continue;
    let w = t - 1;
    while (w > 0 && !startsWord(ids[w])) w--;
    if (!startsWord(ids[w])) continue;
    score += head[t][w]; uniform += 1 / (t + 1); n++;
  }
  return n ? { score: score / n, uniform: uniform / n, n } : { score: 0, uniform: 0, n: 0 };
}
