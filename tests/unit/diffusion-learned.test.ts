// The learned 2-D denoiser (KTD8): the shipped weights against their Python goldens, its size and how well it draws the
// hinge, and chapter 2's roughness measure. The ideal denoiser's checks are in diffusion-engine.test.ts.
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCHEDULE } from '../../src/lib/diffusion/schedule';
import {
  distanceToOutline,
  parsePoints,
  type PointsMeta,
  predictNoise,
  roughness,
  samplePoints,
} from '../../src/lib/diffusion/points';

const meta = JSON.parse(readFileSync('public/data/diffusion/meta.json', 'utf8')) as PointsMeta;
const bin = readFileSync('public/data/diffusion/points.bin');
const model = parsePoints(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer);

// Pinned when the denoiser was trained: with seed 7, 200 points in 50 steps, at least this share lies within NEAR of
// the outline (the outline spans about 1.8 × 1.7; a screw hole's radius is 0.12). Measured 0.915.
const SEED = 7;
const NEAR = 0.05;
const SHARE = 0.9;

describe('learned 2-D denoiser', () => {
  it('matches the Python goldens within 1e-4', () => {
    for (const g of meta.goldens) {
      const eps = predictNoise(model, g.x[0], g.x[1], g.t);
      expect(Math.abs(eps[0] - g.eps[0])).toBeLessThan(1e-4);
      expect(Math.abs(eps[1] - g.eps[1])).toBeLessThan(1e-4);
    }
  });

  it('ships points.bin within 60,000 bytes, with the schedule the TS sampler uses', () => {
    expect(statSync('public/data/diffusion/points.bin').size).toBe(meta.bytes);
    expect(meta.bytes).toBeLessThanOrEqual(60_000);
    expect(meta.schedule).toEqual(SCHEDULE);
  });

  it('draws the hinge: a fixed seed puts the pinned share of points near the outline', () => {
    const pts = samplePoints(model, 200, 50, SEED);
    expect(samplePoints(model, 200, 50, SEED)).toEqual(pts);
    const near = pts.filter(([x, y]) => distanceToOutline(meta.outline, x, y) < NEAR).length / pts.length;
    expect(near).toBeGreaterThanOrEqual(SHARE);
  });

  it("chapter 2's roughness falls as the steps rise", () => {
    const rough = [1, 5, 10, 20, 50].map(steps => roughness(meta.outline, samplePoints(model, 200, steps, SEED)));
    for (let i = 1; i < rough.length; i++) expect(rough[i]).toBeLessThan(rough[i - 1]);
  });
});
