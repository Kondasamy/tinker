// Undo for agents' engine (KTD3): every taught effect is pinned in data/agent-undo/pinned.json and re-derived here, so
// the copy can't drift from the engine. The distinct focus (U8): a failure at step 4 runs the opposites 3→1 in reverse
// and the email gets a follow-up; a retry with a key refunds once; the email-last order wins the pinned injections.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import { closeUpZoom, type Art } from '../../src/lib/iso/motion';
import PINNED from '../../data/agent-undo/pinned.json' with { type: 'json' };
import {
  ALL_UNDO,
  codeOf,
  COURIER_FAILS,
  INJECTIONS,
  LABEL,
  OPENING,
  ORDER,
  ORDERS,
  policy,
  policyOf,
  REFUND_OPPOSITES,
  run,
  score,
  solve,
} from '../../src/lib/agent-undo/sim';
import {
  FUNI_BOARD,
  FUNI_PARTS,
  funiMoves,
  funiScene,
  funiStill,
  partBox,
  routeOf,
  type Funi,
} from '../../src/components/scenes/funicularScene';
import { WINNERS } from '../../src/content/agent-undo/07-workbench';

const EMAIL_LAST = ['stock', 'refund', 'courier', 'email'] as const;

describe('the return', () => {
  it('four steps in R6f’s order; only the email has no opposite', () => {
    expect(ORDER).toEqual(['stock', 'refund', 'email', 'courier']);
    expect(LABEL).toBe('hand-written example run');
    expect(INJECTIONS).toHaveLength(20);
    expect(COURIER_FAILS).toMatchObject({ at: 'courier', kind: 'fail' });
    expect(REFUND_OPPOSITES.filter(o => o.ok).map(o => o.id)).toEqual(['charge-back']);
  });

  it('with no opposites, a courier failure leaves three steps standing', () => {
    const o = run(OPENING, COURIER_FAILS);
    expect(o.failed).toBe('courier');
    expect(o.left).toEqual(['email', 'refund', 'stock']);
    expect(o.clean).toBe(false);
    expect(o.harm).toBe(PINNED.halfway.harm);
  });

  it('a failure at step 4 runs the opposites 3→1 in reverse, and the email gets a second letter', () => {
    const o = run(policy({ undo: ALL_UNDO }), COURIER_FAILS);
    expect(o.events.filter(e => e.mark === 'undone' || e.mark === 'letter').map(e => e.at)).toEqual([
      'email',
      'refund',
      'stock',
    ]);
    expect(o.marks).toEqual({ stock: 'undone', refund: 'undone', email: 'letter', courier: 'failed' });
    expect(o.letters).toBe(2);
    expect(o.clean).toBe(true);
    expect(o.harm).toBe(PINNED.letter.harm);
    expect(o.events.at(-1)?.at).toBe('valley');
  });

  it('with the email last, the courier failure never reaches the post box', () => {
    const o = run(policy({ order: [...EMAIL_LAST], undo: ALL_UNDO }), COURIER_FAILS);
    expect(o.letters).toBe(0);
    expect(o.marks.email).toBeUndefined();
    expect(o.harm).toBe(0);
    expect(o.clean).toBe(true);
  });
});

describe('save points and keys', () => {
  const crash = { at: 'email', kind: 'crash' } as const;
  it('a restart without save points redoes every finished step; with them it resumes', () => {
    const o = run(OPENING, crash);
    expect(o.twice).toEqual(['stock', 'refund', 'email']);
    expect(o.letters).toBe(2);
    const s = run(policy({ saves: true }), crash);
    expect(s.twice).toEqual([]);
    expect(s.finished && s.clean).toBe(true);
  });

  it('a retry without a key refunds twice; with a key it refunds once', () => {
    const t = { at: 'refund', kind: 'timeout' } as const;
    expect(run(OPENING, t).twice).toEqual(['refund']);
    expect(run(policy({ keys: true }), t).twice).toEqual([]);
    expect(run(policy({ keys: true }), t).marks.refund).toBe('done');
  });
});

describe('the workbench', () => {
  it('codes every policy one to one', () => {
    expect(ORDERS).toHaveLength(24);
    for (const c of [0, 1, 63, 64, 777, 24 * 64 - 1]) expect(codeOf(policyOf(c))).toBe(c);
  });

  it('the opening policy and the best are pinned; the email-last order wins', () => {
    const o = score(OPENING);
    expect({ clean: o.clean, harm: o.harm }).toEqual(PINNED.workbench.opening);
    const { best, winners } = solve();
    expect(best).toEqual(PINNED.workbench.best);
    expect(winners).toEqual(PINNED.workbench.winners);
    expect(WINNERS).toEqual(winners);
    for (const w of winners) {
      const p = policyOf(w);
      expect(p.order.at(-1)).toBe('email');
      expect(p.keys && p.saves && p.undo.stock && p.undo.refund && p.undo.courier).toBe(true);
    }
    // the story's order, with every switch on, still loses to the email-last order
    const story = score(policy({ undo: ALL_UNDO, saves: true, keys: true }));
    expect({ clean: story.clean, harm: story.harm }).toEqual(PINNED.workbench.storyAllOn);
  });
});

describe('the funicular scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: FUNI_BOARD, scene, moving, label: '' }));
  const base: Funi = { order: ORDER, car: 'valley', marks: {}, letters: 0 };
  const failed = run(policy({ undo: ALL_UNDO }), COURIER_FAILS);
  const back: Funi = { ...base, marks: failed.marks, letters: failed.letters, route: routeOf(failed.events) };
  const halfway = run(OPENING, COURIER_FAILS);
  const stuck: Funi = { ...base, car: 'courier', marks: halfway.marks, letters: 1, route: routeOf(halfway.events) };
  const moved: Funi = { ...base, order: [...EMAIL_LAST] };
  const moves: [string, Funi, Funi][] = [
    ['up and back down, undoing', base, back],
    ['up and stuck at the courier', base, stuck],
    ['stations reordered', base, moved],
    ['a key and save points', base, { ...base, key: true, saves: ['stock', 'refund'] }],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      expect(funiMoves(a, b), what).toBe(true);
      const end = funiScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(funiStill(b)));
    }
  });

  it('draws every frame with no NaN, the car in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.2, 0.5, 0.8, 0.95]) {
        const f = funiScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('marks each station and counts the letters in the post box', () => {
    const svg = draw(funiStill(back));
    expect(svg).toContain('data-station="courier" data-mark="failed"');
    expect(svg).toContain('data-station="refund" data-mark="undone"');
    expect(svg).toContain('data-station="email" data-mark="letter"');
    expect(svg.match(/data-letter=/g)).toHaveLength(2);
    expect(draw(funiStill(stuck))).toContain('data-car="courier"');
    expect(draw(funiStill(moved))).toMatch(/data-station="email" data-mark="none" data-slot="3"/);
  });

  it('closes in on every part within the 2.2× cap', () => {
    for (const p of FUNI_PARTS) {
      const z = closeUpZoom(FUNI_BOARD, partBox(p, back));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
  });
});
