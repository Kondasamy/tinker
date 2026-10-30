// @vitest-environment happy-dom
// Robots that act's stage (U8): every part a callout names is drawn and every callout the chapters use is one of them;
// the claw sits at the state's cell, holds the part, and the tray holds it once done; pills are escaped; the bay dims
// in poor light. Drive the claw, live: arrow keys move only while the pad has focus (and only then is the default
// prevented), Hand over is disabled with its reason until a demo is finished, the reader's demo is what the replay
// copies, Try again keeps the demos, and with reduced motion a replay shows its last frame at once. One polite read-out.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  CLAW_BOARD,
  CLAW_PARTS,
  clawLabel,
  clawPlot,
  clawScene,
  type ClawOpts,
} from '../../src/components/scenes/clawScene';
import { BAY, type Bay, DriveBench, readerPairs } from '../../src/content/robots/kit';
import { DEMOS } from '../../src/lib/robots/story';
import { replay } from '../../src/lib/robots/policy';
import { FRESH, play, REAL, startOf, TRAIN } from '../../src/lib/robots/world';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const draw = (o: ClawOpts) =>
  renderToString(createElement(IsoStage, { board: CLAW_BOARD, scene: clawScene(o), label: clawLabel(o) }));
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/robots/[0-9]*.tsx', {
  eager: true,
});

describe('the parts bay', () => {
  const start = { layout: TRAIN[0], state: startOf(TRAIN[0]) };
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    for (const part of CLAW_PARTS) expect(draw({ ...start, say: { block: part, text: 'Here' } })).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(CLAW_PARTS as readonly string[]).toContain(b);
  });
  it('puts the claw at the state’s cell, the part in the claw while held, and in the tray once done', () => {
    const run = play(TRAIN[0], DEMOS[0]);
    const held = run.findIndex(s => s.holding);
    const svg = draw({ layout: TRAIN[0], state: run[held] });
    expect(svg).not.toContain('data-part="part"');
    expect(draw(start)).toContain('data-part="part"');
    const done = draw({ layout: TRAIN[0], state: run.at(-1)! });
    expect(done).toContain('data-holds="1"');
    expect(done).toContain('data-end="done"');
    expect(clawLabel({ layout: TRAIN[0], state: run.at(-1)! })).toContain('in the tray');
  });
  it('dims the bay in poor light, escapes pills, and draws the hero plot', () => {
    expect(draw({ layout: REAL[0], state: startOf(REAL[0]), light: 0.5 })).toContain('class="dim"');
    expect(draw(start)).not.toContain('class="dim"');
    expect(draw({ ...start, pill: '<b>x' })).not.toContain('<b>x');
    expect(clawPlot(40, 40, [])).toContain('<path');
  });
});

describe('drive the claw, live', () => {
  let root: Root, host: HTMLElement;
  const reduce = (on: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: on && q.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
  let last: Bay = BAY;
  function Harness() {
    const [b, setB] = useState(BAY);
    last = b;
    return createElement(DriveBench, { bay: b, onBay: setB, fresh: FRESH, caption: 'x' });
  }
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
  const button = (t: string) =>
    [...host.querySelectorAll('button')].find(b => b.textContent === t || b.getAttribute('aria-label') === t);
  const status = () => host.querySelectorAll('[role="status"]');
  const key = (el: Element, k: string) => {
    const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    act(() => {
      el.dispatchEvent(e);
    });
    return e.defaultPrevented;
  };

  it('arrow keys on the pad move the claw and prevent scrolling; Hand over waits for a demo; replays copy it', () => {
    reduce(true);
    act(() => root.render(createElement(Harness)));
    expect(status()).toHaveLength(1);
    expect(status()[0].getAttribute('aria-live')).toBe('polite');
    const hand = button('Hand over')!;
    expect(hand.getAttribute('aria-disabled')).toBe('true');
    expect(host.querySelector('.rb-why')!.textContent).toContain('Finish one demo first');
    act(() => hand.click());
    expect(last.runs).toBe(0);
    // a key outside the pad does nothing and is not prevented
    expect(key(host, 'ArrowRight')).toBe(false);
    expect(last.drive).toEqual([]);
    const pad = host.querySelector('[aria-label="Drive the claw"]')!;
    expect(key(pad.querySelector('button')!, 'ArrowRight')).toBe(true);
    expect(last.drive).toEqual(['right']);
    expect(status()[0].textContent).toBe('Moved right.');
    for (const a of DEMOS[0].slice(1))
      if (a === 'grip' || a === 'drop') key(pad.querySelector('button')!, 'g');
      else act(() => button(`Move ${a}`)!.click());
    expect(last.demos).toEqual([DEMOS[0]]);
    expect(status()[0].textContent).toContain('Demo 1 done');
    act(() => button('Hand over')!.click());
    const want = replay(readerPairs(last), FRESH);
    expect(last.runs).toBe(1);
    expect(last.last).toEqual({ end: want.end, steps: want.steps });
    act(() => button('Try again')!.click());
    expect(status()[0].textContent).toBe('Back to driving. Your 1 demo is kept.');
    expect(last.demos).toHaveLength(1);
  });

  it('without reduced motion a replay plays frame by frame and speaks only at its end', () => {
    reduce(false);
    vi.useFakeTimers();
    act(() => root.render(createElement(Harness)));
    for (const a of DEMOS[0]) act(() => button(a === 'grip' ? 'Grip' : a === 'drop' ? 'Drop' : `Move ${a}`)!.click());
    act(() => button('Hand over')!.click());
    expect(status()[0].textContent).toBe('Hand over: the policy drives a fresh bin.');
    act(() => vi.advanceTimersByTime(180));
    expect(status()[0].textContent).toBe('Hand over: the policy drives a fresh bin.');
    for (let i = 0; i < 60; i++) act(() => vi.advanceTimersByTime(180));
    expect(last.runs).toBe(1);
    expect(status()[0].textContent).toMatch(/^(Part in the tray|Stuck|Off the grid)/);
  });
});
