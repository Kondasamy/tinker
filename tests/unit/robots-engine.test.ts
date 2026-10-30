// Robots that act's engine (U8, KTD5, KTD7): the grid world's rules, the blind rule, the nearest-neighbour policy over
// Mira's pinned demos, the forced slip and its corrections, practice in the simulator, and the workbench. Every taught
// effect is re-derived here against pinned.json over the 20 seeded held-out bins, never one
// (WRITE_PINNED=1 rewrites the pins and the demos).
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/robots/pinned.json' with { type: 'json' };
import demosFile from '../../data/robots/demos.json' with { type: 'json' };
import {
  BINS,
  CAP,
  expert,
  FRESH,
  H,
  HELD_OUT,
  layoutOf,
  observe,
  REAL,
  rollout,
  startOf,
  step,
  TRAIN,
  W,
  type Layout,
} from '../../src/lib/robots/world';
import { expertDemo, gap, nearest, replay } from '../../src/lib/robots/policy';
import { NEW_BIN, RULE, RULE_BIN, runRule } from '../../src/lib/robots/rules';
import { correctionsOf, detectorOf, practiceBins, practicePairs } from '../../src/lib/robots/dagger';
import { DEMOS, demoPairs, FRESH_BIN, SNOWBALL } from '../../src/lib/robots/story';
import {
  DEMOS as BENCH_DEMOS,
  median,
  measure,
  PRACTICE_OF,
  PRACTICES,
  RESULTS,
  SETUPS,
  scoreOn,
  setupOf,
  solve,
  START,
  WINNERS,
  wins,
} from '../../src/lib/robots/workbench';

const clean = (n: number) => {
  const runs = HELD_OUT.map(l => replay(demoPairs(n), l));
  return {
    demos: n,
    solved: runs.filter(r => r.end === 'done').length,
    median: median(runs.map(r => (r.end === 'done' ? r.steps : CAP))),
  };
};
const snowball = () => {
  const l = SNOWBALL.layout,
    pairs = demoPairs(SNOWBALL.demos),
    forced = [SNOWBALL.slipAt];
  const fixes = correctionsOf(pairs, [l], { forced });
  const brief = (r: { end: string; steps: number }) => ({ end: r.end, steps: r.steps });
  return {
    clean: brief(replay(pairs, l)),
    slipped: brief(replay(pairs, l, { forced })),
    corrected: brief(replay([...pairs, ...fixes], l, { forced })),
    corrections: fixes.length,
  };
};
const practice = () =>
  PRACTICES.map(p => {
    const pairs = demoPairs(BINS.practiceDemos);
    if (p === 'none') return { practice: p, ...scoreOn(pairs) };
    const k = PRACTICE_OF[p];
    return { practice: p, ...scoreOn([...pairs, ...practicePairs(k)], detectorOf(k)) };
  }).map(({ labels: _, ...r }) => r);
function pins() {
  const results = SETUPS.map(measure);
  return {
    rule: { bin: runRule(RULE_BIN).end, newBin: runRule(NEW_BIN).end },
    clean: BENCH_DEMOS.map(clean),
    snowball: snowball(),
    practice: practice(),
    workbench: { results, winners: solve(results) },
  };
}

describe('the pins', () => {
  it('Mira’s demos are the careful driver’s moves on each training bin, and each lands the part', () => {
    const now = TRAIN.map(expertDemo);
    if (process.env.WRITE_PINNED) {
      writeFileSync(
        'data/robots/demos.json',
        `${JSON.stringify({ ...demosFile, demos: now.map(d => d.join(' ')) }, null, 2)}\n`,
      );
      writeFileSync('data/robots/pinned.json', `${JSON.stringify(pins(), null, 2)}\n`);
      return;
    }
    expect(DEMOS).toEqual(now);
    for (const [i, d] of DEMOS.entries()) expect(rollout(TRAIN[i], s => expert(TRAIN[i], s)).actions).toEqual(d);
  });
  it('every chapter effect re-derives from the engine', () => {
    const now = pins();
    expect(now.rule).toEqual(pinned.rule);
    expect(now.clean).toEqual(pinned.clean);
    expect(now.snowball).toEqual(pinned.snowball);
    expect(now.practice).toEqual(pinned.practice);
    expect(now.workbench).toEqual(pinned.workbench);
  });
});

describe('the grid world', () => {
  it('draws the same bin from a seed, keeps crates off the start, the part and the tray’s door, and the expert clears it', () => {
    expect(layoutOf(7)).toEqual(layoutOf(7));
    for (const l of [...TRAIN, ...HELD_OUT, ...practiceBins(PRACTICE_OF.both)]) {
      expect(l.crates.some(c => c[0] === 0 && c[1] === 0)).toBe(false);
      expect(l.crates.some(c => c[0] === l.part[0] && c[1] === l.part[1])).toBe(false);
      expect(l.part[0]).toBeGreaterThanOrEqual(2);
      expect(l.part[0]).toBeLessThan(W);
      expect(l.part[1]).toBeLessThan(H);
      expect(rollout(l, s => expert(l, s)).end).toBe('done');
    }
    // the real light is drawn apart from the layout
    expect({ ...REAL[0], light: 1 }).toEqual(HELD_OUT[0]);
    for (const l of REAL) expect(l.light).toBeGreaterThanOrEqual(BINS.real.light[0]);
  });
  it('bumps a crate or wall in place, ends off the grid past the edge, slips one cell further, and drops in the tray', () => {
    const l: Layout = { seed: 0, tray: 0, part: [2, 0], crates: [[1, 1]], light: 1 };
    const s = startOf(l);
    expect(step(l, s, 'down').claw).toEqual([0, 1]);
    expect(step(l, step(l, s, 'down'), 'right').claw).toEqual([0, 1]);
    expect(step(l, s, 'up').end).toBe('off-grid');
    expect(step(l, s, 'right', true).claw).toEqual([2, 0]);
    const held = step(l, step(l, step(l, s, 'right', true), 'grip'), 'right');
    expect(held.holding).toBe(true);
    expect(held.part).toEqual([3, 0]);
    expect(step(l, held, 'drop')).toMatchObject({ holding: false, end: undefined, part: [3, 0] });
    let t = held;
    for (let i = 0; i < 5; i++) t = step(l, t, 'right');
    expect(t.claw).toEqual([W, 0]);
    expect(step(l, t, 'drop').end).toBe('done');
  });
  it('the camera reads the target’s direction and the blocked neighbours, and loses the part in light it never saw', () => {
    const l: Layout = { seed: 0, tray: 3, part: [4, 2], crates: [[1, 0]], light: 0.5 };
    const o = observe(l, startOf(l), [0, 2]);
    expect(o).toEqual({ holding: false, dx: 1, dy: 1, seen: true, blocked: [true, false, true, true] });
    expect(observe(l, startOf(l))).toMatchObject({ seen: false, dx: 0, dy: 0 });
    expect(detectorOf(PRACTICE_OF.light)[0]).toBeLessThanOrEqual(BINS.real.light[0]);
    expect(detectorOf(PRACTICE_OF.plain)).toEqual(BINS.detector);
  });
});

describe('the lessons hold by construction', () => {
  it('chapter 3: the rule lands the part on its own bin and fails on the new one', () => {
    expect(runRule(RULE_BIN).end).toBe('done');
    expect(runRule(NEW_BIN).end).not.toBe('done');
    expect(RULE.length).toBeGreaterThan(0);
  });
  it('chapter 4: the policy is a lookup of the closest frame, and more demos solve more fresh bins', () => {
    const pairs = demoPairs(2);
    for (const p of pairs) expect(nearest(pairs, p.o)!.o).toEqual(p.o);
    expect(gap(pairs[0].o, pairs[0].o)).toBe(0);
    const solved = pinned.clean.map(c => c.solved);
    expect(solved[0]).toBeLessThan(solved.at(-1)!);
    for (let i = 1; i < solved.length; i++) expect(solved[i]).toBeGreaterThanOrEqual(solved[i - 1]);
    expect(HELD_OUT).toHaveLength(20);
    expect(FRESH_BIN).toEqual(FRESH);
  });
  it('chapter 5: one forced slip stalls the policy; the expert’s corrections on that run fix it', () => {
    const s = pinned.snowball;
    expect(s.clean.end).toBe('done');
    expect(s.slipped.end).not.toBe('done');
    expect(s.corrected.end).toBe('done');
    expect(s.corrections).toBeGreaterThan(0);
  });
  it('chapter 6: randomised practice beats plain practice under the real bay’s slips and light', () => {
    const by = Object.fromEntries(pinned.practice.map(p => [p.practice, p.solved]));
    expect(by.light).toBeGreaterThan(by.plain);
    expect(by.both).toBeGreaterThan(by.plain);
    expect(by.both).toBeGreaterThanOrEqual(by.light);
  });
  it('chapter 7: WINNERS solve the most with the fewest labels, the start does not win, and odd saves fall back', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    const most = Math.max(...RESULTS.map(r => r.solved));
    for (const r of RESULTS) if (wins(r)) expect(r.solved).toBe(most);
    expect(wins(START)).toBe(false);
    expect(setupOf({ demos: 3, practice: 'x' as never })).toEqual(START);
  });
});
