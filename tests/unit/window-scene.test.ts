import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  WINDOW_BOARD,
  WINDOW_PARTS,
  windowLabel,
  windowScene,
  windowState,
  type WindowOpts,
} from '../../src/components/scenes/windowScene';
import { windowBar } from '../../src/components/scenes/windowBar';
import { ContextStage, WindowBar } from '../../src/content/context/kit';
import { REPLY_ROOM, run, type Run } from '../../src/lib/context/loop';

const draw = (o: WindowOpts) =>
  renderToString(createElement(IsoStage, { board: WINDOW_BOARD, scene: windowScene(o), label: windowLabel(o) }));
const count = (svg: string, s: string) => svg.split(s).length - 1;
const SESSION = ['refund-window', 'free-shipping', 'sensor-warranty'];

const ONE = run(undefined, {});
const CACHED = run(undefined, {
  sessions: [SESSION],
  tools: true,
  retrieval: 'stuff',
  breakpoints: ['tools', 'system', 'end'],
});
const OVER = run(undefined, { retrieval: 'stuff', budget: 1000 });
const MEMORY = run(undefined, { sessions: [['enterprise-hello'], ['enterprise-refund']], memory: true });
const CLEARED = run(undefined, { sessions: [SESSION], retrieval: 'fetch', history: 'cleared' });
const EMPTY: Run = { status: 'done', meter: [], answers: [], signatures: [], notes: {} };

describe('the window bar', () => {
  it('segment widths sum to the window’s tokens, on the bar’s scale', () => {
    for (const r of [ONE, CACHED, CLEARED])
      for (const m of r.meter) {
        const b = windowBar(m.window, { budget: 8000, hit: m.hit });
        expect(b.segs.reduce((n, s) => n + s.to - s.from, 0)).toBe(m.window.tokens);
        expect(b.segs.reduce((n, s) => n + s.w, 0)).toBeCloseTo(m.window.tokens * b.k, 6);
        expect(b.segs.every(s => !s.over)).toBe(true);
      }
  });
  it('an over-budget window is drawn past the budget line, inside the bar', () => {
    expect(OVER.status).toBe('over-budget');
    const b = windowBar(OVER.refused!, { budget: 1000 });
    expect(b.over).toBe(true);
    expect(b.room.x + b.room.w).toBeGreaterThan(b.line);
    expect(b.room.x + b.room.w).toBeLessThanOrEqual(b.w - b.pad + 1e-9);
    for (const s of b.segs) expect(s.over).toBe(s.to > 1000);
    expect(b.segs.some(s => s.over && s.x + s.w > b.line)).toBe(true);
  });
  it('a cache hit marks exactly the shared-prefix segments', () => {
    const hits = CACHED.meter.filter(m => m.hit.parts > 0);
    expect(hits.length).toBeGreaterThan(0);
    for (const m of hits) {
      const b = windowBar(m.window, { budget: 8000, hit: m.hit });
      expect(b.segs.filter(s => s.cached).map(s => s.i)).toEqual([...Array(m.hit.parts).keys()]);
      expect(b.segs.filter(s => s.cached).reduce((n, s) => n + s.tokens, 0)).toBe(m.hit.read);
      const html = renderToString(createElement(WindowBar, { run: CACHED, upTo: CACHED.meter.indexOf(m) + 1 }));
      expect(count(html, 'data-cached="1"')).toBe(m.hit.parts);
    }
    // the first call has nothing cached
    expect(windowBar(CACHED.meter[0].window, { budget: 8000, hit: CACHED.meter[0].hit }).segs.some(s => s.cached)).toBe(
      false,
    );
  });
  it('an empty window draws no NaN, with a zero budget too', () => {
    for (const budget of [8000, 0]) {
      const b = windowBar(null, { budget });
      expect(b.segs).toEqual([]);
      expect(JSON.stringify(b)).not.toMatch(/NaN|null|Infinity/);
      expect(renderToString(createElement(WindowBar, { run: EMPTY, budget }))).not.toMatch(/NaN|Infinity/);
    }
    expect(windowState({ run: EMPTY })).toMatchObject({ call: 0, tokens: 0, fill: 0, cachedShare: 0, over: false });
    expect(draw({ run: EMPTY, shelf: true, cabinet: true, tray: true })).not.toMatch(/NaN|Infinity/);
  });
  it('one segment is in the tab order, each a named list item', () => {
    const html = renderToString(createElement(WindowBar, { run: CACHED }));
    const n = CACHED.meter.at(-1)!.window.parts.length;
    expect(count(html, 'role="listitem"')).toBe(n);
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toContain('role="list"');
  });
});

describe('the window desk', () => {
  it('papers by kind, one per part; spills only when over budget, and the host refused it', () => {
    const svg = draw({ run: ONE });
    expect(count(svg, 'class="paper"')).toBe(ONE.meter[0].window.parts.length);
    expect(svg).toContain('data-over="0"');
    expect(svg).not.toContain('class="spill"');
    const over = draw({ run: OVER, budget: 1000 });
    expect(windowState({ run: OVER, budget: 1000 })).toMatchObject({ refused: true, over: true, fill: 1 });
    expect(over).toContain('data-over="1"');
    expect(count(over, 'class="spill"')).toBeGreaterThan(0);
  });
  it('the shelf lights on a cache hit, and only then', () => {
    const lit = (upTo: number) => draw({ run: CACHED, upTo, shelf: true });
    expect(lit(1)).toContain('data-hit="0"');
    expect(lit(2)).toContain('data-hit="1"');
    expect(windowState({ run: CACHED, upTo: 2 }).cached).toBe(CACHED.meter[1].hit.read);
  });
  it('the cabinet opens on a memory read', () => {
    const first = MEMORY.meter.findIndex(m => m.window.parts.some(p => p.kind === 'memory'));
    expect(first).toBeGreaterThan(0);
    expect(draw({ run: MEMORY, upTo: first, cabinet: true })).toContain('data-open="0"');
    expect(draw({ run: MEMORY, upTo: first + 1, cabinet: true })).toContain('data-open="1"');
    expect(windowState({ run: MEMORY, upTo: first + 1 }).notes).toBeGreaterThan(0);
  });
  it('cleared results go to agentScene’s in-tray', () => {
    const st = windowState({ run: CLEARED });
    expect(st.cleared).toBeGreaterThan(0);
    expect(draw({ run: CLEARED, tray: true })).toContain(`data-papers="${st.cleared}"`);
  });
  it('a summarised history with nothing cleared says SUMMARY, not SUMMARY + 0', () => {
    const SUMMARY = run(undefined, { sessions: [SESSION], retrieval: 'fetch', history: 'summary' });
    const st = windowState({ run: SUMMARY });
    expect(st.summary).toBe(true);
    const svg = draw({ run: SUMMARY, tray: true });
    expect(svg).toContain(st.cleared ? `SUMMARY + ${st.cleared}` : 'SUMMARY');
    expect(svg).not.toContain('SUMMARY + 0');
  });
  it('the gauge reads the fill with the reply’s room', () => {
    const st = windowState({ run: ONE, budget: 1000 });
    expect(st.fill).toBeCloseTo((ONE.meter[0].window.tokens + REPLY_ROOM) / 1000, 9);
    expect(draw({ run: ONE, budget: 1000 })).toContain(`data-context="${st.fill.toFixed(3)}"`);
  });
});

describe('untrusted strings', () => {
  it('case text containing <script> renders escaped in the desk, the bar and the stage', () => {
    const evil = '<script>alert(1)</script>';
    const r: Run = {
      ...ONE,
      meter: ONE.meter.map(m => ({
        ...m,
        turn: { ...m.turn, text: evil },
        window: { ...m.window, parts: m.window.parts.map(p => ({ ...p, label: evil, text: evil })) },
      })),
    };
    for (const html of [
      draw({ run: r, shelf: true, cabinet: true, tray: true }),
      draw({ run: r, scale: 1.8 }),
      renderToString(createElement(WindowBar, { run: r })),
      renderToString(createElement(ContextStage, { run: r })),
      renderToString(createElement(ContextStage, { run: r, view: 'bar' })),
    ])
      expect(html).not.toContain('<script');
  });
});

describe('a step callout on the window desk', () => {
  const BASE: WindowOpts = { run: MEMORY, shelf: true, cabinet: true, tray: true };
  const calls = (svg: string) => count(svg, 'class="callout"');
  it('draws one lit pill over each named part', () => {
    for (const block of WINDOW_PARTS) {
      const svg = draw({ ...BASE, say: { block, text: 'LOOK HERE' } });
      expect(calls(svg)).toBe(1);
      expect(svg).toContain('LOOK HERE');
    }
  });
  it('draws none for an unknown part, and nothing changes without one', () => {
    expect(calls(draw({ ...BASE, say: { block: 'nowhere', text: 'LOOK HERE' } }))).toBe(0);
    expect(draw({ ...BASE, say: undefined })).toBe(draw(BASE));
  });
  it('on phones drops a callout over 16 characters', () => {
    const block = WINDOW_PARTS[0];
    expect(calls(draw({ ...BASE, scale: 2, say: { block, text: 'SIXTEEN CHARS OK' } }))).toBe(1);
    expect(calls(draw({ ...BASE, scale: 2, say: { block, text: 'SEVENTEEN CHARS X' } }))).toBe(0);
  });
});
