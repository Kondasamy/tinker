// @vitest-environment happy-dom
// Mixture of experts' stage (U30): two rooms lit per floor for a token, matching its routes; the override (at most two
// rooms, a third unchecks the oldest and says so, "Use router" clears it) lighting the chosen rooms and rerunning the
// guess; at most 8 tokens on the belt; the parts every callout names; the status line while loading and Retry after a
// failure.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  ROOMS_BOARD,
  ROOMS_PARTS,
  roomsCard,
  roomsLabel,
  roomsPlot,
  roomsScene,
  roomsState,
  tokensOf,
  type RoomsOpts,
} from '../../src/components/scenes/officeRoomsScene';
import { RoomsStage, setModelFiles, toggle } from '../../src/content/mixture-of-experts/kit';
import { modelLoader } from '../../src/lib/lm/load';
import type { Model } from '../../src/lib/lm/model';
import { SHOWN, promptOf, run, shownPositions, type Override } from '../../src/lib/mixture-of-experts/routes';
import PINNED from '../../data/mixture-of-experts/pinned.json' with { type: 'json' };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DIR = 'public/data/mixture-of-experts/';
const disk = async (f: string) => {
  const b = readFileSync(DIR + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const draw = (o: RoomsOpts) =>
  renderToString(createElement(IsoStage, { board: ROOMS_BOARD, scene: roomsScene(o), label: roomsLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>(
  '../../src/content/mixture-of-experts/[0-9]*.tsx',
  { eager: true },
);

let model: Model;
beforeAll(async () => {
  model = await modelLoader(disk, 'moe').load();
});

describe('the sorting office', () => {
  it('lights exactly two rooms a floor for a token, the ones its routes name', () => {
    const p = promptOf('success');
    const r = run(model, p.ids);
    for (const [sel, pos] of shownPositions(p.ids).entries()) {
      const lit = r.routes.map(l => l[pos].experts);
      const o: RoomsOpts = { tokens: tokensOf(p.ids), sel, lit };
      const svg = draw(o);
      expect(count(svg, 'data-lit="1"')).toBe(4);
      lit.forEach((es, l) => {
        expect(roomsState(o).lit[l]).toEqual(es);
        for (const e of es) expect(svg).toContain(`data-floor="${l + 1}" data-room="${e + 1}" data-lit="1"`);
      });
    }
  });

  it('dense lights every room; nothing selected lights none', () => {
    const tokens = tokensOf(promptOf('reply').ids);
    expect(count(draw({ tokens, sel: 0, dense: true }), 'data-lit="1"')).toBe(16);
    expect(count(draw({ tokens, sel: null }), 'data-lit="1"')).toBe(0);
  });

  it('draws at most 8 tokens on the belt', () => {
    const p = promptOf('heron');
    expect(p.ids.length).toBeGreaterThan(SHOWN);
    const svg = draw({ tokens: p.ids, sel: null });
    expect(count(svg, 'class="parcel"')).toBe(SHOWN);
    expect(tokensOf(p.ids)).toHaveLength(SHOWN);
  });

  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const o = roomsCard(1.2);
    for (const part of ROOMS_PARTS) expect(draw({ ...o, say: { block: part, text: 'Here' } })).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    expect(used.length).toBeGreaterThan(8);
    for (const b of used) expect(ROOMS_PARTS).toContain(b);
  });

  it('room pills carry each expert’s top tokens on wide screens, names only on phones; text is escaped', () => {
    const o = roomsCard(1.2);
    const [e] = o.lit![0];
    const top = PINNED.rooms.tops[0][e][0];
    expect(draw(o)).toContain(`ROOM ${e + 1} ·`);
    expect(draw(o)).toContain(top.trim() || '␣');
    expect(draw({ ...o, scale: 2 })).not.toContain(`ROOM ${e + 1} ·`);
    expect(draw({ ...o, guess: null, say: { block: 'guess', text: '<b>x' } })).not.toContain('<b>x');
  });

  it('capacity: crates per room, tomato past the seats, dropped parcels marked', () => {
    const asked = [
      [5, 1, 2, 0, 0, 0, 0, 0],
      [2, 2, 2, 2, 0, 0, 0, 0],
    ];
    const o: RoomsOpts = { tokens: [1, 2, 3], sel: null, load: { asked, capacity: 3 }, dropped: [1] };
    expect(roomsState(o).over).toEqual([[0], []]);
    const svg = draw(o);
    expect(svg).toContain('data-full="1"');
    expect(svg).toContain('data-dropped="1"');
    expect(svg).toContain('ROOM 1 · 5 FOR 3');
  });

  it('the hero plot and the card draw', () => {
    expect(roomsPlot(40, 40, [])).toContain('<path');
    expect(roomsCard().lit).toEqual(PINNED.card.lit);
  });
});

describe('the override', () => {
  it('a third pick unchecks the oldest and says so; unchecking the last goes back to the router', () => {
    expect(toggle(undefined, 2)).toEqual({ rooms: [2], said: 'Room 3 checked.' });
    expect(toggle([2], 5).rooms).toEqual([2, 5]);
    const third = toggle([2, 5], 0);
    expect(third.rooms).toEqual([5, 0]);
    expect(third.said).toContain('Room 3 unchecked');
    expect(toggle([4], 4).rooms).toEqual([]);
  });
});

describe('the stage, live', () => {
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

  const settle = async () => {
    for (let i = 0; i < 20; i++) await act(async () => new Promise(r => setTimeout(r, 5)));
  };

  it('picks a token, overrides its rooms by checkbox, reruns the guess, and Use router restores the routes', async () => {
    setModelFiles(disk);
    const p = promptOf(PINNED.override.prompt),
      last = p.ids.length - 1;
    const seen: { override: Override; guess: number }[] = [];
    function Harness() {
      const [sel, setSel] = useState<number | null>(null);
      const [override, setOverride] = useState<Override>({});
      return createElement(RoomsStage, {
        ids: p.ids,
        sel,
        override,
        onPick: setSel,
        onOverride: (o: Override, guess: number) => {
          seen.push({ override: o, guess });
          setOverride(o);
        },
        caption: live => (live ? `guess ${live.pass.top[0].tok}` : 'loading'),
      });
    }
    act(() => root.render(createElement(Harness)));
    await settle();
    const radios = host.querySelectorAll<HTMLInputElement>('.me-strip input[type="radio"]');
    expect(radios).toHaveLength(Math.min(SHOWN, p.ids.length));
    act(() => radios[radios.length - 1].click());
    const boxes = () => host.querySelectorAll<HTMLInputElement>('.me-rooms input[type="checkbox"]');
    expect(boxes()).toHaveLength(8);
    for (const e of PINNED.override.experts) act(() => boxes()[e].click());
    const after = seen.at(-1)!;
    expect(after.override[last]).toEqual(PINNED.override.experts);
    expect(after.guess).toBe(run(model, p.ids, { [last]: PINNED.override.experts }).top[0].tok);
    expect(host.querySelectorAll('[data-lit="1"]')).toHaveLength(4);
    for (const e of PINNED.override.experts)
      expect(host.querySelectorAll(`[data-room="${e + 1}"][data-lit="1"]`)).toHaveLength(2);
    // a third pick unchecks the oldest and says so
    act(() => boxes()[7].click());
    expect(seen.at(-1)!.override[last]).toEqual([PINNED.override.experts[1], 7]);
    expect(host.querySelector('.me-said')!.textContent).toContain('unchecked');
    const useRouter = [...host.querySelectorAll('button')].find(b => b.textContent === 'Use router')!;
    act(() => useRouter.click());
    expect(seen.at(-1)!.override).toEqual({});
    const r = run(model, p.ids);
    expect(seen.at(-1)!.guess).toBe(r.top[0].tok);
    r.routes.forEach((l, f) => {
      for (const e of l[last].experts)
        expect(host.querySelector(`[data-floor="${f + 1}"][data-room="${e + 1}"]`)!.getAttribute('data-lit')).toBe('1');
    });
  });

  it('while the weights load the controls are disabled with a status line; a failure offers Retry', async () => {
    let fail = true;
    setModelFiles(async f => {
      if (fail) throw new Error('offline');
      return disk(f);
    });
    const p = promptOf('reply');
    act(() => root.render(createElement(RoomsStage, { ids: p.ids, sel: 0, onPick: () => {}, caption: () => 'x' })));
    expect(host.querySelector<HTMLFieldSetElement>('.me-strip')!.disabled).toBe(true);
    expect(host.querySelector('.me-status')!.textContent).toContain('Loading');
    await settle();
    expect(host.querySelector('.me-status')!.getAttribute('data-state')).toBe('failed');
    fail = false;
    const retry = [...host.querySelectorAll('button')].find(b => b.textContent === 'Retry')!;
    act(() => retry.click());
    await settle();
    expect(host.querySelector('.me-status')).toBeNull();
    expect(host.querySelector<HTMLFieldSetElement>('.me-strip')!.disabled).toBe(false);
  });
});
