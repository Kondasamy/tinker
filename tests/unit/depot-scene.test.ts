// Caching's stage (U18): the depot map's parts, pills and stale tags, the cache timeline's layout and words, and the
// stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  DEPOT_BOARD,
  DEPOT_PARTS,
  IDLE,
  depotAt,
  depotLabel,
  depotReadouts,
  depotScene,
  type DepotOpts,
} from '../../src/components/scenes/depotScene';
import { cacheTimeline, tickName, timelineLabel } from '../../src/components/scenes/cacheTimeline';
import { CachingStage, TimelineView } from '../../src/content/caching/kit';
import { EDGES, MOMENTS, OFF, TICKS, TTLS, policyOf, simulate } from '../../src/lib/caching/sim';

const draw = (o: DepotOpts) =>
  renderToString(createElement(IsoStage, { board: DEPOT_BOARD, scene: depotScene(o), label: depotLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const DAY = TTLS.at(-1)!;
const stale = simulate(policyOf({ ttl: { price: DAY, photo: DAY, stock: DAY } }));
const rush = simulate(policyOf({ ttl: { price: DAY, photo: DAY, stock: 1 }, purge: true }));

describe('the depot map', () => {
  it('draws every part a callout may name', () => {
    const svg = draw({ ...IDLE });
    for (const p of DEPOT_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of DEPOT_PARTS) expect(draw({ ...IDLE, say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it('a truck rides a road for each trip, three at most; shelves hold the kept kinds', () => {
    const o = depotAt(simulate(OFF), MOMENTS.sale);
    const svg = draw(o);
    expect(count(svg, 'class="truck"')).toBe(9);
    expect(count(svg, 'class="truck queued"')).toBeGreaterThan(0);
    expect(svg).toContain('data-overloaded="1"');
    expect(count(svg, 'data-kept="1"')).toBe(0);
    const day = draw(depotAt(rush, 30));
    expect(count(day, 'data-kept="1"')).toBeGreaterThan(0);
  });

  it('the stale tag shows only on a warehouse that served a stale copy this quarter hour', () => {
    for (let t = 0; t < TICKS; t++) {
      const o = depotAt(stale, t),
        svg = draw(o);
      for (const e of EDGES)
        expect(svg.includes(`data-prop="${e}" data-stale="1"`)).toBe(stale.ticks[t].edges[e].stale > 0);
      expect(count(svg, 'class="stale-tag"')).toBe(EDGES.filter(e => stale.ticks[t].edges[e].stale > 0).length);
    }
  });

  it('on phones the pills keep just the names, and the caption carries the numbers', () => {
    const o = depotAt(rush, MOMENTS.sale),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toMatch(/DEPOT · \d+ TRIPS/);
    expect(wide).toMatch(/NORTH · \d+ HITS? · \d+ MISS/);
    expect(phone).toContain('>DEPOT<');
    expect(phone).toContain('>NORTH<');
    expect(phone).not.toMatch(/\d+ TRIPS/);
    expect(depotReadouts(o).join(' ')).toMatch(/\d+ trips/);
  });

  it('escapes nothing it doesn’t need to: the label reads the map in words', () => {
    expect(depotLabel({ ...IDLE })).toMatch(/^The depot map/);
  });
});

describe('the cache timeline', () => {
  it('a column per quarter hour, a cell per warehouse with requests', () => {
    const t = cacheTimeline(stale);
    expect(t.columns).toHaveLength(TICKS);
    expect(t.columns.every(c => c.cells.length === EDGES.length)).toBe(true);
    expect(t.columns[0].cells.every(c => c.kind === 'miss')).toBe(true);
    expect(t.columns.some(c => c.cells.some(x => x.stale))).toBe(true);
    for (const c of t.columns) expect(c.x + c.w).toBeLessThanOrEqual(t.w);
  });

  it('marks overloaded quarter hours over the capacity line', () => {
    const t = cacheTimeline(rush);
    const over = t.columns.filter(c => c.bar.over);
    expect(over.map(c => c.t)).toContain(MOMENTS.sale);
    for (const c of over) expect(c.bar.y).toBeLessThan(t.bars.capY);
  });

  it('reads each quarter hour in words', () => {
    expect(tickName(rush, MOMENTS.sale)).toMatch(/^12:00\. North: \d+ requests.*Depot: \d+ trips, overloaded\.$/);
    expect(timelineLabel(rush)).toMatch(/^Cache timeline/);
  });

  it('draws as a list of focusable quarter hours, one in the tab order', () => {
    const html = renderToString(createElement(TimelineView, { result: rush, at: MOMENTS.sale }));
    expect(count(html, 'role="listitem"')).toBe(TICKS);
    expect(count(html, 'tabindex="0"')).toBe(1);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the timeline tab off when there is no run', () => {
    const html = renderToString(createElement(CachingStage, { show: { scene: IDLE, caption: 'Idle' } }));
    expect(html).toContain('data-prop="depot"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Timeline/);
  });

  it('shows the timeline when asked, and escapes the caption', () => {
    const html = renderToString(
      createElement(CachingStage, {
        view: 'timeline',
        show: { scene: depotAt(rush, 16), result: rush, tick: 16, caption: '<b>x</b>' },
      }),
    );
    expect(html).toContain('role="list"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
