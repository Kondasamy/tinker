// Larkspur mini's reply at any bit width (KTD4): Inference's quantiser rounds every weight matrix per row, then
// forward() picks the most likely token each time (greedy) until a new line or MAX tokens. The pinned prompt and the
// replies at each width live in data/on-device/pinned.json and are re-derived by a test.
import { decode, encode } from '../lm/bpe';
import { forward, type Model } from '../lm/model';
import { quantize } from '../inference/quantize';
import pinned from '../../../data/on-device/pinned.json' with { type: 'json' };

export const MAX = 8;
export const PROMPT = pinned.replies.prompt;

/** The greedy reply's token ids, the model rounded to `bits`. */
export function reply(m: Model, bits: number, prompt = PROMPT): number[] {
  const q = quantize(m, bits),
    ids = encode(prompt),
    out: number[] = [];
  while (out.length < MAX) {
    const l = forward(q, ids.slice(-m.config.ctx)).logits.at(-1)!;
    let best = 0;
    for (let k = 1; k < l.length; k++) if (l[k] > l[best]) best = k;
    if (decode([best]).includes('\n')) break;
    ids.push(best);
    out.push(best);
  }
  return out;
}

export interface Pinned {
  bits: number;
  ids: number[];
  text: string;
}
/** The pinned replies, one per bit width. */
export const REPLIES: Pinned[] = pinned.replies.at;
export const replyAt = (bits: number) => REPLIES.find(r => r.bits === bits)!;
