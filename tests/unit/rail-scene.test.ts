// @vitest-environment happy-dom
// Queues' stage (U6): the rail's parts and callouts, the ticket cap and its count pill, the crash bar (only busy workers
// can be knocked over, a reason when none is, arrow keys between them), Step and a crash while paused, and the fall
// drawn still with motion only behind prefers-reduced-motion: no-preference.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_TICKETS,
  RAIL_BOARD,
  RAIL_PARTS,
  idleRail,
  railAt,
  railCard,
  railLabel,
  railPlot,
  railReadouts,
  railScene,
  railState,
  type RailOpts,
} from '../../src/components/scenes/railScene';
import { QueuesStage } from '../../src/content/queues/kit';
import { CRASH_AT, SCENES, SHOWN_CRASH, WORKER_NAMES, runOf, type Crash } from '../../src/lib/queues/sim';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draw = (o: RailOpts) =>
  renderToString(createElement(IsoStage, { board: RAIL_BOARD, scene: railScene(o), label: railLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/queues/[0-9]*.tsx', {
  eager: true,
});

describe('the ticket rail', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const svg = draw(railAt(runOf(SCENES.one), 12));
    for (const p of ['till', 'rail', 'shelf', 'courier']) expect(svg).toContain(`data-prop="${p}"`);
    expect(svg).toContain('class="worker"');
    for (const p of RAIL_PARTS) expect(draw({ ...idleRail(2), say: { block: p, text: 'Here' } })).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    expect(used.length).toBeGreaterThan(5);
    for (const b of used) expect(RAIL_PARTS).toContain(b);
  });

  it('a run with 30 waiting draws 12 tickets and a “+18” pill', () => {
    const o: RailOpts = { ...idleRail(2), waiting: Array.from({ length: 30 }, (_, i) => ({ id: `J${i}`, tries: 0 })) };
    expect(railState(o)).toMatchObject({ tickets: MAX_TICKETS, more: 18 });
    const svg = draw(o);
    expect(count(svg, 'data-ticket=')).toBe(12);
    expect(svg).toContain('+18');
    expect(draw({ ...o, scale: 2 })).toContain('+18');
  });

  it('a knocked-over worker lies by the bench with the dropped ticket; the lapsed lease puts it back on the rail', () => {
    const r = runOf({ ...SCENES.crash, crashes: [SHOWN_CRASH] });
    const at = railAt(r, CRASH_AT);
    expect(at.workers[SHOWN_CRASH.worker]).toMatchObject({ state: 'down' });
    expect(at.workers[SHOWN_CRASH.worker].job).toBeDefined();
    expect(at.fell).toEqual([SHOWN_CRASH.worker]);
    expect(railAt(r, CRASH_AT + 1).fell).toEqual([]);
    const svg = draw(at);
    expect(svg).toContain('data-state="down"');
    expect(svg).toContain('class="fallen"');
    const back = railAt(r, CRASH_AT + SCENES.crash.lease);
    expect(back.returned).toEqual([at.workers[SHOWN_CRASH.worker].job]);
    expect(draw(back)).toContain('returned');
    // between, it hangs greyed: on the rail, hidden by the lease
    expect(railAt(r, CRASH_AT + 4).hidden).toBe(1);
  });

  it('phones keep just the names in the pills; the caption carries the counts', () => {
    const o = railAt(runOf(SCENES.noBackoff), 12);
    expect(draw({ ...o, scale: 2 })).not.toContain('TRY ');
    expect(draw({ ...o, scale: 1.2 })).toContain('TRY ');
    expect(railReadouts(o).join(' ')).toMatch(/waiting/);
  });

  it('the hero plot and the card picture draw', () => {
    expect(
      railPlot(100, 100, [
        [0, 0, 0],
        [200, 0, 0],
        [200, 200, 0],
        [0, 200, 0],
      ]),
    ).toContain('<path');
    expect(draw(railCard())).toContain('data-state="down"');
  });
});

describe('the crash bar and the clock', () => {
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

  /** The chapter-5 stage as a chapter drives it: the clock, and crashes kept in state. */
  function Harness({ start = CRASH_AT }: { start?: number }) {
    const [t, setT] = useState(start),
      [crashes, setCrashes] = useState<Crash[]>([]);
    const r = runOf({ ...SCENES.crash, crashes });
    return createElement(
      'div',
      { 'data-t': t, 'data-crashes': JSON.stringify(crashes) },
      createElement(QueuesStage, {
        show: { scene: railAt(r, t), result: r, tick: t, caption: 'x' },
        onTick: setT,
        onCrash: (worker: number) => setCrashes(c => [...c, { worker, tick: t }]),
      }),
    );
  }
  const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')];
  const press = (name: string) =>
    act(() => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === name)!.click());

  it('only busy workers can be knocked over; with none busy every button is disabled with a reason', () => {
    act(() => root.render(createElement(Harness)));
    const busy = railAt(runOf(SCENES.crash), CRASH_AT).workers.map(w => w.state === 'busy');
    expect(buttons().map(b => !b.disabled)).toEqual(busy);
    expect(buttons().map(b => b.textContent)).toEqual(WORKER_NAMES.slice(0, 2).map(n => `Knock over ${n}`));
    expect(host.textContent).not.toContain('No worker is mid-job');
    act(() => root.unmount());
    root = createRoot(host);
    act(() =>
      root.render(createElement(QueuesStage, { show: { scene: idleRail(2), caption: 'x' }, onCrash: () => {} })),
    );
    expect(buttons().every(b => b.disabled)).toBe(true);
    expect(host.textContent).toContain('No worker is mid-job');
  });

  it('Step advances one minute; a crash while paused lands at the current minute', () => {
    act(() => root.render(createElement(Harness)));
    const box = () => host.firstElementChild as HTMLElement;
    press('Step');
    expect(box().dataset.t).toBe(String(CRASH_AT + 1));
    const i = buttons().findIndex(b => !b.disabled);
    act(() => buttons()[i].click());
    expect(JSON.parse(box().dataset.crashes!)).toEqual([{ worker: i, tick: CRASH_AT + 1 }]);
    expect(host.querySelector(`[data-worker="${i}"][data-state="down"]`)).not.toBeNull();
  });

  it('the arrow keys move between the busy workers’ buttons', () => {
    act(() => root.render(createElement(Harness)));
    const [a, b] = buttons();
    expect(a.disabled || b.disabled).toBe(false);
    expect(a.tabIndex).toBe(0);
    expect(b.tabIndex).toBe(-1);
    a.focus();
    act(() => {
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(document.activeElement).toBe(b);
    expect(b.tabIndex).toBe(0);
  });

  it('under reduced motion the fall and the slide have no animation: motion lives only behind no-preference', () => {
    const css = readFileSync('src/content/queues/queues.css', 'utf8');
    const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)![1];
    expect(gated).toContain('[data-fell] .fallen');
    expect(gated).toContain('.ticket.returned');
    const outside = css.replace(gated, '');
    expect(outside).not.toMatch(/animation:|transition:/);
    // the fallen pose itself is drawn, not animated into
    expect(draw(railCard())).not.toMatch(/<animate|style="[^"]*transition/);
  });
});
