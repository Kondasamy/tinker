// @vitest-environment happy-dom
// Releases' stage (U17): the signal box's parts and callouts, the lit share against the simulator's exposure at every
// minute, the pipeline's lamps, the dial and the lever recording events at the current minute, Pause, the read-out
// (one polite status, changed by milestones and actions, never by a plain tick), the reduced-motion clock (Next event,
// with Step one minute), the Errors chart, and motion only behind prefers-reduced-motion: no-preference.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  SIGNAL_BOARD,
  SIGNAL_PARTS,
  SLOTS,
  signalAt,
  signalLabel,
  signalPlot,
  signalScene,
  signalState,
  type SignalOpts,
} from '../../src/components/scenes/signalScene';
import { rolloutChart } from '../../src/components/scenes/rolloutChart';
import { ReleasesStage, SHARES, readoutOf } from '../../src/content/releases/kit';
import { SCENES, TICKS, nextEventAfter, runOf, simulate, type Event } from '../../src/lib/releases/sim';
import { pipelineOf } from '../../src/lib/releases/pipeline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draw = (o: SignalOpts) =>
  renderToString(createElement(IsoStage, { board: SIGNAL_BOARD, scene: signalScene(o), label: signalLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/releases/[0-9]*.tsx', {
  eager: true,
});

describe('the signal box', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const r = runOf({ ...SCENES.flag, events: [{ t: 1, kind: 'dial', share: 0.1 }] });
    const svg = draw({ ...signalAt(r, 3), pipeline: pipelineOf('coupon') });
    for (const p of SIGNAL_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of SIGNAL_PARTS)
      expect(draw({ ...signalAt(r, 3), say: { block: p, text: 'Here' } })).toContain('Here');
    const steps = Object.values(chapters).flatMap(m => m.STEPS);
    const used = steps.flatMap(s => (s.say ? [s.say.block] : []));
    expect(steps.length).toBeGreaterThan(20);
    expect(used.length).toBeGreaterThan(5);
    for (const b of used) expect(SIGNAL_PARTS).toContain(b);
  });

  it('the lit share matches the simulator’s exposure at every minute', () => {
    for (const r of [simulate(SCENES.staged), simulate(SCENES.all), simulate(SCENES.migration)])
      for (let t = 0; t < TICKS; t++) {
        const o = signalAt(r, t),
          lit = Math.round(r.ticks[t].share * SLOTS);
        expect(signalState(o).lit).toBe(lit);
        const svg = draw(o);
        expect(count(svg, 'data-track="new"')).toBe(lit);
        expect(count(svg, 'data-track="old"')).toBe(SLOTS - lit);
      }
  });

  it('the pipeline’s lamps: stopped at its gate, or passed', () => {
    const stopped = draw({ ...signalAt(runOf(SCENES.calm), 0), pipeline: pipelineOf('coupon') });
    expect(stopped).toContain('data-ships="0"');
    expect(stopped).toContain('data-pass="0"');
    const passed = draw({ ...signalAt(runOf(SCENES.calm), 0), pipeline: pipelineOf('address') });
    expect(passed).toContain('data-ships="1"');
    expect(passed).not.toContain('data-pass="0"');
  });

  it('phones keep just the names in the pills; text is escaped', () => {
    const o = { ...signalAt(runOf(SCENES.staged), 3), name: '<b>x</b>' };
    expect(draw({ ...o, scale: 2 })).not.toContain('NEW ·');
    expect(draw({ ...o, scale: 1.2 })).toContain('NEW ·');
    expect(draw({ ...o, scale: 1.2 })).not.toContain('<b>x</b>');
  });

  it('the hero plot draws, and the chart spans the whole morning', () => {
    const top = [
      [0, 0, 0],
      [200, 0, 0],
      [200, 200, 0],
      [0, 200, 0],
    ];
    expect(signalPlot(100, 100, top)).toContain('<path');
    const r = simulate(SCENES.staged),
      a = rolloutChart(r, 3),
      b = rolloutChart(r, TICKS - 1);
    expect(a.bars).toHaveLength(4);
    expect(b.bars).toHaveLength(TICKS);
    expect([a.w, a.h, a.cw]).toEqual([b.w, b.h, b.cw]);
    expect(b.marks.map(m => m.kind)).toEqual(['back', 'safe']);
  });
});

describe('the dial, the lever and the clock', () => {
  let root: Root, host: HTMLElement;
  const media = (reduce: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      (q: string) =>
        ({
          matches: reduce && q.includes('reduce'),
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  beforeEach(() => {
    media(false);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  /** Chapter 4's stage as the chapter drives it: the clock, and the dial and lever kept as events. */
  function Harness() {
    const [t, setT] = useState(1),
      [events, setEvents] = useState<Event[]>([]);
    const r = runOf({ ...SCENES.flag, events });
    return createElement(
      'div',
      { 'data-t': t, 'data-events': JSON.stringify(events) },
      createElement(ReleasesStage, {
        run: r,
        t,
        caption: 'x',
        onTick: setT,
        onDial: (share: number) => setEvents(e => [...e, { t, kind: 'dial', share }]),
        onBack: () => setEvents(e => [...e, { t, kind: 'back' }]),
      }),
    );
  }
  const box = () => host.firstElementChild as HTMLElement;
  const button = (name: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === name)!;
  const press = (name: string) => act(() => button(name).click());
  const status = () => host.querySelector('[role="status"]')!;
  const dial = (i: number) =>
    act(() => {
      const el = host.querySelector<HTMLInputElement>('input[type="range"]')!;
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(el, String(i));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

  it('the dial and the lever are events at the current minute; the lever needs something out', () => {
    act(() => root.render(createElement(Harness)));
    expect(button('Switch the flag off').disabled).toBe(true);
    press('Step');
    dial(SHARES.indexOf(0.1));
    expect(JSON.parse(box().dataset.events!)).toEqual([{ t: 2, kind: 'dial', share: 0.1 }]);
    expect(host.querySelector('[data-prop="new"]')!.getAttribute('data-shoppers')).toBe(String(0.1 * SLOTS));
    press('Step');
    press('Switch the flag off');
    expect(JSON.parse(box().dataset.events!).at(-1)).toEqual({ t: 3, kind: 'back' });
    expect(host.querySelector<HTMLInputElement>('input[type="range"]')!.disabled).toBe(true);
    press('Step');
    expect(host.querySelector('[data-prop="new"]')!.getAttribute('data-shoppers')).toBe('0');
  });

  it('one polite status: a milestone or an action changes it, a plain minute does not', () => {
    act(() => root.render(createElement(Harness)));
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(status().getAttribute('aria-live')).toBe('polite');
    dial(SHARES.indexOf(0.25));
    const set = status().textContent;
    expect(set).toContain('dial set to 25%');
    press('Step');
    press('Step');
    expect(status().textContent).toBe(set);
    press('Play');
    expect(status().textContent).toMatch(/^Playing from/);
    press('Pause');
    expect(status().textContent).toMatch(/^Paused at/);
    press('Switch the flag off');
    expect(status().textContent).toContain('switching the flag off');
  });

  it('with reduced motion, Next event jumps to the next milestone and Step moves one minute', () => {
    media(true);
    const r = simulate(SCENES.staged);
    function Clock() {
      const [t, setT] = useState(0);
      return createElement(
        'div',
        { 'data-t': t },
        createElement(ReleasesStage, { run: r, t, caption: 'x', onTick: setT }),
      );
    }
    act(() => root.render(createElement(Clock)));
    expect(button('Play')).toBeUndefined();
    press('Next event');
    expect(box().dataset.t).toBe(String(nextEventAfter(r, 0)));
    press('Next event');
    expect(box().dataset.t).toBe(String(r.alarmAt));
    press('Step');
    expect(box().dataset.t).toBe(String(r.alarmAt! + 1));
    expect(readoutOf(r, r.alarmAt!)).toMatch(/alarm.*rolling back/);
  });

  it('the Errors tab draws the chart', () => {
    act(() => root.render(createElement(Harness)));
    press('Errors');
    expect(host.querySelector('svg[role="img"]')!.getAttribute('aria-label')).toMatch(/^Failed checkouts by minute/);
  });

  it('under reduced motion nothing animates: motion lives only behind no-preference', () => {
    const css = readFileSync('src/content/releases/releases.css', 'utf8');
    const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)![1];
    expect(gated).toContain('.lever.pulled');
    const outside = css.replace(gated, '');
    expect(outside).not.toMatch(/animation:|transition:/);
  });
});
