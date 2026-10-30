// @vitest-environment happy-dom
// Backups' stage (U5): the server room's parts and callouts, the reel cap and its count pill, what each disaster draws
// (charred, padlocked, the restored copy), the strike bar (Select, range, Strike; changing the hour clears a strike),
// the one polite read-out, and motion only behind prefers-reduced-motion: no-preference.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_REELS,
  SAFE_BOARD,
  SAFE_PARTS,
  safeAt,
  safeCard,
  safeLabel,
  safeReadouts,
  safeScene,
  safeState,
  type SafeOpts,
} from '../../src/components/scenes/safeScene';
import { BackupsStage, StrikeBar, WeekView, type Struck } from '../../src/content/backups/kit';
import { SCENES, STRIKES, weekOf } from '../../src/lib/backups/sim';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draw = (o: SafeOpts) =>
  renderToString(createElement(IsoStage, { board: SAFE_BOARD, scene: safeScene(o), label: safeLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const W = (k: keyof typeof SCENES) => weekOf(SCENES[k]);
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/backups/[0-9]*.tsx', {
  eager: true,
});

describe('the server room', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const svg = draw(safeAt(W('lockbox'), 100));
    for (const p of ['server', 'cabinet', 'warehouse', 'lockbox']) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of SAFE_PARTS)
      expect(draw({ ...safeAt(W('none'), 3), say: { block: p, text: 'Here' } })).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    expect(used.length).toBeGreaterThan(8);
    for (const b of used) expect(SAFE_PARTS).toContain(b);
  });
  it(`draws at most ${MAX_REELS} reels and a count pill for the rest`, () => {
    const o = safeAt(W('six'), 100);
    expect(o.reels.length).toBeGreaterThan(MAX_REELS);
    const svg = draw(o);
    expect(count(svg, 'class="reel')).toBe(MAX_REELS);
    expect(svg).toContain(`+${o.reels.length - MAX_REELS}`);
  });
  it('a dead disk smokes; fire chars the room and the reels; ransomware padlocks what the network reaches', () => {
    const dead = draw(safeAt(W('nightly'), 0, STRIKES.wed));
    expect(dead).toContain('class="smoke"');
    expect(dead).toContain('class="reel full used"');
    const fire = safeAt(W('offsite'), 0, STRIKES.fire);
    expect(safeState(fire)).toMatchObject({ how: 'burnt', cabinetLost: true, restored: 'warehouse' });
    expect(draw(fire)).toContain('class="fire"');
    const ransom = safeAt(W('lockbox'), 0, STRIKES.ransom),
      svg = draw(ransom);
    expect(count(svg, 'class="ransom"')).toBe(3);
    expect(svg).toContain('data-used="1"');
    expect(safeLabel(ransom)).toMatch(/Restored from the lockbox copy/);
  });
  it('a bad tape looks fine until a strike or a test finds it out', () => {
    expect(safeAt(W('silent'), 100).reels.some(r => r.bad)).toBe(false);
    expect(safeAt(W('silent'), 0, STRIKES.fri).reels.some(r => r.bad)).toBe(true);
  });
  it('phones keep only the names in the pills; the caption carries the counts', () => {
    const o = { ...safeCard(), scale: 2 };
    expect(draw(o)).not.toMatch(/LOCKBOX · /);
    expect(safeReadouts(o).join(' ')).toMatch(/orders lost/);
  });
  it('the week view draws a copy per tape and labels the restore', () => {
    const html = renderToString(createElement(WeekView, { week: W('broken'), hour: 46, strike: STRIKES.tue }));
    expect(html).toMatch(/restored to Tue 07:00/);
    expect(count(html, 'class="bk-copy')).toBe(W('broken').copies.filter(c => c.t <= 46).length);
  });
  it('motion lives only behind prefers-reduced-motion: no-preference', () => {
    const css = readFileSync('src/content/backups/backups.css', 'utf8');
    const motion = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(motion).toBeGreaterThan(0);
    expect(css.slice(0, motion)).not.toMatch(/animation/);
  });
});

describe('the strike bar and stage', () => {
  let host: HTMLDivElement, root: Root;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });
  function Live() {
    const [s, set] = useState<Struck>({ hour: 89, kind: 'disk', struck: false, view: 'scene' });
    return createElement(BackupsStage, {
      week: W('nightly'),
      s,
      onView: view => set({ ...s, view }),
      bar: createElement(StrikeBar, { s, kinds: ['disk', 'fire'], onChange: n => set(n) }),
    });
  }
  it('Strike hits; moving the hour clears it; the read-out says what was left, once', () => {
    act(() => root.render(createElement(Live)));
    const status = () => host.querySelectorAll('[role="status"]');
    expect(status()).toHaveLength(1);
    expect(status()[0].textContent).toBe('No disaster yet.');
    const strike = [...host.querySelectorAll('button')].find(b => b.textContent === 'Strike')!;
    act(() => strike.click());
    expect(status()[0].textContent).toMatch(/^Disk dies at Thu 17:00: restored from the cabinet copy of Thu 01:00/);
    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(range.getAttribute('aria-valuetext')).toBe('Thu 17:00');
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(range, '30');
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(status()[0].textContent).toBe('No disaster yet.');
    const week = [...host.querySelectorAll('button')].find(b => b.textContent === 'Week')!;
    act(() => week.click());
    expect(host.querySelector('.bk-week')).not.toBeNull();
  });
});
