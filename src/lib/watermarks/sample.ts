// The marked writer (KTD3): Transformers' seeded sampler at temperature 1, with δ added to the green logits first.
// At δ 0 it is Transformers' sample() token for token. forward() reads only the last 32 tokens.
import { encode } from '../lm/bpe';
import { forward, softmax, type Model } from '../lm/model';
import { distribution, mulberry32, nucleus } from '../transformers/sample';
import { greenList, KEY } from './greenlist';

/** Next-token logits for a token history: Larkspur mini, or any stand-in writer. */
export type Writer = (ids: number[]) => ArrayLike<number>;

export const larkspur =
  (model: Model): Writer =>
  ids =>
    forward(model, ids).logits.at(-1)!;

export interface Mark {
  delta: number;
  gamma: number;
  key?: number;
}

/** δ added to every green logit after the previous token. */
export function nudge(logits: ArrayLike<number>, prev: number, { delta, gamma, key = KEY }: Mark): Float64Array {
  const green = greenList(prev, gamma, key);
  return Float64Array.from(logits, (x, id) => x + delta * green[id]);
}

/** Continues `prompt` for `steps` tokens with one seeded stream; returns the reply's token ids. */
export function write(writer: Writer, prompt: string, mark: Mark, seed: number, steps = 64): number[] {
  const rand = mulberry32(seed),
    ids = encode(prompt),
    start = ids.length;
  for (let i = 0; i < steps; i++) {
    const d = distribution(nudge(writer(ids), ids.at(-1)!, mark), 1, 1);
    let r = rand(),
      id = 0;
    for (const k of nucleus(d, 1).filter(k => d[k] > 0)) {
      id = k;
      if ((r -= d[k]) < 0) break;
    }
    ids.push(id);
  }
  return ids.slice(start);
}

/** Mean log-likelihood per token of `reply` after `prompt` under the unmarked writer: how natural it reads. */
export function logLikelihood(writer: Writer, prompt: string, reply: number[]): number {
  const ids = encode(prompt);
  let sum = 0;
  for (const id of reply) {
    sum += Math.log(softmax(writer(ids))[id]);
    ids.push(id);
  }
  return sum / reply.length;
}

/** The writer's six next-best tokens after `ids`, best first, leaving out `id` (the one already there). */
export function nextBest(writer: Writer, ids: number[], id: number, n = 6): number[] {
  return nucleus(softmax(writer(ids)), 1)
    .filter(k => k !== id)
    .slice(0, n);
}

/** The reader's swap path: every other reply token, from the second, becomes the writer's next-best choice there. */
export function swapHalf(writer: Writer, prompt: string, reply: number[]): number[] {
  const ids = encode(prompt),
    start = ids.length;
  reply.forEach((id, i) => ids.push(i % 2 ? nextBest(writer, ids, id, 1)[0] : id));
  return ids.slice(start);
}
