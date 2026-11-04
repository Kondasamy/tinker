// Multi-agent's engine (KTD3): a deterministic toy of a lead and its helpers over Larkspur's 30 catalogues
// (data/multi-agent/jobs.json). Every taught effect is pinned in data/multi-agent/pinned.json and re-derived here:
// a malformed reply bounces, the pinned two-helper wait is a deadlock the timeout clears, tokens grow with helpers,
// and the workbench's WINNERS recompute.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import type { Art } from '../../src/lib/iso/motion';
import { closeUpZoom } from '../../src/lib/iso/motion';
import PINNED from '../../data/multi-agent/pinned.json' with { type: 'json' };
import {
  CATALOGUES,
  JOBS,
  MALFORMED,
  findCycle,
  jobOf,
  replyOf,
  run,
  validate,
  WINNERS,
  winnersOf,
  wins,
} from '../../src/lib/multi-agent/sim';
import {
  SWITCH_BOARD,
  SWITCH_PARTS,
  partBox,
  switchScene,
  switchStill,
  type Switch,
} from '../../src/components/scenes/switchboardScene';
import { switchOf } from '../../src/content/multi-agent/kit';
import { STEPS as BENCH } from '../../src/content/multi-agent/07-workbench';

const report = jobOf('report'),
  rates = jobOf('rates');
const d = (helpers: number, more: object = {}) => ({ helpers, brief: 'detailed' as const, check: false, ...more });

describe('one agent, one desk', () => {
  it('runs out of room: the pinned catalogues fall unread and the report has gaps', () => {
    expect(CATALOGUES).toHaveLength(30);
    const r = run(report, d(0));
    expect({ read: r.read, spilled: r.spilled, tokens: r.tokens, minutes: r.minutes, correct: r.correct }).toEqual(
      PINNED.alone,
    );
  });
});

describe('a lead and helpers', () => {
  it('three helpers split the catalogues and finish in the pinned time', () => {
    const r = run(report, d(3));
    expect({ loads: r.loads.slice(1), tokens: r.tokens, minutes: r.minutes, correct: r.correct }).toEqual(PINNED.three);
  });

  it('the token bill grows with every helper hired', () => {
    const bills = [0, 1, 2, 3, 4, 5].map(k => run(report, d(k)).tokens);
    expect(bills).toEqual(PINNED.tokensByHelpers);
    for (let k = 2; k < bills.length; k++) expect(bills[k]).toBeGreaterThan(bills[k - 1]);
  });
});

describe('the hand-off', () => {
  it('a vague brief makes helper 2 repeat helper 1 and leaves a slice on the cart', () => {
    const r = run(report, d(3, { brief: 'vague' }));
    expect({ dup: r.dup, left: r.left, tokens: r.tokens, correct: r.correct }).toEqual(PINNED.vague);
    expect(run(report, d(1, { brief: 'vague' })).dup).toEqual([]);
  });
});

describe('agreed shapes', () => {
  it('a well-formed reply fits; the malformed one bounces, is resent and the report still completes', () => {
    expect(validate(replyOf(report, d(3), 1))).toEqual([]);
    expect(validate(MALFORMED)).toEqual(PINNED.malformed.problems);
    expect(validate({ rows: '10' })).toContain('rows is not a whole number');
    const r = run(report, d(3), { malformed: true });
    expect(r.replies.find(x => x.desk === PINNED.malformed.helper)?.kind).toBe('bounced');
    expect(r.minutes).toBe(PINNED.malformed.minutes);
    expect(r.correct).toBe(PINNED.malformed.correct);
    expect(r.msgs.some(m => m.stamp === 'INVALID')).toBe(true);
  });
});

describe('waiting on each other', () => {
  it('finds a circular wait, and none in a chain', () => {
    expect(
      findCycle([
        [1, 2],
        [2, 1],
      ]),
    ).toEqual([1, 2]);
    expect(
      findCycle([
        [1, 2],
        [2, 3],
      ]),
    ).toEqual([]);
    expect(
      findCycle([
        [3, 1],
        [1, 2],
        [2, 3],
      ]),
    ).toEqual([1, 2, 3]);
  });

  it('the pinned two-helper wait is a deadlock; the timeout clears it', () => {
    const stuck = run(rates, d(2));
    expect({ hold: stuck.hold, finished: stuck.finished }).toEqual({
      hold: PINNED.deadlock.hold,
      finished: PINNED.deadlock.finished,
    });
    expect(stuck.minutes).toBeNull();
    const freed = run(rates, d(2, { timeout: true }));
    expect(freed.timedOut).toBe(true);
    expect({ minutes: freed.minutes, tokens: freed.tokens, correct: freed.correct }).toEqual(PINNED.deadlock.timeout);
    // one helper, or the lead alone, never waits
    expect(run(rates, d(1)).hold).toEqual([]);
  });
});

describe('trusting a helper', () => {
  it('a confident wrong number reaches the report unchecked; the check catches it', () => {
    const wrong = run(report, d(3), { slip: true });
    expect(wrong.replies.find(x => x.desk === PINNED.slip.helper)?.kind).toBe(PINNED.slip.unchecked);
    expect(wrong.correct).toBe(false);
    const ok = run(report, d(3, { check: true }), { slip: true });
    expect(ok.replies.find(x => x.desk === PINNED.slip.helper)?.kind).toBe(PINNED.slip.checked);
    expect({ correct: ok.correct, minutes: ok.minutes, tokens: ok.tokens }).toEqual({
      correct: true,
      minutes: PINNED.slip.minutes,
      tokens: PINNED.slip.tokens,
    });
  });
});

describe('the workbench', () => {
  it('recomputes the pinned WINNERS for each job', () => {
    expect(JOBS.map(j => j.id)).toEqual(['report', 'rates', 'quote']);
    for (const j of JOBS) expect(winnersOf(j), j.id).toEqual(PINNED.winners[j.id as keyof typeof PINNED.winners]);
    expect(WINNERS).toEqual(PINNED.winners);
    for (const j of JOBS) for (const s of WINNERS[j.id]) expect(wins(j, s)).toBe(true);
  });

  it('Show me sets every job to a winner', () => {
    const start = { job: 'report', runs: {} as Record<string, never>, quiz: null };
    const shown = BENCH[0].solution!(start as never);
    expect(BENCH[0].predicate(shown)).toBe(true);
  });

  it('no unchecked setup wins, and talking or small jobs are best left to the lead alone', () => {
    for (const j of JOBS) expect(WINNERS[j.id].every(s => s.check)).toBe(true);
    expect(WINNERS.rates.every(s => s.helpers === 0)).toBe(true);
    expect(WINNERS.quote.every(s => s.helpers === 0)).toBe(true);
    expect(WINNERS.report.every(s => s.helpers >= 2 && s.brief === 'detailed')).toBe(true);
  });
});

describe('the switchboard scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: SWITCH_BOARD, scene, moving, label: '' }));
  const idle = switchOf(report, { helpers: 0, brief: 'detailed', check: false }, false);
  const wired = switchOf(report, d(3), false, {}, [1, 2, 3]);
  const three = switchOf(report, d(3), true, {}, [1, 2, 3]);
  const alone = switchOf(report, d(0), true);
  const bounce = switchOf(report, d(3), true, { malformed: true }, [1, 2, 3]);
  const hold = switchOf(rates, d(2), true, {}, [1, 2]);
  const freed = switchOf(rates, d(2, { timeout: true }), true, {}, [1, 2]);
  const moves: [string, Switch, Switch][] = [
    ['cords out', idle, wired],
    ['a run', wired, three],
    ['alone', idle, alone],
    ['a bounce', wired, bounce],
    ['a hold', switchOf(rates, d(2), false, {}, [1, 2]), hold],
    ['a timeout', hold, freed],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      const end = switchScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(switchStill(b)));
    }
  });

  it('draws every frame of every move with no NaN, the pieces in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
        const f = switchScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('draws what the run did: cords, piles, the spill, the bounced plug, the blinking lamps', () => {
    expect(draw(switchStill(wired)).match(/data-cord=/g)).toHaveLength(3);
    expect(draw(switchStill(alone))).toContain('data-spilled="6"');
    expect(draw(switchStill(bounce))).toContain('data-plug="bounced"');
    expect(draw(switchStill(hold)).match(/data-lamp="hold"/g)).toHaveLength(2);
    expect(draw(switchStill(freed))).not.toContain('data-lamp="hold"');
    expect(draw(switchStill(freed))).toContain('data-timer="rang"');
  });

  it('closes in on every part within the 2.2× cap', () => {
    for (const p of SWITCH_PARTS) {
      const z = closeUpZoom(SWITCH_BOARD, partBox(p));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
  });
});
