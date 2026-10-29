// @vitest-environment happy-dom
// Recommendations' stage (U21): the aisle's parts and callouts, the caps (5 on the shelf, at most 40 on the map), pills
// on phones and escaping; the move-a-shopper marker (arrow keys move it a fixed step only while it has focus, and the
// shelf's five match score.ts for its position), the shopper drop-down, one polite read-out that speaks on actions, the
// Ranking tab, and motion only behind prefers-reduced-motion: no-preference.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_DOTS,
  SHELF_BOARD,
  SHELF_PARTS,
  fromFloor,
  shelfLabel,
  shelfPlot,
  shelfScene,
  shelfState,
  toFloor,
  type ShelfOpts,
} from '../../src/components/scenes/shelfScene';
import { KEYS, RecsStage, STEP, nudge } from '../../src/content/recommendations/kit';
import { BASE, type Vec } from '../../src/lib/recommendations/factorise';
import { METHODS, methodRows, shelfOf, tasteRows, tasteShelf } from '../../src/lib/recommendations/score';
import { CUSTOMERS, NEW_PRODUCT, TRAIN } from '../../src/lib/recommendations/story';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draw = (o: ShelfOpts) =>
  renderToString(createElement(IsoStage, { board: SHELF_BOARD, scene: shelfScene(o), label: shelfLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>(
  '../../src/content/recommendations/[0-9]*.tsx',
  { eager: true },
);
const ASH = 'c01';
const MAP: ShelfOpts = {
  view: 'map',
  shelf: shelfOf('factors', TRAIN, ASH, BASE),
  shopper: 'Ash Joinery',
  you: BASE.users[ASH],
  items: BASE.items,
  ghost: NEW_PRODUCT,
};
const AISLE: ShelfOpts = {
  view: 'aisle',
  shelf: shelfOf('popular', TRAIN, ASH),
  shopper: 'Ash Joinery',
  others: ['A', 'B', 'C', 'D'],
  basket: 'hinge-pack',
};

describe('the shop aisle', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const svg = draw(AISLE) + draw(MAP);
    for (const p of SHELF_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of SHELF_PARTS)
      expect(
        draw({ ...AISLE, ...MAP, view: p === 'map' || p === 'new' ? 'map' : 'aisle', say: { block: p, text: 'Here' } }),
      ).toContain('Here');
    const steps = Object.values(chapters).flatMap(m => m.STEPS);
    const used = steps.flatMap(s => (s.say ? [s.say.block] : []));
    expect(steps.length).toBeGreaterThan(20);
    expect(used.length).toBeGreaterThan(5);
    for (const b of used) expect(SHELF_PARTS).toContain(b);
  });

  it('caps: five on the shelf, three others, at most 40 on the map; a product with no taste is off the map', () => {
    const svg = draw({ ...MAP, shelf: [...MAP.shelf, 'wood-glue', 'sandpaper'] });
    expect(count(svg, 'class="rc-item"')).toBe(5);
    const st = shelfState(MAP);
    expect(st.dots.length).toBeLessThanOrEqual(MAX_DOTS);
    expect(st.dots.map(d => d.id)).not.toContain(NEW_PRODUCT);
    expect(count(draw(MAP), 'class="rc-dot"')).toBe(st.dots.length);
    expect(count(draw(MAP), 'data-lit="1"')).toBe(5);
    expect(shelfState(AISLE).others).toHaveLength(3);
  });

  it('the map places a taste at its two numbers, and back', () => {
    const v = BASE.users[ASH]!,
      [x, y] = toFloor(v),
      w = fromFloor(x, y);
    expect(w[0]).toBeCloseTo(v[0], 9);
    expect(w[1]).toBeCloseTo(v[1], 9);
  });

  it('phones keep only ranks in the shelf pills; text is escaped', () => {
    const o = { ...AISLE, shopper: '<b>x</b>' };
    expect(draw({ ...o, scale: 2 })).not.toContain('· Hinges');
    expect(draw({ ...o, scale: 1.2 })).toContain('1 ·');
    expect(draw({ ...o, scale: 1.2 })).not.toContain('<b>x</b>');
  });

  it('every method’s ranking rows start with its shelf', () => {
    for (const m of METHODS)
      for (const c of CUSTOMERS)
        expect(
          methodRows(m, TRAIN, c.id, BASE)
            .slice(0, 5)
            .map(r => r.id),
        ).toEqual(shelfOf(m, TRAIN, c.id, BASE));
  });

  it('the hero plot draws', () => {
    const top = [
      [0, 0, 0],
      [200, 0, 0],
      [200, 200, 0],
      [0, 200, 0],
    ];
    expect(shelfPlot(100, 100, top)).toContain('<path');
  });
});

describe('move a shopper', () => {
  let root: Root, host: HTMLElement;
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      (q: string) =>
        ({
          matches: false,
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  /** Chapter 4's stage as the chapter drives it: the marker's taste kept in state, the shelf ranked from it. */
  function Harness() {
    const [you, setYou] = useState<Vec>(BASE.users[ASH]!),
      [who, setWho] = useState(ASH);
    return createElement(
      'div',
      { 'data-you': JSON.stringify(you) },
      createElement(RecsStage, {
        shelf: { view: 'map', shelf: tasteShelf(BASE.items, you, TRAIN[who]), shopper: who, you, items: BASE.items },
        rows: tasteRows(BASE.items, you, TRAIN[who]),
        scoreName: 'Taste match',
        caption: 'x',
        onMove: setYou,
        pick: {
          value: who,
          options: [
            { id: ASH, name: 'Ash' },
            { id: 'c07', name: 'Quay' },
          ],
          onPick: (c: string) => {
            setWho(c);
            setYou(BASE.users[c]!);
          },
        },
      }),
    );
  }
  const marker = () => host.querySelector<SVGGElement>('.rc-marker')!;
  const shelfIds = () => [...host.querySelectorAll('.rc-item')].map(e => e.getAttribute('data-product'));
  const you = () => JSON.parse((host.firstElementChild as HTMLElement).dataset.you!) as Vec;
  const key = (k: string) => act(() => marker().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })));
  const status = () => host.querySelector('[role="status"]')!;

  it('the marker is focusable, named, and arrow keys move it a fixed step; the shelf re-ranks to match score.ts', () => {
    act(() => root.render(createElement(Harness)));
    expect(marker().getAttribute('tabindex')).toBe('0');
    expect(marker().getAttribute('aria-label')).toMatch(/Arrow keys move them/);
    let v = you();
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) {
      key(k);
      const want = nudge(v, k);
      expect(you()).toEqual(want);
      const [a, b] = toFloor(v),
        [c, d] = toFloor(want);
      // a fixed step on the floor, unless the mat's edge clamps it
      if (c > 30 && c < 160 && d > 40 && d < 125) {
        expect(c - a).toBeCloseTo(KEYS[k][0], 9);
        expect(d - b).toBeCloseTo(KEYS[k][1], 9);
      }
      expect(shelfIds()).toEqual(tasteShelf(BASE.items, want, TRAIN[ASH]));
      v = want;
    }
    expect(Math.abs(STEP)).toBeGreaterThan(0);
    key('a');
    expect(you()).toEqual(v);
  });

  it('one polite status: it names the shelf and changes on a move or a pick', () => {
    act(() => root.render(createElement(Harness)));
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(status().getAttribute('aria-live')).toBe('polite');
    const before = status().textContent;
    expect(before).toMatch(/shelf: /);
    for (let i = 0; i < 12; i++) key('ArrowRight');
    expect(status().textContent).toMatch(/^Nearest /);
    act(() => {
      host.querySelector<HTMLElement>('[role="combobox"]')!.click();
      host.querySelector<HTMLElement>('[role="option"][data-value="c07"]')!.click();
    });
    expect(status().textContent).toMatch(/^c07’s shelf/);
  });

  it('the Ranking tab shows the ranking with the shelf marked', () => {
    act(() => root.render(createElement(Harness)));
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Ranking')!.click());
    expect(host.querySelectorAll('tr[data-shelf]')).toHaveLength(5);
    expect(host.querySelector('.rc-marker')).toBeNull();
  });

  it('under reduced motion nothing animates: motion lives only behind no-preference', () => {
    const css = readFileSync('src/content/recommendations/recommendations.css', 'utf8');
    const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)![1];
    expect(gated).toContain('.rc-item');
    expect(gated).toContain('.rc-marker');
    expect(css.replace(gated, '')).not.toMatch(/animation:|transition:/);
  });
});
