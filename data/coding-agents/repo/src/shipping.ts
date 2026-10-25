// Shipping on an order: free over a threshold, a flat rate under it.
export const FREE_OVER = 150;
export const FLAT_RATE = 12;

/** Shipping in dollars for an order whose goods cost `goods`. */
export function shippingFor(goods: number): number {
  return goods >= FREE_OVER ? 0 : FLAT_RATE;
}
