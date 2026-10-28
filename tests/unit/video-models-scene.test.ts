// @vitest-environment happy-dom
// Video and world models' stage (U29): every part a callout names is drawn; the floors carry exactly the frames
// world.ts and the model give; the drive pad steps both by arrow key (only while it has focus) and by button, Re-sync
// makes them equal, the one polite read-out names each action and milestone; one floor at a time on its own board;
// the status line while the weights load and Retry after a failure.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  boardOf,
  DREAM_PARTS,
  dreamLabel,
  dreamPlot,
  dreamScene,
  FLOOR_ONLY_BOARD,
  PAIR_BOARD,
  type DreamOpts,
} from '../../src/components/scenes/dreamFloorScene';
import { DreamStage, DrivePad, ModelStatus, forgetNets, useNets } from '../../src/content/video-models/kit';
import { diskNet } from '../../src/lib/video-models/diskModel';
import { type Drive, driven, MAX_MOVES, move, NO_DRIVE, readout, resync } from '../../src/lib/video-models/drive';
import { dream, realOf } from '../../src/lib/video-models/rollout';
import { type Action, frame, frameText, parseFrame, rollout, start, step } from '../../src/lib/video-models/world';
import { mulberry32 } from '../../src/lib/transformers/sample';
import pinned from '../../data/video-models/pinned.json' with { type: 'json' };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const k2 = diskNet('k2');
const SEED = pinned.seed;
const real = rollout(SEED, 32);
const at = (t: number): DreamOpts => ({ real: real.frames[t], dream: parseFrame(pinned.dream[t]), step: t });
const draw = (o: DreamOpts) =>
  renderToString(createElement(IsoStage, { board: boardOf(o), scene: dreamScene(o), label: dreamLabel(o) }));
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>(
  '../../src/content/video-models/[0-9]*.tsx',
  {
    eager: true,
  },
);

describe('the warehouse dream', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    for (const part of DREAM_PARTS) expect(draw({ ...at(3), say: { block: part, text: 'Here' } })).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(DREAM_PARTS).toContain(b);
  });

  it('draws the real frame on the floor and the dream on the screen, ringing every cell that differs', () => {
    const t = pinned.kept + 2,
      o = at(t),
      svg = draw(o);
    expect(svg).toContain(`data-part="floor" data-frame="${frameText(real.frames[t])}"`);
    expect(svg).toContain(`data-part="dream" data-frame="${pinned.dream[t]}"`);
    const wrong = [...o.dream!].filter((k, i) => k !== o.real[i]).length;
    expect(wrong).toBeGreaterThan(0);
    expect(svg).toContain(`data-wrong="${wrong}"`);
    expect(dreamLabel(o)).toContain(`${wrong} cell${wrong === 1 ? ' differs' : 's differ'}`);
    expect(draw(at(3))).toContain('data-wrong="0"');
  });

  it('draws both floors on the pair board, one floor alone on its own board', () => {
    expect(boardOf(at(3))).toEqual(PAIR_BOARD);
    expect(boardOf({ ...at(3), show: 'dream' })).toEqual(FLOOR_ONLY_BOARD);
    expect(boardOf({ dream: null })).toEqual(FLOOR_ONLY_BOARD);
    const one = draw({ ...at(3), show: 'dream', scale: 2 });
    expect(one).toContain('data-part="dream"');
    expect(one).not.toContain('data-part="floor"');
    expect(draw({ real: real.frames[0] })).not.toContain('data-part="dream"');
  });

  it('escapes pill text and draws the hero plot', () => {
    expect(draw({ ...at(3), say: { block: 'robot', text: '<b>x' } })).not.toContain('<b>x');
    expect(dreamPlot(40, 40, [])).toContain('<path');
  });
});

describe('the drive', () => {
  it('after each move both frames match world.ts and the model; re-sync makes them equal', () => {
    let d: Drive = NO_DRIVE,
      w = start(mulberry32(SEED));
    w = step(w, rollout(SEED, 1).actions[0]).world;
    const keys: Action[] = [4, 4, 4, 2, 2, 3, 1, 1, 4, 4, 4, 2];
    for (const a of keys) {
      d = move(d, a);
      w = step(w, a).world;
      const now = driven(k2, SEED, d);
      expect(frameText(now.real.frames[now.at])).toBe(frameText(realOf(SEED, d.moves).frames.at(-1)!));
      expect(now.real.frames[now.at]).toEqual(frame(w));
      const fresh = dream(k2, realOf(SEED, d.moves), { syncs: d.syncs });
      expect(now.dream.frames.map(frameText)).toEqual(fresh.frames.map(frameText));
    }
    d = resync(d);
    const synced = driven(k2, SEED, d);
    expect(synced.dream.frames[synced.at]).toEqual(synced.real.frames[synced.at]);
    expect(resync(d)).toBe(d);
  });

  it('stops at the route’s end and names each milestone', () => {
    let d: Drive = NO_DRIVE;
    for (let i = 0; i < MAX_MOVES + 3; i++) d = move(d, 0);
    expect(d.moves).toHaveLength(MAX_MOVES);
    // the pinned route's own moves lose the robot in the dream at the pinned step
    const moves = real.actions.slice(1, pinned.kept + 2) as Action[];
    let before = driven(k2, SEED, NO_DRIVE),
      lines: string[] = [];
    let cur: Drive = NO_DRIVE;
    for (const a of moves) {
      cur = move(cur, a);
      const after = driven(k2, SEED, cur);
      lines.push(readout(before, after, a));
      before = after;
    }
    expect(lines.at(-1)).toContain('The dream lost the robot.');
    expect(lines.slice(0, -1).join(' ')).not.toContain('lost the robot');
    const after = driven(k2, SEED, resync(cur));
    expect(readout(before, after, 'sync')).toBe('Re-synced: the dream is the real frame again.');
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
    vi.unstubAllGlobals();
  });
  const settle = async () => {
    for (let i = 0; i < 20; i++) await act(async () => new Promise(r => setTimeout(r, 5)));
  };
  const disk = (fail: () => boolean) =>
    vi.stubGlobal('fetch', async (url: string) => {
      if (fail()) throw new Error('offline');
      const b = readFileSync(`public${url}`);
      return new Response(b);
    });

  it('drives by arrow key only while the pad has focus, by button, and re-syncs; one read-out says each', async () => {
    disk(() => false);
    const seen: Drive[] = [];
    function Harness() {
      const { nets } = useNets();
      const [d, setD] = useState<Drive>(NO_DRIVE);
      if (!nets) return null;
      const now = driven(nets.k2, SEED, d);
      return createElement(
        DreamStage,
        { real: now.real.frames[now.at], dream: now.dream.frames[now.at], step: now.at, caption: 'x' },
        createElement(DrivePad, {
          net: nets.k2,
          seed: SEED,
          drive: d,
          onDrive: (next: Drive) => {
            seen.push(next);
            setD(next);
          },
        }),
      );
    }
    act(() => root.render(createElement(Harness)));
    await settle();
    const pad = host.querySelector<HTMLElement>('.vm-pad')!;
    expect(pad.tabIndex).toBe(0);
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    // an arrow key on the page does nothing; on the pad it moves
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(seen).toHaveLength(0);
    pad.focus();
    act(() => {
      pad.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(seen.at(-1)!.moves).toEqual([4]);
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Down"]')!.click());
    expect(seen.at(-1)!.moves).toEqual([4, 2]);
    const said = host.querySelector('[role="status"]')!.textContent!;
    expect(said).toMatch(/^(Moved|Tried) down/);
    const now = driven(k2, SEED, seen.at(-1)!);
    expect(host.querySelector('[data-part="floor"]')!.getAttribute('data-frame')).toBe(
      frameText(now.real.frames[now.at]),
    );
    expect(host.querySelector('[data-part="dream"]')!.getAttribute('data-frame')).toBe(
      frameText(now.dream.frames[now.at]),
    );
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Re-sync')!.click());
    expect(host.querySelector('[role="status"]')!.textContent).toContain('Re-synced');
    expect(host.querySelector('[data-part="dream"]')!.getAttribute('data-frame')).toBe(
      host.querySelector('[data-part="floor"]')!.getAttribute('data-frame'),
    );
    // the Frames tab: both grids, the robot on its own sliding rect
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Frames')!.click());
    expect(host.querySelectorAll('.vm-grid svg')).toHaveLength(2);
    expect(host.querySelectorAll('.vm-slide')).toHaveLength(2);
  });

  it('while the weights load a status line shows; a failure offers Retry', async () => {
    let fail = true;
    forgetNets();
    disk(() => fail);
    function Harness() {
      const { status, retry, nets } = useNets();
      return createElement('div', null, nets ? `ready ${nets.k2.k}` : createElement(ModelStatus, { status, retry }));
    }
    act(() => root.render(createElement(Harness)));
    await settle();
    expect(host.querySelector('.vm-status')!.getAttribute('data-state')).toBe('failed');
    fail = false;
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Retry')!.click());
    expect(host.querySelector('.vm-status')!.getAttribute('data-state')).toBe('loading');
    await settle();
    expect(host.textContent).toContain('ready 2');
  });
});
