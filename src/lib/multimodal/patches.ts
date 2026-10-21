// Image tokens, computed live (KTD10): one visual token per 28 × 28 px patch, ⌈w / 28⌉ × ⌈h / 28⌉, after the image is
// scaled down to fit its tier's long-edge and token limits. The patch size and the limits are read from facts.json; the
// resize is Anthropic's published reference implementation (vision-coordinates), ported line for line.
import { fact } from './facts';

export const PATCH = Number(fact('patches').value);
export interface Tier { maxEdge: number; maxTokens: number }
const tier = (id: string): Tier => { const [maxEdge, maxTokens] = fact(id).value!.split(',').map(Number); return { maxEdge, maxTokens }; };
export const HIGH = tier('high-res-tier'), STANDARD = tier('standard-tier');
/** Larkspur's assistant runs on a current model, so the high-resolution tier. */
export const MODEL_TIER = HIGH;

export const visualTokens = (w: number, h: number) => Math.ceil(w / PATCH) * Math.ceil(h / PATCH);

/** Python's round(): halves to even, as the live API resolves ties. */
const roundEven = (v: number) => { const fl = Math.floor(v); return v - fl !== .5 ? Math.round(v) : fl % 2 === 0 ? fl : fl + 1; };

/** The size the image is scaled to before it is read: unchanged when it fits, else the largest same-shape size that does. */
export function resized(w: number, h: number, t: Tier = MODEL_TIER): [number, number] {
  const fits = (a: number, b: number) => Math.ceil(a / PATCH) * PATCH <= t.maxEdge && Math.ceil(b / PATCH) * PATCH <= t.maxEdge && visualTokens(a, b) <= t.maxTokens;
  if (fits(w, h)) return [w, h];
  if (h > w) { const [rh, rw] = resized(h, w, t); return [rw, rh]; }
  const ar = w / h;
  let lo = 1, hi = w;   // lo always fits; hi never does
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid, Math.max(roundEven(mid / ar), 1))) lo = mid; else hi = mid;
  }
  return [lo, Math.max(roundEven(lo / ar), 1)];
}

export interface Count { w: number; h: number; cols: number; rows: number; tokens: number; downscaled: boolean }
/** What an image of w × h costs: the size it is read at, its patch grid and its token count. */
export function imageTokens(w: number, h: number, t: Tier = MODEL_TIER): Count {
  const [rw, rh] = resized(w, h, t), cols = Math.ceil(rw / PATCH), rows = Math.ceil(rh / PATCH);
  return { w: rw, h: rh, cols, rows, tokens: cols * rows, downscaled: rw !== w || rh !== h };
}

/** OpenAI's patch count for the models that use 32 px patches, before any budget scaling (shown once, as a fact). */
export const openaiPatches = (w: number, h: number, p = Number(fact('openai-32').value)) => Math.ceil(w / p) * Math.ceil(h / p);

export const thousands = (n: number) => n.toLocaleString('en-US');
