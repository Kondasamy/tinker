// @vitest-environment happy-dom
// The support desk and its ranking column (U25): every part drawn, the true ball's slot is rank.ts's rank, the rise only
// with motion, one polite status read-out outside the drawing, and the repeats radio as native radios.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  LEDGER_LINES,
  RECITAL_PARTS,
  recitalLabel,
  recitalScene,
  recitalState,
  type RecitalOpts,
} from '../../src/components/scenes/recitalScene';
import { RecitalStage, RepeatsRadio, SAMPLE_PINS, ledgerOf } from '../../src/content/memorisation/kit';
import { diskCanary } from '../../src/lib/memorisation/diskModel';
import { columnPins, rankAmong } from '../../src/lib/memorisation/rank';
import { canaryOf } from '../../src/lib/memorisation/story';

const ctx = { top: [] } as never;
const draw = (o: RecitalOpts) => recitalScene(o)(ctx);
const model = diskCanary();
const columnFor = (repeats: number) => {
  const c = canaryOf(repeats);
  return rankAmong(model, c, columnPins(c, SAMPLE_PINS));
};
const desk = (repeats: number, o: Partial<RecitalOpts> = {}): RecitalOpts => {
  const col = columnFor(repeats);
  return { ledger: ledgerOf(repeats), column: { lps: col.lps, label: `RANK ${col.rank}` }, ...o };
};

describe('the support desk', () => {
  it('draws every part it exports, with a callout over each, escaped', () => {
    for (const block of RECITAL_PARTS) {
      const svg = draw(desk(64, { say: { block, text: 'Here <b>' } }));
      expect(svg).toContain(`class="${block}"`);
      expect(svg).toContain('Here &lt;b&gt;');
    }
    expect(draw({ ledger: ledgerOf(null), reply: { text: '<x>' } })).toContain('&lt;x&gt;');
  });
  it.each([64, 16, 4, 1])('%i copies: the true ball’s slot is its rank among the 201', r => {
    const col = columnFor(r),
      st = recitalState(desk(r));
    expect(st.balls).toHaveLength(201);
    expect(st.rank).toBe(col.rank);
    expect(draw(desk(r))).toContain(`class="truth" data-slot="${col.rank}"`);
  });
  it('the 64-copy PIN floats far above the crowd; the 1-copy PIN sits among the top of it', () => {
    const hi = recitalState(desk(64)).balls,
      lo = recitalState(desk(1)).balls;
    const gap = (b: typeof hi) => b[0].z - Math.max(...b.slice(1).map(x => x.z));
    expect(gap(hi)).toBeGreaterThan(10);
    expect(gap(lo)).toBeLessThan(0);
  });
  it('the true ball rises only with motion; with reduced motion it is drawn where it ends', () => {
    expect(draw(desk(4, { rise: true }))).toContain('mem-rise');
    const still = draw(desk(4, { rise: false }));
    expect(still).not.toContain('mem-rise');
    expect(still).toContain(`data-slot="${columnFor(4).rank}"`);
    const css = readFileSync('src/content/memorisation/memorisation.css', 'utf8');
    const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)![1];
    expect(gated).toContain('.mem-rise');
    expect(css.replace(gated, '')).not.toMatch(/animation:|transition:/);
  });
  it('caps the ledger’s lit lines, greens them when scrubbed, and says what it shows', () => {
    expect(recitalState(desk(64)).lit).toBe(LEDGER_LINES);
    expect(recitalState({ ledger: ledgerOf(64, { dedup: true }) }).lit).toBe(1);
    expect(draw({ ledger: ledgerOf(16, { scrub: true }) })).toContain('data-scrub="1"');
    expect(recitalLabel(desk(1))).toMatch(new RegExp(`slot ${columnFor(1).rank} from the top`));
    expect(recitalLabel({ ledger: ledgerOf(null) })).toMatch(/board is empty/);
  });
});

describe('the stage and the repeats radio', () => {
  let root: Root, host: HTMLElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('has one polite status read-out, outside the drawing', () => {
    const html = renderToString(
      createElement(RecitalStage, { desk: desk(16), caption: 'x', readout: ['rank 1', 'exposure'] }),
    );
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toMatch(/<p class="mem-readout" role="status" aria-live="polite">rank 1 · exposure<\/p>/);
  });

  it('is four native radios in one group; picking one (Space does the same) changes the copies', () => {
    function Harness() {
      const [r, setR] = useState<number | null>(null);
      return createElement('div', { 'data-r': r ?? '' }, createElement(RepeatsRadio, { value: r, onChange: setR }));
    }
    act(() => root.render(createElement(Harness)));
    const radios = [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios).toHaveLength(4);
    expect(new Set(radios.map(x => x.name)).size).toBe(1);
    expect(host.querySelector('legend')?.textContent).toBe('Copies in training');
    act(() => radios[2].click());
    expect((host.firstElementChild as HTMLElement).dataset.r).toBe('16');
  });
});
