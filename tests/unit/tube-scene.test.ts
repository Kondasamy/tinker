// Payments' stage (U13): the exchange's parts, the night palette set by the clock alone, the jars in the fees' order,
// the capsules, the pills on phones, the ledger's rows summing to zero, and the stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  TUBE_BOARD,
  TUBE_PARTS,
  hopAt,
  idleTubes,
  journeyOf,
  tubeAt,
  tubeLabel,
  tubeReadouts,
  tubeScene,
  tubeState,
  type TubeOpts,
} from '../../src/components/scenes/tubeScene';
import { ledgerAt } from '../../src/components/scenes/ledgerView';
import { LedgerView, PaymentsStage } from '../../src/content/payments/kit';
import { FEE_PARTIES, PARTIES, TICKS, isNight, policyOf, simulate } from '../../src/lib/payments/sim';

const draw = (o: TubeOpts) =>
  renderToString(createElement(IsoStage, { board: TUBE_BOARD, scene: tubeScene(o), label: tubeLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const REF = simulate(policyOf({ sca: 'risk', capture: 'shipment', key: true }));
const LOOSE = simulate(policyOf({ sca: 'never', capture: 'order', key: false }));
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe('the tube exchange', () => {
  it('draws every part a callout may name', () => {
    const night = draw(tubeAt(REF, 1));
    for (const p of TUBE_PARTS.filter(p => p !== 'jars')) expect(draw(idleTubes())).toContain(`data-prop="${p}"`);
    expect(night).toContain('data-jar="issuer"');
    for (const p of TUBE_PARTS) expect(draw({ ...tubeAt(REF, 1), say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it('is night exactly when the run’s clock is past the cut-off, with no reader toggle', () => {
    for (let t = 0; t < TICKS; t++) {
      const o = tubeAt(REF, t),
        svg = draw(o);
      expect(o.night).toBe(isNight(t));
      expect(svg).toContain(`data-palette="${isNight(t) ? 'night' : 'day'}"`);
      expect(svg.includes('class="jar"')).toBe(isNight(t));
    }
    expect(Object.keys(tubeAt(REF, 0))).not.toContain('toggle');
  });

  it('the jars’ heights follow the fee totals, in order', () => {
    for (let t = 1; t < TICKS; t += 2) {
      const o = tubeAt(REF, t),
        h = tubeState(o).jars;
      for (const a of FEE_PARTIES)
        for (const b of FEE_PARTIES) if (o.jars[a] > o.jars[b]) expect(h[a]).toBeGreaterThan(h[b]);
    }
  });

  it('capsules ride by day only, three at most per kind and tube', () => {
    const day = tubeAt(REF, 0);
    expect(day.capsules.length).toBeGreaterThan(0);
    const svg = draw(day);
    expect(count(svg, 'class="capsule"')).toBe(tubeState(day).capsules.reduce((a, c) => a + c.drawn, 0));
    for (const c of tubeState(day).capsules) expect(c.drawn).toBeLessThanOrEqual(3);
    expect(draw(tubeAt(REF, 1))).not.toContain('class="capsule"');
  });

  it('one authorisation hop by hop: out to the issuer and back to the till', () => {
    const ana = REF.orders.find(o => o.order.id === 'A1')!,
      hops = journeyOf(ana);
    expect(hops[0]).toMatchObject({ from: 'customer', to: 'merchant' });
    expect(hops.at(-1)).toMatchObject({ from: 'acquirer', to: 'merchant', kind: 'ok' });
    expect(draw(hopAt(ana, 3))).toContain('data-from="network" data-to="issuer"');
  });

  it('the wallet shows one receipt per charge: two without the key', () => {
    expect(draw(tubeAt(LOOSE, 1, ['B2']))).toContain('data-charges="2"');
    expect(draw(tubeAt(REF, 1, ['B2']))).toContain('data-charges="1"');
  });

  it('on phones the pills keep just the names, and the caption carries the money', () => {
    const o = tubeAt(REF, 1),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toMatch(/LARKSPUR · KEPT €/);
    expect(phone).toContain('>LARKSPUR<');
    expect(phone).not.toContain('KEPT €');
    expect(tubeReadouts(o).join(' ')).toMatch(/Larkspur kept €.*fees/);
  });

  it('the label reads the exchange in words', () => {
    expect(tubeLabel(idleTubes())).toMatch(/^The tube exchange by day/);
    expect(tubeLabel(tubeAt(REF, 1))).toMatch(/at night.*Fees so far/);
  });
});

describe('the ledger', () => {
  it('every row sums to zero at every tick, under every setting tried', () => {
    for (const r of [REF, LOOSE])
      for (let t = 0; t < TICKS; t++) {
        const l = ledgerAt(r, t);
        for (const row of l.rows) expect(sum(row.cells)).toBe(0);
        expect(sum(l.totals)).toBe(0);
        expect(Object.keys(l.totals)).toEqual(PARTIES);
      }
  });
  it('renders as a table in a focusable region, one row per order with money moved', () => {
    const html = renderToString(createElement(LedgerView, { result: REF, t: 1 }));
    expect(html).toContain('<table');
    expect(html).toContain('tabindex="0"');
    expect(count(html, 'data-order=')).toBe(ledgerAt(REF, 1).rows.length);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the ledger tab off when there is no run', () => {
    const html = renderToString(createElement(PaymentsStage, { show: { scene: idleTubes(), caption: 'Idle' } }));
    expect(html).toContain('data-prop="wallet"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Ledger/);
  });
  it('darkens at night, shows the ledger when asked, and escapes the caption', () => {
    expect(renderToString(createElement(PaymentsStage, { show: { scene: tubeAt(REF, 1), caption: 'x' } }))).toContain(
      'data-night="1"',
    );
    const html = renderToString(
      createElement(PaymentsStage, {
        view: 'ledger',
        show: { scene: tubeAt(REF, 1), result: REF, tick: 1, caption: '<b>x</b>' },
      }),
    );
    expect(html).toContain('<table');
    expect(html).not.toContain('data-night');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
