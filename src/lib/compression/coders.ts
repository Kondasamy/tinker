// Compression's four ways to pack a file, side by side: as it is, LZ77's pointers, Huffman's codes, and the pair.
// Every one round-trips byte-exact (tests/unit/compression-coders.test.ts); sizes are pinned in data/compression/pinned.json.
import { deflateDecode, deflateEncode } from './deflate';
import { huffmanDecode, huffmanEncode } from './huffman';
import { lz77Decode, lz77Encode } from './lz77';

export const CODERS = {
  store: { name: 'As it is', encode: (b: Uint8Array) => b, decode: (b: Uint8Array) => b },
  lz77: { name: 'Pointers', encode: lz77Encode, decode: lz77Decode },
  huffman: { name: 'Short codes', encode: huffmanEncode, decode: huffmanDecode },
  pair: { name: 'Both', encode: deflateEncode, decode: deflateDecode },
};
export type CoderId = keyof typeof CODERS;
export const CODER_IDS = Object.keys(CODERS) as CoderId[];

const memo = new Map<string, number>();
/** A coder's size in bytes, remembered when the caller names the bytes (a site file's id). */
export function sizeOf(coder: CoderId, bytes: Uint8Array, key?: string): number {
  const k = key && `${coder}:${key}`;
  if (k && memo.has(k)) return memo.get(k)!;
  const n = CODERS[coder].encode(bytes).length;
  if (k) memo.set(k, n);
  return n;
}
