// Where the effort goes: every taught effect is pinned in data/adaptive-compute/pinned.json and re-derived from the engine
// here (each option helps only its kinds, maximum effort runs the tower dry, routing matches maximum effort's answers for
// far less), the workbench's WINNERS recompute, and the mill-yard scene ends on its still.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import { type Art, closeUpZoom } from '../../src/lib/iso/motion';
import {
  MILL_BOARD,
  MILL_PARTS,
  type MillYard,
  millPills,
  millScene,
  millStill,
  partBox,
} from '../../src/components/scenes/millScene';
import { yardOf } from '../../src/content/adaptive-compute/kit';
import { WINNERS } from '../../src/content/adaptive-compute/07-workbench';
import PINNED from '../../data/adaptive-compute/pinned.json' with { type: 'json' };
import {
  KIND_IDS,
  MAX,
  OPTS,
  type Opt,
  PLAIN,
  REQUESTS,
  ROUTED,
  type Rules,
  allRules,
  countOf,
  isWin,
  rightBy,
  rulesOf,
  runDay,
} from '../../src/lib/adaptive-compute/effort';

describe('the hand-written day', () => {
  it('has 40 questions of five kinds', () => {
    expect(REQUESTS).toHaveLength(40);
    expect(KIND_IDS.map(countOf)).toEqual([14, 8, 8, 6, 4]);
  });
});

describe('each kind of effort', () => {
  it('helps only its pinned request kinds', () => {
    for (const o of OPTS) {
      const helps = KIND_IDS.filter(k => rightBy(k, o) && !rightBy(k, 'straight'));
      expect(helps, o).toEqual(PINNED.helps[o as keyof typeof PINNED.helps]);
    }
  });

  it('maximum effort on every question runs the tower dry; no effort gets only the everyday ones right', () => {
    for (const [name, d] of Object.entries(PINNED.days)) {
      const r = runDay(rulesOf(d.rules as Opt));
      expect({ answered: r.answered, right: r.right, spent: r.spent, dry: r.dry }, name).toEqual({
        answered: d.answered,
        right: d.right,
        spent: d.spent,
        dry: d.dry,
      });
    }
  });

  it('each chapter’s valve turn gives its pinned score and bill', () => {
    for (const s of PINNED.steps) {
      const r = runDay(s.rules as Rules);
      expect({ right: r.right, spent: r.spent }, s.what).toEqual({ right: s.right, spent: s.spent });
    }
  });
});

describe('deciding per request', () => {
  it('routing gets as many right as maximum effort, for the pinned fraction of the bill', () => {
    const max = runDay(MAX, Infinity),
      routed = runDay(ROUTED, Infinity);
    expect({ right: max.right, spent: max.spent }).toEqual(PINNED.unlimited.max);
    expect({ right: routed.right, spent: routed.spent }).toEqual(PINNED.unlimited.routed);
    expect(routed.right).toBe(max.right);
    expect(routed.spent).toBeLessThan(max.spent);
    expect(runDay(PLAIN, Infinity).right).toBeLessThan(routed.right);
  });

  it('WINNERS are every valve setting with all 40 right within the budget, recomputed', () => {
    expect(allRules()).toHaveLength(6 ** 5);
    expect(allRules().filter(isWin)).toEqual(PINNED.winners);
    expect(WINNERS).toEqual(PINNED.winners);
  });

  it('the win is every question right on 106 of the 110 budget; one valve off, or a budget under 106, loses', () => {
    expect(runDay(ROUTED)).toMatchObject({ right: 40, spent: 106, dry: false });
    expect(isWin(ROUTED)).toBe(true);
    expect(runDay(ROUTED, 105).dry).toBe(true);
    expect(runDay({ ...ROUTED, warranty: 'straight' })).toMatchObject({ right: 36, dry: false });
    expect(isWin({ ...ROUTED, warranty: 'straight' })).toBe(false);
  });
});

describe('the mill-yard scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: MILL_BOARD, scene, moving, label: '' }));
  const plain = yardOf(PLAIN),
    max = yardOf(MAX, { lit: { tower: true } }),
    routed = yardOf(ROUTED, { lit: { mill: 'big', valve: 'warranty' } }),
    turned = yardOf({ ...PLAIN, puzzle: 'think' }, { lit: { valve: 'puzzle', mill: 'think' } });
  const moves: [string, MillYard, MillYard][] = [
    ['every valve wide open', plain, max],
    ['one valve turned', plain, turned],
    ['routed from max', max, routed],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      const end = millScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(millStill(b, { zoomT: 0 }, false)));
    }
  });

  it('draws every frame with no NaN, the pieces in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.25, 0.5, 0.75, 0.95]) {
        const f = millScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('water reaches exactly the mills the valves point at, and the tower shows what is left', () => {
    const svg = draw(millStill(turned));
    expect(svg).toContain('data-mill="think" data-wet="1"');
    for (const m of ['lookup', 'check', 'big']) expect(svg).toContain(`data-mill="${m}" data-wet="0"`);
    expect(svg).toContain('data-valve="puzzle" data-to="think"');
    expect(draw(millStill(max))).toContain('data-dry="1"');
    // a valve whose questions the water never reached reads apart from one whose day hasn't run
    expect(draw(millStill(max))).toContain('data-mark="dry"');
    expect(draw(millStill(yardOf(MAX, { idle: true })))).not.toContain('data-mark="dry"');
    expect(draw(millStill(plain))).toContain('data-dry="0"');
  });

  it('closes in on every part within the 2.2× cap; the pills draw apart from the still', () => {
    for (const p of MILL_PARTS) {
      const z = closeUpZoom(MILL_BOARD, partBox(p, routed));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
    expect(millPills(routed, { zoomT: 0 })).toContain('WARRANTY');
    expect(draw(millStill(routed, { zoomT: 0 }, false))).not.toContain('WARRANTY');
  });
});
