// Diffusion's chapters against the engine (U35): what each chapter's copy and Show me rely on is what the engine gives.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nearest } from '../../src/lib/diffusion/drawings';
import { sampleDrawing, trajectory } from '../../src/lib/diffusion/ideal';
import { parsePoints, type PointsMeta, roughness, samplePoints } from '../../src/lib/diffusion/points';
import { SEEDS, solved, WINNERS } from '../../src/lib/diffusion/workbench';
import { SEED as SEED1, STEPS_1 } from '../../src/content/diffusion/01-noise-to-picture';
import {
  ASKED as ASKED2,
  DOTS,
  ROUGH,
  SEED as SEED2,
  STEPS as STEPS2,
} from '../../src/content/diffusion/02-step-by-step';
import { ASKED as ASKED5, STEPS_5 } from '../../src/content/diffusion/05-steer-with-a-label';
import { F, positions } from '../../src/content/diffusion/06-why-it-costs';
import { START, STEPS as STEPS7, planOf } from '../../src/content/diffusion/07-workbench';

const meta = JSON.parse(readFileSync('public/data/diffusion/meta.json', 'utf8')) as PointsMeta;
const bin = readFileSync('public/data/diffusion/points.bin');
const model = parsePoints(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer);

describe('chapter 1', () => {
  it('develops a clean hinge from its seed', () => {
    const n = nearest(trajectory(STEPS_1, SEED1)[STEPS_1]);
    expect(n.drawing.label).toBe('hinge');
    expect(n.rms).toBeLessThan(0.01);
  });
});

describe('chapter 2', () => {
  it('Show me fills in the live roughness at each asked count, and fewer steps are rougher', () => {
    const live = ASKED2.map(
      s => Math.round(roughness(meta.outline, samplePoints(model, DOTS, s, SEED2)) * 1000) / 1000,
    );
    expect(ASKED2.map(s => ROUGH[s])).toEqual(live);
    for (let i = 1; i < live.length; i++) expect(live[i]).toBeGreaterThan(live[i - 1]);
    const step = STEPS2.find(s => s.id === 'sweep')!;
    const s0 = { p1: 1, steps: 50 as const, run: null, rough: {}, quiz: null };
    expect(step.predicate(step.solution!(s0))).toBe(true);
  });
});

describe('chapter 5', () => {
  it('scale 0 leaves the drill to chance; the top scale draws a drill from every seed', () => {
    const drills = (g: number) =>
      SEEDS.filter(s => nearest(sampleDrawing(STEPS_5, s, 'drill', g)).drawing.label === 'drill').length;
    expect(drills(0)).toBeLessThan(SEEDS.length / 2);
    expect(drills(ASKED5[ASKED5.length - 1])).toBe(SEEDS.length);
  });
});

describe('chapter 6', () => {
  it('counts positions: doubling the size quadruples them, latent shrinks them F² times', () => {
    expect(positions(512, false)).toBe(4 * positions(256, false));
    expect(positions(512, false) / positions(512, true)).toBe(F * F);
  });
});

describe('chapter 7', () => {
  it('Show me applies one of the winners, and the starting plan is not solved', () => {
    const step = STEPS7.find(s => s.id === 'plan')!;
    const shown = step.solution!({ plan: START, show: 'catalogue', quiz: null });
    expect(WINNERS).toContainEqual(shown.plan);
    expect(step.predicate(shown)).toBe(true);
    expect(solved(planOf(START))).toBe(false);
    expect(planOf({ thumbnail: { steps: 7 as never, scale: 1 } }).thumbnail).toEqual(START.thumbnail);
  });
});
