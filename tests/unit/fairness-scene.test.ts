// @vitest-environment happy-dom
// Bias and fairness's stage (U12): every part a callout names is drawn; at most 12 applicants a lane (6 on phones) with
// a count pill for the rest; each lane carries metrics.ts's split at its bar, and its drawn people follow it; looks
// never mark the region; the ranges move together while linked and alone once split; with reduced motion the final
// split shows at once; one polite read-out names each new split and clears when the step changes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { SKIN } from '../../src/lib/iso/figures';
import {
  CAP,
  CAP_PHONE,
  drawnOf,
  GATE_BOARD,
  GATE_PARTS,
  gateLabel,
  gateScene,
  gateState,
  lookAt,
  type GateOpts,
} from '../../src/components/scenes/gateScene';
import { GateStage, lanesOf, splitText, START_BARS } from '../../src/content/fairness/kit';
import type { Bars } from '../../src/lib/fairness/metrics';
import { BARS, REGION_NAMES, runOf } from '../../src/lib/fairness/story';
import pinned from '../../data/fairness/pinned.json' with { type: 'json' };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const at = (bars: Bars, rest: Partial<GateOpts> = {}): GateOpts => ({
  lanes: lanesOf(runOf('all', 'none', bars), bars),
  names: REGION_NAMES,
  ...rest,
});
const draw = (o: GateOpts) =>
  renderToString(createElement(IsoStage, { board: GATE_BOARD, scene: gateScene(o), label: gateLabel(o) }));
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('the sorting gate', () => {
  it('draws every part a callout may name, and escapes pill text', () => {
    for (const part of GATE_PARTS) {
      const svg = draw(at(START_BARS, { say: { block: part, text: 'Here' } }));
      expect(svg, part).toContain('>Here<');
    }
    for (const part of ['lane-a', 'lane-b', 'out-a', 'out-b'])
      expect(draw(at(START_BARS))).toContain(`data-part="${part}"`);
    expect(draw(at(START_BARS, { say: { block: 'check', text: '<b>x' } }))).not.toContain('<b>x');
  });

  it('draws at most 12 applicants a lane (6 on phones), with a count pill for the rest', () => {
    for (const bars of [START_BARS, { A: 0.2, B: 0.8 }, pinned.even.bars]) {
      const wide = draw(at(bars)),
        phone = draw(at(bars, { scale: 2 }));
      for (const r of ['A', 'B']) {
        expect(count(wide, new RegExp(`class="applicant" data-lane="${r}"`, 'g'))).toBe(CAP);
        expect(count(phone, new RegExp(`class="applicant" data-lane="${r}"`, 'g'))).toBe(CAP_PHONE);
      }
      const m = runOf('all', 'none', bars);
      expect(wide).toContain(`NORTHVALE · 300 · ${m.A.tp + m.A.fp} IN · ${m.A.fn + m.A.tn} OUT`);
      expect(wide).toContain(`EASTMERE · 100 · ${m.B.tp + m.B.fp} IN · ${m.B.fn + m.B.tn} OUT`);
      expect(phone).toContain('>NORTHVALE<');
    }
  });

  it("carries each lane's metrics.ts split at its bar, and draws people in proportion", () => {
    for (const bars of [START_BARS, { A: 0.35, B: 0.65 }, pinned.even.bars]) {
      const m = runOf('all', 'none', bars),
        svg = draw(at(bars));
      for (const r of ['A', 'B'] as const) {
        const c = m[r];
        expect(svg).toContain(
          `data-part="lane-${r.toLowerCase()}" data-bar="${bars[r]}" data-tp="${c.tp}" data-fp="${c.fp}" data-fn="${c.fn}" data-tn="${c.tn}"`,
        );
        const d = drawnOf(c);
        expect(d).toHaveLength(CAP);
        // each kind within one person of its share
        for (const k of ['tp', 'fp', 'fn', 'tn'] as const)
          expect(Math.abs(d.filter(x => x === k).length - (c[k] * CAP) / c.n)).toBeLessThan(1);
        expect(count(svg, new RegExp(`data-lane="${r}" data-kind="fn" data-past="1"`, 'g'))).toBe(
          d.filter(x => x === 'fn').length,
        );
      }
      // every wrongly turned-down person drawn has dropped their bag
      expect(count(svg, /class="dropped"/g)).toBe(
        drawnOf(m.A).filter(x => x === 'fn').length + drawnOf(m.B).filter(x => x === 'fn').length,
      );
    }
    // the pinned lesson shows: Eastmere loses more of its repaying applicants at the shared bar
    const m = runOf('all', 'none', START_BARS);
    expect(m.B.falseDecline).toBeGreaterThan(2 * m.A.falseDecline);
    expect(m.A.falseDecline).toBeCloseTo(pinned.all.A.falseDecline, 4);
  });

  it('marks region by lane, never by looks: both lanes walk the same looks in the same order', () => {
    expect(new Set(Array.from({ length: SKIN.length }, (_, i) => lookAt(i).skin))).toEqual(new Set(SKIN));
    const svg = draw(at(START_BARS, { through: 0 }));
    const looks = (r: string) =>
      [...svg.matchAll(new RegExp(`data-lane="${r}"[^>]*>(<g class="person"[\\s\\S]*?)</g></g>`, 'g'))].length;
    expect(looks('A')).toBe(looks('B'));
  });

  it('walks applicants through: none past at the start, all past at the end', () => {
    const st0 = gateState(at(START_BARS, { through: 0 })),
      st1 = gateState(at(START_BARS));
    expect(st0.A.past + st0.B.past).toBe(0);
    expect(st1.A.past).toBe(CAP);
    expect(count(draw(at(START_BARS, { through: 0 })), /data-past="1"/g)).toBe(0);
  });

  // every pill's rect, as [x0, y0, x1, y1], and the picture's width and height
  const pillBoxes = (svg: string) =>
    [
      ...svg.matchAll(/<g class="tag[^"]*">.*?<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g),
    ].map(([, x, y, w, h]) => [+x, +y, +x + +w, +y + +h]);
  const overlaps = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  it('no two pills overlap and none leaves the picture: intro, chapters and share images, linked or split, phone', () => {
    const { A, B } = REGION_NAMES;
    // the chapters' callouts (src/content/fairness/0*.tsx)
    const says: (GateOpts['say'] | undefined)[] = [
      undefined,
      ...(
        [
          ['check', 'The check'],
          ['counter', 'Approved'],
          ['out-b', 'Dropped bags'],
          ['out-a', 'Fewer bags'],
          ['lane-b', '100 applicants'],
          ['post-b', 'Lower scores'],
          ['post-b', `${B} bar`],
          ['post-a', `${A} bar`],
          ['out-b', 'Turned down'],
        ] as const
      ).map(([block, text]) => ({ block, text })),
    ];
    // linked at each end and the shared bar, split both ways, and the pinned even pair
    const bars: Bars[] = [
      ...[BARS[0], START_BARS.A, BARS.at(-1)!].map(b => ({ A: b, B: b })),
      { A: 0.2, B: 0.8 },
      { A: 0.8, B: 0.2 },
      pinned.even.bars,
    ];
    let checked = 0;
    // 1.2 a chapter, 1.3 a share image, 1.4 the intro, 2 a phone
    for (const scale of [1.2, 1.3, 1.4, 2])
      for (const b of bars)
        for (const say of says) {
          const svg = draw(at(b, { scale, say })),
            [, , w, h] = svg
              .match(/viewBox="([-\d. ]+)"/)![1]
              .split(' ')
              .map(Number),
            boxes = pillBoxes(svg),
            where = `${scale} ${JSON.stringify(b)} ${say?.block ?? ''}`;
          for (const [i, p] of boxes.entries()) {
            expect(p[0] >= 0 && p[1] >= 0 && p[2] <= w && p[3] <= h, `${where}: pill ${i} leaves the picture`).toBe(
              true,
            );
            for (let j = i + 1; j < boxes.length; j++)
              expect(overlaps(p, boxes[j]), `${where}: pills ${i} and ${j}`).toBe(false);
          }
          checked++;
        }
    expect(checked).toBeGreaterThan(100);
  }, 90_000);
});

describe('slide the bar', () => {
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
  const slide = (input: HTMLInputElement, i: number) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(i));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  let seen: Bars = START_BARS;
  function Harness({ linked, step = 1 }: { linked: boolean; step?: number }) {
    const [bars, setBars] = useState<Bars>(START_BARS);
    seen = bars;
    return createElement(GateStage, { bars, onBars: setBars, linked, caption: 'x', step });
  }

  it('moves both lanes together while linked (ch. 1–4), and each alone once split (ch. 5 on)', () => {
    reduce(true);
    act(() => root.render(createElement(Harness, { linked: true })));
    const [a, b] = host.querySelectorAll<HTMLInputElement>('input[type="range"]');
    expect(a.closest('[data-linked]')!.getAttribute('data-linked')).toBe('1');
    slide(a, BARS.indexOf(0.3));
    expect(seen).toEqual({ A: 0.3, B: 0.3 });
    expect(b.value).toBe(String(BARS.indexOf(0.3)));
    act(() => root.render(createElement(Harness, { linked: false })));
    const [a2, b2] = host.querySelectorAll<HTMLInputElement>('input[type="range"]');
    slide(b2, BARS.indexOf(pinned.even.bars.B));
    expect(seen).toEqual({ A: 0.3, B: pinned.even.bars.B });
    expect(a2.value).toBe(String(BARS.indexOf(0.3)));
    // the picture follows: each lane's split at its own bar
    const m = runOf('all', 'none', seen);
    expect(host.innerHTML).toContain(`data-part="lane-b" data-bar="${seen.B}" data-tp="${m.B.tp}"`);
  });

  it('shows the final split at once with reduced motion', () => {
    reduce(true);
    act(() => root.render(createElement(Harness, { linked: true })));
    expect(count(host.innerHTML, /data-past="0"/g)).toBe(0);
    expect(count(host.innerHTML, /data-past="1"/g)).toBe(2 * CAP);
  });

  it('walks the applicants through when motion is allowed, then reads out the split', () => {
    reduce(false);
    vi.useFakeTimers();
    act(() => root.render(createElement(Harness, { linked: true })));
    expect(count(host.innerHTML, /data-past="1"/g)).toBe(0);
    const said = host.querySelector('[role="status"]')!;
    expect(said.textContent).toBe('');
    act(() => vi.advanceTimersByTime(2000));
    expect(count(host.innerHTML, /data-past="1"/g)).toBe(2 * CAP);
    expect(said.textContent).toBe(splitText(runOf('all', 'none', START_BARS), START_BARS));
  });

  it('has one polite read-out that names each new split and clears when the step changes', () => {
    reduce(true);
    act(() => root.render(createElement(Harness, { linked: true })));
    const status = host.querySelectorAll('[role="status"]');
    expect(status).toHaveLength(1);
    expect(status[0].getAttribute('aria-live')).toBe('polite');
    expect(status[0].closest('svg')).toBeNull();
    slide(host.querySelector<HTMLInputElement>('input[type="range"]')!, BARS.indexOf(0.6));
    const bars = { A: 0.6, B: 0.6 };
    expect(status[0].textContent).toBe(splitText(runOf('all', 'none', bars), bars));
    expect(status[0].textContent).toContain('Eastmere at 0.60');
    act(() => root.render(createElement(Harness, { linked: true, step: 2 })));
    expect(host.querySelector('[role="status"]')!.textContent).toBe('');
  });

  it('shows the per-group bars one tab away, read off the same run', () => {
    reduce(true);
    act(() => root.render(createElement(Harness, { linked: true })));
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Bars')!.click());
    const m = runOf('all', 'none', START_BARS);
    const fd = host.querySelector('[data-metric="falseDecline"]')!;
    expect(fd.querySelector('[data-region="A"]')!.textContent).toContain(`${Math.round(m.A.falseDecline * 100)}%`);
    expect(fd.querySelector('[data-region="B"]')!.textContent).toContain(`${Math.round(m.B.falseDecline * 100)}%`);
    expect(host.querySelector('svg')).toBeNull();
  });
});
