// @vitest-environment happy-dom
// Logins and passwords' stage (U5): the cloakroom's parts and callouts, the drawer cap and its count pill, escaping, the
// race's board at every tick against race.ts, the race's controls (radios, a native range, Play and Step, one polite
// read-out), the final board at once with reduced motion, and the pop drawn only behind no-preference.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  CLOAK_BOARD,
  CLOAK_CAP,
  CLOAK_PARTS,
  cloakLabel,
  cloakPlot,
  cloakScene,
  type CloakOpts,
} from '../../src/components/scenes/cloakScene';
import { RaceControls, bigNumber, drawersOf, raceScene, type Race } from '../../src/content/logins/kit';
import { FORMS, LAST, WORK, boardAt } from '../../src/lib/logins/race';
import { ACCOUNTS } from '../../src/lib/logins/store';

const draw = (o: CloakOpts) =>
  renderToString(createElement(IsoStage, { board: CLOAK_BOARD, scene: cloakScene(o), label: cloakLabel(o) }));
const FULL: CloakOpts = {
  drawers: drawersOf('sha256'),
  table: 'TABLE',
  desk: 'LARKSPUR',
  ticket: { label: 'TICKET' },
  thief: { label: 'THIEF', holds: 'ticket' },
  guild: { label: 'GUILD', card: { label: 'ID TOKEN', at: 'belt', sealed: true } },
};

describe('the cloakroom', () => {
  it('draws every part a callout may name, and the callout itself', () => {
    for (const p of CLOAK_PARTS) {
      expect(draw(FULL)).toContain(`data-prop="${p}"`);
      expect(draw({ ...FULL, say: { block: p, text: 'Here' } })).toContain('Here');
    }
  });
  it('draws at most 12 drawers, plus a count pill for the rest', () => {
    const many = [...ACCOUNTS, ...ACCOUNTS].map((a, i) => ({ id: `${a.id}${i}`, state: 'hashed' as const }));
    const svg = draw({ drawers: many });
    expect(svg.split('data-drawer=').length - 1).toBe(CLOAK_CAP);
    expect(svg).toContain(`+${many.length - CLOAK_CAP} MORE`);
    expect(draw({ drawers: drawersOf('plain') })).not.toContain('MORE');
  });
  it('escapes every pill', () => {
    const svg = draw({ ...FULL, table: '<script>x</script>' });
    expect(svg).not.toContain('<script>x');
    expect(svg).toContain('&lt;script&gt;');
  });
  it('draws the hero plot', () => {
    const plot = createElement(IsoStage, { board: CLOAK_BOARD, scene: ctx => cloakPlot(40, 40, ctx.top), label: '' });
    expect(renderToString(plot)).toContain('<path');
  });
  it('pops only behind prefers-reduced-motion: no-preference', () => {
    const css = readFileSync('src/content/logins/logins.css', 'utf8');
    expect(css).toMatch(/no-preference\)\s*{\s*\.lg-stage \[data-fresh\]/);
  });
});

describe('the race’s board', () => {
  it('at tick n matches race.ts at tick n, for every form and work factor', () => {
    for (const f of FORMS)
      for (const w of WORK)
        for (let t = 0; t <= LAST; t++) {
          const o = raceScene(f, w, t),
            cracked = o.drawers.filter(d => d.state === 'cracked').map(d => d.id);
          expect(cracked).toEqual(boardAt(f, w, t).cracked);
          expect(o.table).toBe(`${cracked.length} OF ${ACCOUNTS.length} CRACKED`);
          const svg = draw(o);
          expect(svg.split('data-state="cracked"').length - 1).toBe(cracked.length);
        }
  });
  it('says big numbers in words', () => {
    expect(bigNumber(21_975_500_000)).toBe('22 billion');
    expect(bigNumber(1.9e15)).toBe('1.9 × 10¹⁵');
  });
});

describe('the race’s controls', () => {
  let root: Root, host: HTMLElement;
  const realMatch = window.matchMedia;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    window.matchMedia = realMatch;
  });
  function Harness({ start }: { start: Race }) {
    const [r, setR] = useState(start);
    return createElement(
      'div',
      { 'data-race': JSON.stringify(r) },
      createElement(RaceControls, { race: r, forms: ['sha256', 'pbkdf2'], onChange: setR }),
    );
  }
  const race = () => JSON.parse(host.querySelector<HTMLElement>('[data-race]')!.dataset.race!) as Race;
  const button = (name: string) => [...host.querySelectorAll('button')].find(b => b.textContent === name)!;

  it('is a radio group, a native range for PBKDF2, Play and Step, and one polite status read-out', () => {
    act(() => root.render(createElement(Harness, { start: { form: 'pbkdf2', work: WORK[0], tick: 0 } })));
    expect(host.querySelectorAll('input[type="radio"][name="lg-form"]')).toHaveLength(2);
    expect(host.querySelector('input[type="range"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    act(() => button('Step').click());
    expect(race().tick).toBe(1);
    expect(host.querySelector('[role="status"]')!.textContent).toContain('After 1 minute');
  });
  it('the range changes the work factor and restarts the race', () => {
    act(() => root.render(createElement(Harness, { start: { form: 'pbkdf2', work: WORK[0], tick: 3 } })));
    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(range, '2');
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(race()).toEqual({ form: 'pbkdf2', work: WORK[2], tick: 0 });
  });
  it('with reduced motion, Play shows the final board at once', () => {
    window.matchMedia = (q: string) => ({ matches: q.includes('reduce') }) as MediaQueryList;
    act(() => root.render(createElement(Harness, { start: { form: 'sha256', work: WORK[0], tick: 0 } })));
    act(() => button('Play').click());
    expect(race().tick).toBe(LAST);
    expect(host.querySelector('[role="status"]')!.textContent).toContain('After 1 year');
  });
});
