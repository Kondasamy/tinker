// Compression's pointers (KTD6): LZ77 with a fixed window and a greedy longest match. Each step either copies one byte
// as it is (a literal) or points back: "go back `dist` bytes and copy `len`". A copy may run into the bytes it is
// making ("abcabcabc" is three literals and one pointer: back 3, copy 6). The file format is ours: a flag bit, then
// 8 bits for a literal, or 12 bits of distance and 8 of length for a pointer. Pure and synchronous.
import { BitReader, BitWriter } from './huffman';

export const WINDOW = 4096,
  MIN_MATCH = 3,
  MAX_MATCH = 258;
export const LITERAL_BITS = 9,
  POINTER_BITS = 21;

export type Token = { lit: number } | { dist: number; len: number };
export const isPointer = (t: Token): t is { dist: number; len: number } => 'dist' in t;

/** Greedy: at each place take the longest match in the window (the nearest, if tied); else one literal. */
export function tokensOf(bytes: Uint8Array): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < bytes.length; ) {
    let best = 0,
      dist = 0;
    const max = Math.min(MAX_MATCH, bytes.length - i);
    for (let d = 1; d <= Math.min(i, WINDOW); d++) {
      let n = 0;
      while (n < max && bytes[i + n] === bytes[i + n - d]) n++;
      if (n > best) {
        best = n;
        dist = d;
        if (n === max) break;
      }
    }
    if (best >= MIN_MATCH) {
      out.push({ dist, len: best });
      i += best;
    } else out.push({ lit: bytes[i++] });
  }
  return out;
}

/** The bytes back from tokens: a pointer copies byte by byte, so it may overlap what it writes. */
export function untokens(tokens: Token[]): Uint8Array {
  const out: number[] = [];
  for (const t of tokens)
    if (isPointer(t)) for (let k = 0; k < t.len; k++) out.push(out[out.length - t.dist]);
    else out.push(t.lit);
  return Uint8Array.from(out);
}

export function lz77Encode(bytes: Uint8Array): Uint8Array {
  const w = new BitWriter();
  for (const t of tokensOf(bytes))
    if (isPointer(t)) {
      w.bit(1);
      w.put(t.dist - 1, 12);
      w.put(t.len - MIN_MATCH, 8);
    } else {
      w.bit(0);
      w.put(t.lit, 8);
    }
  return w.bytes();
}
/** Reads tokens until fewer bits are left than a literal takes: the padding is under 8 bits, so it is never one. */
export function lz77Decode(packed: Uint8Array): Uint8Array {
  const r = new BitReader(packed),
    tokens: Token[] = [];
  while (r.left >= LITERAL_BITS)
    tokens.push(r.bit() ? { dist: r.get(12) + 1, len: r.get(8) + MIN_MATCH } : { lit: r.get(8) });
  return untokens(tokens);
}
