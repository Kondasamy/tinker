// Larkspur mini's forward pass in plain TypeScript (KTD2): learned positions, pre-LayerNorm blocks,
// causal softmax attention, a tanh-GELU MLP and the unembedding tied to the token embedding, the same
// maths as scripts/train/train.py. Weights are Float32Array (exact Float16 values); sums run in float64.

export interface ModelConfig { vocab: number; n_layer: number; n_head: number; d_model: number; ctx: number; d_mlp: number; ln_eps: number }
/** Tensors by their PyTorch names (Linear weights are [out, in], row-major). */
export interface Model { config: ModelConfig; tensors: Record<string, Float32Array> }

export interface ForwardResult {
  /** The ids the model read: the prompt's last `ctx` (32) tokens. */
  ids: number[];
  /** True when the prompt was longer than the context window, so its start was dropped. */
  truncated: boolean;
  /** Next-token logits at every position read, each of length vocab. */
  logits: Float64Array[];
  /** [layer][head][query t][key s]; each row sums to 1 and is 0 for s > t. */
  attention: number[][][][];
}

export function softmax(xs: ArrayLike<number>): Float64Array {
  let max = -Infinity;
  for (let i = 0; i < xs.length; i++) if (xs[i] > max) max = xs[i];
  const out = new Float64Array(xs.length);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) sum += out[i] = Math.exp(xs[i] - max);
  for (let i = 0; i < xs.length; i++) out[i] /= sum;
  return out;
}

function linear(x: Float64Array, w: Float32Array, b: Float32Array, nOut: number): Float64Array {
  const nIn = x.length, y = new Float64Array(nOut);
  for (let o = 0; o < nOut; o++) {
    let s = b[o];
    for (let i = 0, r = o * nIn; i < nIn; i++) s += w[r + i] * x[i];
    y[o] = s;
  }
  return y;
}

function layerNorm(x: Float64Array, w: Float32Array, b: Float32Array, eps: number): Float64Array {
  const n = x.length;
  let mean = 0, v = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  for (let i = 0; i < n; i++) v += (x[i] - mean) ** 2;
  const k = 1 / Math.sqrt(v / n + eps), y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = (x[i] - mean) * k * w[i] + b[i];
  return y;
}

const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

export function forward(model: Model, prompt: number[]): ForwardResult {
  const { config: c, tensors: P } = model;
  const D = c.d_model, H = c.n_head, hd = D / H;
  const ids = prompt.slice(-c.ctx), T = ids.length;
  const wte = P['wte.weight'], wpe = P['wpe.weight'];
  let xs = ids.map((id, t) => Float64Array.from({ length: D }, (_, i) => wte[id * D + i] + wpe[t * D + i]));
  const attention: number[][][][] = [];

  for (let l = 0; l < c.n_layer; l++) {
    const p = (n: string) => P[`h.${l}.${n}`];
    const qkv = xs.map((x) => linear(layerNorm(x, p('ln1.weight'), p('ln1.bias'), c.ln_eps), p('attn.qkv.weight'), p('attn.qkv.bias'), 3 * D));
    const ys = xs.map(() => new Float64Array(D));
    const heads: number[][][] = [];
    for (let h = 0; h < H; h++) {
      const rows: number[][] = [];
      for (let t = 0; t < T; t++) {
        const scores = new Float64Array(t + 1);
        for (let s = 0; s <= t; s++) {
          let dot = 0;
          for (let i = 0; i < hd; i++) dot += qkv[t][h * hd + i] * qkv[s][D + h * hd + i];
          scores[s] = dot / Math.sqrt(hd);
        }
        const a = softmax(scores);
        for (let s = 0; s <= t; s++) for (let i = 0; i < hd; i++) ys[t][h * hd + i] += a[s] * qkv[s][2 * D + h * hd + i];
        rows.push(Array.from({ length: T }, (_, s) => (s <= t ? a[s] : 0)));
      }
      heads.push(rows);
    }
    attention.push(heads);
    xs = xs.map((x, t) => {
      const proj = linear(ys[t], p('attn.proj.weight'), p('attn.proj.bias'), D);
      const r = x.map((v, i) => v + proj[i]);
      const hidden = linear(layerNorm(r, p('ln2.weight'), p('ln2.bias'), c.ln_eps), p('mlp.fc.weight'), p('mlp.fc.bias'), c.d_mlp).map(gelu);
      const out = linear(hidden, p('mlp.proj.weight'), p('mlp.proj.bias'), D);
      return r.map((v, i) => v + out[i]);
    });
  }

  const zeros = new Float32Array(c.vocab);
  const logits = xs.map((x) => linear(layerNorm(x, P['lnf.weight'], P['lnf.bias'], c.ln_eps), wte, zeros, c.vocab));
  return { ids, truncated: prompt.length > c.ctx, logits, attention };
}

/**
 * Held-out scores, as train.py computes them: each document is read in windows of ctx + 1 tokens at
 * stride ctx, and every token after a window's first is predicted from what comes before it there.
 */
export function evaluate(model: Model, docs: number[][]): { loss: number; top1: number; top5: number; tokens: number } {
  const ctx = model.config.ctx;
  let nll = 0, top1 = 0, top5 = 0, n = 0;
  for (const doc of docs) for (let s = 0; s < doc.length - 1; s += ctx) {
    const w = doc.slice(s, s + ctx + 1);
    forward(model, w.slice(0, -1)).logits.forEach((lg, t) => {
      const y = w[t + 1];
      nll -= Math.log(softmax(lg)[y]);
      let above = 0;
      for (let i = 0; i < lg.length; i++) if (lg[i] > lg[y]) above++;
      if (above === 0) top1++;
      if (above < 5) top5++;
      n++;
    });
  }
  return { loss: nll / n, top1: top1 / n, top5: top5 / n, tokens: n };
}
