// Similarity for the Recommendations module (KTD9): cosine over who bought what. Two customers are alike when they
// bought the same products; two products are alike when the same customers bought them. Bought or not is all that
// counts, so cosine is the shared count over the square root of the two counts.
import type { History } from './story';

/** Cosine of two sets of ids: shared over the root of the sizes; 0 when either is empty. */
export function cosine(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  const shared = new Set(a.filter(x => B.has(x))).size;
  return shared / Math.sqrt(new Set(a).size * B.size);
}

/** How alike two customers' baskets are. */
export const userSimilarity = (h: History, a: string, b: string) => cosine(h[a] ?? [], h[b] ?? []);

/** Who bought each product, once each. */
export function buyersOf(h: History): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [c, ps] of Object.entries(h)) for (const p of new Set(ps)) (out[p] ??= []).push(c);
  return out;
}
/** How alike two products are: the same customers bought them. */
export const itemSimilarity = (buyers: Record<string, string[]>, a: string, b: string) =>
  cosine(buyers[a] ?? [], buyers[b] ?? []);

/** A customer's most similar other customers, most alike first (ties by id), only those with something shared. */
export function neighbours(h: History, c: string, k = 3): { id: string; sim: number }[] {
  return Object.keys(h)
    .filter(o => o !== c)
    .map(id => ({ id, sim: userSimilarity(h, c, id) }))
    .filter(n => n.sim > 0)
    .sort((a, b) => b.sim - a.sim || a.id.localeCompare(b.id))
    .slice(0, k);
}
