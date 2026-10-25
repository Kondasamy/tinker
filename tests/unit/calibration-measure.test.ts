// Calibration's engine (U20): the scores on synthetic sets, Larkspur mini's measured calibration (base and fine-tuned,
// both from disk), the temperature fit, and the jars' minimum. The pinned values are KTD8's stop conditions.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { evaluate } from '../../src/lib/lm/model';
import {
  HELDOUT,
  MIN_BIN,
  TEMPERATURES,
  fitT,
  half,
  itemsAt,
  measure,
  measureWindow,
  nll,
  report,
  windows,
} from '../../src/lib/calibration/measure';
import { accuracy, bins, brier, coverage, ece, soften, type Item } from '../../src/lib/calibration/score';
import { FACTS } from '../../src/lib/calibration/facts';
import pinned from '../../data/calibration/pinned.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const MODELS = { base: parseModel(meta, disk('model.bin')), finetuned: parseModel(meta, disk('finetuned.bin')) };
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const rep = (n: number, c: number, ok: boolean): Item[] => Array.from({ length: n }, () => ({ c, ok }));

describe('scores', () => {
  it('a perfectly calibrated set has ECE 0; always 90% but half right has ECE 0.4', () => {
    const honest = [...rep(5, 0.5, true), ...rep(5, 0.5, false), ...rep(9, 0.9, true), ...rep(1, 0.9, false)];
    expect(ece(honest)).toBeCloseTo(0, 12);
    expect(ece([...rep(10, 0.9, true), ...rep(10, 0.9, false)])).toBeCloseTo(0.4, 12);
  });
  it('Brier is 0 for sure, right answers and 0.25 for always 50%', () => {
    expect(brier(rep(8, 1, true))).toBe(0);
    expect(brier([...rep(3, 0.5, true), ...rep(5, 0.5, false)])).toBeCloseTo(0.25, 12);
  });
  it('bins merge thin tenths from the sure end down, and never lose an item', () => {
    const items = [...rep(30, 0.15, true), ...rep(3, 0.75, true), ...rep(4, 0.95, false), ...rep(25, 0.55, false)];
    const bs = bins(items, 20);
    expect(bs.reduce((n, b) => n + b.n, 0)).toBe(items.length);
    expect(bs.every(b => b.n >= 20)).toBe(true);
    expect(bs.map(b => [b.lo, b.hi])).toEqual([
      [0.1, 0.5],
      [0.5, 1],
    ]);
  });
  it('coverage falls and accuracy rises as the threshold rises', () => {
    const items = [...rep(5, 0.95, true), ...rep(5, 0.85, true), ...rep(5, 0.85, false), ...rep(5, 0.6, false)];
    const c = [0, 0.7, 0.9].map(t => coverage(items, t));
    expect(c.map(x => x.coverage)).toEqual([1, 0.75, 0.25]);
    expect(c[0].accuracy).toBeLessThan(c[1].accuracy);
    expect(c[1].accuracy).toBeLessThan(c[2].accuracy);
  });
  it('T = 1 leaves a confidence unchanged; above 1 pulls it toward 50%', () => {
    expect(soften(0.83, 1)).toBeCloseTo(0.83, 12);
    expect(soften(0.9, 2)).toBeLessThan(0.9);
    expect(soften(0.9, 2)).toBeGreaterThan(0.5);
  });
});

describe('Larkspur mini, measured', () => {
  const g = { base: measure(MODELS.base), finetuned: measure(MODELS.finetuned) };
  it('reads evaluate()’s positions, and its top picks are evaluate()’s top-1', () => {
    for (const [w, m] of Object.entries(MODELS)) {
      const e = evaluate(m, HELDOUT.ids),
        gs = g[w as keyof typeof g];
      expect(gs.length).toBe(e.tokens);
      expect(accuracy(itemsAt(gs))).toBeCloseTo(e.top1, 12);
    }
    expect(windows(MODELS.base.config.ctx).flatMap(w => measureWindow(MODELS.base, w))).toEqual(g.base);
  });
  it('T = 1 is the model as trained: each confidence is the top-1 probability, the same top pick at every T', () => {
    const at1 = itemsAt(g.base, 1);
    for (const T of TEMPERATURES) expect(itemsAt(g.base, T).map(x => x.ok)).toEqual(at1.map(x => x.ok));
  });
  it('matches the pins for both weights', () => {
    for (const w of ['base', 'finetuned'] as const) {
      const r = report(g[w]),
        p = pinned.models[w];
      expect({ positions: r.positions, right: r.right, ece: r3(r.ece), brier: r3(r.brier) }).toEqual({
        positions: p.positions,
        right: p.right,
        ece: p.ece,
        brier: p.brier,
      });
      expect(fitT(half(g[w], 'fit'))).toBe(p.fitT);
    }
  });
  it('the style fine-tune is less calibrated than the base on text it was not tuned for (KTD8’s bar)', () => {
    expect(report(g.finetuned).ece).toBeGreaterThan(report(g.base).ece);
    expect(pinned.models.finetuned.ece).toBeGreaterThan(pinned.models.base.ece);
    // chapter 3 says “in nearly every jar”: every one of its jars holds less mint than its ring
    for (const j of report(g.finetuned).jars) expect(j.right / j.n).toBeLessThan(j.conf);
  });
  it('the fitted temperature lowers the fine-tune’s test-half NLL and ECE', () => {
    const fit = half(g.finetuned, 'fit'),
      test = half(g.finetuned, 'test'),
      T = fitT(fit);
    expect(T).toBe(pinned.scaled.T);
    expect(nll(test, T)).toBeLessThanOrEqual(nll(test, 1));
    expect(r3(report(test, 1).ece)).toBe(pinned.scaled.testEceBefore);
    expect(r3(report(test, T).ece)).toBe(pinned.scaled.testEceAfter);
    expect(fit.length + test.length).toBe(g.finetuned.length);
  });
  it('every jar the chapters show holds at least the pinned minimum, both weights, all positions and both halves', () => {
    expect(MIN_BIN).toBe(20);
    for (const gs of [g.base, g.finetuned])
      for (const set of [gs, half(gs, 'fit'), half(gs, 'test')])
        for (const T of TEMPERATURES) {
          const jars = report(set, T).jars;
          expect(Math.min(...jars.map(j => j.n))).toBeGreaterThanOrEqual(MIN_BIN);
          expect(jars.reduce((n, j) => n + j.n, 0)).toBe(set.length);
        }
  });
  it('at T = 1 the jars are unmerged tenths for both weights over every position', () => {
    for (const gs of [g.base, g.finetuned]) expect(report(gs).jars).toHaveLength(10);
  });
});

it('every fact has a source and its claim', () => {
  for (const f of FACTS) {
    expect(f.source).toMatch(/^https:\/\//);
    expect(f.claim.length).toBeGreaterThan(20);
  }
});
