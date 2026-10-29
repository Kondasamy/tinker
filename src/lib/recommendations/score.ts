// The shelves (KTD9): every method ranks the catalogue for one customer and shows the top SHELF products they haven't
// bought. Bestsellers ranks by how many customers bought each product; people like you by what similar customers
// bought; bought together by products similar to the customer's own; hidden tastes by the dot product of two-number
// tastes. Ties go to catalogue order, so every shelf is fixed. Scoring: hit@5 counts customers whose held-out last
// order is on their shelf; coverage counts the products that are on anyone's shelf.
import pinned from '../../../data/recommendations/pinned.json' with { type: 'json' };
import { dot, type Factors, type Vec } from './factorise';
import { buyersOf, itemSimilarity, userSimilarity } from './similar';
import { CUSTOMERS, HELD_OUT, PRODUCTS, SHELF, TRAIN, type History } from './story';

const ORDER = new Map(PRODUCTS.map((p, i) => [p.id, i]));
const ALL = PRODUCTS.map(p => p.id);

/** The top n product ids by score, highest first, ties in catalogue order; products scored null are left out. */
export function topOf(score: (p: string) => number | null, exclude: readonly string[] = [], n = SHELF): string[] {
  const skip = new Set(exclude);
  return ALL.flatMap(p => {
    const s = skip.has(p) ? null : score(p);
    return s === null ? [] : [{ p, s }];
  })
    .sort((a, b) => b.s - a.s || ORDER.get(a.p)! - ORDER.get(b.p)!)
    .slice(0, n)
    .map(x => x.p);
}

/** How many customers bought each product. */
export function popularity(h: History): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(ALL.map(p => [p, 0]));
  for (const ps of Object.values(h)) for (const p of new Set(ps)) out[p]++;
  return out;
}

export type Method = 'popular' | 'users' | 'items' | 'factors';
export const METHODS: Method[] = ['popular', 'users', 'items', 'factors'];

/** The bestsellers shelf: the same for everyone, less what they already have. */
export const popularShelf = (h: History, exclude: readonly string[] = []) => {
  const pop = popularity(h);
  return topOf(p => pop[p], exclude);
};

/** Each product's score from similar customers: the sum of their similarity over those who bought it. */
export function userScores(h: History, c: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of Object.keys(h)) {
    if (o === c) continue;
    const s = userSimilarity(h, c, o);
    if (s > 0) for (const p of new Set(h[o])) out[p] = (out[p] ?? 0) + s;
  }
  return out;
}
/** Each product's score from the customer's own basket: the sum of its similarity to what they bought. */
export function itemScores(h: History, c: string, buyers = buyersOf(h)): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of ALL) for (const q of new Set(h[c] ?? [])) out[p] = (out[p] ?? 0) + itemSimilarity(buyers, p, q);
  return out;
}
/** A product's score for a taste: the dot product with its own; null for a product with no taste. */
export const tasteScore = (items: Factors['items'], taste: Vec) => (p: string) =>
  items[p] ? dot(taste, items[p]!) : null;
/** Shelf from a taste: products ranked by dot product with it; products with no taste are left out. */
export const tasteShelf = (items: Factors['items'], taste: Vec, exclude: readonly string[] = []) =>
  topOf(tasteScore(items, taste), exclude);

/** One customer's scorer by a method, leaving out what they already bought. A customer with no orders (nothing to be
 * similar to), or no taste, gets the bestsellers. */
function scorerOf(method: Method, h: History, c: string, f?: Factors, buyers?: Record<string, string[]>) {
  const own = h[c] ?? [];
  const u = method === 'factors' ? f?.users[c] : undefined;
  if (method === 'popular' || !own.length || (method === 'factors' && !u)) {
    const pop = popularity(h);
    return { score: (p: string): number | null => pop[p], exclude: own };
  }
  if (method === 'users') {
    const s = userScores(h, c);
    return { score: (p: string): number | null => s[p] ?? 0, exclude: own };
  }
  if (method === 'items') {
    const s = itemScores(h, c, buyers);
    return { score: (p: string): number | null => s[p] ?? 0, exclude: own };
  }
  return { score: tasteScore(f!.items, u!), exclude: own };
}

/** One customer's shelf by a method. */
export function shelfOf(
  method: Method,
  h: History,
  c: string,
  f?: Factors,
  buyers?: Record<string, string[]>,
): string[] {
  const { score, exclude } = scorerOf(method, h, c, f, buyers);
  return topOf(score, exclude);
}

/** Every customer's shelf by a method, over the training orders. */
export function shelvesOf(method: Method, f?: Factors, h: History = TRAIN): Record<string, string[]> {
  const buyers = buyersOf(h);
  return Object.fromEntries(CUSTOMERS.map(c => [c.id, shelfOf(method, h, c.id, f, buyers)]));
}
/** hit@5: customers whose held-out last order is on their shelf. */
export const hitsOf = (shelves: Record<string, string[]>) =>
  CUSTOMERS.filter(c => shelves[c.id]?.includes(HELD_OUT[c.id])).length;
/** Catalogue coverage: products on at least one customer's shelf. */
export const coverageOf = (shelves: Record<string, string[]>) => new Set(Object.values(shelves).flat()).size;

/** Each method's hit@5 and coverage over the training orders, the tastes from `f`. */
export const methodScores = (f: Factors) =>
  Object.fromEntries(
    METHODS.map(m => {
      const s = shelvesOf(m, f);
      return [m, { hits: hitsOf(s), coverage: coverageOf(s) }];
    }),
  ) as Record<Method, { hits: number; coverage: number }>;
/** The pinned scores the chapters quote (KTD10); tests/unit/recommendations-engine.test.ts recomputes them. */
export const SCORES = pinned.methods as Record<Method, { hits: number; coverage: number }>;

/** Where a product ranks (1 = top) for a taste, among products not excluded; null if it has no taste. */
export function rankOf(items: Factors['items'], taste: Vec, exclude: readonly string[], id: string): number | null {
  if (!items[id]) return null;
  const order = topOf(tasteScore(items, taste), exclude, ALL.length);
  const i = order.indexOf(id);
  return i < 0 ? null : i + 1;
}

/** A ranking's top rows with their scores, for the Ranking tab: the shelf is the first SHELF of them. */
export function rowsOf(score: (p: string) => number | null, exclude: readonly string[] = [], n = 8) {
  return topOf(score, exclude, n).map(id => ({ id, score: score(id)! }));
}
/** One customer's ranking by a method, as the shelf ranks it (shelfOf's first SHELF rows). */
export function methodRows(method: Method, h: History, c: string, f?: Factors, n = 8): { id: string; score: number }[] {
  const { score, exclude } = scorerOf(method, h, c, f);
  return rowsOf(score, exclude, n);
}
/** A taste's ranking: dot product with each product's taste; products without one are left out. */
export const tasteRows = (items: Factors['items'], taste: Vec, exclude: readonly string[] = [], n = 8) =>
  rowsOf(tasteScore(items, taste), exclude, n);
/** Bought together with one product: every other product by how alike their buyers are. */
export function togetherRows(h: History, p: string, n = 8) {
  const buyers = buyersOf(h);
  return rowsOf(q => itemSimilarity(buyers, p, q), [p], n);
}
