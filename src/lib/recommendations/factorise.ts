// Hidden tastes (KTD9): two numbers per customer and per product, found by alternating least squares over who bought
// what, in the implicit-feedback form of Hu, Koren and Volinsky (2008): a purchase is a preference of 1 held with
// confidence 1 + ALPHA, a product not bought a preference of 0 held with confidence 1. Seeded and run for a fixed number
// of rounds, so the same orders always give the same numbers; with two factors, the numbers are the taste map itself.
// It runs at build and test time only: the browser reads the pinned results (factors.json, loop.json) and never
// factorises (R3).
import pinnedFactors from '../../../data/recommendations/factors.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';
import type { History } from './story';

export type Vec = [number, number];
export interface Factors {
  /** customer id → taste; null for a customer with no orders */
  users: Record<string, Vec | null>;
  /** product id → taste; null for a product nobody has bought (cold start) */
  items: Record<string, Vec | null>;
}

export const FACTORS = 2;
export const ITERS = 15;
export const LAMBDA = 0.1;
export const ALPHA = 16;
export const SEED = 7;

/** One side's solve: for each row, the 2-vector that best fits its preferences against the other side's vectors. */
function solve(rows: string[], cols: string[], other: Record<string, Vec>, has: (r: string, c: string) => boolean) {
  // Σ y yᵀ over every column, shared by all rows; each row then adds ALPHA y yᵀ for what it bought
  let g00 = 0,
    g01 = 0,
    g11 = 0;
  for (const c of cols) {
    const [a, b] = other[c];
    g00 += a * a;
    g01 += a * b;
    g11 += b * b;
  }
  const out: Record<string, Vec> = {};
  for (const r of rows) {
    let a00 = g00 + LAMBDA,
      a01 = g01,
      a11 = g11 + LAMBDA,
      b0 = 0,
      b1 = 0;
    for (const c of cols) {
      if (!has(r, c)) continue;
      const [x, y] = other[c];
      a00 += ALPHA * x * x;
      a01 += ALPHA * x * y;
      a11 += ALPHA * y * y;
      b0 += (1 + ALPHA) * x;
      b1 += (1 + ALPHA) * y;
    }
    const det = a00 * a11 - a01 * a01;
    out[r] = [(a11 * b0 - a01 * b1) / det, (a00 * b1 - a01 * b0) / det];
  }
  return out;
}

/** Factorise who bought what over the given products: ITERS rounds of ALS from a seeded start. */
export function factorise(h: History, products: string[], seed = SEED): Factors {
  const users = Object.keys(h);
  const bought = new Set(users.flatMap(u => h[u].map(p => `${u}|${p}`)));
  const has = (u: string, p: string) => bought.has(`${u}|${p}`);
  const rand = mulberry32(seed);
  let Y: Record<string, Vec> = Object.fromEntries(products.map(p => [p, [rand() * 0.1, rand() * 0.1] as Vec]));
  let X: Record<string, Vec> = {};
  for (let i = 0; i < ITERS; i++) {
    X = solve(users, products, Y, has);
    Y = solve(products, users, X, (p, u) => has(u, p));
  }
  const buyers = new Set(users.flatMap(u => h[u]));
  const xs = users.filter(u => h[u].length),
    ys = products.filter(p => buyers.has(p));
  // ALS splits the scale between the sides at random; shrink one and grow the other by the same factor so shoppers and
  // products share the map. Every dot product, so every ranking, is unchanged.
  const norm = (vs: Vec[]) => vs.reduce((a, v) => a + Math.hypot(v[0], v[1]), 0) / Math.max(1, vs.length);
  const k = Math.sqrt(norm(ys.map(p => Y[p])) / norm(xs.map(u => X[u])) || 1);
  return {
    users: Object.fromEntries(users.map(u => [u, h[u].length ? ([X[u][0] * k, X[u][1] * k] as Vec) : null])),
    items: Object.fromEntries(products.map(p => [p, buyers.has(p) ? ([Y[p][0] / k, Y[p][1] / k] as Vec) : null])),
  };
}

export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];

/** A new shopper's taste (cold start): the mean of the products they pick, those with a taste; null if none has one. */
export function tasteOf(items: Factors['items'], picks: string[]): Vec | null {
  const vs = picks.map(p => items[p]).filter((v): v is Vec => !!v);
  if (!vs.length) return null;
  return [vs.reduce((a, v) => a + v[0], 0) / vs.length, vs.reduce((a, v) => a + v[1], 0) / vs.length];
}

/** The pinned tastes (KTD9, factors.json): from the training orders, and once the new product has its first order.
 * tests/unit/recommendations-engine.test.ts factorises again and fails on drift. */
export const BASE = pinnedFactors.base as unknown as Factors;
export const AFTER_FIRST = pinnedFactors.afterFirst as unknown as Factors;

/** The tastes turned (or mirrored) about the origin to sit as near as they can to `ref`'s, product by product. Every
 * dot product, so every ranking, is unchanged; it only keeps the map from spinning between refits, since ALS fixes
 * the numbers only up to such a turn. */
export function align(f: Factors, ref: Factors['items']): Factors {
  const pairs = Object.keys(f.items).flatMap(p => (f.items[p] && ref[p] ? [[f.items[p]!, ref[p]!] as const] : []));
  const turn = (flip: number) => {
    let c = 0,
      s = 0;
    for (const [[x, y], [a, b]] of pairs) {
      c += x * a + flip * y * b;
      s += x * b - flip * y * a;
    }
    const t = Math.atan2(s, c);
    const m = (v: Vec): Vec => [
      v[0] * Math.cos(t) - flip * v[1] * Math.sin(t),
      v[0] * Math.sin(t) + flip * v[1] * Math.cos(t),
    ];
    const err = pairs.reduce((e, [v, r]) => {
      const w = m(v);
      return e + (w[0] - r[0]) ** 2 + (w[1] - r[1]) ** 2;
    }, 0);
    return { m, err };
  };
  const a = turn(1),
    b = turn(-1),
    { m } = a.err <= b.err ? a : b;
  const each = (side: Record<string, Vec | null>) =>
    Object.fromEntries(Object.entries(side).map(([k, v]) => [k, v ? m(v) : null]));
  return { users: each(f.users), items: each(f.items) };
}
