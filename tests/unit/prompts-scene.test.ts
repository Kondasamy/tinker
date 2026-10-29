// @vitest-environment happy-dom
// Prompts' stage (U4): every part a callout names is drawn; the docket draws at most six strips, in the assembled
// prompt's order; the keyboard alone clips and unclips cards and moves the rules card; with reduced motion a clipped
// card is simply there; one polite read-out outside the drawing names the reply's grade and clears on a new step;
// chapter 1's continuation runs live on Larkspur mini and matches its pin.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  cardsOf,
  DOCKET_BOARD,
  DOCKET_PARTS,
  docketLabel,
  docketScene,
  MAX_CARDS,
  type DocketOpts,
} from '../../src/components/scenes/docketScene';
import { boardOf, DocketStage, gradeText, MiniStage } from '../../src/content/prompts/kit';
import { modelStore } from '../../src/content/transformers/kit';
import { CHAPTER_TICKET, partsOf, START } from '../../src/lib/prompts/assemble';
import { EMPTY, type Docket } from '../../src/lib/prompts/cards';
import { gradeReply } from '../../src/lib/prompts/grade';
import { replyOf, MINI_PROMPTS } from '../../src/lib/prompts/story';
import pinned from '../../data/prompts/pinned.json' with { type: 'json' };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const FULL: Docket = { role: true, task: 'clear', examples: 2, format: 'json', rules: 'first' };
const draw = (o: DocketOpts) =>
  renderToString(createElement(IsoStage, { board: DOCKET_BOARD, scene: docketScene(o), label: docketLabel(o) }));
const slotsIn = (svg: string) => [...svg.matchAll(/data-slot="(\w+)"/g)].map(m => m[1]);
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/prompts/[0-9]*.tsx', {
  eager: true,
});

describe('the docket board', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const o = { ...boardOf('07-workbench', FULL).opts };
    for (const part of DOCKET_PARTS) {
      const svg = draw({ ...o, say: { block: part, text: 'Here' } });
      expect(svg, part).toContain('Here');
      expect(svg, part).toContain(`data-part="${part}"`);
    }
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(DOCKET_PARTS).toContain(b);
  });

  it('draws at most six strips, in the order the model reads the prompt', () => {
    for (const d of [
      FULL,
      { ...FULL, rules: 'last' as const },
      { ...EMPTY, task: 'vague' as const },
      START['03-show-dont-tell'],
    ]) {
      const want = partsOf({ ...d, ticket: CHAPTER_TICKET }).map(p => p.slot);
      expect(cardsOf(d).map(c => c.slot)).toEqual(want);
      expect(slotsIn(draw({ cards: cardsOf(d) }))).toEqual(want);
    }
    const many = [...cardsOf(FULL), ...cardsOf(FULL)];
    expect(slotsIn(draw({ cards: many }))).toHaveLength(MAX_CARDS);
    // the rules strip moves from top to bottom
    expect(slotsIn(draw({ cards: cardsOf(FULL) }))[0]).toBe('rules');
    expect(slotsIn(draw({ cards: cardsOf({ ...FULL, rules: 'last' }) })).at(-1)).toBe('rules');
  });

  it('the machine’s screen and the slip follow the reply’s grade, and pills are escaped', () => {
    const vague = boardOf('02-say-what-you-want', START['02-say-what-you-want']).opts;
    expect(vague.state).toBe('bad');
    expect(draw(vague)).toContain('data-facts="0"');
    const clear = boardOf('02-say-what-you-want', { ...START['02-say-what-you-want'], task: 'clear' }).opts;
    expect(clear.state).toBe('ok');
    expect(draw(clear)).toContain('data-facts="1"');
    expect(draw(clear)).toContain('data-state="ok"');
    expect(draw({ cards: [{ slot: 'task', label: '<b>' }] })).toContain('&lt;b&gt;');
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
  const card = (id: string) => host.querySelector<HTMLButtonElement>(`button[data-card="${id}"]`)!;
  const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent === text)!;
  const status = () => host.querySelector('[role="status"]')!.textContent;
  // keyboard: a focused button activates on Enter, which the browser turns into a click
  const press = (b: HTMLButtonElement) =>
    act(() => {
      b.focus();
      expect(document.activeElement).toBe(b);
      b.click();
    });
  let seen: Docket = START['02-say-what-you-want'];
  function Harness({ chapter = '02-say-what-you-want', step = 1 }: { chapter?: string; step?: number }) {
    const [d, setD] = useState(START[chapter]);
    seen = d;
    return createElement(DocketStage, { chapter, docket: d, onDocket: setD, caption: 'x', step });
  }

  it('clips and unclips cards from the keyboard, names the grade in one polite region, and clears on a new step', () => {
    reduce(false);
    act(() => root.render(createElement(Harness)));
    const regions = host.querySelectorAll('[role="status"]');
    expect(regions).toHaveLength(1);
    expect(regions[0].getAttribute('aria-live')).toBe('polite');
    expect(regions[0].closest('svg')).toBeNull();
    press(card('clear'));
    expect(seen.task).toBe('clear');
    const s = { ...seen, ticket: CHAPTER_TICKET, model: 'main' as const };
    const r = replyOf('02-say-what-you-want', s);
    if (r === 'norecord') throw new Error('no reply');
    expect(status()).toBe(`Clipped Clear task. ${gradeText(seen, gradeReply(s, r.text))}`);
    expect(status()).toContain('key fact in');
    press(card('role'));
    expect(seen.role).toBe(true);
    expect(card('role').getAttribute('aria-pressed')).toBe('true');
    press(card('role'));
    expect(seen.role).toBe(false);
    expect(status()).toContain('Unclipped Who you are.');
    // a closed card stays reachable, says why, and does nothing
    const shut = card('json');
    expect(shut.getAttribute('aria-disabled')).toBe('true');
    expect(shut.textContent).toContain('Opens in chapter 4.');
    press(shut);
    expect(seen.format).toBe('none');
    // a fresh card slides in
    press(card('vague'));
    expect(host.querySelector('.dk-slide')?.getAttribute('data-slot')).toBe('task');
    act(() => root.render(createElement(Harness, { step: 2 })));
    expect(status()).toBe('');
  });

  it('moves the rules card first and last where the chapter opens it', () => {
    reduce(false);
    act(() => root.render(createElement(Harness, { chapter: '05-order-and-emphasis' })));
    expect(seen.rules).toBe('first');
    const move = button('House rule last');
    press(move);
    expect(seen.rules).toBe('last');
    expect(move.getAttribute('aria-pressed')).toBe('true');
    expect(slotsIn(host.innerHTML).at(-1)).toBe('rules');
    expect(status()).toContain('House rule moved to the end.');
    press(move);
    expect(seen.rules).toBe('first');
    expect(slotsIn(host.innerHTML)[0]).toBe('rules');
    act(() => root.render(createElement(Harness, { chapter: '02-say-what-you-want', step: 3 })));
    expect([...host.querySelectorAll('button')].some(b => b.textContent === 'House rule last')).toBe(false);
  });

  it('with reduced motion a clipped card is simply there', () => {
    reduce(true);
    act(() => root.render(createElement(Harness)));
    press(card('clear'));
    expect(slotsIn(host.innerHTML)).toContain('task');
    expect(host.querySelector('.dk-slide')).toBeNull();
  });

  it('the Text tab shows the prompt in order, who wrote the reply, and its grades', () => {
    reduce(false);
    act(() => root.render(createElement(Harness, { chapter: '05-order-and-emphasis' })));
    act(() => button('Text').click());
    const order = [...host.querySelectorAll('.pr-parts li')].map(li => li.getAttribute('data-slot'));
    expect(order).toEqual(partsOf({ ...START['05-order-and-emphasis'], ticket: CHAPTER_TICKET }).map(p => p.slot));
    expect(host.querySelector('.pr-by')!.textContent).toMatch(/^Simulated \(/);
    expect(host.querySelector('.pr-checks')!.textContent).toContain('House rule missed');
  });

  it('chapter 1: Larkspur mini continues the instruction live, matching its pin', async () => {
    reduce(false);
    const store = modelStore(async f => {
      const b = readFileSync(`public/data/lm/${f}`);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    });
    act(() => root.render(createElement(MiniStage, { prompt: MINI_PROMPTS[0], store, caption: 'x' })));
    for (let i = 0; i < 10; i++) await act(async () => new Promise(r => setTimeout(r, 5)));
    const pin = pinned.continuations.find(c => c.prompt === MINI_PROMPTS[0])!;
    expect(status()).toBe(`Larkspur mini continued: “${pin.text.trim()}”`);
    expect(host.innerHTML).toContain('data-state="warn"');
  });
});
