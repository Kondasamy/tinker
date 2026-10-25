// The puppet desk (U25): every part is drawn, the crosshair sits at the recorded click mapped through the host's scale,
// planted text stays text, phones keep the film strip's last three frames, and click-to-predict targets merge small
// neighbours on phones so each stays at least 44 px.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  PUPPET_BOARD,
  PUPPET_PARTS,
  puppetLabel,
  puppetScene,
  type PuppetOpts,
} from '../../src/components/scenes/puppetScene';
import { BANNER, viewOf } from '../../src/lib/computer-use/screens';
import { frameAt, play } from '../../src/content/computer-use/kit';
import { targetsOf } from '../../src/content/computer-use/screenView';

const draw = (o: PuppetOpts) =>
  renderToString(createElement(IsoStage, { board: PUPPET_BOARD, scene: puppetScene(o), label: puppetLabel(o) }));
const clickAt = (s: Parameters<typeof play>[0]) => {
  const r = play(s),
    i = r.steps.filter(x => x.kind !== 'norecord').findIndex(x => x.kind === 'click');
  return frameAt(r, i + 1);
};

describe('the puppet desk', () => {
  it('draws every part a callout may name', () => {
    const svg = draw(frameAt(play({ case: 'hinges' }), 3).opts);
    for (const p of PUPPET_PARTS) expect(svg, p).toContain(`data-part="${p}"`);
  });
  it('puts the crosshair at the recorded click, mapped through the current scale', () => {
    const scaled = clickAt({ case: 'hinges', size: 1024, scale: true }),
      raw = clickAt({ case: 'hinges', size: 1024, scale: false });
    const at = scaled.click!.at;
    expect(draw(scaled.opts)).toContain(`data-crosshair="${Math.round(at[0] / 0.8)},${Math.round(at[1] / 0.8)}"`);
    expect(draw(raw.opts)).toContain(`data-crosshair="${at[0]},${at[1]}"`);
    expect(raw.click!.el?.id).toBe('tile-signout');
  });
  it('flashes the camera on a look, and the strip holds the looks so far', () => {
    const f = frameAt(play({ case: 'hinges' }), 1);
    expect(draw(f.opts)).toContain('data-flash="1"');
    expect(draw(f.opts)).toContain('data-frames="1"');
  });
  it('on phones the film strip keeps its last three frames', () => {
    const r = play({ case: 'hinges' }),
      end = frameAt(r, 99).opts;
    expect(end.frames!.length).toBeGreaterThan(3);
    expect(draw({ ...end, scale: 2 })).toContain('data-frames="3"');
    expect(draw({ ...end, scale: 1.2 })).toContain(`data-frames="${end.frames!.length}"`);
  });
  it('planted text renders as text in the label, never as markup', () => {
    const v = viewOf({ screen: 'basket', lines: [{ sku: 'HG-120', qty: 120 }], plus: false }, { banner: true });
    const svg = draw({ view: v });
    expect(svg).not.toContain('<script');
    expect(puppetLabel({ view: v })).toContain('Basket');
    expect(BANNER.text.join(' ')).toContain('AI assistants');
  });
});

describe('click-to-predict targets', () => {
  const orders = viewOf({ screen: 'orders', lines: [], plus: false });
  it('on desktop each clickable thing is its own target', () => {
    expect(targetsOf(orders, false)).toHaveLength(orders.els.length);
  });
  it('on phones the small Reorder links merge into one target', () => {
    const t = targetsOf(orders, true);
    expect(t).toHaveLength(1);
    expect(t[0].ids).toHaveLength(orders.els.length);
  });
  it('on phones the home tiles stay separate', () => {
    const home = viewOf({ screen: 'home', lines: [], plus: false });
    expect(targetsOf(home, true)).toHaveLength(home.els.length);
  });
});
