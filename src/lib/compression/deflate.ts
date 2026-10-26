// Compression's pair (KTD6): DEFLATE's shape, our own file. LZ77 first; then Huffman codes the result, one tree for
// literals and lengths (0–255 a byte, 256 the end, 257–285 a length) and one for distances, each length and distance
// code followed by its extra bits, with DEFLATE's own tables. Real gzip runs the same idea with smarter matching and a
// tighter table, so ours sits near it (gzip.ts measures it). Pure and synchronous.
import {
  BitReader,
  BitWriter,
  countOf,
  decoderOf,
  canonical,
  lengthsOf,
  treeOf,
  writeTable,
  readTable,
} from './huffman';
import { isPointer, tokensOf, untokens, type Token } from './lz77';

const LEN_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073,
];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
export const END = 256;

/** The last table entry at or below v. */
const slot = (base: number[], v: number) => {
  let i = base.length - 1;
  while (base[i] > v) i--;
  return i;
};

interface Coded {
  sym: number;
  extra?: [number, number];
  dist?: { sym: number; extra: [number, number] };
}
/** Each token as its literal/length symbol (and extra bits), plus a distance symbol for a pointer; then END. */
function symbolsOf(tokens: Token[]): Coded[] {
  const out: Coded[] = tokens.map(t => {
    if (!isPointer(t)) return { sym: t.lit };
    const l = slot(LEN_BASE, t.len),
      d = slot(DIST_BASE, t.dist);
    return {
      sym: 257 + l,
      extra: [t.len - LEN_BASE[l], LEN_EXTRA[l]],
      dist: { sym: d, extra: [t.dist - DIST_BASE[d], DIST_EXTRA[d]] },
    };
  });
  return [...out, { sym: END }];
}

/** The pair: two code tables, then every symbol's code and extra bits. */
export function deflateEncode(bytes: Uint8Array): Uint8Array {
  const syms = symbolsOf(tokensOf(bytes));
  const litLen = lengthsOf(treeOf(countOf(syms.map(s => s.sym)))),
    distLen = lengthsOf(treeOf(countOf(syms.flatMap(s => (s.dist ? [s.dist.sym] : [])))));
  const lit = canonical(litLen),
    dist = canonical(distLen),
    w = new BitWriter();
  writeTable(w, litLen, 9);
  writeTable(w, distLen, 5);
  for (const s of syms) {
    w.code(lit.get(s.sym)!);
    if (s.extra) w.put(...s.extra);
    if (s.dist) {
      w.code(dist.get(s.dist.sym)!);
      w.put(...s.dist.extra);
    }
  }
  return w.bytes();
}

export function deflateDecode(packed: Uint8Array): Uint8Array {
  const r = new BitReader(packed),
    lit = decoderOf(readTable(r, 9)),
    dist = decoderOf(readTable(r, 5)),
    tokens: Token[] = [];
  for (let s = lit(r); s !== END; s = lit(r)) {
    if (s < END) {
      tokens.push({ lit: s });
      continue;
    }
    const l = s - 257,
      len = LEN_BASE[l] + r.get(LEN_EXTRA[l]),
      d = dist(r);
    tokens.push({ len, dist: DIST_BASE[d] + r.get(DIST_EXTRA[d]) });
  }
  return untokens(tokens);
}
