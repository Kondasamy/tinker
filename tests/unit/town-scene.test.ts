// Opening a web page's stage (U9): the post town's parts, offices, carts and ditches, the waterfall's layout and words,
// and the stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  TOWN_BOARD,
  TOWN_PARTS,
  idleTown,
  roadFor,
  townAt,
  townLabel,
  townReadouts,
  townScene,
  type TownOpts,
} from '../../src/components/scenes/townScene';
import { requestWaterfall, rowName, waterfallLabel } from '../../src/components/scenes/requestWaterfall';
import { WaterfallView, WebStage } from '../../src/content/web-requests/kit';
import { ASSUMPTIONS, CUSTOMERS, customerOf, runOf } from '../../src/lib/web-requests/sim';

const draw = (o: TownOpts) =>
  renderToString(createElement(IsoStage, { board: TOWN_BOARD, scene: townScene(o), label: townLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;

describe('the post town', () => {
  it('draws every part a callout may name', () => {
    const o = idleTown(customerOf('ines')),
      svg = draw(o);
    for (const p of TOWN_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of TOWN_PARTS) expect(draw({ ...o, say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it('a first visit lights every directory office; a remembered answer lights none', () => {
    const cold = draw(townAt(runOf('ines')));
    for (const k of ['root', 'tld', 'nameserver']) expect(cold).toContain(`data-prop="${k}" data-lit="1"`);
    const warm = runOf('tomas', { ttl: 60 });
    expect(warm.dnsCached).toBe(true);
    const svg = draw(townAt(warm));
    expect(count(svg, 'data-lit="1"')).toBe(0);
    expect(townLabel(townAt(warm))).toContain('remembered');
  });

  it('the ditch appears exactly where the run lost a packet', () => {
    for (const c of CUSTOMERS)
      for (const http of ['1.1', '2', '3'] as const) {
        const r = runOf(c.id, { http, loss: true }),
          svg = draw(townAt(r));
        expect(count(svg, 'class="ditch"')).toBe(new Set(r.phases.filter(p => p.lost).map(p => p.office ?? 'road')).size);
      }
    const wen = draw(townAt(runOf('wen', { http: '2', loss: true })));
    expect(wen).toContain('data-ditch="road"');
    expect(wen).toContain('RESENT');
    expect(draw(townAt(runOf('wen', { http: '2' })))).not.toContain('class="ditch"');
  });

  it('carts ride the road per round trip, three at most, sealed once TLS is up', () => {
    const r = runOf('dara', { http: '1.1' });
    expect(count(draw(townAt(r, 0)), 'class="cart"')).toBe(0);
    const firstShop = r.phases.findIndex(p => p.kind === 'tcp') + 1;
    const one = draw(townAt(r, firstShop));
    expect(one).toContain('data-carts="1" data-sealed="0"');
    const all = draw(townAt(r));
    expect(all).toContain('data-carts="3" data-sealed="1"');
  });

  it('road length follows distance up to the maximum, then breaks', () => {
    expect(roadFor(2000).len).toBeCloseTo(2 * roadFor(1000).len - roadFor(0).len, 9);
    expect(roadFor(ASSUMPTIONS.kmFull * 3).len).toBe(roadFor(ASSUMPTIONS.kmFull).len);
    expect(roadFor(ASSUMPTIONS.kmFull * 3).broken).toBe(true);
    expect(draw(townAt(runOf('wen')))).toMatch(/SHOP · 8,000 KM/);
  });

  it('on phones the pills keep only names, and the caption carries the numbers', () => {
    const o = townAt(runOf('wen', { http: '2', loss: true })),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toMatch(/WEN · [\d,]+ MS/);
    expect(phone).toContain('>WEN<');
    expect(phone).toContain('>SHOP<');
    expect(phone).not.toMatch(/\d MS/);
    expect(townReadouts(o).join(' ')).toMatch(/[\d,]+ ms/);
  });
});

describe('the waterfall', () => {
  it('a row per step, inside the frame, and its total equals the simulator’s', () => {
    for (const c of CUSTOMERS) {
      const r = runOf(c.id, { http: '2', loss: true }),
        w = requestWaterfall(r);
      expect(w.rows).toHaveLength(r.phases.length);
      expect(w.total).toBe(r.total);
      for (const row of w.rows) expect(row.x + row.w).toBeLessThanOrEqual(w.w - w.pad + 1e-9);
      expect(Math.max(...w.rows.map(x => x.phase.end))).toBe(r.total);
    }
  });

  it('reads each row in words, the lost and the held back marked', () => {
    const r = runOf('wen', { http: '2', loss: true }),
      w = requestWaterfall(r);
    const names = w.rows.map(x => rowName(x, w.rows.length));
    expect(names.some(n => /lost and sent again/.test(n))).toBe(true);
    expect(names.some(n => /Held back/.test(n))).toBe(true);
    expect(waterfallLabel(r)).toMatch(/^Waterfall of Wen/);
  });

  it('draws as a list of focusable rows, one in the tab order', () => {
    const r = runOf('dara'),
      html = renderToString(createElement(WaterfallView, { run: r }));
    expect(count(html, 'role="listitem"')).toBe(r.phases.length);
    expect(count(html, 'tabindex="0"')).toBe(1);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the waterfall tab off when there is no run', () => {
    const html = renderToString(
      createElement(WebStage, { show: { town: idleTown(customerOf('ines')), caption: 'Idle' } }),
    );
    expect(html).toContain('data-prop="house"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Waterfall/);
  });

  it('shows the waterfall when asked, and escapes the caption', () => {
    const r = runOf('wen');
    const html = renderToString(
      createElement(WebStage, { view: 'fall', show: { town: townAt(r), run: r, caption: '<b>x</b>' } }),
    );
    expect(html).toContain('role="list"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
