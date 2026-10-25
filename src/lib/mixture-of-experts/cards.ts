// Model cards (KTD11): published total and active parameter counts with the shapes behind them, from facts.json, each
// dated. count() redoes the active-parameter maths from the shape (attention, routers, shared experts, dense layers,
// the experts that run, embeddings); the engine test holds it within 2% of the published figures. Bytes follow
// Inference's memory maths: a weight at `bits` takes bits ÷ 8 bytes.
import data from '../../../data/mixture-of-experts/facts.json' with { type: 'json' };
import { ROOMS } from './routes';

type Attn =
  | { kind: 'gqa'; heads: number; kvHeads: number; headDim: number }
  /** DeepSeek's multi-head latent attention: queries and keys/values squeezed through low-rank projections */
  | { kind: 'mla'; heads: number; qRank: number; kvRank: number; nope: number; rope: number; v: number };
export interface Shape {
  name: string;
  who: string;
  /** published, in parameters */
  total: number;
  active: number;
  config: string;
  layers: number;
  dModel: number;
  vocab: number;
  /** input and output embeddings shared */
  tied: boolean;
  attn: Attn;
  /** routed experts per MoE layer (1 for a dense model) */
  experts: number;
  topK: number;
  /** experts every token runs, besides the routed ones */
  shared: number;
  /** each expert's hidden width (a SwiGLU MLP: three matrices) */
  expertFf: number;
  /** leading layers with one dense MLP instead of experts */
  denseLayers: number;
  denseFf: number;
}
export interface Card extends Shape {
  id: string;
  source: string;
  accessed: string;
}

export const CARDS: Card[] = data.facts.flatMap(f =>
  'card' in f && f.card ? [{ id: f.id, source: f.source, accessed: data.accessed, ...(f.card as Shape) }] : [],
);
export type CardId = string;
export function cardOf(id: CardId): Card {
  const c = CARDS.find(x => x.id === id);
  if (!c) throw new Error(`unknown card: ${id}`);
  return c;
}

function attention(d: number, a: Attn): number {
  if (a.kind === 'gqa') return 2 * d * a.heads * a.headDim + 2 * d * a.kvHeads * a.headDim;
  return (
    d * a.qRank +
    a.qRank +
    a.qRank * a.heads * (a.nope + a.rope) +
    d * (a.kvRank + a.rope) +
    a.kvRank +
    a.kvRank * a.heads * (a.nope + a.v) +
    a.heads * a.v * d
  );
}

/** Total and active parameters from the shape: every expert sits in memory; a token runs its top k plus the shared. */
export function count(c: Shape): { total: number; active: number; attention: number; expert: number } {
  const d = c.dModel,
    attn = attention(d, c.attn),
    expert = 3 * d * c.expertFf,
    moe = c.layers - c.denseLayers,
    router = c.experts > 1 ? c.experts * d : 0,
    // every layer: attention and two norms; the embeddings, once or twice, and the final norm
    common = c.layers * (attn + 2 * d) + c.vocab * d * (c.tied ? 1 : 2) + d + c.denseLayers * 3 * d * c.denseFf;
  return {
    total: common + moe * ((c.experts + c.shared) * expert + router),
    active: common + moe * ((c.topK + c.shared) * expert + router),
    attention: attn,
    expert,
  };
}

/** Weight memory at `bits`, Inference's sum: every weight at bits ÷ 8 bytes (its per-row scales are left out here). */
export const bytesAt = (params: number, bits: number) => (params * bits) / 8;
export const gb = (bytes: number) => bytes / 1e9;
/** Billions, as cards print them: 46.7B. */
export const billions = (n: number) => `${Number((n / 1e9).toFixed(1))}B`;
export const fmtGB = (bytes: number) => `${Math.round(gb(bytes) * 10) / 10} GB`;

/** Larkspur's toy, measured (meta.json): its own total and active weights, beside the published cards. */
export const TOY = {
  name: 'Larkspur’s toy',
  total: ROOMS.params,
  active: ROOMS.active,
  experts: ROOMS.experts,
  topK: ROOMS.topK,
};
