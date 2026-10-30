// Pre-training's engine (KTD2, KTD3). Two halves:
// - The base run's checkpoints, run live: Larkspur mini's weights at eight steps of its one training run
//   (public/data/pre-training/), each read for its top 5 next pieces, its greedy continuation of a prompt and its
//   held-out score (computed over Fine-tuning's copy of the held-out split, read only).
// - The variant runs, recorded: the same training on other data mixes (data/pre-training/runs.json, written by
//   train.py --variants). No variant weights ship; their loss curves, scores and greedy samples are read as recorded.
import { decode } from '../lm/bpe';
import { evaluate, forward, softmax, type Model } from '../lm/model';
import type { CheckpointMeta } from '../lm/load';
import { topK, type Candidate } from '../transformers/trace';
import { HELDOUT } from '../fine-tuning/engine';
import meta from '../../../public/data/pre-training/meta.json' with { type: 'json' };
import runs from '../../../data/pre-training/runs.json' with { type: 'json' };

/** The checkpoints' layout and recorded scores (train and held-out loss per step, from train.py --checkpoints). */
export const CKPT = meta as unknown as CheckpointMeta;
/** The steps a checkpoint was saved at: 0 (before any update) to 3000 (model.bin). */
export const STEPS = CKPT.steps;
export const LAST = STEPS.at(-1)!;
export type CkptWeights = `ckpt-${number}`;
export const weightsAt = (step: number): CkptWeights => `ckpt-${step}`;
/** A checkpoint's recorded scores; throws on a step with none. */
export function checkpoint(step: number) {
  const c = CKPT.checkpoints.find(x => x.step === step);
  if (!c) throw new Error(`no checkpoint at step ${step}`);
  return c;
}
/** Held-out loss minus training loss at a checkpoint: how much better the model does on text it trained on. */
export const gapAt = (step: number) => checkpoint(step).heldout.loss - checkpoint(step).train.loss;

// ---- the variant runs (recorded) ----

export type RunId = 'clean' | 'duplicated' | 'leaked' | 'half';
export interface Score {
  loss: number;
  top1: number;
  top5: number;
}
export interface Run {
  docs: number;
  tokens: number;
  lossCurve: { step: number; train: number; heldout: number }[];
  train: Score;
  heldout: Score;
  /** scored on the twelve test questions the leaked run trained on */
  leaked: Score;
  heldoutMin: { step: number; loss: number };
  /** greedy continuation ids, one per prompt */
  samples: number[][];
}
export const RUNS = runs as unknown as {
  training: { steps: number; batch: number; every: number; sampleTokens: number };
  duplicated: { doc: string; copies: number };
  leaked: string[];
  prompts: { text: string; ids: number[] }[];
  earlyMinimum: RunId[];
  runs: Record<RunId, Run>;
};
export const RUN_IDS = Object.keys(RUNS.runs) as RunId[];
export const runOf = (id: RunId): Run => RUNS.runs[id];
/** The prompts every checkpoint and run continues, as the tokenizer reads them today (the U3 test proves it). */
export const PROMPTS = RUNS.prompts;
/** How many pieces a continuation runs to. */
export const SAMPLE_TOKENS = RUNS.training.sampleTokens;

/** A reply ends at the first blank line, as Larkspur's documents end a paragraph. */
export const cut = (text: string) => text.split('\n\n')[0];
/** A recorded run's continuation of a prompt, cut where it ends. */
export const sampleOf = (run: RunId, prompt: number) => cut(decode(runOf(run).samples[prompt]));
/** About how many times over a run read its documents: every step guesses batch × context pieces, to two figures. */
export const passes = (id: RunId) =>
  Number(((RUNS.training.steps * RUNS.training.batch * CKPT.model.ctx) / runOf(id).tokens).toPrecision(2));

// ---- the checkpoints (live) ----

const conts = new WeakMap<Model, Map<number, number[]>>();
/** Greedy continuation of a prompt: the likeliest next piece, SAMPLE_TOKENS times. Memoized per (weights, prompt):
 * captions call it on every render, and each call is 24 forward passes. */
export function continuation(model: Model, prompt: number): number[] {
  let m = conts.get(model);
  if (!m) conts.set(model, (m = new Map()));
  let out = m.get(prompt);
  if (!out) {
    const ids = [...PROMPTS[prompt].ids];
    for (let i = 0; i < SAMPLE_TOKENS; i++) {
      const lg = forward(model, ids).logits.at(-1)!;
      let best = 0;
      for (let j = 1; j < lg.length; j++) if (lg[j] > lg[best]) best = j;
      ids.push(best);
    }
    m.set(prompt, (out = ids.slice(PROMPTS[prompt].ids.length)));
  }
  return out;
}
/** What a checkpoint writes after a prompt, cut where it ends. */
export const says = (model: Model, prompt: number) => cut(decode(continuation(model, prompt)));
/** The five likeliest next pieces after a prompt, with their probabilities. */
export const top5 = (model: Model, prompt: number): Candidate[] =>
  topK(softmax(forward(model, PROMPTS[prompt].ids).logits.at(-1)!), 5);

const scored = new WeakMap<Model, ReturnType<typeof evaluate>>();
/** Held-out scores for one checkpoint, computed live (once per loaded model). */
export function heldoutScore(model: Model) {
  let s = scored.get(model);
  if (!s) scored.set(model, (s = evaluate(model, HELDOUT.ids)));
  return s;
}
