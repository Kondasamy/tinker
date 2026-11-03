// Memory you can trust: every taught effect is pinned in data/agent-memory/pinned.json and re-derived from the engine
// here (undo by source, the conflict rule, forget me, expiry, the full board), the workbench's WINNERS recompute, and
// the cork-board scene ends on its still.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import { type Art, closeUpZoom } from '../../src/lib/iso/motion';
import {
  CORK_BOARD,
  CORK_PARTS,
  type Cork,
  corkPills,
  corkScene,
  corkStill,
  partBox,
} from '../../src/components/scenes/corkScene';
import { chatCork, corkOf } from '../../src/content/agent-memory/kit';
import { WINNERS } from '../../src/content/agent-memory/07-workbench';
import PINNED from '../../data/agent-memory/pinned.json' with { type: 'json' };
import {
  CANDIDATES,
  CARDS,
  GOOD,
  QUESTIONS,
  allSetups,
  cardOf,
  hangsFrom,
  isWin,
  kept,
  remember,
  rootOf,
  scoreOf,
  wins,
} from '../../src/lib/agent-memory/memory';

const ids = (m: { board: { id: string }[] }) => m.board.map(b => b.id).sort();
const fell = (m: { bin: { id: string; why: string }[] }, why: string) =>
  m.bin
    .filter(b => b.why === why)
    .map(b => b.id)
    .sort();

describe('undo by source', () => {
  it('pulling a source drops exactly the cards hanging from it, through other cards too', () => {
    for (const [src, want] of Object.entries(PINNED.undo)) {
      const before = remember(GOOD),
        after = remember(GOOD, { undone: [src] });
      expect(fell(after, 'undone'), src).toEqual([...want].sort());
      const descendants = before.board.filter(b => hangsFrom(cardOf(b.id), src)).map(b => b.id);
      expect(fell(after, 'undone'), src).toEqual(descendants.sort());
      // nothing else moved
      expect(ids(after), src).toEqual(ids(before).filter(id => !want.includes(id)));
      expect(after.pulled).toEqual([src]);
    }
  });

  it('a card learnt from another card hangs from that card’s source', () => {
    expect(rootOf(cardOf('web-skip')).id).toBe('web-deals');
    expect(hangsFrom(cardOf('web-skip'), 'web-id')).toBe(true);
    expect(hangsFrom(cardOf('ben-quay'), 'web-deals')).toBe(false);
  });
});

describe('old and new disagree', () => {
  it('the newer, better-sourced address wins the pinned conflict', () => {
    const [old, neu] = PINNED.conflict.address;
    expect(wins(cardOf(old), cardOf(neu), 'ranked').id).toBe(neu);
    expect(fell(remember(GOOD, { upTo: 20 }), 'replaced')).toContain(old);
    expect(ids(remember(GOOD, { upTo: 20 }))).toContain(neu);
  });

  it('a newer card from a worse source loses under the ranked rule, and wins under newest', () => {
    const [rule, web] = PINNED.conflict.refunds;
    expect(wins(cardOf(rule), cardOf(web), 'ranked').id).toBe(rule);
    expect(wins(cardOf(rule), cardOf(web), 'newest').id).toBe(web);
  });
});

describe('forgetting on purpose', () => {
  it('“forget me” leaves no card about that customer or from her chats, whatever its source', () => {
    const m = remember(GOOD, { upTo: PINNED.forget.day, forgot: ['cara'] });
    expect(m.board.filter(b => cardOf(b.id).about === 'cara' || rootOf(cardOf(b.id)).customer === 'cara')).toEqual([]);
    expect(fell(m, 'forgot')).toEqual([...PINNED.forget.fell].sort());
    expect(m.pulled).toEqual(['chat-cara']);
  });

  it('a hold note expires after its days; with no expiry it stays', () => {
    expect(fell(remember(GOOD), 'expired')).toEqual(PINNED.expired);
    expect(ids(remember({ ...GOOD, expiry: 'none' }))).toEqual(expect.arrayContaining(PINNED.expired));
  });

  it('keeping everything fills the board and drops the oldest card', () => {
    expect(fell(remember({ ...GOOD, keep: 'all' }), 'full')).toEqual(PINNED.full);
    expect(remember({ ...GOOD, keep: 'all' }).board.length).toBe(16);
  });
});

describe('what to keep', () => {
  it('twelve candidates from Ada’s chat, of which the pinned few last', () => {
    expect(CANDIDATES).toHaveLength(12);
    expect(kept('lasting')).toEqual(PINNED.kept);
    expect(kept('all')).toHaveLength(12);
  });
});

describe('the workbench', () => {
  it('scores the pinned setups as pinned', () => {
    for (const [name, s] of Object.entries(PINNED.scores)) {
      const r = scoreOf(s.rules as Parameters<typeof scoreOf>[0], s.undone);
      expect({ right: r.right, poison: r.poison }, name).toEqual({ right: s.right, poison: s.poison });
    }
  });

  it('WINNERS are every setup with every answer right and no poison left, recomputed', () => {
    const winners = allSetups().filter(isWin);
    expect(winners).toEqual(PINNED.winners);
    expect(QUESTIONS).toHaveLength(8);
    expect(CARDS.length).toBeGreaterThan(16);
  });

  it('chapter 7 accepts exactly the pinned winners', () => {
    expect(WINNERS).toEqual(PINNED.winners);
  });
});

describe('the cork-board scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: CORK_BOARD, scene, moving, label: '' }));
  const month = corkOf(remember(GOOD), { lit: ['web-deals', 'web-id', 'web-skip'] }),
    pulled = corkOf(remember(GOOD, { undone: ['web-deals'] })),
    full = corkOf(remember({ ...GOOD, keep: 'all' }));
  const moves: [string, Cork, Cork][] = [
    ['candidates onto the board', chatCork('table'), chatCork('all')],
    ['small talk into the bin', chatCork('all'), chatCork('sorted', kept('lasting'))],
    ['a pulled thread', month, pulled],
    ['a full board, every card moving', chatCork('table'), full],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      const end = corkScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(corkStill(b, { zoomT: 0 }, false)));
    }
  });

  it('draws every frame with no NaN, the pieces in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.25, 0.5, 0.75, 0.95]) {
        const f = corkScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('a pulled thread leaves its paper and cards in the bin, every other card where it was', () => {
    const svg = draw(corkStill(pulled));
    expect(svg).toContain('data-source="web-deals" data-at="bin"');
    for (const id of PINNED.undo['web-deals']) expect(svg).toContain(`data-card="${id}" data-at="bin"`);
    expect(svg.match(/data-card="[^"]+" data-at="board"/g)).toHaveLength(remember(GOOD).board.length - 2);
  });

  it('closes in on every part within the 2.2× cap; the pills draw apart from the still', () => {
    for (const p of CORK_PARTS) {
      const z = closeUpZoom(CORK_BOARD, partBox(p, month));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
    expect(corkPills(month, { zoomT: 0 })).toContain('SKIP ID');
    expect(draw(corkStill(month, { zoomT: 0 }, false))).not.toContain('SKIP ID');
  });
});
