// Diffusion engine (U33, KTD8, KTD12): forward noising, the ideal denoiser's pinned samples, steps against roughness,
// guidance, the 2-D copy-or-create comparison, and the workbench. Pinned outputs live in data/diffusion/pinned.json.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/diffusion/pinned.json' with { type: 'json' };
import { DRAWINGS, type Label, LABELS, nearest, SIZE } from '../../src/lib/diffusion/drawings';
import { correlation, noised, STEPS } from '../../src/lib/diffusion/schedule';
import {
  GUIDANCE,
  idealGuess,
  passes,
  pictureRoughness,
  sampleDrawing,
  sampleIdealPoints,
  trajectory,
} from '../../src/lib/diffusion/ideal';
import {
  distanceToOutline,
  nextStep,
  parsePoints,
  pointsOf,
  roughness,
  startPoints,
  stepPointRange,
  type PointsMeta,
  samplePoints,
  ON,
  trainingPoints,
} from '../../src/lib/diffusion/points';
import {
  BEST_COST,
  CHOICES,
  choiceKey,
  costOf,
  measure,
  resultOf,
  solved,
  USES,
  type Plan,
  WINNERS,
} from '../../src/lib/diffusion/workbench';
import { FACTS } from '../../src/lib/diffusion/facts';

const meta = JSON.parse(readFileSync('public/data/diffusion/meta.json', 'utf8')) as PointsMeta;
const bin = readFileSync('public/data/diffusion/points.bin');
const model = parsePoints(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer);
const SEEDS = pinned.seeds;
const TOP = GUIDANCE[GUIDANCE.length - 1];

describe('drawings', () => {
  it('holds about twelve exact 32×32 bitmaps, four per class', () => {
    expect(DRAWINGS.length).toBe(12);
    for (const l of LABELS) expect(DRAWINGS.filter(d => d.label === l)).toHaveLength(4);
    for (const d of DRAWINGS) expect(d.pixels).toHaveLength(SIZE * SIZE);
    expect(new Set(DRAWINGS.map(d => d.pixels.join())).size).toBe(12);
  });
});

describe('the ideal guess', () => {
  it('at no noise returns the nearest training drawing exactly', () => {
    for (const d of DRAWINGS) {
      const x = Float64Array.from(d.pixels, (v, i) => (i % 97 === 0 ? -v : v + 0.3));
      expect(Array.from(idealGuess(x, 0))).toEqual(Array.from(d.pixels));
    }
  });
});

describe('forward noising', () => {
  const d = DRAWINGS[0].pixels;
  it('at step 0 gives the drawing; at the last step almost nothing of it is left', () => {
    expect(Array.from(noised(d, 0, 3))).toEqual(Array.from(d));
    expect(Math.abs(correlation(noised(d, 1, 3), d))).toBeLessThan(0.1);
    expect(correlation(noised(d, 0.25, 3), d)).toBeGreaterThan(0.5);
  });
  it('is seeded: the same seed gives the same noise', () => {
    expect(noised(d, 0.5, 9)).toEqual(noised(d, 0.5, 9));
  });
});

describe('the ideal denoiser, pinned', () => {
  it('each pinned seed lands on its pinned drawing', () => {
    for (const p of pinned.samples) {
      const x = sampleDrawing(p.steps, p.seed, (p.label ?? undefined) as Label | undefined, p.scale);
      const n = nearest(x);
      expect([p.seed, n.drawing.id]).toEqual([p.seed, p.nearest]);
    }
  });

  it('one step gives the blurred average; many steps a clean drawing, on every pinned seed', () => {
    for (const seed of SEEDS) {
      expect(pictureRoughness(sampleDrawing(1, seed))).toBeGreaterThan(0.4);
      expect(pictureRoughness(sampleDrawing(50, seed))).toBeLessThan(0.01);
    }
  });

  it('a trajectory has a frame per step, ending on the sample', () => {
    const t = trajectory(10, SEEDS[0]);
    expect(t).toHaveLength(11);
    expect(t[10]).toEqual(sampleDrawing(10, SEEDS[0]));
  });

  it('at guidance 0 the class is not fixed; at the top guidance the label wins on every pinned seed', () => {
    for (const label of LABELS) {
      const free = SEEDS.map(s => nearest(sampleDrawing(50, s, label, 0)).drawing.label);
      expect(free.some(l => l !== label)).toBe(true);
      for (const s of SEEDS) expect(nearest(sampleDrawing(50, s, label, TOP)).drawing.label).toBe(label);
    }
  });

  it('guidance above 1 costs two predictions a step', () => {
    expect(GUIDANCE.map(passes)).toEqual(GUIDANCE.map(g => (g === 0 || g === 1 ? 1 : 2)));
  });
});

describe('the learned 2-D denoiser, step by step', () => {
  it("fewer steps give a higher value of U4's roughness on the pinned seed", () => {
    const r = STEPS.map(steps => roughness(meta.outline, samplePoints(model, 200, steps, 7)));
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThan(r[i - 1]);
  });

  it('a run stepped in slices gives the same points as one call', () => {
    const run = startPoints(60, 10, 3);
    while (run.done < run.steps) {
      for (let p = 0; p < 60; p += 25) stepPointRange(model, run, p, Math.min(60, p + 25));
      nextStep(run);
    }
    expect(pointsOf(run)).toEqual(samplePoints(model, 60, 10, 3));
  });
});

describe('copy or create, on 2-D points', () => {
  const train = trainingPoints(meta.outline);
  const toTrain = ([x, y]: [number, number]) => Math.min(...train.map(([a, b]) => Math.hypot(x - a, y - b)));

  it('the ideal denoiser lands on its training points: 95 in 100 within a dot (ON) of one', () => {
    const pts = sampleIdealPoints(train, 100, 50, 7);
    expect(pts.filter(p => toTrain(p) < ON).length).toBeGreaterThanOrEqual(95);
  });

  it('the learned denoiser lands on the outline at the pinned share, mostly away from the training points', () => {
    const pts = samplePoints(model, 200, 50, 7);
    const near = pts.filter(([x, y]) => distanceToOutline(meta.outline, x, y) < 0.05).length / pts.length;
    expect(near).toBeGreaterThanOrEqual(0.9);
    const fresh = pts.filter(p => toTrain(p) > ON).length / pts.length;
    expect(fresh).toBeGreaterThanOrEqual(0.8);
  });
});

describe('workbench', () => {
  it('the precomputed measurements match the live engine', () => {
    const want = pinned.workbench as Record<string, unknown>;
    expect(Object.keys(want).sort()).toEqual(CHOICES.map(choiceKey).sort());
    for (const c of CHOICES) expect([choiceKey(c), measure(c)]).toEqual([choiceKey(c), want[choiceKey(c)]]);
  });

  it('every use passes some choice, and guidance 1 alone is never enough for both', () => {
    for (const u of USES) expect(CHOICES.some(c => resultOf(u.id, c).ok)).toBe(true);
    for (const w of WINNERS) expect(USES.every(u => w[u.id].scale === 1)).toBe(false);
  });

  it('has winners, all at the best cost, and the start plan is not one', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) {
      expect(solved(w)).toBe(true);
      expect(costOf(w)).toBe(BEST_COST);
    }
    const all = Object.fromEntries(USES.map(u => [u.id, { steps: 50, scale: TOP }])) as Plan;
    expect(solved(all)).toBe(false);
  });
});

describe('facts', () => {
  it('every fact has a source and an access date', () => {
    for (const f of FACTS) {
      expect(f.source).toMatch(/^https:\/\//);
      expect(f.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
