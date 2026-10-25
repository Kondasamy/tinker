// Live generation (KTD9): Larkspur mini writes support replies with Transformers' seeded sampler, and answers the rare
// prompts greedily, graded by Evals' key-fact rule. Nothing generates at import; the kit passes a loaded model.
import { decode } from '../lm/bpe';
import type { Model } from '../lm/model';
import { sample } from '../transformers/sample';
import { generate } from '../fine-tuning/engine';
import { keyFactOf } from '../evals/graders';
import { RUNS } from './runs';
import { productIn, sieve } from './sieve';

/** The temperatures the chapters and the grid use. */
export const TEMPS = [0.7, 1, 1.3] as const;
export type Temp = (typeof TEMPS)[number];
/** Replies written per batch, and pieces per reply. */
export const BATCH = 20;
export const REPLY = 6;
/** Batch i is drawn with seed i + 1, so the same temperature always writes the same batch. */
export const seedOf = (i: number) => i + 1;

/** One sampled reply, as ids (temperature t, top-p 1: train_synth.py's setting). */
export const writeOne = (model: Model, prompt: string, t: number, i: number) =>
  sample(model, prompt, t, 1, seedOf(i), REPLY).picks.map(p => p.id);
/** A whole batch at once (tests and the dev page; the kit writes a reply per frame). */
export const writeBatch = (model: Model, prompt: string, t: number, n = BATCH) =>
  Array.from({ length: n }, (_, i) => writeOne(model, prompt, t, i));

/** A reply as text, cut where the answer ends. */
export const replyText = (ids: number[]) => decode(ids).split('\n\n')[0].trim();
/** Replies that copy, word for word or mostly, one written before: what dedupe drops. */
export const copies = (batch: number[][]) => sieve(batch, 'dedupe').filter(v => v !== 'kept').length;
/** Replies that name one of Larkspur's products: on the question's topic. */
export const onTopic = (batch: number[][]) => batch.filter(r => productIn(r)).length;

export const RARE = RUNS.rarePrompts;
/** Whether a reply to rare prompt i holds its key fact (Evals' key-fact rule). */
export const gradeIds = (ids: number[], i: number) => keyFactOf({ answer: '', facts: RARE[i].facts }, decode(ids));
/** The teacher's answer to rare prompt i: greedy, train_synth.py's reply length, and whether it holds the key fact. */
export function teacher(model: Model, i: number) {
  const ids = generate(model, RARE[i].ids, RUNS.replyTokens);
  return { ids, text: replyText(ids), ok: gradeIds(ids, i) };
}
/** The fact a rare prompt's answer must hold, in words. */
export const factOf = (i: number) => Object.values(RARE[i].facts)[0][0];
