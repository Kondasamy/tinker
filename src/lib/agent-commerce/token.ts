// Paying without the card (chapter 6): once the shop accepts an order, the buyer's payment provider issues a token for
// that one order, that merchant and that amount (the shape of ACP's shared payment token, fact `acp-spt`). The card
// number never reaches the agent or the shop. A token charged twice, or on another order or amount, is refused.
import type { Order } from './shop';
import { totalOf } from './story';

export interface Token {
  id: string;
  order: string;
  merchant: string;
  amount: number;
  currency: string;
}
export interface Charge {
  order: string;
  merchant: string;
  amount: number;
  currency: string;
}
export type Refusal = 'spent' | 'order' | 'merchant' | 'amount';
export const REASONS: Record<Refusal, string> = {
  spent: 'this token was already used',
  order: 'this token is for another order',
  merchant: 'this token is for another shop',
  amount: 'this token is for another amount',
};

/** FNV-1a, so a token's id is fixed by what it is bound to (the id carries no secret here; it is a stand-in). */
const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
};

export function issue(o: Order): Token {
  const amount = totalOf(o.lines);
  return {
    id: `tok_${fnv(`${o.id}|${o.merchant}|${amount}|${o.currency}`)}`,
    order: o.id,
    merchant: o.merchant,
    amount,
    currency: o.currency,
  };
}
export const chargeOf = (o: Order): Charge => ({
  order: o.id,
  merchant: o.merchant,
  amount: totalOf(o.lines),
  currency: o.currency,
});

/** Charge a token; `spent` holds the ids already charged. A refused charge leaves `spent` as it was. */
export function redeem(
  t: Token,
  c: Charge,
  spent: readonly string[],
): { ok: true; spent: string[] } | { ok: false; why: Refusal; spent: readonly string[] } {
  const why: Refusal | null = spent.includes(t.id)
    ? 'spent'
    : c.order !== t.order
      ? 'order'
      : c.merchant !== t.merchant
        ? 'merchant'
        : c.amount !== t.amount || c.currency !== t.currency
          ? 'amount'
          : null;
  return why ? { ok: false, why, spent } : { ok: true, spent: [...spent, t.id] };
}
