// @vitest-environment happy-dom
// How email arrives' stage (U9): the post room's parts and callouts, the hop cap, the lamps and trays read off the
// verdicts, the postmarks peeled bottom-up matching parse.ts (focus moving to the next one, so the keyboard alone peels
// them all), Peel all, one polite read-out, the Headers tab as text, and motion only behind
// prefers-reduced-motion: no-preference.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_HOPS,
  POST_BOARD,
  POST_PARTS,
  postLabel,
  postPlot,
  postScene,
  postState,
  type PostOpts,
} from '../../src/components/scenes/postScene';
import { EmailStage, hopText, postOf } from '../../src/content/email/kit';
import { hops, parse } from '../../src/lib/email/parse';
import { MESSAGES, RECORDS, verdictOf, type MessageId } from '../../src/lib/email/story';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draw = (o: PostOpts) =>
  renderToString(createElement(IsoStage, { board: POST_BOARD, scene: postScene(o), label: postLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const ALL = { spf: true, dkim: true, dmarc: true, spam: true, sorted: true };
const at = (id: MessageId, rec: string, peeled = 0) =>
  postOf(verdictOf(id, RECORDS[rec]), id, RECORDS[rec], peeled, ALL);
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/email/[0-9]*.tsx', {
  eager: true,
});

describe('the post room', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const o = { ...at('forged', 'reject'), fate: undefined };
    const svg = draw(o);
    for (const p of POST_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of POST_PARTS) expect(draw({ ...o, say: { block: p, text: 'Here' } })).toContain('Here');
    const steps = Object.values(chapters).flatMap(m => m.STEPS);
    const used = steps.flatMap(s => (s.say ? [s.say.block] : []));
    expect(Object.keys(chapters)).toHaveLength(7);
    expect(used.length).toBeGreaterThan(10);
    for (const b of used) expect(POST_PARTS).toContain(b);
  });

  it('caps the hops at six and counts the rest', () => {
    expect(postState({ from: 'x', hops: 9, peeled: 8 })).toEqual({ hops: MAX_HOPS, peeled: MAX_HOPS, more: 3 });
    const svg = draw({ from: 'x', hops: 9, peeled: 2 });
    expect(count(svg, 'data-hop="')).toBe(MAX_HOPS);
    expect(count(svg, 'data-lit="1"')).toBe(2);
    expect(svg).toContain('+3');
  });

  it('lamps and trays follow the verdict', () => {
    const fake = draw(at('forged', 'reject'));
    expect(fake).toContain('data-prop="spf" data-lamp="pass"');
    expect(fake).toContain('data-prop="dkim" data-lamp="off"');
    expect(fake).toContain('data-prop="dmarc" data-lamp="fail"');
    expect(fake).toContain('data-prop="bounce" data-holds="1"');
    const fwd = draw(at('forwarded', 'reject'));
    expect(fwd).toContain('data-prop="spf" data-lamp="fail"');
    expect(fwd).toContain('data-prop="inbox" data-holds="1"');
    expect(draw(at('prize', 'reject'))).toContain('data-prop="junk" data-holds="1"');
  });

  it('phones keep just the names in the pills; text is escaped', () => {
    const o = { ...at('order', 'nothing'), fate: undefined, from: '<b>x</b>' };
    expect(draw({ ...o, scale: 2 })).not.toContain('FROM ·');
    expect(draw({ ...o, scale: 1.2 })).toContain('FROM ·');
    expect(draw({ ...o, scale: 1.2 })).not.toContain('<b>x</b>');
  });

  it('the hero plot draws', () => {
    const top = [
      [0, 0, 0],
      [200, 0, 0],
      [200, 200, 0],
      [0, 200, 0],
    ];
    expect(postPlot(100, 100, top)).toContain('<path');
  });
});

describe('peeling the postmarks', () => {
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

  function Harness({ id }: { id: MessageId }) {
    const [peeled, setPeeled] = useState(0);
    return createElement(
      'div',
      { 'data-peeled': peeled },
      createElement(EmailStage, { id, rec: RECORDS.nothing, show: {}, peeled, onPeel: setPeeled, caption: 'x' }),
    );
  }
  const button = (name: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === name);
  const status = () => host.querySelector('[role="status"]')!;

  it('peels bottom-up, in parse.ts’s order, each lighting its server and saying its hop', () => {
    const list = hops(parse(MESSAGES.forwarded));
    act(() => root.render(createElement(Harness, { id: 'forwarded' })));
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(button('Peel postmark 2')!.disabled).toBe(true);
    for (const [i, h] of list.entries()) {
      act(() => button(`Peel postmark ${i + 1}`)!.click());
      expect(host.querySelector(`li[data-hop="${i}"]`)!.textContent).toBe(hopText(h));
      expect(host.querySelectorAll('.hop[data-lit="1"]')).toHaveLength(i + 1);
      expect(status().textContent).toContain(`Postmark ${i + 1} of ${list.length}: ${h.by}`);
    }
    expect(button('Peel all')!.disabled).toBe(true);
  });

  it('the keyboard alone peels them all: focus moves to the next postmark after each peel', () => {
    const list = hops(parse(MESSAGES.order));
    act(() => root.render(createElement(Harness, { id: 'order' })));
    button('Peel postmark 1')!.focus();
    for (let i = 0; i < list.length; i++) {
      const el = document.activeElement as HTMLButtonElement;
      expect(el.textContent).toBe(`Peel postmark ${i + 1}`);
      act(() => el.click());
    }
    expect((host.firstElementChild as HTMLElement).dataset.peeled).toBe(String(list.length));
  });

  it('Peel all reveals every hop, and says so', () => {
    act(() => root.render(createElement(Harness, { id: 'forwarded' })));
    act(() => button('Peel all')!.click());
    expect(host.querySelectorAll('li.peeled')).toHaveLength(hops(parse(MESSAGES.forwarded)).length);
    expect(status().textContent).toMatch(/^All 5 postmarks peeled/);
  });

  it('with reduced motion the peeled hops are listed the same', () => {
    media(true);
    act(() => root.render(createElement(Harness, { id: 'order' })));
    act(() => button('Peel all')!.click());
    expect([...host.querySelectorAll('li.peeled')].map(l => l.textContent)).toEqual(
      hops(parse(MESSAGES.order)).map(hopText),
    );
  });

  it('the Headers tab shows the raw message as text', () => {
    act(() => root.render(createElement(Harness, { id: 'forged' })));
    act(() => button('Headers')!.click());
    expect(host.querySelector('pre.em-headers')!.textContent).toContain('Return-Path: <pay@larkspur-billing.example>');
  });

  it('under reduced motion nothing animates: motion lives only behind no-preference', () => {
    const css = readFileSync('src/content/email/email.css', 'utf8');
    const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)![1];
    expect(gated).toContain('.postmark.peeled');
    expect(css.replace(gated, '')).not.toMatch(/animation:|transition:/);
  });
});
