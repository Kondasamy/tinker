// Git chapter 7's workbench (KTD12): the pinned WINNERS are every best plan over the whole domain, none rewrites a
// shared commit, and the lessons the bench rests on hold in the runs.
import { describe, expect, it } from 'vitest';
import {
  BEST,
  PLANS,
  SHARED,
  START,
  WINNERS,
  benchPlan,
  planKey,
  runPlan,
  solve,
  wins,
} from '../../src/lib/git/workbench';

describe('chapter 7’s workbench', () => {
  it('has 48 plans: merge or rebase for each of three branches, in any order', () => {
    expect(PLANS).toHaveLength(48);
    expect(new Set(PLANS.map(planKey)).size).toBe(48);
  });

  it('WINNERS equals the pin: every plan tied for fewest conflicts, then shortest history', () => {
    expect(solve().map(planKey)).toEqual(WINNERS.map(planKey));
    for (const p of WINNERS) expect(wins(p)).toBe(true);
    expect(BEST.conflicts).toBe(0);
  });

  it('no winner rewrites a branch others have', () => {
    for (const p of WINNERS) {
      const r = runPlan(p);
      expect(r.keepsRule).toBe(true);
      for (const row of r.rows) if (SHARED.includes(row.branch)) expect(row.kind).not.toBe('replayed');
    }
  });

  it('rebasing the shared sale after another branch rewrites it, and breaks the rule', () => {
    const r = runPlan({ order: ['hinge', 'sale', 'shelf'], ways: { sale: 'rebase', shelf: 'merge', hinge: 'merge' } });
    expect(r.keepsRule).toBe(false);
  });

  it('rebasing shelf after the sale meets a conflict a merge never sees', () => {
    const run = (way: 'merge' | 'rebase') =>
      runPlan({ order: ['sale', 'shelf', 'hinge'], ways: { sale: 'merge', shelf: way, hinge: 'merge' } }).rows[1];
    expect(run('rebase').conflicts).toBe(1);
    expect(run('merge').conflicts).toBe(0);
  });

  it('a rebase leaves a shorter history than a merge commit', () => {
    const base = { order: START.order, ways: { ...START.ways } };
    const merged = runPlan(base).length,
      rebased = runPlan({ ...base, ways: { ...base.ways, hinge: 'rebase' } }).length;
    expect(rebased).toBe(merged - 1);
    expect(wins(START)).toBe(false);
  });

  it('reads a saved state back into a plan, falling back to the start', () => {
    expect(planKey(benchPlan({}))).toBe(planKey(START));
    expect(benchPlan({ order: ['x'] as never, ways: { sale: 'squash' } as never }).ways.sale).toBe('merge');
    expect(planKey(benchPlan(WINNERS[0]))).toBe(planKey(WINNERS[0]));
  });
});
