// A real B+tree (KTD7, after Bayer & McCreight 1972): keys are arrays of numbers compared column by column, each leaf
// holds up to FANOUT keys with a row id each and links to the next leaf, and each inner page up to FANOUT children.
// Every page visited counts a read and every page changed a write, so the chapters show counts the tree really did.
import { FANOUT } from './table';

export type Key = number[];
export interface IO {
  reads: number;
  writes: number;
}
export interface Leaf {
  leaf: true;
  keys: Key[];
  vals: number[];
  next: Leaf | null;
}
export interface Inner {
  leaf: false;
  /** keys[i] is the smallest key under kids[i + 1] */
  keys: Key[];
  kids: Node[];
}
export type Node = Leaf | Inner;

export function cmp(a: Key, b: Key) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length - b.length;
}
/** a against a bound that may be a prefix: only the bound's columns count */
const cmpTo = (a: Key, bound: Key) => cmp(a.slice(0, bound.length), bound);
const minKey = (n: Node): Key => (n.leaf ? n.keys[0] : minKey(n.kids[0]));
const chunk = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export class BTree {
  constructor(
    public root: Node,
    public cap = FANOUT,
  ) {}

  /** Bulk-loads sorted (or unsorted) entries into full pages, bottom up. */
  static bulk(entries: [Key, number][], cap = FANOUT) {
    const sorted = [...entries].sort((a, b) => cmp(a[0], b[0]));
    let level: Node[] = chunk(sorted, cap).map(c => ({
      leaf: true as const,
      keys: c.map(e => e[0]),
      vals: c.map(e => e[1]),
      next: null,
    }));
    level.forEach((l, i) => ((l as Leaf).next = (level[i + 1] as Leaf) ?? null));
    if (!level.length) level = [{ leaf: true, keys: [], vals: [], next: null }];
    while (level.length > 1)
      level = chunk(level, cap).map(kids => ({ leaf: false as const, kids, keys: kids.slice(1).map(minKey) }));
    return new BTree(level[0], cap);
  }

  height() {
    let n = this.root,
      h = 1;
    while (!n.leaf) {
      n = n.kids[0];
      h++;
    }
    return h;
  }

  /** The pages level by level, root first. */
  levels(): Node[][] {
    const out: Node[][] = [[this.root]];
    while (!out.at(-1)![0].leaf) out.push(out.at(-1)!.flatMap(n => (n as Inner).kids));
    return out;
  }

  /** Each leaf's depth: one value when the tree is balanced. */
  leafDepths(): number[] {
    const out: number[] = [];
    const walk = (n: Node, d: number) => (n.leaf ? out.push(d) : n.kids.forEach(k => walk(k, d + 1)));
    walk(this.root, 1);
    return out;
  }

  /** Root to leaf toward the first key at or after `lo` (a key or a prefix), a read per page. */
  private descend(lo: Key, io: IO, path: Node[] = []): Leaf {
    let n = this.root;
    for (;;) {
      io.reads++;
      path.push(n);
      if (n.leaf) return n;
      // skip a child only when everything in it is surely below lo
      let i = 0;
      while (i < n.keys.length) {
        const c = cmpTo(n.keys[i], lo);
        if (c < 0 || (c === 0 && lo.length >= n.keys[i].length)) i++;
        else break;
      }
      n = n.kids[i];
    }
  }

  /** The row id stored under exactly this key. */
  get(key: Key, io: IO): number | undefined {
    const l = this.descend(key, io),
      i = l.keys.findIndex(k => cmp(k, key) === 0);
    return i < 0 ? undefined : l.vals[i];
  }

  /** Row ids for every key between lo and hi (bounds may be prefixes), walking the leaf chain. */
  range(lo: Key, hi: Key, io: IO): number[] {
    const out: number[] = [];
    let l: Leaf | null = this.descend(lo, io);
    for (;;) {
      for (let i = 0; i < l.keys.length; i++) {
        if (cmpTo(l.keys[i], lo) < 0) continue;
        if (cmpTo(l.keys[i], hi) > 0) return out;
        out.push(l.vals[i]);
      }
      if (!l.next) return out;
      l = l.next;
      io.reads++;
    }
  }

  /** The path to a key: per level, the page's place among that level's pages. For the tree view. */
  pathTo(key: Key) {
    const path: Node[] = [];
    this.descend(key, { reads: 0, writes: 0 }, path);
    return this.levels().map((lv, d) => ({ pages: lv.length, at: lv.indexOf(path[d]), node: path[d] }));
  }

  /** Inserts a key, splitting full pages on the way back up. A write per page changed. */
  insert(key: Key, val: number, io: IO) {
    const path: Node[] = [];
    const leaf = this.descend(key, io, path);
    let at = leaf.keys.findIndex(k => cmp(k, key) > 0);
    if (at < 0) at = leaf.keys.length;
    leaf.keys.splice(at, 0, key);
    leaf.vals.splice(at, 0, val);
    io.writes++;
    let node: Node = leaf;
    for (let d = path.length - 1; d >= 0; d--) {
      const size = node.leaf ? node.keys.length : node.kids.length;
      if (size <= this.cap) return;
      const h = Math.ceil(size / 2);
      let right: Node, sep: Key;
      if (node.leaf) {
        right = { leaf: true, keys: node.keys.splice(h), vals: node.vals.splice(h), next: node.next };
        node.next = right;
        sep = right.keys[0];
      } else {
        const kids = node.kids.splice(h),
          keys = node.keys.splice(h - 1);
        sep = keys.shift()!;
        right = { leaf: false, kids, keys };
      }
      io.writes++;
      const parent = path[d - 1] as Inner | undefined;
      if (!parent) {
        this.root = { leaf: false, keys: [sep], kids: [node, right] };
        io.writes++;
        return;
      }
      const i = parent.kids.indexOf(node);
      parent.kids.splice(i + 1, 0, right);
      parent.keys.splice(i, 0, sep);
      io.writes++;
      node = parent;
    }
  }
}
