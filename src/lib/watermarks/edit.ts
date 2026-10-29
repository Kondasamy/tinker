// Rewording (KTD3, chapter 5): the reader swaps one reply token for one of the writer's six next-best there, and the
// checker re-reads the edited text (check() scores encode(decode(ids))). "Reword all" swaps every token, in order,
// for the writer's best other choice after the reworded text so far: a paraphrase pinned in pinned.json.
import { encode } from '../lm/bpe';
import { check, LINE } from './detect';
import { isGreen } from './greenlist';
import { nextBest, type Writer } from './sample';

/** The six tokens the writer would put at position `i` instead, given the (possibly edited) reply before it. */
export const choicesAt = (writer: Writer, prompt: string, reply: number[], i: number) =>
  nextBest(writer, [...encode(prompt), ...reply.slice(0, i)], reply[i]);

/** The reply with token `i` replaced. */
export const swap = (reply: number[], i: number, id: number) => reply.map((t, j) => (j === i ? id : t));

/** Every token replaced by the writer's best other choice there, left to right. */
export function rewordAll(writer: Writer, prompt: string, reply: number[]): number[] {
  let out = reply;
  for (let i = 0; i < reply.length; i++) out = swap(out, i, choicesAt(writer, prompt, out, i)[0]);
  return out;
}

/**
 * The fewest swaps, left to right, that wash the mark out: each green token becomes its first red choice until the
 * checker drops below the line. Run in tests to pin chapter 5's demonstration and its "Show me" (never at import).
 */
export function washOut(writer: Writer, prompt: string, reply: number[], gamma: number): [number, number][] {
  const swaps: [number, number][] = [],
    p = encode(prompt).at(-1)!;
  let out = reply;
  for (let i = 0; i < reply.length && (check(out, gamma).z ?? 0) >= LINE; i++) {
    const prev = i ? out[i - 1] : p;
    if (!isGreen(prev, out[i], gamma)) continue;
    const red = choicesAt(writer, prompt, out, i).find(id => !isGreen(prev, id, gamma));
    if (red === undefined) continue;
    swaps.push([i, red]);
    out = swap(out, i, red);
  }
  return swaps;
}

/** Every `k`th token (from the `k`th) replaced by the writer's best other choice: the workbench's edit. */
export function swapEvery(writer: Writer, prompt: string, reply: number[], k: number): number[] {
  let out = reply;
  for (let i = k - 1; i < reply.length; i += k) out = swap(out, i, choicesAt(writer, prompt, out, i)[0]);
  return out;
}
