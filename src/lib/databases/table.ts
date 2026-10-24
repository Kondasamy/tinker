// Databases' orders table (KTD7): 10,000 orders generated from a seed, laid out 50 to a page, and a customers table
// beside it. Sizes come from data/databases/assumptions.json, Larkspur's labelled teaching numbers. The million-row
// counts are computed by formula from the same page sizes (`scaleTo`), never stored.
import data from '../../../data/databases/assumptions.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';

export const ASSUMPTIONS = data;
export const ROWS_PER_PAGE = data.rowsPerPage;
/** keys per index page, leaf or inner */
export const FANOUT = data.fanout;
export const STATUSES = ['shipped', 'open', 'returned'] as const;
export type Status = (typeof STATUSES)[number];

export interface Order {
  id: number;
  customer: number;
  /** days since the first day of the table, data.start */
  day: number;
  /** an index into STATUSES */
  status: number;
}

const DAY_MS = 86_400_000,
  START = Date.parse(`${data.start}T00:00:00Z`);
/** How many days the table spans, the first and the last included. */
export const DAYS = (Date.parse(`${data.end}T00:00:00Z`) - START) / DAY_MS + 1;
export const TODAY = DAYS - 1;
const dateOf = (day: number) => new Date(START + day * DAY_MS);
/** "24 Oct" */
export const dayName = (day: number) =>
  dateOf(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
/** This month so far, as a day range: from the 1st to today. */
export const MONTH: [number, number] = [TODAY - (dateOf(TODAY).getUTCDate() - 1), TODAY];
export const MONTH_NAME = dateOf(TODAY).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });

/** The orders, oldest first: dates rise with the order number, customers are drawn at random, the last fortnight's
 * orders are open, and about one older order in a hundred was returned. */
export function makeOrders(n = data.orders, seed = data.seed): Order[] {
  const r = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const day = Math.floor((i * DAYS) / n),
      customer = 1 + Math.floor(r() * data.customers),
      back = r() < data.returnedShare;
    return { id: i + 1, customer, day, status: day > TODAY - data.openDays ? 1 : back ? 2 : 0 };
  });
}
export const ORDERS = makeOrders();
export const CUSTOMERS = Array.from({ length: data.customers }, (_, i) => ({ id: i + 1 }));

export const pagesFor = (rows: number) => Math.ceil(rows / ROWS_PER_PAGE);
export const TABLE_PAGES = pagesFor(ORDERS.length);
export const CUSTOMER_PAGES = pagesFor(CUSTOMERS.length);
/** the table page a row sits on, by its place in the table */
export const pageOf = (row: number) => Math.floor(row / ROWS_PER_PAGE);

/** A bulk-loaded tree's height over `rows` keys: ⌈log_fanout(leaves)⌉ + 1, counted level by level. */
export function heightFor(rows: number) {
  let pages = Math.ceil(rows / FANOUT),
    h = 1;
  while (pages > 1) {
    pages = Math.ceil(pages / FANOUT);
    h++;
  }
  return h;
}
/** Pages read to find one row at `rows` rows: a full scan reads every page; a lookup walks the tree and fetches one
 * table page. The formula behind chapter 1's million (the copy says it is computed). */
export const scaleTo = (rows: number) => ({ scan: pagesFor(rows), lookup: heightFor(rows) + 1 });

/** The customer with the most orders this month: chapter 4's regular, and the workbench's. */
export const REGULAR = (() => {
  const n = new Map<number, number>();
  for (const o of ORDERS) if (o.day >= MONTH[0]) n.set(o.customer, (n.get(o.customer) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
})();

/** A day's new orders, written today: chapter 3's and the workbench's inserts. */
export const newOrders = (n: number): Order[] => {
  const r = mulberry32(data.seed + 1);
  return Array.from({ length: n }, (_, i) => ({
    id: ORDERS.length + i + 1,
    customer: 1 + Math.floor(r() * data.customers),
    day: TODAY,
    status: 1,
  }));
};

export const fmt = (n: number) => n.toLocaleString('en-US');
