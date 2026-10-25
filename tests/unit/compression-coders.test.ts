// Compression's coders (U9, KTD6): every site file round-trips byte-exact through each coder, the pinned sizes and
// tokens hold, the Huffman tree is pinned and meets Kraft's equality, random bytes don't shrink, real gzip sits near its
// reference, and the lossy step meets its pin.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/compression/pinned.json' with { type: 'json' };
import { CODERS, CODER_IDS, sizeOf } from '../../src/lib/compression/coders';
import { FILES, PICTURE, PUZZLE, PUZZLE_SOURCE, fileOf, randomBytes } from '../../src/lib/compression/files';
import { gzipSize } from '../../src/lib/compression/gzip';
import {
  canonical,
  codesOf,
  costOf,
  countOf,
  entropyOf,
  kraft,
  lengthsOf,
  treeOf,
} from '../../src/lib/compression/huffman';
import { lossOf, NO_LOSS } from '../../src/lib/compression/lossy';
import { tokensOf, untokens } from '../../src/lib/compression/lz77';

const enc = (s: string) => new TextEncoder().encode(s);
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

describe('every coder', () => {
  for (const f of FILES)
    for (const c of CODER_IDS)
      it(`round-trips ${f.name} byte-exact through ${c}`, () => {
        expect(same(CODERS[c].decode(CODERS[c].encode(f.bytes)), f.bytes)).toBe(true);
      });

  it('round-trips the empty file and a one-symbol file', () => {
    for (const c of CODER_IDS) {
      expect(CODERS[c].decode(CODERS[c].encode(new Uint8Array()))).toHaveLength(0);
      expect(same(CODERS[c].decode(CODERS[c].encode(enc('aaaaaaa'))), enc('aaaaaaa'))).toBe(true);
    }
  });

  it('gives the pinned sizes', () => {
    for (const f of FILES)
      for (const c of CODER_IDS) expect(sizeOf(c, f.bytes), `${f.id} ${c}`).toBe(pinned.sizes[f.id][c]);
  });
});

describe('LZ77', () => {
  it('codes "abcabcabc" as three literals and one pointer back 3, copying 6', () => {
    expect(tokensOf(enc('abcabcabc'))).toEqual(pinned.abc);
    expect(new TextDecoder().decode(untokens(pinned.abc))).toBe('abcabcabc');
  });
});

describe('Huffman', () => {
  const tree = treeOf(countOf(enc(PUZZLE)));
  it('builds the pinned tree for the puzzle text, its words read from the price list', () => {
    expect(PUZZLE_SOURCE.toLowerCase()).toContain(PUZZLE);
    expect(Object.fromEntries([...codesOf(tree)].map(([s, c]) => [String.fromCharCode(s), c]))).toEqual(
      pinned.puzzleCodes,
    );
  });
  it('meets Kraft’s equality, and canonical codes keep every length', () => {
    for (const f of FILES) {
      const lengths = lengthsOf(treeOf(countOf(f.bytes)));
      expect(kraft(lengths.values())).toBeCloseTo(1, 12);
      expect([...canonical(lengths)].map(([s, c]) => [s, c.length])).toEqual(
        [...lengths].sort((a, b) => a[1] - b[1] || a[0] - b[0]),
      );
    }
  });
  it('costs the bits of weight times depth, never below the entropy', () => {
    const bytes = fileOf('price').bytes;
    const t = treeOf(countOf(bytes));
    expect(costOf(t)).toBeGreaterThanOrEqual(entropyOf(bytes) * bytes.length);
    expect(costOf(t)).toBeLessThan((entropyOf(bytes) + 1) * bytes.length);
  });
});

describe('the site files', () => {
  it('the two texts are the corpus documents, byte for byte', () => {
    for (const [id, doc] of [
      ['price', 'price-list-2025'],
      ['product', 'kestrel-k3-launch-faq-2025'],
    ] as const)
      expect(same(fileOf(id).bytes, new Uint8Array(readFileSync(`data/corpus/${doc}.md`)))).toBe(true);
  });
  it('the random file is its seed’s bytes, and the pair can’t shrink it', () => {
    const r = fileOf('random');
    expect(same(r.bytes, randomBytes(2026, 512))).toBe(true);
    expect(sizeOf('pair', r.bytes)).toBeGreaterThanOrEqual(r.bytes.length);
    expect(entropyOf(r.bytes)).toBeGreaterThan(7.5);
  });
  it('packing a packed file again gains nothing', () => {
    const once = CODERS.pair.encode(fileOf('price').bytes);
    expect(CODERS.pair.encode(once).length).toBeGreaterThanOrEqual(once.length);
  });
  it('real gzip’s size for each file sits within 15% of its reference', async () => {
    for (const f of FILES) {
      const g = await gzipSize(f.bytes),
        ref = pinned.gzip[f.id];
      expect(Math.abs(g - ref) / ref, f.id).toBeLessThanOrEqual(0.15);
    }
  });
});

describe('the lossy step', () => {
  it('meets the pinned difference and size at the pinned setting', () => {
    const l = lossOf(PICTURE, { levels: pinned.lossy.levels, block: pinned.lossy.block });
    expect(l.diff).toBe(pinned.lossy.diff);
    expect(l.size).toBe(pinned.lossy.size);
  });
  it('keeps every pixel with no loss, and more loss means a bigger difference', () => {
    expect(same(lossOf(PICTURE, NO_LOSS).pic.rgb, PICTURE.rgb)).toBe(true);
    expect(lossOf(PICTURE, { levels: 4, block: 4 }).diff).toBeGreaterThan(
      lossOf(PICTURE, { levels: 32, block: 1 }).diff,
    );
  });
});
