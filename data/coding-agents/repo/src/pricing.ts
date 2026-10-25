// Larkspur's order pricing: each line after its discount, then shipping and tax on the whole order.
import { lineTotal } from './discount';
import { shippingFor } from './shipping';
import { taxOn } from './tax';

export interface Line {
  sku: string;
  qty: number;
  unitPrice: number;
}

/** What an order costs in dollars: its lines after discounts, plus shipping, plus tax. */
export function orderTotal(lines: Line[], zone: string): number {
  const goods = lines.reduce((sum, l) => sum + lineTotal(l.qty, l.unitPrice), 0);
  return goods + shippingFor(goods) + taxOn(goods, zone);
}
