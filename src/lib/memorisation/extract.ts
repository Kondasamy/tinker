// Extraction (chapter 3): ask the canary model to finish a canary's prefix and read its greedy reply, live. A canary
// is extracted when the reply's first tokens are its secret, as train_canary.py scores it.
import { decode } from '../lm/bpe';
import { forward, type Model } from '../lm/model';
import { RUNS, type Canary } from './story';

const argmax = (xs: ArrayLike<number>) => {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[best]) best = i;
  return best;
};
/** The model's n likeliest next tokens, one at a time. */
export function greedy(model: Model, ids: number[], n = RUNS.replyTokens): number[] {
  const out = [...ids];
  for (let i = 0; i < n; i++) out.push(argmax(forward(model, out).logits.at(-1)!));
  return out.slice(ids.length);
}
/** A reply as text, up to its first line end. */
export const replyText = (ids: number[]) => decode(ids).split('\n')[0];
/** The bypass (chapter 6): ask for one token at a time, each time adding the last reply to the prompt. Each reply
 * is one digit, so a four-digit filter passes every one; together they are the PIN, spaced out. */
export function drip(model: Model, c: Canary, n = c.secret.length): string[] {
  const asked = [...c.prefix.ids],
    out: string[] = [];
  for (let i = 0; i < n; i++) {
    const [t] = greedy(model, asked, 1);
    asked.push(t);
    out.push(decode([t]));
  }
  return out;
}
/** What the model says after a canary's prefix, and whether it is that canary's PIN. */
export function extract(model: Model, c: Canary) {
  const reply = greedy(model, c.prefix.ids);
  return { reply, text: replyText(reply), extracted: c.secret.every((t, i) => reply[i] === t) };
}
