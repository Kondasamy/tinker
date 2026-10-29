// Dependencies chapter 7's workbench (KTD11): an update policy against the registry's month. The reader sets the
// app's range style (caret, tilde or exact), the lockfile (on or off), how often a tested update refreshes it (never,
// monthly, weekly, daily) and install scripts (on or off): 3 × 2 × 4 × 2 = 48 policies. Each runs a build every day
// of the month and counts broken builds, days hijacked code shipped, hijacked install scripts run (scored apart),
// and days late on the security fix. The owner's rule (data/dependencies/workbench.json): none of the first three,
// then the fewest days late. WINNERS is pinned in data/dependencies/pinned.json and recomputed by
// tests/unit/dependencies-workbench.test.ts, never solved at import (KTD10).
import data from '../../../data/dependencies/workbench.json' with { type: 'json' };
import pinned from '../../../data/dependencies/pinned.json' with { type: 'json' };
import { lockOf, update } from './lock';
import { APP, MONTH, auditOf, install, type Tree } from './resolve';
import { compare } from './semver';
import { SECURITY } from './story';

export const RULE = data.rule;
export const REASONS = data.reasons;
export const RANGES = ['caret', 'tilde', 'exact'] as const;
export type RangeStyle = (typeof RANGES)[number];
export const CADENCES = Object.keys(data.cadences) as Cadence[];
export type Cadence = 'never' | 'monthly' | 'weekly' | 'daily';
export const EVERY = data.cadences as Record<Cadence, number>;

export interface Policy {
  range: RangeStyle;
  lock: boolean;
  cadence: Cadence;
  scripts: boolean;
}

/** The app's five ranges written in one style, from the versions app.json's ranges start at. */
export function depsFor(style: RangeStyle): Record<string, string> {
  const mark = { caret: '^', tilde: '~', exact: '' }[style];
  return Object.fromEntries(Object.entries(APP.deps).map(([k, r]) => [k, `${mark}${r.replace(/^[\^~]/, '')}`]));
}

export interface Day {
  day: number;
  tree: Tree;
  /** the lockfile was updated this morning: taken, or rejected by the tests */
  update?: 'taken' | 'rejected';
  broken: boolean;
  hijacked: boolean;
  scriptRan: boolean;
  scriptBlocked: boolean;
  fixed: boolean;
}
export interface Result {
  days: Day[];
  broken: number;
  shipped: number;
  scriptRuns: number;
  /** days from the security fix's release to the first build that has it (to the month's end if never) */
  late: number;
  meets: boolean;
}

const hasFix = (t: Tree) => t.nodes.some(n => n.name === SECURITY.name && compare(n.version, SECURITY.version) >= 0);

const cache = new Map<string, Result>();
export const policyKey = (p: Policy) =>
  `${p.range}|${p.lock ? 'lock' : 'nolock'}|${p.cadence}|${p.scripts ? 'scripts' : 'noscripts'}`;
/** A month of daily builds under a policy. Without a lockfile each build resolves afresh, so the cadence does
 * nothing. */
export function runPolicy(p: Policy): Result {
  const key = policyKey(p),
    hit = cache.get(key);
  if (hit) return hit;
  const deps = depsFor(p.range),
    every = EVERY[p.cadence];
  let lock = lockOf(install({ day: 0, deps }));
  const days: Day[] = [];
  for (let day = 1; day <= MONTH; day++) {
    let upd: Day['update'];
    if (p.lock && every > 0 && day % every === 0) {
      const u = update(lock, day, deps);
      lock = u.lock;
      upd = u.rejected ? 'rejected' : 'taken';
    }
    const tree = p.lock ? install({ day, deps, lock }) : install({ day, deps });
    const a = auditOf(tree, p.scripts);
    days.push({
      day,
      tree,
      ...(upd ? { update: upd } : {}),
      broken: a.breaks.length > 0,
      hijacked: a.payload.length > 0,
      scriptRan: a.scriptRan.length > 0,
      scriptBlocked: a.scriptBlocked.length > 0,
      fixed: hasFix(tree),
    });
  }
  const first = days.find(d => d.fixed)?.day ?? MONTH + 1;
  const r: Result = {
    days,
    broken: days.filter(d => d.broken).length,
    shipped: days.filter(d => d.hijacked).length,
    scriptRuns: days.filter(d => d.scriptRan).length,
    late: Math.max(0, first - SECURITY.day),
    meets: false,
  };
  r.meets = r.broken === 0 && r.shipped === 0 && r.scriptRuns === 0;
  cache.set(key, r);
  return r;
}

/** Every policy the controls can make. */
export const POLICIES: Policy[] = RANGES.flatMap(range =>
  [false, true].flatMap(lock =>
    CADENCES.flatMap(cadence => [true, false].map(scripts => ({ range, lock, cadence, scripts }))),
  ),
);
/** Solves the bench from scratch: every policy that keeps the rule with the fewest days late. */
export function solve() {
  const ok = POLICIES.filter(p => runPolicy(p).meets);
  const best = Math.min(...ok.map(p => runPolicy(p).late));
  return { best, winners: ok.filter(p => runPolicy(p).late === best).map(policyKey) };
}

/** the pinned solution (KTD10): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
const WIN = new Set(pinned.workbench.winners);
export const WINNERS: Policy[] = POLICIES.filter(p => WIN.has(policyKey(p)));
export const wins = (p: Policy) => WIN.has(policyKey(p));

/** where the bench starts: the team's carets, no lockfile, no updates, scripts on */
export const START: Policy = { range: 'caret', lock: false, cadence: 'never', scripts: true };
/** The policy in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Policy>): Policy => ({
  range: RANGES.includes(s.range as RangeStyle) ? (s.range as RangeStyle) : START.range,
  lock: typeof s.lock === 'boolean' ? s.lock : START.lock,
  cadence: CADENCES.includes(s.cadence as Cadence) ? (s.cadence as Cadence) : START.cadence,
  scripts: typeof s.scripts === 'boolean' ? s.scripts : START.scripts,
});
