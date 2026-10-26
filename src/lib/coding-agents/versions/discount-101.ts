// Larkspur's bulk discount: 10% off an order line of 50 or more of one item, to the cent.
export const BULK_QTY = 50;
export const BULK_RATE = 0.1;

/** Whether a line is big enough for the bulk discount. */
export function isBulk(qty: number): boolean {
  return qty >= BULK_QTY;
}

/** The bulk discount on one order line, in dollars. */
export function bulkDiscount(qty: number, unitPrice: number): number {
  if (!isBulk(qty)) return 0;
  return qty * unitPrice * BULK_RATE;
}

/** What one order line costs after its discount. */
export function lineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice) - bulkDiscount(qty, unitPrice);
}
