// @vitest-environment happy-dom
// Choosing a model's stage (KTD8): every part a callout names is drawn; each poise range's value moves its poise and
// the beam's tilt and heading come from score.ts; every range moves alone; with reduced motion the beam shows its
// final tilt at once; one polite read-out says where the beam tips and clears when the step changes; the Scores tab
// reads the same weighing; no two pills overlap.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  STEELYARD_BOARD,
  STEELYARD_PARTS,
  aimOf,
  beamOf,
  notch,
  steelyardLabel,
  steelyardScene,
  type SteelyardOpts,
} from '../../src/components/scenes/steelyardScene';
import { NONE, SteelyardStage, tipText } from '../../src/content/choosing-models/kit';
import type { Source } from '../../src/lib/choosing-models/machines';
import { CRITERIA, WEIGHTS, rowsOf, tiltOf, weigh, type Weights } from '../../src/lib/choosing-models/score';
import { qualityText } from '../../src/lib/choosing-models/story';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const at = (source: Source, w: Weights, rest: Partial<SteelyardOpts> = {}): SteelyardOpts => {
  const { winner, lead } = weigh(rowsOf(source), w);
  return { aim: aimOf(winner), tilt: tiltOf(lead, winner), winner, weights: w, pills: qualityText(source).pills, ...rest };
};
const draw = (o: SteelyardOpts) =>
  renderToString(createElement(IsoStage, { board: STEELYARD_BOARD, scene: steelyardScene(o), label: steelyardLabel(o) }));

describe('the market hall', () => {
  it('draws every part a callout may name, and escapes pill text', () => {
    for (const part of STEELYARD_PARTS) {
      const svg = draw(at('larkspur', { quality: 2, cost: 1, wait: 1 }, { say: { block: part, text: 'Here' } }));
      expect(svg, part).toContain('>Here<');
    }
    expect(draw(at('larkspur', NONE, { say: { block: 'beam', text: '<b>x' } }))).not.toContain('<b>x');
    expect(draw(at('larkspur', NONE, { pills: { A: '<i>', B: 'B', C: 'C' } }))).not.toContain('<i>');
  });

  it('hangs each poise at its weight’s notch, and tips the beam as score.ts says', () => {
    for (const w of [NONE, { quality: 4, cost: 0, wait: 0 }, { quality: 2, cost: 1, wait: 0 }, { quality: 1, cost: 3, wait: 4 }]) {
      const o = at('larkspur', w),
        svg = draw(o),
        { winner, lead } = weigh(rowsOf('larkspur'), w);
      expect(svg).toContain(`data-part="beam" data-winner="${winner ?? 'none'}" data-tilt="${tiltOf(lead, winner).toFixed(1)}"`);
      expect(svg).toContain(`data-part="pan" data-slips="${winner ? 3 : 0}"`);
      for (const k of CRITERIA) {
        expect(svg).toContain(`data-poise="${k}" data-weight="${w[k]}"`);
        // the poise's hook sits notch(w) out along the long arm
        const g = beamOf(o.aim, o.tilt, w),
          d = Math.hypot(g.poise[k].hook[0] - g.pivot[0], g.poise[k].hook[1] - g.pivot[1], g.poise[k].hook[2] - g.pivot[2]);
        expect(d).toBeCloseTo(notch(w[k]), 6);
      }
    }
  });

  it('dips the short arm toward the winner, and hangs level on a tie', () => {
    const tip = at('larkspur', { quality: 2, cost: 1, wait: 0 });
    const g = beamOf(tip.aim, tip.tilt, tip.weights);
    expect(g.short[2]).toBeLessThan(g.pivot[2]);
    expect(g.long[2]).toBeGreaterThan(g.pivot[2]);
    const level = at('larkspur', NONE),
      h = beamOf(level.aim, level.tilt, NONE);
    expect(h.short[2]).toBeCloseTo(h.pivot[2], 9);
  });

  // every pill's rect, as [x0, y0, x1, y1]
  const pillBoxes = (svg: string) =>
    [...svg.matchAll(/<g class="tag[^"]*">.*?<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(
      ([, x, y, w, h]) => [+x, +y, +x + +w, +y + +h],
    );
  const overlaps = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  it('no two pills overlap and none leaves the picture, wide and phone, with every chapter callout', () => {
    const says = [
      undefined,
      ...(
        [
          ['beam', 'Level'],
          ['quality', 'Quality'],
          ['cost', 'Cost'],
          ['wait', 'Wait'],
          ['pan', 'One answer'],
          ['machine-a', 'Top in public'],
          ['machine-b', 'Second in public'],
          ['machine-c', 'Under the bar'],
        ] as const
      ).map(([block, text]) => ({ block, text })),
    ];
    let checked = 0;
    for (const scale of [1.2, 1.3, 1.4, 2])
      for (const source of ['public', 'larkspur', 'next'] as Source[])
        for (const w of [NONE, { quality: 4, cost: 0, wait: 0 }, { quality: 2, cost: 1, wait: 0 }, { quality: 0, cost: 0, wait: 4 }])
          for (const say of says) {
            const o = at(source, w, { scale, say, ...(scale > 1.5 ? { pills: { A: 'A', B: 'B', C: 'C' } } : {}) });
            const svg = draw(o),
              [, , vw, vh] = svg.match(/viewBox="([-\d. ]+)"/)![1].split(' ').map(Number),
              boxes = pillBoxes(svg),
              where = `${scale} ${source} ${JSON.stringify(w)} ${say?.block ?? ''}`;
            for (const [i, p] of boxes.entries()) {
              expect(p[0] >= 0 && p[1] >= 0 && p[2] <= vw && p[3] <= vh, `${where}: pill ${i} leaves`).toBe(true);
              for (let j = i + 1; j < boxes.length; j++) expect(overlaps(p, boxes[j]), `${where}: ${i}/${j}`).toBe(false);
            }
            checked++;
          }
    expect(checked).toBeGreaterThan(100);
  }, 90_000);
});

describe('slide the poise weights', () => {
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
    vi.useRealTimers();
  });
  const slide = (input: HTMLInputElement, v: number) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const ROWS = rowsOf('larkspur');
  let seen: Weights = NONE;
  function Harness({ step = 1 }: { step?: number }) {
    const [w, setW] = useState<Weights>(NONE);
    seen = w;
    return createElement(SteelyardStage, {
      rows: ROWS,
      weights: w,
      onWeights: setW,
      quality: qualityText('larkspur'),
      caption: 'x',
      step,
    });
  }
  const tilt = () => host.querySelector('[data-part="beam"]')!.getAttribute('data-tilt');

  it('each range moves its own poise alone, over every notch, and the beam follows score.ts', () => {
    reduce(true);
    act(() => root.render(createElement(Harness)));
    const ranges = host.querySelectorAll<HTMLInputElement>('input[type="range"]');
    expect(ranges).toHaveLength(3);
    for (const [i, k] of CRITERIA.entries())
      for (const v of WEIGHTS) {
        slide(ranges[i], v);
        expect(seen[k]).toBe(v);
        const { winner, lead } = weigh(ROWS, seen);
        expect(tilt()).toBe(tiltOf(lead, winner).toFixed(1));
        expect(host.innerHTML).toContain(`data-poise="${k}" data-weight="${v}"`);
      }
  });

  it('swings to the final tilt over a few ticks with motion, at once with reduced motion', () => {
    reduce(false);
    vi.useFakeTimers();
    act(() => root.render(createElement(Harness)));
    slide(host.querySelector<HTMLInputElement>('input[type="range"]')!, 4);
    const end = weigh(ROWS, seen),
      final = tiltOf(end.lead, end.winner).toFixed(1);
    expect(tilt()).not.toBe(final);
    act(() => vi.advanceTimersByTime(1000));
    expect(tilt()).toBe(final);
    act(() => root.unmount());
    root = createRoot(host);
    reduce(true);
    act(() => root.render(createElement(Harness)));
    slide(host.querySelector<HTMLInputElement>('input[type="range"]')!, 4);
    expect(tilt()).toBe(final);
  });

  it('has one polite read-out that says where the beam tips and clears when the step changes', () => {
    reduce(true);
    act(() => root.render(createElement(Harness)));
    const status = host.querySelectorAll('[role="status"]');
    expect(status).toHaveLength(1);
    expect(status[0].getAttribute('aria-live')).toBe('polite');
    expect(status[0].closest('svg')).toBeNull();
    slide(host.querySelectorAll<HTMLInputElement>('input[type="range"]')[1], 2);
    expect(status[0].textContent).toBe(tipText(ROWS, { quality: 0, cost: 2, wait: 0 }));
    expect(status[0].textContent).toContain('Machine C');
    act(() => root.render(createElement(Harness, { step: 2 })));
    expect(host.querySelector('[role="status"]')!.textContent).toBe('');
  });

  it('shows the scores per machine one tab away, read off the same weighing', () => {
    reduce(true);
    act(() => root.render(createElement(Harness)));
    slide(host.querySelector<HTMLInputElement>('input[type="range"]')!, 3);
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Scores')!.click());
    const { winner } = weigh(ROWS, seen);
    expect(host.querySelector(`tr[data-machine="${winner}"]`)!.getAttribute('data-win')).toBe('1');
    expect(host.querySelector('svg')).toBeNull();
  });
});
