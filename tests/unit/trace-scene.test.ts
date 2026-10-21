import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { TRACE_BOARD, WALL_MAX, traceLabel, traceScene, traceState, type TraceOpts } from '../../src/components/scenes/traceScene';
import { rowName, traceWaterfall } from '../../src/components/scenes/traceWaterfall';
import { TraceCard, Waterfall, binsOf, wallOf } from '../../src/content/observability/kit';
import { FAILED, TRACES, ordered, traceOf, type Trace } from '../../src/lib/observability/traces';
import { DAY1_COUNTS } from '../../src/lib/observability/coding';

const draw = (o: TraceOpts) => renderToString(createElement(IsoStage, { board: TRACE_BOARD, scene: traceScene(o), label: traceLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;

describe('the control room', () => {
  it('a card per trace on the wall, failed ones marked, the read one lit', () => {
    const svg = draw({ cards: wallOf(TRACES, 't23') });
    expect(count(svg, 'class="card"')).toBe(TRACES.length);
    expect(count(svg, 'data-failed="1"')).toBe(FAILED.length);
    expect(count(svg, 'data-lit="1"')).toBe(1);
    expect(svg).toContain(`TRACES ${TRACES.length} · FAILED ${FAILED.length}`);
  });
  it('a bin per mode with its count; the counts sum to the failed traces', () => {
    const o = { cards: wallOf(TRACES), bins: binsOf(DAY1_COUNTS, 'stale-doc') }, svg = draw(o);
    expect(count(svg, 'class="bin"')).toBe(5);
    expect(traceState(o).sorted).toBe(FAILED.length);
    expect(svg).toMatch(/class="bin" data-bin="1" data-n="5" data-lit="1"/);
    expect(traceLabel(o)).toContain('STALE 5 (lit)');
  });
  it('more cards than the wall holds: the rest are counted off the wall', () => {
    const cards = Array.from({ length: WALL_MAX + 3 }, () => ({ failed: false }));
    expect(traceState({ cards })).toMatchObject({ shown: WALL_MAX, hidden: 3 });
    expect(draw({ cards })).toContain('+3 OFF WALL');
  });
  it('an empty room draws with no NaN, and a board text is escaped', () => {
    const svg = draw({ cards: [], bins: [], board: '<script>x</script>' });
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(svg).not.toContain('<script');
    expect(draw({ cards: [], scale: 2 })).not.toMatch(/NaN/);
  });
});

describe('the waterfall', () => {
  const t = traceOf('t01'), w = traceWaterfall(t);
  it('a row per span in reading order, each bar inside the drawing and as long as its span', () => {
    expect(w.rows.map(r => r.id)).toEqual(ordered(t).map(o => o.span.id));
    for (const r of w.rows) {
      expect(r.x).toBeGreaterThanOrEqual(w.x0 - 1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(w.w - w.pad + 2);
    }
    expect(w.rows[0].w).toBeCloseTo(w.total * w.k, 6);
    expect(rowName(w.rows[1], w.rows.length)).toMatch(/^Span 2 of 6: retrieval policies \(retrieval\), 180 ms/);
  });
  it('one row in the tab order; the first failure is stamped, the pick marked', () => {
    const f = FAILED[0], html = renderToString(createElement(Waterfall, { trace: f, stamp: f.first, picked: 's2' }));
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(count(html, 'tabindex="-1"')).toBe(f.spans.length - 1);
    expect(html).toContain(`data-span="${f.first}" data-kind="retrieval" data-first="1"`);
    expect(html).toContain('FIRST FAILURE');
    expect(html).toContain('data-picked="1"');
  });
  it('a trace with no spans draws nothing and never divides by zero', () => {
    const empty: Trace = { ...t, spans: [] };
    expect(traceWaterfall(empty).rows).toEqual([]);
    expect(renderToString(createElement(Waterfall, { trace: empty }))).not.toMatch(/NaN/);
  });
});

describe('the reader’s note renders as text only', () => {
  it('a note containing a script tag shows literally', () => {
    const html = renderToString(createElement(TraceCard, { trace: FAILED[0], note: '<script>alert(1)</script>' }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
