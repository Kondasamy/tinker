// Larkspur mini's forward pass in plain TypeScript (KTD2): learned positions, pre-LayerNorm blocks,
// causal softmax attention, a tanh-GELU MLP and the unembedding tied to the token embedding, the same
// maths as scripts/train/train.py. Weights are Float32Array (exact Float16 values); sums run in float64.

export interface ModelConfig {
  vocab: number;
  n_layer: number;
  n_head: number;
  d_model: number;
  ctx: number;
  d_mlp: number;
  ln_eps: number;
}
/** Tensors by their PyTorch names (Linear weights are [out, in], row-major). */
export interface Model {
  config: ModelConfig;
  tensors: Record<string, Float32Array>;
  adapter?: Adapter;
}
/**
 * A LoRA adapter (U18): for each adapted Linear `h.<l>.attn.<qkv|proj>`, A [rank, in] and B [out, rank] stored as
 * `<name>.A` / `<name>.B`. The forward pass adds scale × B(A x) to that Linear's output; the base weights stay as
 * they are. A Linear with no A/B pair is left alone.
 */
export interface Adapter {
  rank: number;
  scale: number;
  tensors: Record<string, Float32Array>;
}

export interface ForwardResult {
  /** The ids the model read: the prompt's last `ctx` (32) tokens. */
  ids: number[];
  /** True when the prompt was longer than the context window, so its start was dropped. */
  truncated: boolean;
  /** Next-token logits at every position read, each of length vocab. */
  logits: Float64Array[];
  /** [layer][head][query t][key s]; each row sums to 1 and is 0 for s > t (unless `hooks.bidirectional`). */
  attention: number[][][][];
  /** With `hooks.residuals`: [stage][t] of d_model; stage 0 after the embedding, stage l + 1 after block l. */
  residuals?: Float64Array[][];
  /** With `hooks.mlp`: [layer][t] of d_mlp, each MLP neuron's activation after GELU. */
  mlp?: Float64Array[][];
}

/**
 * Optional hooks (KTD5, Interpretability). A `layer` for patch and steer is the residual at the top of that layer,
 * before its block runs; `n_layer` means after the last block, before `lnf`. Positions count in the ids read, after
 * the 32-token truncation.
 */
export interface Hooks {
  /** Heads whose output is zeroed before the output projection (its bias still applies; `attention` still reports them). */
  ablate?: { layer: number; head: number }[];
  residuals?: boolean;
  mlp?: boolean;
  /** Replace one position's residual. */
  patch?: { layer: number; pos: number; value: ArrayLike<number> };
  /** Add a vector to every position's residual. */
  steer?: { layer: number; vector: ArrayLike<number> };
  /** Drop the causal mask: every position attends to every position (the masked model, KTD4). */
  bidirectional?: boolean;
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
  const nIn = x.length,
    y = new Float64Array(nOut);
  for (let o = 0; o < nOut; o++) {
    let s = b[o];
    for (let i = 0, r = o * nIn; i < nIn; i++) s += w[r + i] * x[i];
    y[o] = s;
  }
  return y;
}

function layerNorm(x: Float64Array, w: Float32Array, b: Float32Array, eps: number): Float64Array {
  const n = x.length;
  let mean = 0,
    v = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  for (let i = 0; i < n; i++) v += (x[i] - mean) ** 2;
  const k = 1 / Math.sqrt(v / n + eps),
    y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = (x[i] - mean) * k * w[i] + b[i];
  return y;
}

/** Linear `name` (e.g. `h.0.attn.qkv`), plus the adapter's low-rank product when the model carries one for it. */
function adapted(model: Model, name: string, x: Float64Array, nOut: number): Float64Array {
  const P = model.tensors,
    y = linear(x, P[`${name}.weight`], P[`${name}.bias`], nOut);
  const ad = model.adapter,
    A = ad?.tensors[`${name}.A`],
    B = ad?.tensors[`${name}.B`];
  if (!ad || !A || !B) return y;
  const r = ad.rank,
    nIn = x.length,
    ax = new Float64Array(r);
  for (let k = 0; k < r; k++) for (let i = 0; i < nIn; i++) ax[k] += A[k * nIn + i] * x[i];
  for (let o = 0; o < nOut; o++) {
    let s = 0;
    for (let k = 0; k < r; k++) s += B[o * r + k] * ax[k];
    y[o] += ad.scale * s;
  }
  return y;
}

const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

/** The tied unembedding has no bias: one shared zero row per vocabulary size, never written. */
const zeroBias = new Map<number, Float32Array>();
const noBias = (n: number) => zeroBias.get(n) ?? zeroBias.set(n, new Float32Array(n)).get(n)!;

/** One residual read out as next-token logits: `lnf`, then the unembedding tied to the token embedding (the logit lens). */
export function unembed(model: Model, x: Float64Array): Float64Array {
  const { config: c, tensors: P } = model;
  return linear(layerNorm(x, P['lnf.weight'], P['lnf.bias'], c.ln_eps), P['wte.weight'], noBias(c.vocab), c.vocab);
}

/** Patch and steer the residual stream at the top of layer l (hooks looked up once per layer). */
function edit(xs: Float64Array[], l: number, hooks: Hooks): Float64Array[] {
  const { patch, steer } = hooks;
  if (patch?.layer === l) xs = xs.map((x, t) => (t === patch.pos ? Float64Array.from(patch.value) : x));
  if (steer?.layer === l) xs = xs.map(x => x.map((v, i) => v + steer.vector[i]));
  return xs;
}

export function forward(model: Model, prompt: number[], hooks: Hooks = {}): ForwardResult {
  const { config: c, tensors: P } = model;
  const D = c.d_model,
    H = c.n_head,
    hd = D / H;
  const ids = prompt.slice(-c.ctx),
    T = ids.length;
  const wte = P['wte.weight'],
    wpe = P['wpe.weight'];
  let xs: Float64Array[] = ids.map((id, t) =>
    Float64Array.from({ length: D }, (_, i) => wte[id * D + i] + wpe[t * D + i]),
  );
  const attention: number[][][][] = [];
  const residuals: Float64Array[][] = [],
    mlp: Float64Array[][] = [];

  for (let l = 0; l < c.n_layer; l++) {
    xs = edit(xs, l, hooks);
    if (hooks.residuals) residuals.push(xs);
    const p = (n: string) => P[`h.${l}.${n}`];
    const off = hooks.ablate?.filter(a => a.layer === l).map(a => a.head) ?? [],
      bi = hooks.bidirectional === true;
    const acts: Float64Array[] = [];
    const qkv = xs.map(x =>
      adapted(model, `h.${l}.attn.qkv`, layerNorm(x, p('ln1.weight'), p('ln1.bias'), c.ln_eps), 3 * D),
    );
    const ys = xs.map(() => new Float64Array(D));
    const heads: number[][][] = [];
    for (let h = 0; h < H; h++) {
      const rows: number[][] = [],
        silenced = off.includes(h);
      for (let t = 0; t < T; t++) {
        const last = bi ? T - 1 : t,
          scores = new Float64Array(last + 1);
        for (let s = 0; s <= last; s++) {
          let dot = 0;
          for (let i = 0; i < hd; i++) dot += qkv[t][h * hd + i] * qkv[s][D + h * hd + i];
          scores[s] = dot / Math.sqrt(hd);
        }
        const a = softmax(scores);
        if (!silenced)
          for (let s = 0; s <= last; s++)
            for (let i = 0; i < hd; i++) ys[t][h * hd + i] += a[s] * qkv[s][2 * D + h * hd + i];
        rows.push(Array.from({ length: T }, (_, s) => (s <= last ? a[s] : 0)));
      }
      heads.push(rows);
    }
    attention.push(heads);
    xs = xs.map((x, t) => {
      const proj = adapted(model, `h.${l}.attn.proj`, ys[t], D);
      const r = x.map((v, i) => v + proj[i]);
      const hidden = linear(
        layerNorm(r, p('ln2.weight'), p('ln2.bias'), c.ln_eps),
        p('mlp.fc.weight'),
        p('mlp.fc.bias'),
        c.d_mlp,
      ).map(gelu);
      if (hooks.mlp) acts.push(hidden);
      const out = linear(hidden, p('mlp.proj.weight'), p('mlp.proj.bias'), D);
      return r.map((v, i) => v + out[i]);
    });
    if (hooks.mlp) mlp.push(acts);
  }
  xs = edit(xs, c.n_layer, hooks);
  if (hooks.residuals) residuals.push(xs);

  const logits = xs.map(x => unembed(model, x));
  const out: ForwardResult = { ids, truncated: prompt.length > c.ctx, logits, attention };
  if (hooks.residuals) out.residuals = residuals;
  if (hooks.mlp) out.mlp = mlp;
  return out;
}

/**
 * Held-out scores, as train.py computes them: each document is read in windows of ctx + 1 tokens at
 * stride ctx, and every token after a window's first is predicted from what comes before it there.
 */
export function evaluate(model: Model, docs: number[][]): { loss: number; top1: number; top5: number; tokens: number } {
  const ctx = model.config.ctx;
  let nll = 0,
    top1 = 0,
    top5 = 0,
    n = 0;
  for (const doc of docs)
    for (let s = 0; s < doc.length - 1; s += ctx) {
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

/** Share of held-out positions (evaluate()'s windows) where models a and b pick the same greedy next token. */
export function agreement(a: Model, b: Model, docs: number[][]): number {
  const argmax = (xs: Float64Array) => xs.reduce((best, v, i) => (v > xs[best] ? i : best), 0);
  let same = 0,
    n = 0;
  for (const doc of docs)
    for (let s = 0; s < doc.length - 1; s += a.config.ctx) {
      const x = doc.slice(s, s + a.config.ctx + 1).slice(0, -1),
        la = forward(a, x).logits,
        lb = forward(b, x).logits;
      la.forEach((lg, t) => {
        if (argmax(lg) === argmax(lb[t])) same++;
        n++;
      });
    }
  return same / n;
}
