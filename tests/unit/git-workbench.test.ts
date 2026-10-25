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
import * as ch1 from '../../src/content/git/01-named-by-contents';
import * as ch2 from '../../src/content/git/02-a-chain-of-snapshots';
import * as ch3 from '../../src/content/git/03-a-branch-is-a-label';
import * as ch4 from '../../src/content/git/04-three-way-merge';
import * as ch5 from '../../src/content/git/05-both-changed-it';
import * as ch6 from '../../src/content/git/06-rewriting-history';
import * as ch7 from '../../src/content/git/07-bring-them-in';

describe('the chapters’ reveals match the engine', () => {
  it('chapter 1: one new price changes the whole name', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toBe('A whole new name');
    expect(ch1.changedChars(ch1.SAVED, ch1.EDITED)).toBeGreaterThan(30);
  });
  it('chapter 2: rewording the first message renames every crate', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^Every crate/);
  });
  it('chapter 3: making a branch adds no crate', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^None/);
  });
  it('chapter 4: different lines merge on their own', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^Yes/);
  });
  it('chapter 5: the same line both ways stops for a person, and the sale’s side is the right pick', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^Stops/);
    expect(ch5.SIDES.find(([s]) => s === ch5.RIGHT)![1]).toContain(ch5.HUNK.theirs[0].trim());
  });
  it('chapter 6: a rebase renames every replayed commit', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^No/);
  });
  it('chapter 7: Show me lands on a winner', () => {
    const bench = ch7.STEPS.find(s => s.id === 'bench')!;
    const shown = bench.solution!({ ...START, view: 'scene', quiz: null });
    expect(wins(benchPlan(shown))).toBe(true);
    expect(bench.predicate(shown)).toBe(true);
  });
});

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
