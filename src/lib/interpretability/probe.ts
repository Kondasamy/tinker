// Interpretability's probes (KTD5): the forward-pass hooks read the way the chapters show them. Pull fuses (silence a
// head, or zero an MLP's output), read the guess through the logit lens, patch one activation in from another prompt,
// steer with a direction made from two sets of prompts, and look up a neuron's top tokens. Nothing is recorded: every
// probe runs Larkspur mini live; data/interpretability/prompts.json pins what the copy says it shows.
import data from '../../../data/interpretability/prompts.json' with { type: 'json' };
import neurons from '../../../data/interpretability/neurons.json' with { type: 'json' };
import heldout from '../../../data/fine-tuning/heldout.json' with { type: 'json' };
import { decode, encode } from '../lm/bpe';
import { forward, softmax, unembed, type ForwardResult, type Hooks, type Model } from '../lm/model';
import { topK, type Candidate } from '../transformers/trace';

/** One fuse per head (`h<layer>-<head>`) and one per MLP (`mlp<layer>`), Larkspur mini's six parts, 0-based. */
export const FUSES = ['h0-0', 'h0-1', 'h1-0', 'h1-1', 'mlp0', 'mlp1'] as const;
export type Fuse = (typeof FUSES)[number];
export const isHead = (f: Fuse) => f.startsWith('h');
export const layerOf = (f: Fuse) => Number(isHead(f) ? f[1] : f[3]);
export const fuseName = (f: Fuse) =>
  isHead(f) ? `Layer ${layerOf(f) + 1}, head ${Number(f[3]) + 1}` : `Layer ${layerOf(f) + 1} MLP`;

export const HELDOUT = data.fuses;
export const BITE = data.fuses.bite as typeof data.fuses.bite & { fuse: Fuse };
export const LENS = data.lens.prompts;
export const PATCH = data.patch;
export const STEER = data.steer;
export const NEURONS = neurons;

/** How many tokens outrank token y (0: it is the top guess). */
export function rankOf(logits: ArrayLike<number>, y: number): number {
  let above = 0;
  for (let i = 0; i < logits.length; i++) if (logits[i] > logits[y]) above++;
  return above;
}

const cache = new WeakMap<Model, Map<string, Model>>();
/** The model with the pulled MLPs' output zeroed (its projection's weights and bias), kept per set so passes reuse it. */
function withoutMlps(model: Model, pulled: readonly Fuse[]): Model {
  const off = pulled.filter(f => !isHead(f)).map(layerOf);
  if (!off.length) return model;
  const key = off.sort().join(','),
    seen = cache.get(model) ?? new Map<string, Model>();
  cache.set(model, seen);
  const hit = seen.get(key);
  if (hit) return hit;
  const P = { ...model.tensors };
  for (const l of off)
    for (const n of ['weight', 'bias']) P[`h.${l}.mlp.proj.${n}`] = new Float32Array(P[`h.${l}.mlp.proj.${n}`].length);
  const m = { ...model, tensors: P };
  seen.set(key, m);
  return m;
}

/** One forward pass with the given fuses pulled, plus any other hooks. */
export function run(model: Model, ids: number[], pulled: readonly Fuse[], hooks: Hooks = {}): ForwardResult {
  const ablate = pulled.filter(isHead).map(f => ({ layer: layerOf(f), head: Number(f[3]) }));
  return forward(withoutMlps(model, pulled), ids, ablate.length ? { ...hooks, ablate } : hooks);
}

/** The top k next tokens after a prompt, with the given fuses pulled. */
export const nextTop = (model: Model, text: string, pulled: readonly Fuse[] = [], k = 5): Candidate[] =>
  topK(softmax(run(model, encode(text), pulled).logits.at(-1) ?? []), k);

/** The held-out documents (Fine-tuning's copy of the split), read in evaluate()'s windows. */
const DOCS = heldout.ids as number[][];
function windows(ctx: number) {
  const out: number[][] = [];
  for (const doc of DOCS) for (let s = 0; s < doc.length - 1; s += ctx) out.push(doc.slice(s, s + ctx + 1));
  return out;
}

/** Of the held-out positions whose true next token is in the plain top 5 (`right`), how many leave it with these fuses
 * pulled (`lost`). Runs the whole held-out split twice, a few hundred milliseconds. */
export function headLoss(model: Model, ...pulled: Fuse[]): { lost: number; right: number } {
  let lost = 0,
    right = 0;
  for (const w of windows(model.config.ctx)) {
    const x = w.slice(0, -1),
      a = forward(model, x).logits,
      b = run(model, x, pulled).logits;
    a.forEach((lg, t) => {
      if (rankOf(lg, w[t + 1]) >= 5) return;
      right++;
      if (rankOf(b[t], w[t + 1]) >= 5) lost++;
    });
  }
  return { lost, right };
}

/** The stages the lens reads: after the embedding, after block 1, after block 2 (the output). */
export const STAGES = ['After the embedding', 'After block 1', 'Output'] as const;

/** The logit lens: every stage's residual read out as next-token guesses, at every position. */
export function lens(model: Model, text: string, pulled: readonly Fuse[] = [], k = 5) {
  const out = run(model, encode(text), pulled, { residuals: true }),
    logits = out.residuals!.map(stage => stage.map(x => unembed(model, x)));
  return {
    tokens: out.ids.map(id => decode([id])),
    /** [stage][position] the top k guesses */
    stages: logits.map(stage => stage.map(lg => topK(softmax(lg), k))),
    /** token y's rank at the last position, per stage */
    ranks: (y: number) => logits.map(stage => rankOf(stage.at(-1)!, y)),
  };
}

export interface PatchCell {
  /** the clean run's answer with this one activation copied in */
  top: string;
  flipped: boolean;
}
/** Copy the swapped run's residual at each stage and position into the clean run, one at a time: does the answer
 * become the swapped run's? [stage][position]. The prompts must be the same length in tokens. */
export function patchGrid(model: Model, clean: string, swapped: string) {
  const A = encode(clean),
    B = encode(swapped);
  if (A.length !== B.length) throw new Error('patching needs prompts of the same length');
  const other = forward(model, B, { residuals: true }).residuals!;
  const answer = (lg: Float64Array) => topK(softmax(lg), 1)[0].text;
  const want = answer(forward(model, B).logits.at(-1)!);
  return {
    tokens: A.map(id => decode([id])),
    swappedTokens: B.map(id => decode([id])),
    cleanAnswer: answer(forward(model, A).logits.at(-1)!),
    swappedAnswer: want,
    cells: other.map((stage, layer) =>
      stage.map((value, pos) => {
        const top = answer(forward(model, A, { patch: { layer, pos, value } }).logits.at(-1)!);
        return { top, flipped: top === want };
      }),
    ),
  };
}

/** The mean residual at the top of `layer`, at each prompt's last token. */
function meanResidual(model: Model, texts: string[], layer: number): Float64Array {
  const v = new Float64Array(model.config.d_model);
  for (const t of texts)
    forward(model, encode(t), { residuals: true })
      .residuals![layer].at(-1)!
      .forEach((x, i) => (v[i] += x / texts.length));
  return v;
}
/** A steering direction: the mean residual of one set of prompts minus that of another. */
export function steerDirection(model: Model, toward: string[], away: string[], layer: number): Float64Array {
  const a = meanResidual(model, toward, layer),
    b = meanResidual(model, away, layer);
  return a.map((x, i) => x - b[i]);
}
/** The last position's logits with scale × the direction added to every position's residual at `layer`. */
export const steered = (model: Model, text: string, dir: Float64Array, scale: number, layer: number) =>
  forward(model, encode(text), { steer: { layer, vector: dir.map(d => d * scale) } }).logits.at(-1)!;

/** What a piece is: a word (a space, then letters), part of a word, a number, or a mark (punctuation, spaces, bytes). */
export type Kind = 'word' | 'part' | 'number' | 'mark';
export function kindOf(piece: string | null): Kind {
  if (piece === null) return 'mark';
  if (/^ ?\d/.test(piece)) return 'number';
  if (/^ [a-z]/i.test(piece)) return 'word';
  if (/^[a-z]/i.test(piece)) return 'part';
  return 'mark';
}
/** A neuron's five top tokens over the training split, from neurons.json. */
export const neuron = (layer: number, n: number) => ({ layer, n, fires: NEURONS.layers[layer][n] });
