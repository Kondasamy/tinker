// A/B testing's stage (U30): the shop floor's parts, towers and pills, the result chart's layout and words, and the
// stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  IDLE,
  SPLIT_BOARD,
  SPLIT_PARTS,
  ordersCrates,
  splitAt,
  splitLabel,
  splitReadouts,
  splitScene,
  type SplitOpts,
} from '../../src/components/scenes/splitScene';
import { chartLabel, dayName, resultChart } from '../../src/components/scenes/resultChart';
import { AbStage, ResultView } from '../../src/content/ab-testing/kit';
import { ASSUMPTIONS, SCENARIOS, peekResult, resultAt, runOf } from '../../src/lib/ab-testing/sim';

const draw = (o: SplitOpts) =>
  renderToString(createElement(IsoStage, { board: SPLIT_BOARD, scene: splitScene(o), label: splitLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const P = SCENARIOS.checkout,
  R = runOf(P),
  END = P.days - 1;

describe('the shop floor', () => {
  it('draws every part a callout may name', () => {
    const svg = draw({ ...IDLE });
    for (const p of SPLIT_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of SPLIT_PARTS) expect(draw({ ...IDLE, say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it('the scoreboard matches the simulator', () => {
    const o = splitAt(R, P, END),
      res = resultAt(R, END, ASSUMPTIONS.level),
      d = R[END];
    expect(o.arms[0].orders).toBe(d.orders[0]);
    expect(o.arms[1].orders).toBe(d.orders[1]);
    expect(o.verdict).toBe(res.significant ? (res.diff > 0 ? 'B WINS' : 'A WINS') : 'NO WINNER');
    const svg = draw({ ...o, scale: 1.2 });
    expect(svg).toContain(`data-orders="${d.orders[1]}"`);
    expect(svg).toContain(`>B · ${((d.orders[1] / d.visitors[1]) * 100).toFixed(1)}%<`);
    expect(svg).toContain(`>${o.verdict}<`);
  });

  it('crate towers grow with the rate; returns show only when the guardrail is watched', () => {
    const o = splitAt(R, P, END);
    const svg = draw(o);
    expect(svg).toContain(`class="orders" data-arm="b" data-n="${ordersCrates(o.arms[1])}"`);
    expect(ordersCrates(o.arms[1])).toBeGreaterThanOrEqual(ordersCrates(o.arms[0]));
    expect(svg).toContain('class="returns" data-arm="b" data-n="0"');
    const h = SCENARIOS.hurry,
      g = draw(splitAt(runOf(h), h, h.days - 1, { guardrail: true }));
    expect(g).not.toContain('class="returns" data-arm="b" data-n="0"');
  });

  it('shoppers ride the belts only while the test runs', () => {
    expect(count(draw(splitAt(R, P, 3)), 'class="shopper rider"')).toBe(4);
    expect(count(draw(splitAt(R, P, END)), 'class="shopper rider"')).toBe(0);
  });

  it('on phones the pills keep just the names, and the caption carries the numbers', () => {
    const o = splitAt(R, P, 6),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toMatch(/>A · \d+\.\d%</);
    expect(wide).toContain('>DAY 7 OF 14<');
    expect(phone).toContain('>A<');
    expect(phone).toContain('>SPLIT<');
    expect(phone).not.toMatch(/>(A|B) · |>DAY \d/);
    expect(splitReadouts(o).join(' · ')).toMatch(/day 7 of 14 · A \d+\.\d% · B \d+\.\d%/);
  });

  it('escapes pill text', () => {
    expect(draw({ ...IDLE, verdict: '<b>x</b>' })).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('the result chart', () => {
  it('a column per day inside the frame, the band round every dot', () => {
    const c = resultChart(R);
    expect(c.columns).toHaveLength(P.days);
    for (const col of c.columns) {
      expect(col.x + col.w).toBeLessThanOrEqual(c.w);
      expect(col.hi).toBeLessThanOrEqual(col.y);
      expect(col.lo).toBeGreaterThanOrEqual(col.y);
      expect(col.hi).toBeGreaterThanOrEqual(c.top);
      expect(col.lo).toBeLessThanOrEqual(c.bottom);
    }
    expect(c.columns.at(-1)!.significant).toBe(true);
    expect(c.peek).toBeNull();
  });

  it('marks where a daily peek stopped', () => {
    const r = runOf(SCENARIOS.aa),
      peek = peekResult(r, ASSUMPTIONS.level)!;
    const c = resultChart(r, { peek: peek.t });
    expect(c.peek).toBe(c.columns[peek.t].cx);
    expect(c.columns[peek.t].significant).toBe(true);
    expect(c.columns.at(-1)!.significant).toBe(false);
    expect(chartLabel(r, { peek: peek.t })).toContain(`stopped on day ${peek.t + 1}`);
  });

  it('reads each day in words', () => {
    expect(dayName(R, END)).toMatch(
      /^Day 14: B − A in buying = \+\d\.\d points; interval [+−]\d\.\d to \+\d\.\d; B wins\.$/,
    );
    expect(dayName(R, 0)).toMatch(/^Day 1: /);
  });

  it('draws as a list of focusable days, one in the tab order', () => {
    const html = renderToString(createElement(ResultView, { chart: { run: R } }));
    expect(count(html, 'role="listitem"')).toBe(P.days);
    expect(count(html, 'tabindex="0"')).toBe(1);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the Result tab off when there is no run', () => {
    const html = renderToString(createElement(AbStage, { show: { scene: IDLE, caption: 'Idle' } }));
    expect(html).toContain('data-prop="turnstile"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Result/);
  });

  it('shows the chart when asked, and escapes the caption', () => {
    const html = renderToString(
      createElement(AbStage, {
        view: 'chart',
        show: { scene: splitAt(R, P, END), chart: { run: R }, caption: '<b>x</b>' },
      }),
    );
    expect(html).toContain('role="list"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
