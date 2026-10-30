// @vitest-environment happy-dom
// On-device's stage (U6): every part a callout names is drawn; the crate holds 16 bricks and spills the rest, in
// step with fits(); the tank's water is the charge left; one polite read-out outside the drawing; the Bars tab reads
// the same numbers; with reduced motion the bricks show their end state at once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  CRATE_BOARD,
  CRATE_BRICKS,
  CRATE_PARTS,
  crateLabel,
  crateScene,
  packOf,
  SPILL_DRAWN,
  type CrateOpts,
} from '../../src/components/scenes/phoneCrateScene';
import { BITS, CONTEXTS, fits, SIZES } from '../../src/lib/on-device/memory';
import { bricksFor, CrateStage, packText } from '../../src/content/on-device/kit';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const draw = (o: CrateOpts) =>
  renderToString(createElement(IsoStage, { board: CRATE_BOARD, scene: crateScene(o), label: crateLabel(o) }));
const count = (svg: string, re: RegExp) => [...svg.matchAll(re)].length;
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/on-device/[0-9]*.tsx', {
  eager: true,
});

describe('the phone-shaped crate', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const full: CrateOpts = { weights: 14, cache: 4, level: 0.5 };
    for (const part of CRATE_PARTS) {
      const svg = draw({ ...full, say: { block: part, text: 'Here' } });
      expect(svg, part).toContain('Here');
      expect(svg, part).toContain(`data-part="${part}"`);
    }
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(CRATE_PARTS).toContain(b);
  });

  it('packs weights then cache, 16 inside, the rest spilled; drawn spills cap with a count pill', () => {
    expect(packOf({ weights: 13, cache: 2 })).toEqual({ inside: [...Array(13).fill('w'), 'c', 'c'], spilled: [] });
    const p = packOf({ weights: 52 });
    expect(p.inside).toHaveLength(CRATE_BRICKS);
    expect(p.spilled).toHaveLength(36);
    const svg = draw({ weights: 52, level: 1 });
    expect(count(svg, /data-part="spill"/g)).toBe(SPILL_DRAWN);
    expect(svg).toContain('+36 SPILLED');
    expect(draw({ weights: 3, level: 1 })).not.toContain('data-part="spill"');
  });

  it('spills exactly when the model and its cache don’t fit, for every size, width and context', () => {
    for (const s of SIZES)
      for (const bits of BITS)
        for (const tokens of CONTEXTS) {
          const b = bricksFor({ size: s.id, bits, tokens });
          expect(b.weights + b.cache <= CRATE_BRICKS, `${s.id} ${bits} ${tokens}`).toBe(fits(s, bits, tokens));
        }
  });

  it('fills the tank to the charge left, and glows when hot', () => {
    expect(draw({ weights: 1, level: 0.25 })).toContain('data-level="0.250"');
    expect(draw({ weights: 1, level: 2 })).toContain('data-level="1.000"');
    expect(draw({ weights: 1, level: 1, hot: true })).toContain('data-hot="1"');
    expect(draw({ weights: 1, level: 1 })).not.toContain('class="heat"');
  });

  it('escapes its pills and says the picture in words', () => {
    expect(draw({ weights: 1, level: 1, load: '<b>' })).toContain('&lt;b&gt;');
    expect(crateLabel({ weights: 18, cache: 0, level: 0.5, hot: true })).toBe(
      'The handheld drawn as a phone-shaped crate in a warehouse aisle, holding 16 weight bricks of 16; 2 more spill onto the floor; it glows hot. Its battery tank is 50% full.',
    );
  });
});

describe('the stage', () => {
  let root: Root, host: HTMLElement;
  const reduce = (on: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: on && q.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it('has one polite read-out outside the drawing, and a Bars tab off the same numbers', () => {
    reduce(true);
    const pack = { size: '3b' as const, bits: 4, tokens: 4000, level: 0.4 };
    act(() => root.render(createElement(CrateStage, { pack, caption: 'c' })));
    const status = host.querySelectorAll('[role="status"]');
    expect(status).toHaveLength(1);
    expect(status[0].closest('svg')).toBeNull();
    expect(status[0].textContent).toBe(packText(pack));
    expect(status[0].textContent).toContain('It doesn’t fit: 1 brick spill.');
    act(() => (host.querySelector('button[aria-pressed="false"]') as HTMLButtonElement).click());
    expect(host.querySelector('svg')).toBeNull();
    expect(host.textContent).toContain('Battery: 40% left');
  });

  it('with reduced motion shows every brick at once', () => {
    reduce(true);
    act(() => root.render(createElement(CrateStage, { pack: { size: '1b', bits: 8 }, caption: 'c' })));
    act(() => root.render(createElement(CrateStage, { pack: { size: '3b', bits: 4 }, caption: 'c' })));
    expect(host.querySelectorAll('[data-part="bricks"] [data-brick]')).toHaveLength(13);
  });
});
