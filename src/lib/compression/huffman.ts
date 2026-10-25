// Compression's short codes (KTD6): Huffman's code tree, built by merging the two lightest piles until one is left, ties
// broken by the smallest symbol so one text always gives one tree. The file format is ours, DEFLATE's idea: a table of
// code lengths (canonical codes rebuilt from them), the symbol count, then the codes. Pure and synchronous, like
// src/lib/git/objects.ts; tests/unit/compression-coders.test.ts round-trips every site file through it.

/** Bits written most significant first, packed into bytes; the last byte is padded with zeros. */
export class BitWriter {
  private out: number[] = [];
  private cur = 0;
  private n = 0;
  put(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) this.bit((value >>> i) & 1);
  }
  bit(b: number) {
    this.cur = (this.cur << 1) | b;
    if (++this.n === 8) this.flush();
  }
  code(c: string) {
    for (const ch of c) this.bit(ch === '1' ? 1 : 0);
  }
  private flush() {
    this.out.push(this.cur);
    this.cur = 0;
    this.n = 0;
  }
  bytes(): Uint8Array {
    if (this.n) {
      this.cur <<= 8 - this.n;
      this.flush();
    }
    return Uint8Array.from(this.out);
  }
}
export class BitReader {
  private i = 0;
  constructor(private b: Uint8Array) {}
  get left() {
    return this.b.length * 8 - this.i;
  }
  bit() {
    if (this.i >= this.b.length * 8) throw new Error('read past the end');
    const v = (this.b[this.i >> 3] >> (7 - (this.i & 7))) & 1;
    this.i++;
    return v;
  }
  get(width: number) {
    let v = 0;
    for (let k = 0; k < width; k++) v = v * 2 + this.bit();
    return v;
  }
}

/** A pile: a leaf holds one symbol; a merged pile holds two, the first picked on the 0 side. */
export interface Node {
  w: number;
  sym?: number;
  kids?: [Node, Node];
  /** the smallest symbol inside, for breaking ties */
  min: number;
}

/** How often each symbol occurs, smallest symbol first. */
export function countOf(syms: ArrayLike<number>): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = 0; i < syms.length; i++) m.set(syms[i], (m.get(syms[i]) ?? 0) + 1);
  return new Map([...m].sort((a, b) => a[0] - b[0]));
}

/** Shannon's entropy of the bytes: the fewest bits per byte any code that sees one byte at a time could average. */
export function entropyOf(bytes: Uint8Array): number {
  let h = 0;
  for (const n of countOf(bytes).values()) h -= (n / bytes.length) * Math.log2(n / bytes.length);
  return h;
}

export const leavesOf = (freq: Map<number, number>): Node[] => [...freq].map(([sym, w]) => ({ w, sym, min: sym }));
const lighter = (a: Node, b: Node) => a.w - b.w || a.min - b.min;
/** Two piles joined: the lighter (or, tied, the one with the smaller symbol) on the 0 side. */
export const join = (a: Node, b: Node): Node => {
  const [x, y] = lighter(a, b) <= 0 ? [a, b] : [b, a];
  return { w: a.w + b.w, kids: [x, y], min: Math.min(a.min, b.min) };
};

/** Huffman's rule: keep merging the two lightest piles. Null for no symbols. */
export function treeOf(freq: Map<number, number>): Node | null {
  let piles = leavesOf(freq);
  while (piles.length > 1) {
    piles = [...piles].sort(lighter);
    piles = [join(piles[0], piles[1]), ...piles.slice(2)];
  }
  return piles[0] ?? null;
}

/** Each symbol's code read off the tree (0 for the first kid, 1 for the second); a lone symbol gets "0". */
export function codesOf(tree: Node | null): Map<number, string> {
  const out = new Map<number, string>();
  const walk = (n: Node, path: string) => {
    if (n.kids) {
      walk(n.kids[0], `${path}0`);
      walk(n.kids[1], `${path}1`);
    } else out.set(n.sym!, path || '0');
  };
  if (tree) walk(tree, '');
  return new Map([...out].sort((a, b) => a[0] - b[0]));
}

/** Every leaf's weight times its depth: the bits the codes take. */
export const costOf = (tree: Node | null) =>
  [...codesOf(tree)].reduce((a, [sym, c]) => a + c.length * weightOf(tree!, sym), 0);
const weightOf = (n: Node, sym: number): number =>
  n.kids ? weightOf(n.kids[0], sym) + weightOf(n.kids[1], sym) : n.sym === sym ? n.w : 0;

/** Kraft's sum over the code lengths: exactly 1 for a full code tree. */
export const kraft = (lengths: Iterable<number>) => [...lengths].reduce((a, l) => a + 2 ** -l, 0);

/** Canonical codes from lengths alone (DEFLATE's way): shorter first, then by symbol, counting up. */
export function canonical(lengths: Map<number, number>): Map<number, string> {
  const order = [...lengths].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out = new Map<number, string>();
  let code = 0,
    len = order[0]?.[1] ?? 0;
  for (const [sym, l] of order) {
    code <<= l - len;
    len = l;
    out.set(sym, code.toString(2).padStart(l, '0'));
    code++;
  }
  return out;
}

const LEN_BITS = 5;
/** A table of code lengths: how many entries, then each symbol and its length. */
export function writeTable(w: BitWriter, lengths: Map<number, number>, symBits: number) {
  w.put(lengths.size, symBits + 1);
  for (const [sym, l] of lengths) {
    w.put(sym, symBits);
    w.put(l, LEN_BITS);
  }
}
export function readTable(r: BitReader, symBits: number): Map<number, string> {
  const n = r.get(symBits + 1),
    lengths = new Map<number, number>();
  for (let i = 0; i < n; i++) lengths.set(r.get(symBits), r.get(LEN_BITS));
  return canonical(lengths);
}
/** A reader of one symbol at a time, code bit by code bit. */
export function decoderOf(codes: Map<number, string>) {
  const back = new Map([...codes].map(([s, c]) => [c, s]));
  return (r: BitReader): number => {
    let c = '';
    for (;;) {
      c += r.bit();
      const s = back.get(c);
      if (s !== undefined) return s;
      if (c.length > 31) throw new Error('bad code');
    }
  };
}

export const lengthsOf = (tree: Node | null) => new Map([...codesOf(tree)].map(([s, c]) => [s, c.length]));
const COUNT_BITS = 24;

/** Huffman alone: the table, the byte count, then each byte's code. */
export function huffmanEncode(bytes: Uint8Array): Uint8Array {
  const lengths = lengthsOf(treeOf(countOf(bytes))),
    codes = canonical(lengths),
    w = new BitWriter();
  writeTable(w, lengths, 8);
  w.put(bytes.length, COUNT_BITS);
  for (const b of bytes) w.code(codes.get(b)!);
  return w.bytes();
}
export function huffmanDecode(packed: Uint8Array): Uint8Array {
  const r = new BitReader(packed),
    codes = readTable(r, 8),
    n = r.get(COUNT_BITS),
    read = decoderOf(codes),
    out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = read(r);
  return out;
}
