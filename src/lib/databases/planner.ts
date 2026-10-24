// Databases' query engine (KTD7): runs a request against the orders table by a full scan or through one index, counting
// every page read; a planner that picks between them by a stated cost rule over estimated rows; nested-loop joins to
// the customers table; and what each index adds to a write. The planner is Larkspur's rule, not any database's: an index
// plan is estimated at the tree's height, the leaves it walks and one page per row it fetches; a scan at every page.
import workload from '../../../data/databases/workload.json' with { type: 'json' };
import { BTree, type IO, type Key } from './btree';
import { CUSTOMERS, CUSTOMER_PAGES, FANOUT, ORDERS, TABLE_PAGES, newOrders, pageOf, type Order } from './table';

export type Col = 'id' | 'customer' | 'day' | 'status';
/** A request: each column equal to a value, or within a range of values (both ends kept). */
export interface Query {
  where: Partial<Record<Col, number | [number, number]>>;
}
export const INDEXES = ['id', 'customer', 'customer_date', 'date', 'status'] as const;
export type IndexName = (typeof INDEXES)[number];
export const INDEX_COLS: Record<IndexName, Col[]> = {
  id: ['id'],
  customer: ['customer'],
  customer_date: ['customer', 'day'],
  date: ['day'],
  status: ['status'],
};
export const INDEX_NAME: Record<IndexName, string> = {
  id: 'order number',
  customer: 'customer',
  customer_date: 'customer, then date',
  date: 'date',
  status: 'status',
};
export type How = 'scan' | IndexName;

/** An index's key for a row: its columns, then the order number so every key is unique. */
const keyOf = (name: IndexName, o: Order): Key => {
  const k = INDEX_COLS[name].map(c => o[c]);
  return name === 'id' ? k : [...k, o.id];
};
const trees = new Map<IndexName, BTree>();
/** The orders table's index on these columns, bulk-loaded once into full pages. Read only: writes use their own copy. */
export function treeOf(name: IndexName) {
  if (!trees.has(name)) trees.set(name, BTree.bulk(ORDERS.map(o => [keyOf(name, o), o.id])));
  return trees.get(name)!;
}
let customerTree: BTree | undefined;
/** The customers table's index on customer number. */
export const customerIndex = () => (customerTree ??= BTree.bulk(CUSTOMERS.map(c => [[c.id], c.id])));

const matches = (o: Order, q: Query) =>
  (Object.entries(q.where) as [Col, number | [number, number]][]).every(([c, v]) =>
    typeof v === 'number' ? o[c] === v : o[c] >= v[0] && o[c] <= v[1],
  );

/** The index's bounds for a request: its leading columns while each is equal to a value, ending at the first range. */
function bounds(name: IndexName, q: Query): [Key, Key] | null {
  const lo: Key = [],
    hi: Key = [];
  for (const c of INDEX_COLS[name]) {
    const v = q.where[c];
    if (v === undefined) break;
    if (typeof v === 'number') {
      lo.push(v);
      hi.push(v);
    } else {
      lo.push(v[0]);
      hi.push(v[1]);
      break;
    }
  }
  return lo.length ? [lo, hi] : null;
}
/** The request's conditions an index's bounds cover. */
const covered = (name: IndexName, q: Query): Query => {
  const b = bounds(name, q),
    cols = INDEX_COLS[name].slice(0, b ? b[0].length : 0);
  return { where: Object.fromEntries(cols.map(c => [c, q.where[c]])) };
};

// The planner's statistics: how many rows hold each value of each column (exact here; the table is small).
const STATS = Object.fromEntries(
  (['id', 'customer', 'day', 'status'] as Col[]).map(c => {
    const m = new Map<number, number>();
    for (const o of ORDERS) m.set(o[c], (m.get(o[c]) ?? 0) + 1);
    return [c, m];
  }),
) as Record<Col, Map<number, number>>;
/** Estimated rows, column by column, as if the columns were independent. */
export function estimateRows(q: Query) {
  let share = 1;
  for (const [c, v] of Object.entries(q.where) as [Col, number | [number, number]][]) {
    let n = 0;
    if (typeof v === 'number') n = STATS[c].get(v) ?? 0;
    else for (const [x, k] of STATS[c]) if (x >= v[0] && x <= v[1]) n += k;
    share *= n / ORDERS.length;
  }
  return share * ORDERS.length;
}

export interface Plan {
  how: How;
  /** rows the plan expects to read: every row for a scan, the index's matches for an index */
  estRows: number;
  estPages: number;
}
/** Every plan the indexes allow: the scan, and each index whose first column the request names. */
export function plansFor(q: Query, indexes: readonly IndexName[]): Plan[] {
  const out: Plan[] = [{ how: 'scan', estRows: ORDERS.length, estPages: TABLE_PAGES }];
  for (const name of indexes) {
    if (!bounds(name, q)) continue;
    const rows = estimateRows(covered(name, q));
    out.push({ how: name, estRows: rows, estPages: treeOf(name).height() + Math.ceil(rows / FANOUT) - 1 + rows });
  }
  return out;
}
/** The planner's pick: the plan with the fewest estimated pages (an index wins a tie). */
export function choose(q: Query, indexes: readonly IndexName[]) {
  const plans = plansFor(q, indexes);
  const best = plans.reduce((a, p) => (p.estPages <= a.estPages ? p : a));
  return { how: best.how, plans, estRows: estimateRows(q) };
}

export interface Exec {
  how: How;
  rows: Order[];
  /** rows read from the table, matching or not */
  rowsRead: number;
  indexPages: number;
  tablePages: number;
  pages: number;
  /** each table page read at least once */
  pagesSeen: number[];
}
/** Runs a request one way, counting pages: a scan reads every table page; an index walks its tree and fetches a table
 * page for every row it points to. */
export function execute(q: Query, how: How): Exec {
  if (how === 'scan')
    return {
      how,
      rows: ORDERS.filter(o => matches(o, q)),
      rowsRead: ORDERS.length,
      indexPages: 0,
      tablePages: TABLE_PAGES,
      pages: TABLE_PAGES,
      pagesSeen: Array.from({ length: TABLE_PAGES }, (_, i) => i),
    };
  const b = bounds(how, q);
  if (!b) throw new Error(`index ${how} can't serve this request`);
  const io: IO = { reads: 0, writes: 0 },
    ids = treeOf(how).range(b[0], b[1], io),
    fetched = ids.map(id => ORDERS[id - 1]);
  return {
    how,
    rows: fetched.filter(o => matches(o, q)).sort((a, c) => a.id - c.id),
    rowsRead: fetched.length,
    indexPages: io.reads,
    tablePages: fetched.length,
    pages: io.reads + fetched.length,
    pagesSeen: [...new Set(ids.map(id => pageOf(id - 1)))].sort((a, c) => a - c),
  };
}
/** The planner's pick, run. */
export const query = (q: Query, indexes: readonly IndexName[]) => execute(q, choose(q, indexes).how);

/** A nested-loop join: for every order the outer request finds, its customer from the customers table, by scanning
 * that table each time or through its index. */
export function join(outer: Query, indexes: readonly IndexName[], innerIndex: boolean) {
  const o = query(outer, indexes),
    io: IO = { reads: 0, writes: 0 };
  // through the index: walk its tree, then fetch the customer's page; without: read every customers page
  if (innerIndex)
    for (const r of o.rows) {
      if (customerIndex().get([r.customer], io) === undefined) throw new Error(`no customer ${r.customer}`);
      io.reads++;
    }
  const innerPages = innerIndex ? io.reads : o.rows.length * CUSTOMER_PAGES;
  return { outer: o, outerRows: o.rows.length, innerPages, pages: o.pages + innerPages };
}

export const DAY_INSERTS = workload.inserts;
const written = new Map<IndexName, number>();
/** Pages one index adds to a day of new orders, measured by inserting them into a fresh copy of it. */
export function indexWrites(name: IndexName, inserts = DAY_INSERTS) {
  if (inserts === DAY_INSERTS && written.has(name)) return written.get(name)!;
  const t = BTree.bulk(ORDERS.map(o => [keyOf(name, o), o.id])),
    io: IO = { reads: 0, writes: 0 };
  for (const o of newOrders(inserts)) t.insert(keyOf(name, o), o.id, io);
  const n = io.reads + io.writes;
  if (inserts === DAY_INSERTS) written.set(name, n);
  return n;
}
/** Pages a day of new orders costs: one table page each, plus every index's pages. */
export const writeDay = (indexes: readonly IndexName[]) =>
  DAY_INSERTS + indexes.reduce((a, n) => a + indexWrites(n), 0);
/** Pages per new order, on average over the day. */
export const writeCost = (indexes: readonly IndexName[]) => writeDay(indexes) / DAY_INSERTS;
