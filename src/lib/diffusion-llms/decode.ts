// Diffusion LMs' decoder (KTD11): Larkspur's toy masked model fills a reply of `length` [MASK] slots after a prompt.
// Each pass reads the whole window both ways, guesses every slot still masked, and stamps k of them: the surest
// (confidence remasking, ties to the earlier slot) or k drawn with mulberry32(seed) (random remasking). Stamped slots
// are never masked again, and [MASK] is never a token it writes. This is train_mlm.py's decode(), pass for pass, so the
// pinned replies in data/diffusion-llms/prompts.json come out again (diffusion-llms-decode.test.ts).
// Larkspur mini's left-to-right greedy pass is the baseline: one pass per token (Inference's greedy).
import PINNED from '../../../data/diffusion-llms/prompts.json' with { type: 'json' };
import { pieceText } from '../lm/bpe';
import { forward, softmax, type Model } from '../lm/model';
import { greedy } from '../inference/speculate';
import { mulberry32 } from '../transformers/sample';

/** The [MASK] token: one more than the site's 768. */
export const MASK: number = PINNED.mask;
/** A pinned reply's length: 16 slots after a 16-token phrase, the 32-token window. */
export const L: number = PINNED.length;
/** Tokens stamped a pass (k). */
export const KS = [1, 2, 4, 8, 16] as const;
export type K = (typeof KS)[number];
export const RULES = ['confidence', 'random'] as const;
export type Rule = (typeof RULES)[number];

/** One slot's best guess on a pass: its token and the probability the model gave it. */
export interface Guess {
  tok: number;
  p: number;
}
/** One pass: the guess at every reply slot still masked before it (null where already stamped), and the slots it
 * stamped, in the order picked. */
export interface Pass {
  guesses: (Guess | null)[];
  stamped: number[];
}
/** A fill under way or done. `reply[i]` is MASK until slot i is stamped. */
export interface Fill {
  prompt: number[];
  k: number;
  rule: Rule;
  seed: number;
  reply: number[];
  /** the probability each slot was stamped at (0 while masked) */
  probs: number[];
  /** the pass (0-based) each slot was stamped on (-1 while masked) */
  at: number[];
  passes: Pass[];
}
/** Each fill's random draws (kept off the fill, so a fill is plain data a page can serialise). */
const RANDS = new WeakMap<Fill, () => number>();

/** Passes a fill of `length` slots takes at k a pass. */
export const passesFor = (k: number, length = L) => Math.ceil(length / k);

export function startFill(prompt: number[], k: number, rule: Rule, seed: number, length = L): Fill {
  const f: Fill = {
    prompt,
    k,
    rule,
    seed,
    reply: Array(length).fill(MASK),
    probs: Array(length).fill(0),
    at: Array(length).fill(-1),
    passes: [],
  };
  RANDS.set(f, mulberry32(seed));
  return f;
}
export const filled = (f: Fill) => !f.reply.includes(MASK);

/** One pass: read the window both ways, guess every masked slot, stamp k. Returns the pass (also kept on the fill). */
export function passOnce(model: Model, f: Fill): Pass {
  const P = f.prompt.length,
    logits = forward(model, [...f.prompt, ...f.reply], { bidirectional: true }).logits;
  const guesses = f.reply.map((t, i): Guess | null => {
    if (t !== MASK) return null;
    const l = Float64Array.from(logits[P + i]);
    l[MASK] = -Infinity;
    const p = softmax(l);
    let tok = 0;
    for (let j = 1; j < p.length; j++) if (p[j] > p[tok]) tok = j;
    return { tok, p: p[tok] };
  });
  const rand = RANDS.get(f)!,
    left = guesses.flatMap((g, i) => (g ? [i] : []));
  const stamped =
    f.rule === 'confidence'
      ? [...left].sort((a, b) => guesses[b]!.p - guesses[a]!.p || a - b).slice(0, f.k)
      : Array.from({ length: Math.min(f.k, left.length) }, () => left.splice(Math.floor(rand() * left.length), 1)[0]);
  for (const i of stamped) {
    f.reply[i] = guesses[i]!.tok;
    f.probs[i] = guesses[i]!.p;
    f.at[i] = f.passes.length;
  }
  const pass = { guesses, stamped };
  f.passes.push(pass);
  return pass;
}

/** A whole fill at once. */
export function decode(model: Model, prompt: number[], k: number, rule: Rule, seed: number, length = L): Fill {
  const f = startFill(prompt, k, rule, seed, length);
  while (!filled(f)) passOnce(model, f);
  return f;
}

/** The careful fill: one slot a pass, the surest first. The slowest way this toy writes, and the one every other
 * setting is compared with. */
export const careful = (model: Model, prompt: number[], seed: number, length = L) =>
  decode(model, prompt, 1, 'confidence', seed, length);

/** Larkspur mini, left to right: one pass per token (the baseline). */
export const typewriter = (mini: Model, prompt: number[], n = L) => greedy(mini, prompt, n);

/** How many of a reply's tokens equal the careful fill's, slot for slot. */
export const agreeing = (reply: number[], ref: number[]) => reply.filter((t, i) => t === ref[i]).length;
/** How many tokens repeat the one before (a stutter: "the the the"). */
export const repeating = (reply: number[]) => reply.filter((t, i) => i > 0 && t === reply[i - 1]).length;

/** A token as the reader sees it: newlines as ↵, a missing piece as ?. MASK is a blank. */
export function show(id: number): string {
  if (id === MASK) return '▢';
  const t = pieceText(id);
  if (t === null) return '?';
  return t.trim() === '' && !t.includes('\n') ? '␣'.repeat(t.length) : t.replace(/\n/g, '↵');
}
/** Tokens as one line of text (MASK as ▢). */
export const text = (ids: number[]) => ids.map(show).join('');
export const pct = (p: number) => `${Math.round(p * 100)}%`;
