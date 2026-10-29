// What each chip holds (KTD8). Weights, gradients and Adam's state take 16 bytes per parameter (the ZeRO paper). A
// layout splits the model `tp` ways inside each layer and `pp` ways by layers, and keeps `dp` copies that each see a
// slice of the batch. ZeRO stage 1 shares the optimiser state out over the dp copies, stage 2 the gradients too, stage 3
// the weights too.
// Activations, by a stated rule: each chip keeps one micro-batch's activations for its own layers at a time,
// 34·s·b·h/t bytes a layer (Korthikanti et al., 2022, attention recomputed).
// shortcut: micro-batches waiting in the pipeline are not counted; upgrade if a chapter teaches activation memory.
import bench from '../../../data/parallel-training/workbench.json' with { type: 'json' };
import { ACT_BYTES, BATCH, BYTES, MODEL, SEQ } from './facts';

export type Zero = 0 | 1 | 2 | 3;
export interface Layout {
  /** ways each layer is split (tensor parallel) */
  tp: number;
  /** pipeline stages (layers split into groups) */
  pp: number;
  /** data-parallel copies */
  dp: number;
  /** ZeRO stage: 0 none */
  zero: Zero;
}
/** sequences per micro-batch (planning number) */
export const MICRO_BATCH = bench.microBatch;
export const chipsOf = (l: Layout) => l.tp * l.pp * l.dp;
/** micro-batches each copy runs per step: the batch shared over the copies */
export const microsOf = (l: Layout) => BATCH / (l.dp * MICRO_BATCH);

export interface Memory {
  weights: number;
  grads: number;
  optimiser: number;
  activations: number;
  total: number;
}
export type Model = typeof MODEL;

/** Bytes on each chip under a layout. */
export function memoryOf(l: Layout, m: Model = MODEL): Memory {
  const slice = m.params / (l.tp * l.pp),
    shared = (stage: number) => (l.zero >= stage ? l.dp : 1);
  const weights = (slice * BYTES.weights) / shared(3),
    grads = (slice * BYTES.grads) / shared(2),
    optimiser = (slice * BYTES.optimiser) / shared(1),
    activations = ((m.layers / l.pp) * ACT_BYTES * SEQ * MICRO_BATCH * m.hidden) / l.tp;
  return { weights, grads, optimiser, activations, total: weights + grads + optimiser + activations };
}
/** Bytes per parameter for weights, gradients and optimiser state together. */
export const BYTES_PER_PARAM = BYTES.weights + BYTES.grads + BYTES.optimiser;
/** The whole training state of a model, before any split. */
export const stateOf = (m: Model = MODEL) => m.params * BYTES_PER_PARAM;
