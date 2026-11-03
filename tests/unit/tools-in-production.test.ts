// Tools in production's engine (KTD3): every taught effect is pinned in data/tools-in-production/pinned.json and
// re-derived here, so the copy can't drift from the engine. The distinct focus (U7): a renamed field changes the
// fingerprint and the outline fails; lazy loading pins the token saving; a pinned server rejects a changed tool.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import { closeUpZoom, type Art } from '../../src/lib/iso/motion';
import PINNED from '../../data/tools-in-production/pinned.json' with { type: 'json' };
import {
  accepts,
  BOARD,
  changed,
  EAGER_RUN,
  EAGER_TOKENS,
  fingerprint,
  lazyTokens,
  OVERNIGHT,
  poisoned,
  REQUESTS,
  search,
  SERVERS,
  TOOLS,
  toolOf,
} from '../../src/lib/tools-in-production/tools';
import { bitsOf, OPENING, policyOf, runWeek, solve, TASKS } from '../../src/lib/tools-in-production/week';
import {
  SHADOW_BOARD,
  SHADOW_PARTS,
  partBox,
  shadowScene,
  shadowStill,
  type Shadow,
} from '../../src/components/scenes/shadowScene';
import { WINNERS } from '../../src/content/tools-in-production/07-workbench';

describe('the catalogue', () => {
  it('sixty tools from four servers, twelve on the board, three per server', () => {
    expect(TOOLS).toHaveLength(60);
    expect(SERVERS).toHaveLength(4);
    expect(BOARD).toHaveLength(12);
    for (const s of SERVERS) expect(BOARD.filter(t => t.server === s.id)).toHaveLength(3);
    for (const s of SERVERS) expect(s.url).toMatch(/^https:\/\/mcp\.[a-z]+\.example$/);
  });
});

describe('loading every tool, or searching', () => {
  it('every definition in every prompt costs the pinned total', () => {
    expect(EAGER_TOKENS).toBe(PINNED.eagerTokens);
  });

  it('the search finds each request’s tool among its three, and loads the pinned tokens', () => {
    expect(Object.fromEntries(REQUESTS.map(r => [r.id, search(r.text)]))).toEqual(PINNED.found);
    for (const r of REQUESTS) expect(search(r.text), r.id).toContain(r.tool);
    expect(Object.fromEntries(REQUESTS.map(r => [r.id, lazyTokens(search(r.text))]))).toEqual(PINNED.lazyTokens);
  });

  it('lazy loading pins the saving: every request loads under a tenth of the full set', () => {
    for (const r of REQUESTS) expect(lazyTokens(search(r.text)) / EAGER_TOKENS).toBeLessThan(0.1);
    expect(Math.round(100 * (1 - lazyTokens(search(REQUESTS[0].text)) / EAGER_TOKENS))).toBe(PINNED.savedPct);
  });

  it('the hand-written eager run picked a look-alike tool, never the one the request needed', () => {
    expect(EAGER_RUN.label).toBe('hand-written example run');
    expect(EAGER_RUN.picked).not.toBe(REQUESTS.find(r => r.id === EAGER_RUN.request)!.tool);
    expect(toolOf(EAGER_RUN.picked).shape).toBeTruthy();
  });
});

describe('fingerprints', () => {
  const t = toolOf(OVERNIGHT.tool),
    next = changed(t, OVERNIGHT);
  it('a renamed field changes the fingerprint; the same definition always prints the same', () => {
    expect(fingerprint(t)).toBe(PINNED.prints.before);
    expect(fingerprint(next)).toBe(PINNED.prints.after);
    expect(fingerprint({ ...t })).toBe(fingerprint(t));
    expect(Object.keys((next.inputSchema as { properties: object }).properties)).toContain(OVERNIGHT.rename!.to);
  });

  it('key order never changes a fingerprint', () => {
    const a = { name: 'x', description: 'd', inputSchema: { type: 'object', properties: { a: {}, b: {} } } };
    const b = { inputSchema: { properties: { b: {}, a: {} }, type: 'object' }, description: 'd', name: 'x' };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});

describe('hidden orders and sign-in passes', () => {
  it('flags only DocShelf’s find_manual on the first day', () => {
    expect(TOOLS.filter(poisoned).map(t => t.id)).toEqual(['docshelf.find_manual']);
  });

  it('a server’s own pass opens only its own door; the shared key opens all', () => {
    expect(accepts('orderdesk', { for: 'quickpost' })).toBe(false);
    expect(accepts('orderdesk', { for: 'orderdesk' })).toBe(true);
    for (const s of SERVERS) expect(accepts(s.id, { for: 'shared' })).toBe(true);
  });
});

describe('the week', () => {
  it('the opening setup does everything and leaks every request', () => {
    const o = runWeek(OPENING);
    expect({ done: o.done, incidents: o.incidents, tokens: o.tokens }).toEqual(PINNED.week.opening);
    expect(o.done).toBe(TASKS);
  });

  it('a pinned server rejects a changed tool: QuickPost’s rug pull is held, and nothing leaks', () => {
    const p = {
      ...OPENING,
      quickpost: { trust: true, pin: true, lazy: false },
      docshelf: { trust: false, pin: false, lazy: false },
    };
    const s = runWeek(p);
    expect(s.held).toEqual(['quickpost.track_parcel']);
    expect(s.incidents).toBe(0);
    const unpinned = runWeek({ ...p, quickpost: { trust: true, pin: false, lazy: false } });
    expect(unpinned.leaked).toEqual(['quickpost']);
  });

  it('the best week and every policy that reaches it are pinned, and the workbench accepts exactly those', () => {
    const { best, winners } = solve();
    expect({ done: best.done, incidents: best.incidents, tokens: best.tokens }).toEqual(PINNED.week.best);
    expect(winners).toEqual(PINNED.week.winners);
    expect(WINNERS).toEqual(winners);
    for (const w of winners) {
      const p = policyOf(w);
      expect(bitsOf(p)).toBe(w);
      expect(p.docshelf.trust).toBe(false);
      expect(p.quickpost.pin).toBe(true);
    }
  });
});

describe('the shadow board scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: SHADOW_BOARD, scene, moving, label: '' }));
  const empty: Shadow = { vans: [], hung: [], heap: 0, pinned: [], held: [], changed: [] };
  const courier: Shadow = {
    ...empty,
    vans: ['quickpost', 'orderdesk'],
    hung: search(REQUESTS[0].text).map(id => ({ id, fit: true })),
  };
  const all: Shadow = {
    ...empty,
    vans: SERVERS.map(s => s.id),
    hung: BOARD.map(t => ({ id: t.id, fit: true })),
    heap: 48,
  };
  const askew: Shadow = {
    ...courier,
    changed: ['quickpost.book_courier'],
    hung: [{ id: 'quickpost.book_courier', fit: false }],
  };
  const held: Shadow = { ...askew, hung: [], pinned: ['quickpost'], held: ['quickpost.book_courier'] };
  const sent: Shadow = {
    ...empty,
    vans: ['docshelf'],
    hung: [{ id: 'docshelf.find_manual', fit: true }],
    note: 'docshelf',
    sent: 'docshelf',
  };
  const moves: [string, Shadow, Shadow][] = [
    ['vans in, tools hung', empty, courier],
    ['everything out', empty, all],
    ['a changed tool hung askew', courier, askew],
    ['a pinned tool held', courier, held],
    ['a file sent', { ...sent, hung: [], sent: null }, sent],
    ['vans away', courier, empty],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      const end = shadowScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(shadowStill(b)));
    }
  });

  it('draws every frame of every move with no NaN, the pieces in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
        const f = shadowScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('hangs what fits, tilts what changed, holds what a pin refused, and breaks a changed crate’s seal', () => {
    expect(draw(shadowStill(courier)).match(/data-hung="[^"]+" data-fit="1"/g)).toHaveLength(3);
    expect(draw(shadowStill(askew))).toContain('data-hung="quickpost.book_courier" data-fit="0"');
    expect(draw(shadowStill(held))).not.toContain('data-hung=');
    expect(draw(shadowStill(held))).toContain('data-seal="quickpost" data-state="held"');
    expect(draw(shadowStill(askew))).toContain('data-seal="quickpost" data-state="broken"');
    expect(draw(shadowStill(all)).match(/data-van="[a-z]+" data-at="dock"/g)).toHaveLength(4);
    expect(draw(shadowStill(sent))).toContain('data-sent="docshelf"');
  });

  it('closes in on every part within the 2.2× cap', () => {
    for (const p of SHADOW_PARTS) {
      const z = closeUpZoom(SHADOW_BOARD, partBox(p, { ...askew, lit: 'quickpost.book_courier', crate: 'quickpost' }));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
  });
});
