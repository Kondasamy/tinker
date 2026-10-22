// Transformers' sampler (KTD10): temperature and top-p over Larkspur mini's live logits, drawn with a
// fixed PRNG so a seed always gives the same continuation (and e2e is deterministic).
import { decode, encode } from '../lm/bpe';
import { forward, softmax, type Model } from '../lm/model';

/** The chapter controls' domains: native range inputs step over these lists (KTD11). */
export const TEMPERATURES = [0, 0.25, 0.5, 0.75, 1, 1.5, 2];
export const TOP_PS = [0.1, 0.25, 0.5, 0.75, 0.9, 1];

/** mulberry32: a small fixed 32-bit PRNG, uniform in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The smallest set of ids, most likely first, whose mass is at least topP (Holtzman et al.'s V(p)). */
export function nucleus(probs: ArrayLike<number>, topP: number): number[] {
  const order = Array.from(probs, (p, id) => ({ id, p })).sort((a, b) => b.p - a.p || a.id - b.id);
  // top-p 1 keeps everything: the float running sum can reach 1 before the tail is added
  if (topP >= 1) return order.map(o => o.id);
  const kept: number[] = [];
  let mass = 0;
  for (const { id, p } of order) {
    kept.push(id);
    mass += p;
    if (mass >= topP) break;
  }
  return kept;
}

/** Next-token probabilities after temperature (0 = always the argmax) and top-p, renormalised. */
export function distribution(logits: ArrayLike<number>, temperature: number, topP: number): Float64Array {
  const out = new Float64Array(logits.length);
  if (temperature === 0) {
    let best = 0;
    for (let i = 1; i < logits.length; i++) if (logits[i] > logits[best]) best = i;
    out[best] = 1;
    return out;
  }
  const probs = softmax(Array.from(logits, x => x / temperature));
  const kept = nucleus(probs, topP);
  const mass = kept.reduce((s, id) => s + probs[id], 0);
  for (const id of kept) out[id] = probs[id] / mass;
  return out;
}

/** Entropy in bits: how spread the distribution is. */
export function entropy(probs: ArrayLike<number>): number {
  let h = 0;
  for (let i = 0; i < probs.length; i++) if (probs[i] > 0) h -= probs[i] * Math.log2(probs[i]);
  return h;
}

/** Continues the prompt `steps` tokens, each drawn from distribution() with one seeded stream. */
export function sample(model: Model, prompt: string, temperature: number, topP: number, seed: number, steps = 8) {
  const rand = mulberry32(seed),
    ids = encode(prompt),
    picks: { id: number; p: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const d = distribution(forward(model, ids).logits.at(-1)!, temperature, topP);
    let r = rand(),
      id = 0;
    // Only kept tokens, so rounding at the end of the walk can never land on a dropped one.
    for (const k of nucleus(d, 1).filter(k => d[k] > 0)) {
      id = k;
      if ((r -= d[k]) < 0) break;
    }
    picks.push({ id, p: d[id] });
    ids.push(id);
  }
  return { picks, text: decode(picks.map(x => x.id)) };
}
