// Fairness's engine (U11, KTD6, KTD9): the generator reproduces applicants.json; fit() reproduces weights.json; every
// chapter number matches pinned.json; and the effects each chapter teaches hold on these applicants. WRITE_PINNED=1
// rewrites applicants.json, weights.json and pinned.json's effects (run it until nothing changes: each file reads the
// one before it at import).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FACTS, fact } from '../../src/lib/fairness/facts';
import { FEATURE_SETS, FIXES, WEIGHTS, fit } from '../../src/lib/fairness/fit';
import { GRID, gapOf, measure } from '../../src/lib/fairness/metrics';
import { COUNT, generate } from '../../src/lib/fairness/population';
import {
  APPLICANTS,
  APPLICANTS_NOTE,
  REGION_NAMES,
  effects,
  equalPairs,
  evenPairs,
  runOf,
} from '../../src/lib/fairness/story';

const write = (file: string, x: unknown) => writeFileSync(file, `${JSON.stringify(x, null, 2)}\n`);
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const WRITE = !!process.env.WRITE_PINNED;
const PINNED = read('data/fairness/pinned.json');

describe('the applicants', () => {
  it('the seeded generator reproduces applicants.json: 300 from A, 100 from B, labelled made up', () => {
    const rows = generate();
    if (WRITE) write('data/fairness/applicants.json', { ...read('data/fairness/applicants.json'), applicants: rows });
    else expect(APPLICANTS).toEqual(rows);
    expect(rows).toHaveLength(COUNT);
    expect(rows.filter(a => a.region === 'B')).toHaveLength(COUNT / 4);
    expect(new Set(rows.map(a => a.id)).size).toBe(COUNT);
    expect(APPLICANTS_NOTE).toMatch(/made-up/i);
    expect(Object.keys(REGION_NAMES).sort()).toEqual(['A', 'B']);
  });

  it('B is mostly river postcodes and has the lower base rate', () => {
    const e = effects();
    expect(e.river.B / 100).toBeGreaterThan(0.75);
    expect(e.river.A / 300).toBeLessThan(0.15);
    expect(e.all.B.base! + 0.15).toBeLessThan(e.all.A.base!);
  });
});

describe('fit()', () => {
  it('reproduces weights.json exactly, for every field set and sample fix', () => {
    const w = Object.fromEntries(
      FEATURE_SETS.map(f => [f, Object.fromEntries(FIXES.map(x => [x, fit(APPLICANTS, f, x)]))]),
    );
    if (WRITE) write('data/fairness/weights.json', w);
    else expect(WEIGHTS).toEqual(w);
  });

  it('a field left out keeps a zero weight', () => {
    for (const x of FIXES) {
      expect(WEIGHTS['no-region'][x][5]).toBe(0);
      expect(WEIGHTS.neither[x].slice(4)).toEqual([0, 0]);
    }
  });
});

describe('the chapters’ numbers', () => {
  it('every number matches pinned.json', () => {
    const { workbench, ...rest } = PINNED;
    if (WRITE) write('data/fairness/pinned.json', { ...effects(), workbench });
    else expect(effects()).toEqual(rest);
  });

  it('ch. 1–2: right on average, but B is wrongly declined at least twice as often as A', () => {
    const m = runOf('all');
    expect(m.all.error).toBeLessThan(0.3);
    expect(m.B.falseDecline).toBeGreaterThanOrEqual(2 * m.A.falseDecline);
    expect(PINNED.ratio).toBeGreaterThanOrEqual(2);
  });

  it('ch. 4: dropping the region keeps most of the gap (the postcode); dropping both shrinks it and costs accuracy', () => {
    const all = runOf('all'),
      noRegion = runOf('no-region'),
      neither = runOf('neither');
    expect(gapOf(noRegion) / gapOf(all)).toBeGreaterThanOrEqual(0.75);
    expect(PINNED.kept).toBeGreaterThanOrEqual(0.75);
    expect(WEIGHTS['no-region'].none[4]).toBeLessThan(0);
    expect(Math.abs(gapOf(neither))).toBeLessThan(gapOf(all) / 4);
    expect(neither.all.error).toBeGreaterThan(all.all.error);
  });

  it('ch. 5: a bar per region evens out false declines; the pinned pair does', () => {
    const { bars } = PINNED.even;
    expect(evenPairs()[0].bars).toEqual(bars);
    const m = runOf('all', 'none', bars);
    expect(Math.abs(gapOf(m))).toBeLessThanOrEqual(0.01);
    expect(bars.B).toBeLessThan(bars.A);
  });

  it('ch. 6: no bar pair on the grid makes precision, false-approve and false-decline all equal within a point', () => {
    // every field set and fix, all 101 × 101 pairs; only bars that approve almost nobody (precision 1 in both) do
    for (const f of FEATURE_SETS)
      for (const x of FIXES) {
        const { rest, trivial } = equalPairs(f, x);
        expect(rest, `${f}/${x}`).toEqual([]);
        for (const p of trivial) expect(p.m.all.approved).toBeLessThan(0.05);
      }
    expect(PINNED.equal.pairs).toBe(0);
    expect(GRID).toHaveLength(101);
  });

  it('measure() counts every applicant once, and an unreachable bar approves nobody', () => {
    const m = measure(
      APPLICANTS,
      APPLICANTS.map(() => 0.5),
      { A: 1.01, B: 1.01 },
    );
    expect(m.all.n).toBe(COUNT);
    expect(m.all.approved).toBe(0);
    expect(m.A.precision).toBeNull();
  });
});

it('every fact has a source, a claim and the access date; the legal setting is named once', () => {
  for (const f of FACTS) {
    expect(f.claim.length).toBeGreaterThan(20);
    expect(f.source).toMatch(/^https:\/\//);
    expect(fact(f.id).accessed).toBe('2026-10-29');
  }
  expect(fact('ecoa').claim).toMatch(/Equal Credit Opportunity Act/);
});
