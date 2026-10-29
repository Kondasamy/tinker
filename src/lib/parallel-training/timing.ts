// Time per training step on the simulated cluster (KTD8, KTD13): arithmetic over planning figures from facts.ts, not a
// measurement. Stated rules:
// - Work: 6 FLOPs per parameter per token, shared over every chip, at the published dense peak times MFU.
// - Inside a layer (tp): four all-reduces per layer per micro-batch (Megatron-LM) of one micro-batch's activations
//   (2 bytes a number), on NVLink while the tp group fits in one box, else on the between-box link.
// - Pipeline (pp): GPipe, so the stages' work stretches by (m + p − 1)/m; the extra is the bubble.
// - Data parallel (dp): one ring all-reduce of the 16-bit gradients per step, on NVLink only if the whole cluster fits in
//   one box; ZeRO stage 3 sends 1.5× as much (ZeRO paper).
// - Nothing overlaps, and passing activations between pipeline stages is left out.
//   shortcut: no overlap and no stage-to-stage sends; upgrade if a chapter compares overlap schemes.
import { BATCH, CHIP, LINK, MFU, MODEL, PER_BOX, SEQ, TP_ALLREDUCES, ZERO3_TRAFFIC } from './facts';
import { chipsOf, type Layout, MICRO_BATCH, type Model, microsOf } from './memory';
import { ringSeconds } from './ring';

/** A group of chips `span` wide talks on NVLink when it fits in one box. */
export const linkFor = (span: number) => (span <= PER_BOX ? LINK.inside : LINK.between);

export interface Step {
  /** the model's arithmetic */
  compute: number;
  /** all-reduces inside layers */
  tensor: number;
  /** pipeline idle time */
  bubble: number;
  /** the gradient all-reduce between copies */
  data: number;
  total: number;
}

/** Seconds for one training step under a layout. */
export function stepOf(l: Layout, m: Model = MODEL): Step {
  const chips = chipsOf(l),
    micros = microsOf(l);
  const compute = (6 * m.params * BATCH * SEQ) / (chips * CHIP.flops * MFU);
  const actBytes = SEQ * MICRO_BATCH * m.hidden * 2;
  const tensor = (m.layers / l.pp) * micros * TP_ALLREDUCES * ringSeconds(actBytes, l.tp, linkFor(l.tp));
  const bubble = ((compute + tensor) * (l.pp - 1)) / micros;
  const grads = (m.params / (l.tp * l.pp)) * 2;
  const data = ringSeconds(grads, l.dp, linkFor(chips)) * (l.zero === 3 ? ZERO3_TRAFFIC : 1);
  return { compute, tensor, bubble, data, total: compute + tensor + bubble + data };
}

/** One all-reduce of a micro-batch's activations inside a layer split t ways, on a link of `speed`. */
export const tensorHopSeconds = (t: number, speed: number, m: Model = MODEL) =>
  ringSeconds(SEQ * MICRO_BATCH * m.hidden * 2, t, speed);
