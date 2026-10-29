// Chapter 7's workbench (KTD10, KTD11): a data policy is remove duplicates, scrub PINs and an output filter, each on or
// off. The first two pick one of the four runs trained offline (runs.json); the filter is live, the grid's third
// axis. A run that recites a PIN leaks it past the filter too: asked one token at a time, each reply holds one digit
// (the pinned bypass, chapter 6), and those tokens are exactly its greedy reply. A policy wins when it leaks nothing
// and no other leak-free policy is at least as good on worst exposure and held-out top-5 and better on one. WINNERS
// is pinned and recomputed from runs.json by a test, never solved at import.
import { RUNS, type RunId } from './story';

export interface Policy {
  dedup: boolean;
  scrub: boolean;
  filter: boolean;
}
const B = [false, true];
export const POLICIES: Policy[] = B.flatMap(dedup => B.flatMap(scrub => B.map(filter => ({ dedup, scrub, filter }))));
export const runIdOf = (p: Policy): RunId =>
  p.dedup && p.scrub ? 'dedup+scrubbed' : p.dedup ? 'dedup' : p.scrub ? 'scrubbed' : 'canary';

/** What a policy gives: PINs leaked and how, the worst exposure (1 decimal) and held-out top-5 (tenths of a percent). */
export function scoreOf(p: Policy) {
  const run = RUNS.runs[runIdOf(p)];
  const leaked = run.canaries.filter(c => c.extracted).map(c => c.repeats);
  return {
    run: runIdOf(p),
    leaked,
    how: leaked.length ? (p.filter ? 'one digit at a time, past the filter' : 'recited') : null,
    exposure: Math.round(Math.max(...run.canaries.map(c => c.exposure)) * 10) / 10,
    top5: Math.round(run.heldout.top5 * 1000) / 10,
  };
}
const same = (a: Policy, b: Policy) => a.dedup === b.dedup && a.scrub === b.scrub && a.filter === b.filter;
/** A leak-free policy at least as good on both measures and better on one; or, for a leaky one, any leak-free one. */
export function beatenBy(p: Policy): Policy | undefined {
  const s = scoreOf(p);
  return POLICIES.find(o => {
    const t = scoreOf(o);
    if (same(o, p) || t.leaked.length) return false;
    if (s.leaked.length) return true;
    return t.exposure <= s.exposure && t.top5 >= s.top5 && (t.exposure < s.exposure || t.top5 > s.top5);
  });
}
export const solved = (p: Policy) => !scoreOf(p).leaked.length && !beatenBy(p);

/** Every policy no other beats (pinned; tests/unit/memorisation-workbench.test.ts recomputes it). */
export const WINNERS: Policy[] = [
  { dedup: false, scrub: true, filter: false },
  { dedup: false, scrub: true, filter: true },
  { dedup: true, scrub: true, filter: false },
  { dedup: true, scrub: true, filter: true },
];
/** The bench opens on Larkspur's first plan: train on the tickets as they are. */
export const START: Policy = { dedup: false, scrub: false, filter: false };
export const isPolicy = (p: Partial<Policy> | undefined): p is Policy =>
  !!p && typeof p.dedup === 'boolean' && typeof p.scrub === 'boolean' && typeof p.filter === 'boolean';
