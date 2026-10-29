// @vitest-environment happy-dom
// Dependencies' stage (U13): the tower's parts and callouts, pulling a crate turns exactly the resolver's dependants
// tomato (with crossed planks, not colour alone), the 12-crate cap and its count pill, the topple only behind
// prefers-reduced-motion: no-preference, the keyboard path (arrow keys between crates, a version drop-down, Pull), and the
// one polite role="status" read-out outside the drawing.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_CRATES,
  TOWER_BOARD,
  TOWER_PARTS,
  towerLabel,
  towerOf,
  towerPlot,
  towerScene,
  towerState,
  type TowerOpts,
} from '../../src/components/scenes/towerScene';
import { DepsStage, pulledOf, type Overrides } from '../../src/content/dependencies/kit';
import { brokenOf, dependantsOf, install } from '../../src/lib/dependencies/resolve';
import { FIRST, HIJACK_DAY } from '../../src/lib/dependencies/story';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draw = (o: TowerOpts) =>
  renderToString(createElement(IsoStage, { board: TOWER_BOARD, scene: towerScene(o), label: towerLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const brokenDrawn = (svg: string) =>
  [...svg.matchAll(/data-crate="([^"]+)" data-broken="1"/g)].map(m => (m[1] === 'app' ? '' : m[1])).sort();
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>(
  '../../src/content/dependencies/[0-9]*.tsx',
  { eager: true },
);

describe('the crate tower', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const pull = { 'cartwheel/tidystr': null };
    const all: TowerOpts = {
      ...towerOf(install({ day: HIJACK_DAY, overrides: { pricebook: '2.0.0' } }), {
        lit: ['shipcalc'],
        lock: true,
        pulled: pulledOf(FIRST, pull),
      }),
    };
    const svg = draw(all);
    for (const p of ['app', 'lit', 'nested', 'broken', 'hijacked', 'lock']) expect(svg).toContain(`data-prop="${p}"`);
    expect(svg).toContain('data-pulled="cartwheel/tidystr"');
    for (const p of TOWER_PARTS) expect(draw({ ...all, say: { block: p, text: 'Here' } })).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(TOWER_PARTS).toContain(b);
  });

  it('pulling a crate turns exactly the resolver’s dependants tomato, each with crossed planks', () => {
    for (const path of ['cartwheel/tidystr', 'roundnum', 'inkdrop', 'geobits']) {
      const t = install({ day: 0, overrides: { [path]: null } });
      const svg = draw(towerOf(t, { pulled: pulledOf(FIRST, { [path]: null }) }));
      const want = [...dependantsOf(FIRST, [path])].sort();
      expect(brokenDrawn(svg)).toEqual(want);
      expect([...brokenOf(t)].sort()).toEqual(want);
      expect(count(svg, 'class="planks"')).toBe(want.length);
      expect(svg).toContain(`data-pulled="${path}"`);
    }
  });

  it('draws at most 12 crates; the deepest fold into a count pill', () => {
    // a chain 20 deep: the app needs p0, p0 needs p1, …
    const n = 20;
    const crates = [
      { path: '', name: 'app', version: '' },
      ...Array.from({ length: n }, (_, i) => ({ path: `p${i}`, name: `p${i}`, version: '1.0.0' })),
    ];
    const needs: Record<string, string[]> = { '': ['p0'] };
    for (let i = 0; i < n; i++) needs[`p${i}`] = i + 1 < n ? [`p${i + 1}`] : [];
    const st = towerState({ crates, needs });
    expect(st.shown).toHaveLength(MAX_CRATES);
    expect(st.hidden).toBe(n + 1 - MAX_CRATES);
    const svg = draw({ crates, needs });
    expect(count(svg, 'class="tw-crate"')).toBe(MAX_CRATES);
    expect(svg).toContain(`+${n + 1 - MAX_CRATES} DEEPER`);
    expect(draw({ crates, needs, scale: 2 })).toContain(`+${n + 1 - MAX_CRATES} DEEPER`);
  });

  it('a column stands on something it needs: a crate directly over another needs it', () => {
    const st = towerState(towerOf(FIRST));
    const t = towerOf(FIRST);
    for (const p of st.shown) {
      const under = st.shown.find(q => st.slot[q] === st.slot[p] && st.level[q] === st.level[p] - 1);
      if (under !== undefined && p === '') continue;
      if (under !== undefined && st.level[p] > 0) expect(t.needs[p]).toContain(under);
    }
  });

  it('phones keep just the names in the pills; desktop adds versions', () => {
    const o = towerOf(FIRST);
    expect(draw({ ...o, scale: 2 })).not.toContain('>pricebook 1.4.2<');
    expect(draw({ ...o, scale: 1.2 })).toContain('>pricebook 1.4.2<');
  });

  it('every name is escaped', () => {
    const svg = draw({ crates: [{ path: '', name: '<b>x</b>', version: '' }], needs: { '': [] } });
    expect(svg).not.toContain('<b>x</b>');
  });

  it('the hero plot draws', () => {
    expect(
      towerPlot(100, 100, [
        [0, 0, 0],
        [200, 0, 0],
        [200, 200, 0],
        [0, 200, 0],
      ]),
    ).toContain('<path');
  });

  it('under reduced motion nothing topples: motion lives only behind no-preference', () => {
    const css = readFileSync('src/content/dependencies/dependencies.css', 'utf8');
    const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)![1];
    expect(gated).toContain('.tw-crate[data-fell]');
    expect(css.replace(gated, '')).not.toMatch(/animation:|transition:/);
    // the broken pose itself is drawn: tomato and planks, no animation in the SVG
    const svg = draw(towerOf(install({ day: 0, overrides: { roundnum: null } })));
    expect(svg).toContain('class="planks"');
    expect(svg).not.toMatch(/<animate|style="[^"]*transition/);
  });
});

describe('pull a crate, by keyboard', () => {
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

  /** A chapter's stage: overrides in state, the tree reinstalled on each move. */
  function Harness() {
    const [o, setO] = useState<Overrides>({});
    const t = install({ day: 0, overrides: o });
    return createElement(
      'div',
      { 'data-o': JSON.stringify(o) },
      createElement(DepsStage, {
        show: { tower: towerOf(t, { pulled: pulledOf(FIRST, o) }), tree: t, caption: 'x', status: 'Day 0.' },
        overrides: o,
        onPull: setO,
      }),
    );
  }
  const crates = () => [...host.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')];
  const state = () => JSON.parse((host.firstElementChild as HTMLElement).dataset.o!);
  const status = () => host.querySelectorAll('[role="status"]');

  it('arrow keys move between crates; the drop-down forces a version; Pull takes it out; one status says what broke', () => {
    act(() => root.render(createElement(Harness)));
    expect(status()).toHaveLength(1);
    expect(status()[0].closest('svg')).toBeNull();
    expect(status()[0].getAttribute('aria-live')).toBe('polite');
    expect(status()[0].textContent).toBe('Day 0.');
    const [a] = crates();
    expect(a.tabIndex).toBe(0);
    a.focus();
    // walk to pricebook with the arrow keys
    const target = crates().findIndex(b => b.dataset.crate === 'pricebook');
    for (let i = 0; i < target; i++)
      act(() => {
        (document.activeElement as HTMLElement).dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        );
      });
    expect((document.activeElement as HTMLElement).dataset.crate).toBe('pricebook');
    expect((document.activeElement as HTMLButtonElement).tabIndex).toBe(0);
    const version = (v: string) =>
      act(() => host.querySelector<HTMLElement>(`[role="option"][data-value="${v}"]`)!.click());
    version('2.0.0');
    expect(state()).toEqual({ pricebook: '2.0.0' });
    expect(status()[0].textContent).toMatch(/pricebook set to 2\.0\.0\. Broken: .*cartwheel/);
    expect(host.querySelectorAll('[data-broken="1"]').length).toBe(2);
    const back = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Put back');
    const pull = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Pull pricebook')!;
    // setting it back to the version it had mends the tower
    version('1.4.2');
    expect(host.querySelectorAll('[data-broken="1"]')).toHaveLength(0);
    act(() => pull().click());
    expect(state()).toEqual({ pricebook: null });
    expect(status()[0].textContent).toMatch(/^Pulled pricebook\. Broken: /);
    // the crates that broke on this move are the ones that topple
    expect(host.querySelectorAll('[data-fell="1"]').length).toBe(host.querySelectorAll('[data-broken="1"]').length);
    act(() => back()!.click());
    expect(state()).toEqual({});
    expect(status()[0].textContent).toBe('Put back pricebook. Nothing is broken.');
  });
});
