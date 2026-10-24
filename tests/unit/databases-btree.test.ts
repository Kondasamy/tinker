// Databases engine (KTD7): a real B+tree over a generated orders table, pages counted for scans, lookups, inserts and
// joins; the planner's stated cost rule; the million-row formula; chapter 7's workbench.
import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_PAGES,
  FANOUT,
  MONTH,
  ORDERS,
  REGULAR,
  ROWS_PER_PAGE,
  TABLE_PAGES,
  TODAY,
  heightFor,
  makeOrders,
  scaleTo,
} from '../../src/lib/databases/table';
import { BTree, cmp } from '../../src/lib/databases/btree';
import { choose, execute, join, query, treeOf, writeCost, type Query } from '../../src/lib/databases/planner';
import { BUDGET, SETS, WINNERS, readPages, wins, writePages } from '../../src/lib/databases/workbench';

const ids = () => BTree.bulk(ORDERS.map(o => [[o.id], o.id]));

describe('the orders table', () => {
  it('is generated from a seed: the same every time, order 1042 in it', () => {
    expect(makeOrders()).toEqual(ORDERS);
    expect(ORDERS).toHaveLength(10_000);
    expect(ORDERS.find(o => o.id === 1042)).toBeTruthy();
    expect(TABLE_PAGES).toBe(10_000 / ROWS_PER_PAGE);
  });
});

describe('the B+tree', () => {
  it('a lookup for order 1042 returns its row and reads the tree’s height in pages', () => {
    const t = ids(),
      io = { reads: 0, writes: 0 };
    expect(t.get([1042], io)).toBe(1042);
    const leaves = Math.ceil(ORDERS.length / FANOUT);
    const h = Math.ceil(Math.log(leaves) / Math.log(FANOUT)) + 1;
    expect(t.height()).toBe(h);
    expect(io.reads).toBe(h);
  });

  it('a full scan reads every page', () => {
    const r = execute({ where: { id: 1042 } }, 'scan');
    expect(r.tablePages).toBe(TABLE_PAGES);
    expect(r.rowsRead).toBe(ORDERS.length);
    expect(r.rows.map(o => o.id)).toEqual([1042]);
  });

  it('after 1,000 inserts the tree stays balanced and every lookup still succeeds', () => {
    const t = BTree.bulk(ORDERS.map(o => [[o.customer, o.id], o.id]));
    const io = { reads: 0, writes: 0 };
    for (let i = 0; i < 1000; i++) t.insert([(i * 37) % 1000, 20_000 + i], 20_000 + i, io);
    expect(new Set(t.leafDepths()).size).toBe(1);
    for (let i = 0; i < 1000; i += 7) expect(t.get([(i * 37) % 1000, 20_000 + i], io)).toBe(20_000 + i);
    for (const o of ORDERS.slice(0, 500)) expect(t.get([o.customer, o.id], io)).toBe(o.id);
    const keys = t
      .levels()
      .at(-1)!
      .flatMap(l => l.keys);
    for (let i = 1; i < keys.length; i++) expect(cmp(keys[i - 1], keys[i])).toBeLessThan(0);
  });

  it('a range scan finds exactly the matching keys', () => {
    const t = treeOf('customer_date');
    const got = t.range([REGULAR, MONTH[0]], [REGULAR, MONTH[1]], { reads: 0, writes: 0 }).sort((a, b) => a - b);
    const want = ORDERS.filter(o => o.customer === REGULAR && o.day >= MONTH[0] && o.day <= MONTH[1]).map(o => o.id);
    expect(got).toEqual(want);
    expect(want.length).toBeGreaterThan(1);
  });
});

describe('every write pays', () => {
  it('each insert with an index costs more pages than without, and more indexes cost more', () => {
    expect(writeCost([])).toBe(1);
    expect(writeCost(['id'])).toBeGreaterThan(writeCost([]));
    expect(writeCost(['id', 'customer'])).toBeGreaterThan(writeCost(['id']));
  });
});

describe('column order', () => {
  const mine: Query = { where: { customer: REGULAR, day: MONTH } },
    month: Query = { where: { day: MONTH } };
  it('a (customer, date) index serves “a customer’s orders this month” and not “all orders this month”', () => {
    expect(choose(mine, ['customer_date']).how).toBe('customer_date');
    expect(choose(month, ['customer_date']).how).toBe('scan');
    const r = query(mine, ['customer_date']);
    expect(r.pages).toBeLessThan(TABLE_PAGES / 10);
  });
});

describe('the planner', () => {
  it('picks the index for a few rows and a scan once the estimated rows pass the break-even share', () => {
    const today: Query = { where: { day: [TODAY, TODAY] } },
      month: Query = { where: { day: MONTH } };
    const a = choose(today, ['date']),
      b = choose(month, ['date']);
    expect(a.how).toBe('date');
    expect(b.how).toBe('scan');
    // the rule: an index plan's estimate is its height, its leaves and a page per row; past the scan's pages it loses
    expect(b.plans.find(p => p.how === 'date')!.estPages).toBeGreaterThan(TABLE_PAGES);
    expect(a.estRows / ORDERS.length).toBeLessThan(1 / ROWS_PER_PAGE);
    expect(b.estRows / ORDERS.length).toBeGreaterThan(1 / ROWS_PER_PAGE);
    // forcing the index really reads more than the scan
    expect(execute(month, 'date').pages).toBeGreaterThan(execute(month, 'scan').pages);
  });
});

describe('joins', () => {
  it('a nested loop over a scan reads the customers table once per order; over an index, the tree’s height', () => {
    const outer: Query = { where: { day: [TODAY, TODAY] } };
    const slow = join(outer, ['date'], false),
      fast = join(outer, ['date'], true);
    expect(slow.outerRows).toBe(fast.outerRows);
    expect(slow.innerPages).toBe(slow.outerRows * CUSTOMER_PAGES);
    expect(fast.innerPages).toBe(slow.outerRows * (heightFor(1000) + 1));
    expect(fast.pages).toBeLessThan(slow.pages / 3);
  });
});

describe('a million rows, by formula', () => {
  it('matches the measured counts at 10,000 rows', () => {
    const s = scaleTo(ORDERS.length);
    expect(s.scan).toBe(execute({ where: { id: 1042 } }, 'scan').pages);
    expect(s.lookup).toBe(execute({ where: { id: 1042 } }, 'id').pages);
    const m = scaleTo(1_000_000);
    expect(m.scan).toBe(20_000);
    expect(m.lookup).toBe(heightFor(1_000_000) + 1);
    expect(m.lookup).toBeLessThan(10);
  });
});

describe('the workbench', () => {
  it('covers every set of indexes, and WINNERS is non-empty and within the write budget', () => {
    expect(SETS).toHaveLength(32);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) {
      expect(writePages(w)).toBeLessThanOrEqual(BUDGET);
      expect(wins(w)).toBe(true);
    }
    const best = readPages(WINNERS[0]);
    for (const s of SETS) if (writePages(s) <= BUDGET) expect(readPages(s)).toBeGreaterThanOrEqual(best);
  });

  it('the budget binds: the set with every index reads least but writes too much', () => {
    const all = SETS.find(s => s.length === 5)!;
    expect(writePages(all)).toBeGreaterThan(BUDGET);
    expect(readPages(all)).toBeLessThanOrEqual(readPages(WINNERS[0]));
  });
});
