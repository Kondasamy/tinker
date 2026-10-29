// Larkspur's trade-account check for the Fairness module (KTD6): builders apply for credit terms, and the check
// approves those whose chance of repaying (fit.ts) clears a bar. The applicants (data/fairness/applicants.json) are
// hand-made by population.ts's seeded generator, from two made-up regions: labelled wherever they show (R6, R13).
// effects() is every number a chapter teaches, pinned in data/fairness/pinned.json and recomputed by
// tests/unit/fairness-engine (KTD9).
import data from '../../../data/fairness/applicants.json' with { type: 'json' };
import { scoreOf, type Features, type Fix } from './fit';
import { GRID, allEqual, gapOf, measure, trivial, type Bars, type Measured } from './metrics';
import type { Applicant, Region } from './population';

export const APPLICANTS = data.applicants as Applicant[];
export const APPLICANTS_NOTE = data.note;
/** Each region's made-up name. */
export const REGION_NAMES = data.regions as Record<Region, string>;
/** The bar the check starts with, the same for both regions. */
export const SHARED = 0.5;
/** The chapter ranges' steps: 0.20 to 0.80 in hundredths. */
export const BARS = GRID.filter(t => t >= 0.2 - 1e-9 && t <= 0.8 + 1e-9);

/** Every applicant's score under a field set and sample fix. */
export const scoresOf = (f: Features = 'all', fix: Fix = 'none', rows = APPLICANTS) =>
  rows.map(a => scoreOf(a, f, fix));
/** The check's results for a field set, sample fix and bar per region. */
export const runOf = (f: Features = 'all', fix: Fix = 'none', bars: Bars = { A: SHARED, B: SHARED }): Measured =>
  measure(APPLICANTS, scoresOf(f, fix), bars);

/** Every bar pair on the grid that makes precision, false-approve and false-decline all equal within a point, split
 * into the trivial ones (no wrong approvals in either group) and the rest. */
export function equalPairs(f: Features = 'all', fix: Fix = 'none') {
  const s = scoresOf(f, fix);
  const found = GRID.flatMap(A =>
    GRID.flatMap(B => {
      const m = measure(APPLICANTS, s, { A, B });
      return allEqual(m) ? [{ bars: { A, B }, m }] : [];
    }),
  );
  return { trivial: found.filter(p => trivial(p.m)), rest: found.filter(p => !trivial(p.m)) };
}

/** With A's bar left at SHARED, B's bars (on BARS) that bring the false-decline rates within a point; least error first. */
export function evenPairs(f: Features = 'all', fix: Fix = 'none') {
  const s = scoresOf(f, fix);
  return BARS.map(B => ({ bars: { A: SHARED, B }, m: measure(APPLICANTS, s, { A: SHARED, B }) }))
    .filter(p => Math.abs(gapOf(p.m)) <= 0.01)
    .sort((x, y) => x.m.all.error - y.m.all.error || x.bars.B - y.bars.B);
}

const r4 = (x: number | null) => (x === null ? null : Math.round(x * 1e4) / 1e4);
const brief = (m: Measured) =>
  Object.fromEntries(
    (['A', 'B', 'all'] as const).map(k => [
      k,
      {
        n: m[k].n,
        base: r4(m[k].base),
        approved: r4(m[k].approved),
        error: r4(m[k].error),
        falseDecline: r4(m[k].falseDecline),
        falseApprove: r4(m[k].falseApprove),
        precision: r4(m[k].precision),
      },
    ]),
  );

/** Every number the chapters teach, rounded to 4 places (pinned.json, KTD9). */
export function effects() {
  const all = runOf('all'),
    noRegion = runOf('no-region'),
    neither = runOf('neither');
  const rows = (r: Region) => APPLICANTS.filter(a => a.region === r);
  const even = evenPairs()[0],
    equal = equalPairs();
  return {
    shared: SHARED,
    river: Object.fromEntries(
      (['A', 'B'] as const).map(r => [r, rows(r).filter(a => a.postcode.startsWith('RV')).length]),
    ),
    all: brief(all),
    noRegion: brief(noRegion),
    neither: brief(neither),
    /** how many times B's false-decline rate is A's, with every field */
    ratio: r4(all.B.falseDecline / all.A.falseDecline),
    /** the share of the gap left once the region field is dropped (the postcode keeps it) */
    kept: r4(gapOf(noRegion) / gapOf(all)),
    /** chapter 5: the bar pair that evens out false declines with the least error */
    even: { bars: even.bars, m: brief(even.m) },
    /** chapter 6: bar pairs that make all three kinds equal: none, but for bars that approve almost nobody */
    equal: {
      pairs: equal.rest.length,
      trivialPairs: equal.trivial.length,
      trivialMaxApproved: r4(Math.max(0, ...equal.trivial.map(p => p.m.all.approved))),
    },
  };
}
