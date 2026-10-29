// The shop's checks (KTD7), run live on every order: the signature, then each signed term. The shop reads only the
// slip and the order, never what an agent or a seller says, so a message that "raises the limit" changes no signed
// field and the cap still holds. Each failure gives its own reason; the scene stamps one field per check.
import { addHours, type Mandate, type Slip, verify } from './mandate';
import { BUILDER, itemOf, type Line, type Seller, TODAY, totalOf, usd } from './story';

export const FIELDS = ['signature', 'merchant', 'items', 'cap', 'expiry', 'nonce'] as const;
export type Field = (typeof FIELDS)[number];

export interface Order {
  id: string;
  merchant: string;
  lines: Line[];
  currency: string;
  /** ISO time the seller charges */
  at: string;
}
export interface Check {
  field: Field;
  pass: boolean;
  reason: string;
}
export interface Verdict {
  ok: boolean;
  checks: Check[];
}

/** The order a seller's offer makes, charged `delayHours` after now. */
export const orderOf = (s: Seller, id = `order-${s.id}`): Order => ({
  id,
  merchant: s.domain,
  lines: s.lines,
  currency: s.currency,
  at: addHours(TODAY, s.delayHours),
});

const allows = (items: string[], sku: string) =>
  items.includes('*') || items.includes(sku) || items.includes(`category:${itemOf(sku)?.category}`);

/** The five signed terms, checked against the order; `spent` holds every nonce the shop has already taken. */
export function checkTerms(m: Mandate, o: Order, spent: readonly string[]): Check[] {
  const total = totalOf(o.lines);
  const outside = o.lines.find(l => !allows(m.items, l.sku));
  const sameMoney = o.currency === m.currency;
  return [
    m.merchants.includes('*') || m.merchants.includes(o.merchant)
      ? { field: 'merchant', pass: true, reason: `${o.merchant} is on the slip` }
      : { field: 'merchant', pass: false, reason: `${o.merchant} is not on the slip` },
    outside
      ? { field: 'items', pass: false, reason: `${itemOf(outside.sku)?.name ?? outside.sku} is not on the slip` }
      : { field: 'items', pass: true, reason: 'every item is on the slip' },
    !sameMoney
      ? { field: 'cap', pass: false, reason: `priced in ${o.currency}, the slip is in ${m.currency}` }
      : total > m.cap
        ? { field: 'cap', pass: false, reason: `${usd(total)} is over the ${usd(m.cap)} cap` }
        : { field: 'cap', pass: true, reason: `${usd(total)} is within the ${usd(m.cap)} cap` },
    Date.parse(o.at) > Date.parse(m.expiry)
      ? { field: 'expiry', pass: false, reason: 'the slip ran out before this charge' }
      : { field: 'expiry', pass: true, reason: 'charged before the slip runs out' },
    spent.includes(m.nonce)
      ? { field: 'nonce', pass: false, reason: 'this slip was already spent on another order' }
      : { field: 'nonce', pass: true, reason: 'first use of this slip' },
  ];
}

/** Every check, the signature first. A slip whose signature fails is refused whatever its terms say. */
export async function checkOrder(slip: Slip, o: Order, spent: readonly string[]): Promise<Verdict> {
  const signed = await verify(slip);
  const checks: Check[] = [
    signed
      ? { field: 'signature', pass: true, reason: `signed by ${BUILDER.name}` }
      : { field: 'signature', pass: false, reason: `not ${BUILDER.name}’s signature on these terms` },
    ...checkTerms(slip.mandate, o, spent),
  ];
  return { ok: checks.every(c => c.pass), checks };
}
