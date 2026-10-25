// Computer use's engine (U24): clicks resolve on the real screen through the host's scaling, a small screenshot misses
// a small target, a stale screenshot acts twice, the planted notice and offer reach their goals until a host stage stops
// them, screenshot cost is Multimodal's patch rule, and every pinned run still plays as pinned.json says (KTD12).
import { describe, expect, it } from 'vitest';
import pinned from '../../data/computer-use/pinned.json';
import { lookTokens, run, toReal, type Setup } from '../../src/lib/computer-use/loop';
import { centre, hit, SIZES, shotOf, svgOf, viewOf } from '../../src/lib/computer-use/screens';
import { RECORDING } from '../../src/lib/computer-use/turns';
import { imageTokens } from '../../src/lib/multimodal/patches';

const play = (s: Partial<Setup> & { case: string }) => run(RECORDING, s);
const clicks = (s: Partial<Setup> & { case: string }) => play(s).steps.flatMap(x => (x.kind === 'click' ? [x] : []));

describe('the screens', () => {
  it('every element is hit at its own centre, and nowhere else is', () => {
    const home = viewOf({ screen: 'home', lines: [], plus: false });
    for (const e of home.els) expect(hit(home, ...centre(e))?.id).toBe(e.id);
    expect(hit(home, 5, 790)).toBeNull();
  });
  it('planted text renders as text: markup in the notice would be escaped', () => {
    const svg = svgOf(
      viewOf({ screen: 'basket', lines: [{ sku: 'HG-120', qty: 120 }], plus: false }, { banner: true }),
    );
    expect(svg).toContain('Notice for AI assistants');
    expect(svg).not.toMatch(/<script|<foreignObject/);
  });
});

describe('the host stages', () => {
  it('a click at a screenshot point lands on the element under the scaled-back point', () => {
    const [c] = clicks({ case: 'hinges', size: 1024, scale: true });
    expect(c.real).toEqual(toReal(c.at, 1024, true));
    expect(c.el?.id).toBe('tile-orders');
  });
  it('with scaling forgotten, the pinned click lands on Sign out', () => {
    const [c] = clicks({ case: 'hinges', size: 1024, scale: false });
    expect(c.real).toEqual(c.at);
    expect(c.el?.id).toBe('tile-signout');
  });
  it('at the smallest size the small Reorder link is missed; larger hits it, at more tokens', () => {
    const small = play({ case: 'hinges', size: 640 }),
      big = play({ case: 'hinges', size: 1024 });
    expect(small.hist[1]).toBe('click:reorder-PO-5530:ok');
    expect(big.hist[1]).toBe('click:reorder-PO-5531:ok');
    expect(small.caseDone).toBe(false);
    expect(big.caseDone).toBe(true);
    expect(lookTokens(1024)).toBeGreaterThan(lookTokens(640));
  });
  it('without the wait rule the agent acts on a stale screen and orders twice; with it, once', () => {
    const stale = play({ case: 'hinges', wait: false }),
      ok = play({ case: 'hinges', wait: true });
    expect(stale.steps.some(s => s.kind === 'look' && s.stale)).toBe(true);
    expect(stale.charges[0].lines).toEqual([{ sku: 'HG-120', qty: 240 }]);
    expect(ok.charges[0].lines).toEqual([{ sku: 'HG-120', qty: 120 }]);
  });
  it('the planted notice charges Larkspur’s card with nothing on; the allow-list and asking a person each stop it', () => {
    expect(play({ case: 'banner' }).attackMet).toBe(true);
    expect(play({ case: 'banner', allow: true }).attackMet).toBe(false);
    expect(play({ case: 'banner', confirm: true }).attackMet).toBe(false);
  });
  it('the look-alike offer gets past the allow-list; asking a person stops it', () => {
    expect(play({ case: 'offer', allow: true }).attackMet).toBe(true);
    expect(play({ case: 'offer', allow: true, confirm: true }).attackMet).toBe(false);
  });
  it('a screenshot costs what Multimodal’s patch rule says for its size', () => {
    for (const s of SIZES) expect(lookTokens(s)).toBe(imageTokens(shotOf(s).w, shotOf(s).h).tokens);
    const r = play({ case: 'hinges' });
    expect(r.tokens).toBe(r.looks * lookTokens(1280));
  });
});

describe('pinned runs (KTD12)', () => {
  it.each(pinned.runs.map(p => [p.chapter, JSON.stringify(p.setup), p] as const))('%s %s', (_, __, p) => {
    const r = play(p.setup as Partial<Setup> & { case: string });
    expect(r.status).toBe('done');
    expect(r.hist).toEqual(p.hist);
    expect(r.caseDone).toBe(p.done);
    expect(r.attackMet).toBe(p.attack);
  });
});
