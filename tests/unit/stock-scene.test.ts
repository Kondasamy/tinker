// Consistency's stage (U26): the warehouses' parts, boards, cut line and pills, the replica timeline's layout and words,
// and the stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  STOCK_BOARD,
  STOCK_PARTS,
  idleOf,
  stockAt,
  stockLabel,
  stockReadouts,
  stockScene,
  stockState,
  type StockOpts,
} from '../../src/components/scenes/stockScene';
import { replicaTimeline, tickName, timelineLabel } from '../../src/components/scenes/replicaTimeline';
import { ConsistencyStage, TimelineView } from '../../src/content/consistency/kit';
import { MOMENTS, REPS, STOCK, TICKS, policyOf, simulate } from '../../src/lib/consistency/sim';

const draw = (o: StockOpts) =>
  renderToString(createElement(IsoStage, { board: STOCK_BOARD, scene: stockScene(o), label: stockLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const ONE = simulate(policyOf({ r: 1, w: 1, rule: 'lww' }));
const CUT = simulate(policyOf({ r: 1, w: 1, rule: 'lww' }, { partition: true }));
const IDLE = idleOf(STOCK);

describe('the warehouses', () => {
  it('draws every part a callout may name', () => {
    const svg = draw({ ...IDLE });
    for (const p of STOCK_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of STOCK_PARTS) expect(draw({ ...IDLE, say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it('the board numbers match the simulator’s at every minute', () => {
    for (const run of [ONE, CUT])
      for (let t = 0; t < TICKS; t++) {
        const svg = draw(stockAt(run, t));
        for (const r of REPS) {
          const b = run.ticks[t].boards[r];
          expect(svg).toContain(`data-rep="${r}" data-hinge="${b.hinge}" data-drill="${b.drill}"`);
        }
      }
  });

  it('the cut line shows only inside a partition window', () => {
    for (let t = 0; t < TICKS; t++) {
      const o = stockAt(CUT, t),
        svg = draw(o);
      expect(svg.includes('class="break"')).toBe(CUT.ticks[t].cut);
      expect(stockState(o).cut.length).toBe(CUT.ticks[t].cut ? 2 : 0);
    }
    for (let t = 0; t < TICKS; t++) expect(draw(stockAt(ONE, t))).not.toContain('class="break"');
  });

  it('two receipts stand over the last hinge, one of them lost from the count', () => {
    const o = stockAt(ONE, MOMENTS.lastHinge),
      svg = draw(o);
    expect(count(svg, 'class="receipt')).toBe(2);
    expect(count(svg, 'class="receipt lost"')).toBe(1);
  });

  it('on phones the pills keep just the names, and the caption carries the numbers', () => {
    const o = stockAt(CUT, MOMENTS.westSells),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toMatch(/NORTH · \d+ HINGES · \d DRILL/);
    expect(wide).toContain('LINE DOWN');
    expect(phone).toContain('>NORTH<');
    expect(phone).not.toMatch(/\d+ HINGES/);
    expect(phone).not.toContain('LINE DOWN');
    expect(stockReadouts(o).join(' ')).toMatch(/North \d+\/\d.*line down/);
  });

  it('the label reads the warehouses in words', () => {
    expect(stockLabel({ ...IDLE })).toMatch(/^Three warehouses joined by a phone line/);
    expect(stockLabel(stockAt(CUT, MOMENTS.westSells))).toContain('the line to West down');
  });
});

describe('the replica timeline', () => {
  it('a column per minute, a cell per warehouse; the cut lane shaded only while the line is down', () => {
    const t = replicaTimeline(CUT);
    expect(t.columns).toHaveLength(TICKS);
    for (const c of t.columns) {
      expect(c.cells.map(x => x.rep)).toEqual(REPS);
      expect(c.cells.some(x => x.cut)).toBe(CUT.ticks[c.t].cut);
      expect(c.x + c.w).toBeLessThanOrEqual(t.w);
    }
  });

  it('marks the stale look, the arrivals and the lost sale', () => {
    const t = replicaTimeline(ONE);
    const west = (m: number) => t.columns[m].cells.find(c => c.rep === 'west')!;
    expect(west(MOMENTS.staleLook).marks).toEqual(['stale']);
    expect(west(MOMENTS.caughtUp).arrived).toBe(true);
    const sales = t.columns[MOMENTS.lastHinge].cells.flatMap(c => c.marks);
    expect(sales.sort()).toEqual(['lost', 'sold']);
  });

  it('reads each minute in words', () => {
    expect(tickName(CUT, MOMENTS.westSells)).toMatch(/^10:08, line to West down\. North .*Dev bought a drill press/);
    expect(timelineLabel(ONE)).toMatch(/^Replica timeline/);
  });

  it('draws as a list of focusable minutes, one in the tab order', () => {
    const html = renderToString(createElement(TimelineView, { result: ONE, at: 3 }));
    expect(count(html, 'role="listitem"')).toBe(TICKS);
    expect(count(html, 'tabindex="0"')).toBe(1);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the timeline tab off when there is no run', () => {
    const html = renderToString(createElement(ConsistencyStage, { show: { scene: IDLE, caption: 'Idle' } }));
    expect(html).toContain('data-prop="north"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Timeline/);
  });

  it('shows the timeline when asked, and escapes the caption', () => {
    const html = renderToString(
      createElement(ConsistencyStage, {
        view: 'timeline',
        show: { scene: stockAt(ONE, 2), result: ONE, tick: 2, caption: '<b>x</b>' },
      }),
    );
    expect(html).toContain('role="list"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
