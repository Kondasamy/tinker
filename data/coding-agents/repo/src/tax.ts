// Sales tax by delivery zone, as a share of the goods. Zones not listed pay none.
export const RATES: Record<string, number> = { north: 0.05, south: 0.06 };

/** Tax in dollars on goods delivered to a zone, to the cent. */
export function taxOn(goods: number, zone: string): number {
  return Math.round(goods * (RATES[zone] ?? 0) * 100) / 100;
}
