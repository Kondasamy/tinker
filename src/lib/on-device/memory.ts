// What fits on the handheld (KTD4): weights at `bits` take params × bits ÷ 8 bytes, and the KV cache adds keys and
// values for every token read, 16 bits each, from the model's shape. Larkspur mini's real count (scales and vectors
// included) is quantize.ts's memory(); the formula is the same sum without them, so it scales to phone-sized models.
// The handheld's free memory is a planning number (data/on-device/phones.json).
import P from '../../../data/on-device/phones.json' with { type: 'json' };

export type SizeId = 'mini' | '1b' | '3b';
export interface Size {
  id: SizeId;
  name: string;
  params: number;
  layers: number;
  kvHeads: number;
  headDim: number;
  /** stock questions answered right of QUESTIONS (hand-set planning numbers) */
  right: number;
}
export const HANDHELD = P.handheld;
export const SIZES = P.models as Size[];
export const SIZE_IDS = SIZES.map(s => s.id);
export const sizeOf = (id: SizeId) => SIZES.find(s => s.id === id)!;
/** The bit widths the chapters step over. */
export const BITS = P.bits;
export const CONTEXTS = P.contexts;
export const QUESTIONS = P.questions;

export const GB = 1e9;
/** Memory the handheld leaves for one app. */
export const FREE = HANDHELD.freeGB * GB;

export const weightBytes = (s: Size, bits: number) => (s.params * bits) / 8;
/** Keys and values, 16 bits each, in every layer's every key-value head. */
export const kvPerToken = (s: Size) => 2 * s.layers * s.kvHeads * s.headDim * 2;
export const cacheBytes = (s: Size, tokens: number) => kvPerToken(s) * tokens;
export const usedBytes = (s: Size, bits: number, tokens = 0) => weightBytes(s, bits) + cacheBytes(s, tokens);
export const fits = (s: Size, bits: number, tokens = 0) => usedBytes(s, bits, tokens) <= FREE;

/** The crate holds CRATE bricks; each brick is a share of the free memory. */
export const CRATE = 16;
export const BRICK = FREE / CRATE;
/** Bricks a number of bytes fills: any bytes at all take one. */
export const bricksOf = (bytes: number) => (bytes > 0 ? Math.ceil(bytes / BRICK) : 0);

/** Bytes in words: KB, MB or GB, decimal as the facts give them. */
export const sizeText = (bytes: number) =>
  bytes >= GB
    ? `${(bytes / GB).toFixed(2)} GB`
    : bytes >= 1e6
      ? `${Math.round(bytes / 1e6)} MB`
      : `${Math.round(bytes / 1e3)} KB`;
