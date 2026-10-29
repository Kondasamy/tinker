// Facts and planning figures for Many chips, one model (R5), each checked against its source. Copy and the simulated
// cluster read numbers from here, never by hand; chip, link and failure figures are dated published numbers.
import data from '../../../data/parallel-training/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
const json = <T>(id: string) => JSON.parse(fact(id).value!) as T;
const num = (id: string) => Number(fact(id).value);

/** Fernhill's model: sized like Llama 3 70B (fact `llama3-70b`). */
export const MODEL = json<{ params: number; layers: number; hidden: number; heads: number }>('llama3-70b');
const batch = json<{ tokens: number; seq: number }>('llama3-batch');
/** tokens per sequence, and sequences per training step (fact `llama3-batch`) */
export const SEQ = batch.seq;
export const BATCH = batch.tokens / batch.seq;
/** bytes per parameter in mixed-precision Adam (fact `zero-16-bytes`) */
export const BYTES = json<{ weights: number; grads: number; optimiser: number }>('zero-16-bytes');
/** ZeRO stage 3 sends this many times plain data parallel's bytes (fact `zero-stages`) */
export const ZERO3_TRAFFIC = num('zero-stages');
/** bytes per token per hidden unit a layer keeps for its backward pass (fact `activations`) */
export const ACT_BYTES = num('activations');
/** all-reduces per layer per micro-batch when a layer is split (fact `megatron-allreduce`) */
export const TP_ALLREDUCES = num('megatron-allreduce');
const nvlink = json<{ perBox: number; gbPerS: number }>('nvlink');
/** one chip: memory in bytes, dense BF16 FLOP/s (half the with-sparsity figure) */
export const CHIP = { memory: num('h100-memory') * 1e9, flops: (num('h100-bf16') * 1e12) / 2 };
/** chips in one box, and each chip's link speed inside a box and between boxes, bytes a second */
export const PER_BOX = nvlink.perBox;
export const LINK = { inside: nvlink.gbPerS * 1e9, between: num('between-boxes') * 1e9 };
/** the share of peak a real run keeps (fact `llama3-mfu`, inside Meta's 38–43%) */
export const MFU = num('llama3-mfu');
const fails = json<{ unexpected: number; days: number; gpus: number }>('llama3-interruptions');
/** unexpected interruptions per chip per day, from Llama 3's 54 days */
export const FAILS_PER_CHIP_DAY = fails.unexpected / (fails.gpus * fails.days);
