// Databases' chapters against the engine (KTD12): every reveal says what the runs show, the copy's numbers come from
// the runs, Show me lands on a winner, and the bench reads any saved state back into a set it can run.
import { describe, expect, it } from 'vitest';
import { INDEXES, choose, execute } from '../../src/lib/databases/planner';
import { SETS, START, WINNERS, benchSet, wins } from '../../src/lib/databases/workbench';
import { ORDERS } from '../../src/lib/databases/table';
import { READS } from '../../src/lib/databases/workbench';
import * as ch1 from '../../src/content/databases/01-find-one-order';
import * as ch2 from '../../src/content/databases/02-the-index';
import * as ch3 from '../../src/content/databases/03-every-write-pays';
import * as ch4 from '../../src/content/databases/04-column-order';
import * as ch5 from '../../src/content/databases/05-planner-skips';
import * as ch6 from '../../src/content/databases/06-joining-tables';
import * as ch7 from '../../src/content/databases/07-index-plan';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: a million rows scan about a hundred times the pages', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/a scan reads every page/);
    expect(ch1.MILLION.scan).toBe(ch1.SCAN.pages * 100);
  });
  it('chapter 2: the lookup reads one page per level, then the row; far fewer than the scan', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/one page per level/);
    expect(ch2.LOOK.pages).toBeLessThan(ch2.SCAN.pages / 20);
    expect(ch2.LOOK.rows.map(o => o.id)).toEqual([1042]);
  });
  it('chapter 3: indexes make every insert cost more', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^It grows/);
  });
  it('chapter 4: the (customer, date) index serves the regular’s month, and the month alone scans', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^Scan the whole table/);
    expect(ch4.MINE_RUN.how).toBe('customer_date');
    expect(ch4.MONTH_RUN.how).toBe('scan');
  });
  it('chapter 5: today goes through the index, the month scans, and forcing the index reads more', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^A full scan/);
    expect(ch5.TODAY_PLAN.how).toBe('date');
    expect(ch5.FORCED.pages).toBeGreaterThan(ch5.MONTH_RUN.pages);
    expect(ch5.TODAY_PLAN.estRows / ORDERS.length).toBeLessThan(ch5.BREAK_EVEN);
    expect(ch5.MONTH_PLAN.estRows / ORDERS.length).toBeGreaterThan(ch5.BREAK_EVEN);
  });
  it('chapter 6: the customers index cuts the inner reads to its height plus one per order', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^Fewer/);
    expect(ch6.FAST.innerPages).toBe(ch6.FAST.outerRows * ch6.PER_ROW);
  });
});

describe('every control’s domain runs', () => {
  it('every workload request under every set of indexes', () => {
    for (const s of SETS) for (const r of READS) expect(() => execute(r.query, choose(r.query, s).how)).not.toThrow();
    for (const r of READS) expect(execute(r.query, 'scan').rows.length).toBeGreaterThan(0);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { set: [...START], view: 'scene' as const, quiz: null };
  it('Show me lands on a set in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS.some(w => w.join() === benchSet(shown.set).join())).toBe(true);
  });
  it('the start is not a winner, and order of picking doesn’t matter', () => {
    expect(wins(START)).toBe(false);
    expect(wins([...WINNERS[0]].reverse())).toBe(true);
  });
  it('a saved state with unknown names keeps only the known ones', () => {
    expect(benchSet(['id', 'nope', 'date'])).toEqual(['id', 'date']);
    expect(benchSet('x')).toEqual(START);
    for (const i of benchSet([...INDEXES, 'x'])) expect(INDEXES).toContain(i);
  });
});
