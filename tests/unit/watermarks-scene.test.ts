// @vitest-environment happy-dom
// Watermarks' stage (U16): every part a callout names is drawn; exactly the tokens under the lamp light, coloured by
// greenlist.ts; a swap from the Select re-scores and redraws, and Reword all writes the pinned paraphrase; with reduced
// motion every tile is lit at once; one polite read-out outside the drawing gives the z-score and clears on a new step.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  COLS,
  LAMP_STOPS,
  MAX_TOKENS,
  UV_BOARD,
  UV_PARTS,
  uvLabel,
  uvScene,
  WINDOW,
  type UvOpts,
} from '../../src/components/scenes/uvScene';
import { lastOf, PROMPT, REPLY_IDS, REWORDED, UvStage, zText, type Lamp } from '../../src/content/watermarks/kit';
import { modelStore } from '../../src/content/transformers/kit';
import { check } from '../../src/lib/watermarks/detect';
import { choicesAt } from '../../src/lib/watermarks/edit';
import { isGreen } from '../../src/lib/watermarks/greenlist';
import { LABEL, travel } from '../../src/lib/watermarks/label';
import { larkspur } from '../../src/lib/watermarks/sample';
import { MARK, MARKED_PICTURE } from '../../src/lib/watermarks/story';
import { diskModel } from '../../src/lib/transformers/diskModel';
import pinned from '../../data/watermarks/pinned.json' with { type: 'json' };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const prev = lastOf(PROMPT);
const at = (rest: Partial<UvOpts> = {}): UvOpts => ({ ids: REPLY_IDS, prev, gamma: MARK.gamma, lamp: 'all', ...rest });
const draw = (o: UvOpts) =>
  renderToString(createElement(IsoStage, { board: UV_BOARD, scene: uvScene(o), label: uvLabel(o) }));
const tiles = (svg: string) =>
  [...svg.matchAll(/data-i="(\d+)" data-lit="(\d)" data-green="(\d)"/g)].map(m => ({
    i: +m[1],
    lit: m[2] === '1',
    green: m[3] === '1',
  }));
const printAt = (trip: 'as sent' | 'screenshot') => {
  const { pic, label } = travel(MARKED_PICTURE, LABEL, trip);
  return at({ ids: [], print: { pic, label: !!label, found: true } });
};
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/watermarks/[0-9]*.tsx', {
  eager: true,
});

describe('the UV print room', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    for (const part of UV_PARTS) {
      const o = part === 'print' || part === 'label' ? printAt('as sent') : at();
      const svg = draw({ ...o, say: { block: part, text: 'Here' } });
      expect(svg, part).toContain('Here');
      expect(svg, part).toContain(`data-part="${part}"`);
    }
    expect(draw(printAt('screenshot'))).not.toContain('data-part="label"');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(UV_PARTS).toContain(b);
  });

  it('lights exactly the tokens under the lamp, both rows, coloured by greenlist.ts', () => {
    const green = REPLY_IDS.map((id, i) => isGreen(i ? REPLY_IDS[i - 1] : prev, id, MARK.gamma));
    expect(REPLY_IDS).toHaveLength(MAX_TOKENS);
    for (let c = 0; c < LAMP_STOPS; c++) {
      const got = tiles(draw(at({ lamp: c })));
      expect(got.map(t => t.i)).toEqual(REPLY_IDS.map((_, i) => i));
      expect(got.map(t => t.lit)).toEqual(REPLY_IDS.map((_, i) => i % COLS >= c && i % COLS < c + WINDOW));
      expect(got.map(t => t.green)).toEqual(green);
    }
    expect(tiles(draw(at())).every(t => t.lit)).toBe(true);
    expect(tiles(draw(at({ lamp: null }))).some(t => t.lit)).toBe(false);
    // green tiles are raised boxes, red ones flat and notched: never colour alone
    const svg = draw(at());
    expect(svg).toContain('data-on="1"');
    expect(draw(at({ lamp: null }))).toContain('data-on="0"');
  });

  it('draws no more than 64 tokens and escapes the picked token’s pill', () => {
    expect(tiles(draw(at({ ids: [...REPLY_IDS, ...REPLY_IDS] })))).toHaveLength(MAX_TOKENS);
    const lt = 60; // '<'
    const svg = draw(at({ ids: [lt, ...REPLY_IDS.slice(1)], picked: 0 }));
    expect(svg).toContain('‘&lt;’');
    expect(svg).not.toContain('‘<’');
  });
});

describe('the stage, live', () => {
  let host: HTMLDivElement, root: Root;
  const reduce = (on: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: on && q.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
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
  const disk = () =>
    modelStore(async f => {
      const b = readFileSync(`public/data/lm/${f}`);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    });
  const settle = async () => {
    for (let i = 0; i < 10; i++) await act(async () => new Promise(r => setTimeout(r, 5)));
  };
  const slide = (input: HTMLInputElement, i: number) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(i));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent === text)!;
  const status = () => host.querySelector('[role="status"]')!.textContent;
  let seen: { ids: number[]; lamp: Lamp } = { ids: REPLY_IDS, lamp: 0 };
  function Harness({
    step = 1,
    reword = false,
    store,
  }: {
    step?: number;
    reword?: boolean;
    store?: ReturnType<typeof disk>;
  }) {
    const [ids, setIds] = useState(REPLY_IDS);
    const [lamp, setLamp] = useState<Lamp>(0);
    seen = { ids, lamp };
    return createElement(UvStage, {
      ids,
      lamp,
      onLamp: setLamp,
      onIds: reword ? setIds : undefined,
      caption: 'x',
      step,
      store,
    });
  }

  it('sweeps the lamp, lights all, and reads out the z-score in one polite region outside the drawing', () => {
    reduce(false);
    act(() => root.render(createElement(Harness)));
    const regions = host.querySelectorAll('[role="status"]');
    expect(regions).toHaveLength(1);
    expect(regions[0].getAttribute('aria-live')).toBe('polite');
    expect(regions[0].closest('svg')).toBeNull();
    slide(host.querySelector<HTMLInputElement>('input[type="range"]')!, 5);
    expect(seen.lamp).toBe(5);
    const lit = tiles(host.innerHTML).filter(t => t.lit);
    expect(lit.map(t => t.i)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 37, 38, 39, 40, 41, 42, 43, 44]);
    const g = lit.filter(t => t.green).length;
    expect(status()).toBe(`Tokens 6–13 and 38–45: ${g} green, ${16 - g} red.`);
    act(() => button('Light all').click());
    expect(seen.lamp).toBe('all');
    expect(status()).toContain(zText(check(REPLY_IDS, MARK.gamma)));
    expect(status()).toContain(`z ${pinned.reply.z.toFixed(2)}, marked`);
    act(() => root.render(createElement(Harness, { step: 2 })));
    expect(status()).toBe('');
  });

  it('with reduced motion shows every colour at once', () => {
    reduce(true);
    act(() => root.render(createElement(Harness)));
    expect(seen.lamp).toBe(0);
    expect(tiles(host.innerHTML).every(t => t.lit)).toBe(true);
  });

  it('a swap from the Select re-scores and redraws; Reword all writes the pinned paraphrase', async () => {
    reduce(true);
    const store = disk();
    act(() => root.render(createElement(Harness, { reword: true, store })));
    await settle();
    // pick token 3 in the Strip tab, then choose its first next-best from the swap list
    act(() => button('Strip').click());
    act(() => host.querySelector<HTMLButtonElement>('button[data-i="2"]')!.click());
    act(() => button('Picture').click());
    const want = choicesAt(larkspur(diskModel()), PROMPT, REPLY_IDS, 2)[0];
    const swap = host.querySelectorAll<HTMLElement>('[role="combobox"]')[1];
    act(() => swap.click());
    const opt = swap.parentElement!.querySelectorAll<HTMLElement>('[role="option"]')[1];
    act(() => opt.click());
    const after = REPLY_IDS.map((id, i) => (i === 2 ? want : id));
    expect(seen.ids).toEqual(after);
    expect(host.innerHTML).toContain(`data-ids="${after.join(' ')}"`);
    expect(status()).toContain(zText(check(after, MARK.gamma)));
    act(() => button('Reword all').click());
    expect(seen.ids).toEqual(REWORDED);
    expect(status()).toContain(`z ${pinned.rewording.reworded.z.toFixed(2).replace('-', '−')}`);
    act(() => button('Strip').click());
    expect(host.querySelector('.wm-meter')!.getAttribute('data-z')).toBe(check(REWORDED, MARK.gamma).z!.toFixed(4));
  });
});
