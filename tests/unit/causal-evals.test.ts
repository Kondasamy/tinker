// Why did it fail?'s engine (KTD3): every taught effect is pinned in data/causal-evals/pinned.json and re-derived here,
// so the copy can't drift from the engine. The distinct focus (U9): the pinned causing step flips the outcome and the
// last step doesn't; 20 seeded replays give the pinned flip rate; the replay budget is enforced.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import { closeUpZoom, type Art } from '../../src/lib/iso/motion';
import PINNED from '../../data/causal-evals/pinned.json' with { type: 'json' };
import {
  BLADE,
  BUDGET,
  causeOf,
  fixers,
  LABEL,
  REPEATS,
  replay,
  RUNS,
  SEEDS,
  spend,
  tally,
  type Change,
} from '../../src/lib/causal-evals/runs';
import {
  MARBLE_BOARD,
  MARBLE_PARTS,
  marbleScene,
  marbleStill,
  partBox,
  type Marble,
} from '../../src/components/scenes/marbleScene';
import { marbleOf, statusOf } from '../../src/content/causal-evals/kit';
import { AFTER } from '../../src/content/causal-evals/02-blame-the-last-step';
import { CAUSE } from '../../src/content/causal-evals/03-replay-one-change';
import { WITHOUT } from '../../src/content/causal-evals/04-take-a-piece-out';
import { COPES } from '../../src/content/causal-evals/05-break-it-on-purpose';
import { LUCKY, TALLY } from '../../src/content/causal-evals/06-many-runs';
import { WINNERS } from '../../src/content/causal-evals/07-workbench';

const swap = (step: number): Change => ({ kind: 'swap', step });

describe('the hand-written runs', () => {
  it('are labelled hand-written, never recorded, and each has the eight pieces the scene draws', () => {
    expect(LABEL).toBe('hand-written example run');
    expect(RUNS).toHaveLength(4);
    for (const r of RUNS) expect(r.steps, r.id).toHaveLength(8);
  });

  it('replay themselves: with no change, every step writes what the run wrote, and every run fails', () => {
    for (const r of RUNS) {
      const x = replay(r);
      expect(x.slots, r.id).toEqual(r.steps.map(s => s.as));
      expect(x.outcome, r.id).toBe('wrong');
    }
  });
});

describe('the cause', () => {
  it('the pinned causing step flips the outcome in every replay, and the last step does not', () => {
    expect(RUNS.map(causeOf)).toEqual(PINNED.causes);
    for (const [i, r] of RUNS.entries()) {
      const c = PINNED.causes[i];
      expect(tally(r, swap(c)).right, r.id).toBe(REPEATS);
      expect(replay(r, swap(r.steps.length - 1)).outcome, r.id).not.toBe('right');
      expect(c, r.id).toBeLessThan(r.steps.length - 1);
      // exactly one swap fixes each run, so the workbench has one winning answer per run
      expect(fixers(r), r.id).toEqual([c]);
    }
    expect(AFTER).toBe(PINNED.lastSwap);
    expect(CAUSE).toBe(PINNED.causes[0]);
  });

  it('the workbench accepts exactly the recomputed causes, and none is a last step', () => {
    expect(WINNERS).toEqual(RUNS.map(causeOf));
    expect(WINNERS).toEqual(PINNED.causes);
  });
});

describe('taking pieces out and breaking them', () => {
  it('without the order look-up the blade is still wrong; without the search nothing is sent', () => {
    expect(WITHOUT).toEqual(PINNED.without);
  });
  it('a timeout with no retry stops the fixed run; a retry carries it to the right tray', () => {
    expect(COPES).toEqual(PINNED.copes);
    expect(replay(BLADE, [swap(CAUSE), { kind: 'timeout', step: 4 }]).halt).toBe(4);
  });
});

describe('many runs', () => {
  it('20 seeded replays give the pinned flip rates: the note swap no better than no change, the search swap every time', () => {
    expect(SEEDS).toHaveLength(REPEATS);
    expect({ none: TALLY.none.right, note: TALLY.note.right, search: TALLY.search.right }).toEqual(PINNED.right);
    expect(TALLY.note.right).toBe(TALLY.none.right);
    expect(LUCKY).toBe(PINNED.lucky);
    expect(replay(BLADE, swap(6), LUCKY).outcome).toBe('right');
    expect(replay(BLADE, swap(6)).outcome).toBe('wrong');
  });
  it('the same seed always rolls the same replay', () => {
    for (const sd of SEEDS) expect(replay(BLADE, null, sd)).toEqual(replay(BLADE, null, sd));
  });
});

describe('the replay budget', () => {
  it('is enforced: the last replay is allowed, the next refused with a reason', () => {
    expect(spend(BUDGET - 1)).toEqual({ ok: true, used: BUDGET });
    const r = spend(BUDGET);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.why).toMatch(/replays are spent/);
    expect(BUDGET).toBe(PINNED.budget);
  });
});

describe('the marble run scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: MARBLE_BOARD, scene, moving, label: '' }));
  const start = marbleOf(BLADE, null, 0);
  const wrong = marbleOf(BLADE, null, 1);
  const fixed = marbleOf(BLADE, swap(CAUSE), 2, { lit: CAUSE });
  const gone = marbleOf(BLADE, { kind: 'remove', step: 2 }, 2);
  const stuck = marbleOf(BLADE, [swap(CAUSE), { kind: 'timeout', step: 4 }], 3);
  const retry = marbleOf(BLADE, [swap(CAUSE), { kind: 'timeout', step: 4, retry: true }], 4);
  const many = marbleOf(BLADE, swap(6), 5, { seeds: SEEDS });
  const moves: [string, Marble, Marble][] = [
    ['a first roll', start, wrong],
    ['a swap and roll', wrong, fixed],
    ['a piece out', fixed, gone],
    ['a timeout', fixed, stuck],
    ['a retry', stuck, retry],
    ['twenty marbles', wrong, many],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      const end = marbleScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(marbleStill(b)));
    }
  });

  it('draws every frame of every move with no NaN, the marbles in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
        const f = marbleScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('shows each change at rest: a blush swap, blue stripes, a gap, a red gate, and the trays’ marbles', () => {
    expect(draw(marbleStill(fixed))).toContain(`data-piece="${CAUSE}" data-mode="swap"`);
    expect(draw(marbleStill(fixed)).match(/data-touched="1"/g)?.length).toBeGreaterThan(1);
    expect(draw(marbleStill(fixed))).toContain('data-tray="right" data-n="1"');
    expect(draw(marbleStill(gone))).toContain('data-piece="2" data-mode="gone"');
    expect(draw(marbleStill(gone))).toContain('data-tray="none" data-n="1"');
    expect(draw(marbleStill(stuck))).toContain('data-piece="4" data-mode="fault"');
    expect(draw(marbleStill(retry))).toContain('data-piece="4" data-mode="retry"');
    expect(draw(marbleStill(many))).toContain(`data-tray="right" data-n="${TALLY.note.right}"`);
  });

  it('says the end state in words', () => {
    expect(statusOf(start, BLADE)).toMatch(/waits/);
    expect(statusOf(stuck, BLADE)).toMatch(/stopped at piece 5/);
    expect(statusOf(many, BLADE)).toMatch(new RegExp(`^${TALLY.note.right} of ${REPEATS}`));
  });

  it('closes in on every part within the 2.2× cap', () => {
    for (const p of MARBLE_PARTS) {
      const z = closeUpZoom(MARBLE_BOARD, partBox(p));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
  });
});
