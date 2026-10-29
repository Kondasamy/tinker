// @vitest-environment happy-dom
// Many chips, one model's stage (U23): every part a callout names is drawn; at most 8 workers; the buckets carry exactly
// ring.ts's fills after k hops; the line's idle workers are pipeline.ts's; pass the buckets steps one hop, Play turns
// into Pause and stops at the last hop, is hidden under reduced motion while Step still walks every finished stage; the
// one polite read-out names each action and milestone, never each tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  LINE_PARTS,
  RING_BOARD,
  RING_PARTS,
  ringLabel,
  ringPlot,
  ringScene,
  ringTimeline,
  timelineCells,
  type RingOpts,
} from '../../src/components/scenes/ringScene';
import {
  PassTable,
  gradientsFor,
  lastOf,
  milestone,
  ringFor,
  sceneOf,
  START,
  type PassState,
} from '../../src/content/parallel-training/kit';
import { fillsAfter, meanOf } from '../../src/lib/parallel-training/ring';
import { bubble, gpipe, idleAt } from '../../src/lib/parallel-training/pipeline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const draw = (o: RingOpts) =>
  renderToString(createElement(IsoStage, { board: RING_BOARD, scene: ringScene(o), label: ringLabel(o) }));
const at = (s: Partial<PassState>): PassState => ({ ...START, ...s });
const attrs = (svg: string, name: string) => [...svg.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(m => m[1]);
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>(
  '../../src/content/parallel-training/[0-9]*.tsx',
  { eager: true },
);

describe('the round table', () => {
  it('draws every part a callout may name, in its mode, and every callout the chapters use is one of them', () => {
    for (const part of RING_PARTS)
      expect(draw({ ...sceneOf(at({ k: 1 })), say: { block: part, text: 'Here' } })).toContain('Here');
    for (const part of LINE_PARTS)
      expect(draw({ ...sceneOf(at({ mode: 'pipeline', k: 1 })), say: { block: part, text: 'Here' } })).toContain(
        'Here',
      );
    const all: string[] = [...RING_PARTS, ...LINE_PARTS];
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(all).toContain(b);
  });

  it('draws at most 8 workers', () => {
    expect(attrs(draw({ n: 12, fills: fillsAfter(ringFor(8), 0) }), 'data-worker')).toHaveLength(8);
    expect(attrs(draw(sceneOf(at({ n: 8 }))), 'data-worker')).toHaveLength(8);
    expect(attrs(draw(sceneOf(at({ mode: 'pipeline', n: 8, m: 8 }))), 'data-worker')).toHaveLength(8);
  });

  it('fills each bucket as ring.ts does after k hops, and arrows each hop’s sends', () => {
    for (const n of [2, 4, 8] as const) {
      const r = ringFor(n);
      expect([...r.result[0]]).toEqual([...meanOf(gradientsFor(n))].map(x => expect.closeTo(x, 12)));
      for (let k = 0; k <= lastOf(at({ n })); k++) {
        const svg = draw(sceneOf(at({ n, k }))),
          want = fillsAfter(r, k);
        const got = attrs(svg, 'data-bucket').map((wc, j) => [wc, Number(attrs(svg, 'data-fill')[j])] as const);
        expect(got).toHaveLength(n * n);
        for (const [wc, f] of got) {
          const [w, c] = wc.split(',').map(Number);
          expect(f).toBeCloseTo(want[w][c], 3);
        }
        const sends = attrs(svg, 'data-sends')[0];
        expect(sends).toBe(k ? r.hops[k - 1].sends.map(s => `${s.from}>${s.to}:${s.chunk}`).join(' ') : '');
      }
      // at the end every bucket is full
      expect(
        fillsAfter(r, 2 * (n - 1))
          .flat()
          .every(f => f === 1),
      ).toBe(true);
    }
  });

  it('in pipeline mode idles exactly the stages pipeline.ts idles at each slot', () => {
    for (const [p, m] of [
      [4, 1],
      [4, 4],
      [8, 3],
    ]) {
      const sch = gpipe(p, m);
      for (let k = 0; k < sch.slots; k++) {
        const svg = draw(sceneOf(at({ mode: 'pipeline', n: p as 4 | 8, m, k })));
        const idle = [...svg.matchAll(/data-stage="(\d+)" data-idle="1"/g)].map(x => Number(x[1]));
        expect(idle).toEqual(idleAt(sch, k));
        const sitting = attrs(svg, 'data-pose').filter(x => x === 'sit').length;
        expect(sitting).toBe(idle.length);
      }
      const cells = timelineCells({ mode: 'pipeline', grid: sch.grid, k: 0 });
      expect(cells.filter(c => c.kind === 'bubble').length / cells.length).toBeCloseTo(bubble(p, m), 9);
    }
  });

  it('memory mode spills over 1, a failed worker lies fallen, pills are escaped', () => {
    const svg = draw({ n: 1, load: [14] });
    expect(svg).toContain('class="spill"');
    expect(svg).toContain('14×');
    expect(draw({ n: 4, load: [0.5, 0.5, 0.5, 0.5] })).not.toContain('class="spill"');
    expect(draw({ ...sceneOf(at({})), down: 2 })).toMatch(/data-worker="2"><g class="person"[^>]*data-pose="fallen"/);
    expect(draw({ ...sceneOf(at({})), rack: '<b>x' })).not.toContain('<b>x');
    expect(ringPlot(40, 40, [])).toContain('<path');
  });

  it('the timeline marks hops done in ring mode and hatches the bubble', () => {
    const t = ringTimeline({ mode: 'ring', n: 4, k: 2 });
    expect(t.cells.filter(c => c.kind === 'wait')).toHaveLength(4 * 6);
    expect(t.cells.filter(c => c.kind === 'wait' && c.done)).toHaveLength(4 * 2);
    expect(ringTimeline({ mode: 'pipeline', grid: gpipe(4, 2).grid, k: 0 }).svg).toContain('stroke="#8f989b"');
  });
});

describe('pass the buckets, live', () => {
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const button = (t: string) => [...host.querySelectorAll('button')].find(b => b.textContent === t);
  const status = () => host.querySelectorAll('[role="status"]');
  const fills = () =>
    [...host.querySelectorAll('[data-bucket]')].map(g => [
      g.getAttribute('data-bucket'),
      Number(g.getAttribute('data-fill')),
    ]);

  it('Step moves one hop and says it; Play turns into Pause, speaks only at milestones and stops at the last hop', () => {
    reduce(false);
    vi.useFakeTimers();
    act(() => root.render(createElement(PassTable, { caption: 'x' })));
    expect(status()).toHaveLength(1);
    expect(status()[0].getAttribute('aria-live')).toBe('polite');
    act(() => button('Step')!.click());
    expect(status()[0].textContent).toBe('Hop 1 of 6: each worker passed one bucket on and added it in.');
    act(() => button('Play')!.click());
    expect(button('Pause')).toBeTruthy();
    expect(status()[0].textContent).toBe('Playing from hop 1.');
    act(() => vi.advanceTimersByTime(800));
    // hop 2 is no milestone: the read-out keeps what it said
    expect(status()[0].textContent).toBe('Playing from hop 1.');
    act(() => vi.advanceTimersByTime(800));
    expect(status()[0].textContent).toBe(milestone(at({ k: 3 })));
    // a tick at a time, as the browser renders between them; past the last hop it stays put
    for (let i = 0; i < 6; i++) act(() => vi.advanceTimersByTime(800));
    expect(status()[0].textContent).toBe(milestone(at({ k: 6 })));
    expect(button('Pause')).toBeUndefined();
    expect(button('Step')!.disabled).toBe(true);
    expect(fills().every(([, f]) => f === 1)).toBe(true);
    // the worker count starts the ring again
    act(() => host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click());
    expect(host.querySelectorAll('[data-worker]')).toHaveLength(8);
    expect(status()[0].textContent).toBe('8 workers, each bucket holding its own share.');
  });

  it('with reduced motion there is no Play, and Step shows each finished stage', () => {
    reduce(true);
    act(() => root.render(createElement(PassTable, { caption: 'x' })));
    expect(button('Play')).toBeUndefined();
    const r = ringFor(4);
    for (let k = 1; k <= 6; k++) {
      act(() => button('Step')!.click());
      const want = fillsAfter(r, k);
      for (const [wc, f] of fills()) {
        const [w, c] = String(wc).split(',').map(Number);
        expect(f).toBeCloseTo(want[w][c], 3);
      }
    }
    expect(status()[0].textContent).toContain(milestone(at({ k: 6 }))!);
  });

  it('in pipeline mode, the micro-batch range restarts and the Timeline tab draws the schedule', () => {
    reduce(false);
    act(() => root.render(createElement(PassTable, { caption: 'x', start: at({ mode: 'pipeline' }) })));
    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!;
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(range, '7');
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(status()[0].textContent).toBe('4 stages, 8 micro-batches: 22 slots, 27% of them idle.');
    act(() => button('Step')!.click());
    expect(status()[0].textContent).toBe('Slot 2 of 22: stages 3 and 4 idle.');
    act(() => button('Timeline')!.click());
    expect(host.querySelectorAll('.pt-wide .tl-cell')).toHaveLength(4 * 22);
  });
});
