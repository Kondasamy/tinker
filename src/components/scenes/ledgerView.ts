// The Payments stage's precise view (U13): the ledger. A row per order, a column per party, each cell the party's net
// for that order by the end of tick t (money in positive, money out negative), and a totals row. Every row sums to
// zero: money only moves between the parties. Pure, so the tests read it and the kit renders it as a table.
import { PARTIES, type Party, type Run } from '../../lib/payments/sim';

export interface LedgerRow {
  id: string;
  who: string;
  item: string;
  cells: Record<Party, number>;
}
export interface Ledger {
  rows: LedgerRow[];
  totals: Record<Party, number>;
}

const zero = () => Object.fromEntries(PARTIES.map(p => [p, 0])) as Record<Party, number>;

/** The ledger at tick t: orders that have moved money so far (or just `ids`), in order. */
export function ledgerAt(r: Run, t: number, ids?: string[]): Ledger {
  const rows: LedgerRow[] = [];
  for (const o of r.orders) {
    if (ids && !ids.includes(o.order.id)) continue;
    const cells = zero();
    let moved = false;
    for (const e of o.events)
      if (e.t <= t && e.entries) {
        moved = true;
        for (const [p, c] of Object.entries(e.entries)) cells[p as Party] += c;
      }
    if (moved || ids) rows.push({ id: o.order.id, who: o.order.who, item: o.order.item, cells });
  }
  const totals = zero();
  for (const row of rows) for (const p of PARTIES) totals[p] += row.cells[p];
  return { rows, totals };
}
