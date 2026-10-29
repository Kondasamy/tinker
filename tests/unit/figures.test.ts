// The figure kit (U3): every piece draws in every view with sortable, shadow-free items inside its footprint; the cast
// keeps its looks; people stay readable on phones; the model machine shows its state and keeps the llm footprint.
import { describe, expect, it } from 'vitest';
import { SHADOW, matOf, withFrame } from '../../src/lib/iso/core.js';
import { HALF, STATE_COL } from '../../src/lib/iso/blocks';
import { frameFor } from '../../src/lib/iso/IsoStage';
import { CAST, POSES, SAMPLES, markOf, modelMachine, person, type Piece } from '../../src/lib/iso/figures';

const VIEWS = [0, 1, 2, 3];
const inView = <T>(view: number, fn: () => T) => withFrame({ view, center: [60, 60] }, fn);
const ALL: [string, () => Piece][] = [
  ...Object.entries(SAMPLES).map(([k, make]) => [k, () => make(60, 60)] as [string, () => Piece]),
  ...POSES.flatMap(pose =>
    (['employee', 'eve', 'supportLead', 'mira'] as const).map(
      look =>
        [`person ${pose} ${look}`, () => person({ x: 60, y: 60, pose, look, facing: 30 })] as [string, () => Piece],
    ),
  ),
  ...[0.45, 0.7, 1].map(
    k => [`model ${k}`, () => modelMachine(60, 60, k, 'warn', k === 1 ? 50 : undefined)] as [string, () => Piece],
  ),
];
const svgOf = (p: Piece) => p.items.map(i => i.svg).join('');

describe('every piece', () => {
  for (const view of VIEWS)
    it(`draws from view ${view} without NaN, each item boxed inside the footprint, shadows only in shadow`, () => {
      for (const [name, make] of ALL) {
        const p = inView(view, make);
        expect(p.items.length, name).toBeGreaterThan(0);
        for (const it of p.items) {
          expect(it.svg.length, name).toBeGreaterThan(0);
          expect(it.svg, name).not.toContain('NaN');
          expect(it.svg, name).not.toContain(SHADOW);
          expect(it.box, name).toHaveLength(2);
          for (let k = 0; k < 3; k++) {
            expect(it.box[0][k], `${name} min ${k}`).toBeGreaterThanOrEqual(p.box[0][k] - 1e-6);
            expect(it.box[1][k], `${name} max ${k}`).toBeLessThanOrEqual(p.box[1][k] + 1e-6);
          }
        }
        expect(p.shadow, name).toContain(SHADOW);
        expect(p.shadow, name).not.toContain('NaN');
      }
    });
});

describe('people', () => {
  it('each cast key wears its palette and its silhouette marker (hat, prop or hair)', () => {
    for (const [key, look] of Object.entries(CAST)) {
      const svg = inView(0, () => svgOf(person({ x: 60, y: 60, look: key })));
      const m = matOf(look.top);
      expect(
        [m.l, m.m, m.d].some(c => svg.includes(c)),
        key,
      ).toBe(true);
      expect(svg, key).toContain(`data-mark="${markOf(look)}"`);
      expect(svg, key).toContain(`data-look="${key}"`);
    }
  });

  it('named characters differ by silhouette, not only colour', () => {
    const named = ['rosa', 'tomas', 'ines', 'mira', 'tom', 'employee', 'operator', 'eve', 'supportLead'] as const;
    expect(new Set(named.map(k => markOf(CAST[k]))).size).toBe(named.length);
  });

  it('an unknown key falls back to the generic look, its name escaped', () => {
    const svg = inView(0, () => svgOf(person({ x: 60, y: 60, look: '<b>"x"' })));
    expect(svg).toContain('data-mark="short"');
    expect(svg).toContain('data-look="&lt;b&gt;&quot;x&quot;"');
    expect(svg).not.toContain('<b>');
  });

  it('a standing person is at least 22 CSS px tall on a phone', () => {
    // Assumption: the largest common scene board with people (260 × 210, the MCP / engine boards) fills a 358 CSS px
    // stage (390px phone less two 16px gutters); the stage's viewBox is frameFor(board).w units wide.
    const board: [number, number, number, number] = [0, 0, 260, 210],
      fr = frameFor(board),
      css = 358 / fr.w;
    const svg = withFrame(fr, () => svgOf(person({ x: 130, y: 105 })));
    const ys = [...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => +m[2]);
    expect((Math.max(...ys) - Math.min(...ys)) * css).toBeGreaterThanOrEqual(22);
  });
});

describe('the model machine', () => {
  it('shows each state in its screen colour, idle as dots', () => {
    for (const st of ['ok', 'warn', 'bad'] as const) {
      const svg = inView(0, () => svgOf(modelMachine(60, 60, 1, st)));
      expect(svg).toContain(`fill="${STATE_COL[st]}"`);
      expect(svg).toContain(`data-state="${st}"`);
    }
    expect(inView(0, () => svgOf(modelMachine(60, 60)))).toContain('>...</text>');
  });

  it('at size 1 stands on the llm block footprint, scales in proportion, and is marked data-kit="model"', () => {
    for (const k of [0.45, 1]) {
      const p = inView(0, () => modelMachine(60, 60, k));
      expect(p.box[1][0] - p.box[0][0]).toBeCloseTo(2 * HALF * k);
      expect(p.box[1][1] - p.box[0][1]).toBeCloseTo(2 * HALF * k);
      expect(svgOf(p)).toContain('data-kit="model"');
    }
    const tall = inView(0, () => modelMachine(60, 60, 1, 'ok', 56));
    expect(tall.box[1][2]).toBeGreaterThan(inView(0, () => modelMachine(60, 60, 1, 'ok')).box[1][2] + 20);
  });
});
