// Inference's quantization (KTD7), simulated: every weight matrix of Larkspur mini is rounded to int8 or int4 per row
// (absmax: each row's largest magnitude maps to the top level), then dequantized back to floats, and forward() runs
// unchanged. The vectors (biases, LayerNorm) stay at 16 bits, as real weight-only schemes keep them. No new weight files.
import { evaluate, forward, type Model } from '../lm/model';

/** The precisions the chapters step over: the shipped Float16, then int8 and int4. */
export const BITS = [16, 8, 4] as const;
export type Bits = (typeof BITS)[number];

/** Each row of a [rows, cols] matrix rounded to `bits` signed levels by its own absmax, then scaled back. */
export function quantizeRows(w: Float32Array, rows: number, cols: number, bits: number): Float32Array {
  const levels = 2 ** (bits - 1) - 1,
    out = new Float32Array(w.length);
  for (let r = 0; r < rows; r++) {
    let max = 0;
    for (let c = 0; c < cols; c++) max = Math.max(max, Math.abs(w[r * cols + c]));
    const scale = max / levels || 1;
    for (let c = 0; c < cols; c++) out[r * cols + c] = Math.round(w[r * cols + c] / scale) * scale;
  }
  return out;
}

/** A tensor's rows and columns, when it is a matrix (embeddings and Linear weights, [out, in]); vectors give null. */
function shapeOf(m: Model, name: string): [number, number] | null {
  const c = m.config,
    D = c.d_model;
  if (name === 'wte.weight') return [c.vocab, D];
  if (name === 'wpe.weight') return [c.ctx, D];
  if (/attn\.qkv\.weight$/.test(name)) return [3 * D, D];
  if (/attn\.proj\.weight$/.test(name)) return [D, D];
  if (/mlp\.fc\.weight$/.test(name)) return [c.d_mlp, D];
  if (/mlp\.proj\.weight$/.test(name)) return [D, c.d_mlp];
  return null; // biases and LayerNorm weights are vectors
}

const quantized = new WeakMap<Model, Map<number, Model>>();
/** The model at `bits` (any width; On-device goes down to 2): 16 is the shipped weights as they are. Each model's
 * copies are made once per precision. */
export function quantize(m: Model, bits: number): Model {
  if (bits === 16) return m;
  if (!quantized.has(m)) quantized.set(m, new Map());
  const done = quantized.get(m)!;
  if (!done.has(bits)) done.set(bits, quantizeOnce(m, bits));
  return done.get(bits)!;
}

function quantizeOnce(m: Model, bits: number): Model {
  const tensors: Record<string, Float32Array> = {};
  for (const [name, t] of Object.entries(m.tensors)) {
    const s = shapeOf(m, name);
    tensors[name] = s ? quantizeRows(t, s[0], s[1], bits) : t;
  }
  return { ...m, tensors };
}

/** Weight memory at `bits`: every matrix number at `bits`, one 16-bit scale per row, every vector number at 16 bits. */
export function memory(m: Model, bits: number): { bytes: number; params: number; matrix: number; rows: number } {
  let matrix = 0,
    rows = 0,
    params = 0;
  for (const [name, t] of Object.entries(m.tensors)) {
    params += t.length;
    const s = shapeOf(m, name);
    if (s) {
      matrix += t.length;
      rows += s[0];
    }
  }
  const bytes = bits === 16 ? params * 2 : (matrix * bits) / 8 + rows * 2 + (params - matrix) * 2;
  return { bytes, params, matrix, rows };
}

/** How the top 5 next tokens changed against the shipped weights, over the given prompts' last positions. */
export function top5Changes(
  base: Model,
  q: Model,
  prompts: number[][],
): { same: number; total: number; top1Same: number } {
  const top = (xs: Float64Array) =>
    Array.from(xs, (v, i) => [v, i])
      .sort((a, b) => b[0] - a[0] || a[1] - b[1])
      .slice(0, 5)
      .map(x => x[1]);
  let same = 0,
    top1Same = 0;
  for (const p of prompts) {
    const a = top(forward(base, p).logits.at(-1)!),
      b = top(forward(q, p).logits.at(-1)!);
    same += b.filter(id => a.includes(id)).length;
    if (a[0] === b[0]) top1Same++;
  }
  return { same, total: prompts.length * 5, top1Same };
}

/** Held-out scores at `bits`, as evaluate() gives them, one document at a time so the page can yield between them. */
export async function heldoutAsync(
  m: Model,
  docs: number[][],
  yieldEvery: () => Promise<void> = () => new Promise(r => setTimeout(r, 0)),
) {
  let loss = 0,
    top1 = 0,
    top5 = 0,
    tokens = 0;
  for (const d of docs) {
    const e = evaluate(m, [d]);
    loss += e.loss * e.tokens;
    top1 += e.top1 * e.tokens;
    top5 += e.top5 * e.tokens;
    tokens += e.tokens;
    await yieldEvery();
  }
  return { loss: loss / tokens, top1: top1 / tokens, top5: top5 / tokens, tokens };
}
