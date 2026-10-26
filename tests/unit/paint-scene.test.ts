// Locks and keys' stage (U18): the paint mix (both ends' final pots one colour for every pair of secrets), every pill's
// contrast against every pot colour, the parts a callout may name, escaping, the secret picker's native radio group,
// and the pour that reduced motion leaves out.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { INK } from '../../src/lib/iso/core.js';
import {
  DH_STAGES,
  PAINT_BOARD,
  PAINT_CARD,
  PAINT_PARTS,
  PIGMENTS,
  contrast,
  mixPaint,
  paintAt,
  paintLabel,
  paintPlot,
  paintScene,
  type PaintOpts,
  type Pigment,
} from '../../src/components/scenes/paintScene';
import { SecretPicker, SECRETS } from '../../src/content/encryption/kit';
import { TOY, publicOf, sharedOf } from '../../src/lib/encryption/toy';

const draw = (o: PaintOpts) =>
  renderToString(createElement(IsoStage, { board: PAINT_BOARD, scene: paintScene(o), label: paintLabel(o) }));
const ALL = Object.keys(PIGMENTS) as Pigment[];
const final = (o: PaintOpts, side: 'us' | 'them') => o[side].find(i => i.label.startsWith('SHARED'))!;

describe('the paint mix', () => {
  it('both ends’ final pots are one colour for every pair of secret pigments', () => {
    for (const a of ALL) for (const b of ALL) expect(mixPaint(['straw', a, b])).toBe(mixPaint(['straw', b, a]));
    for (const p of SECRETS) {
      const o = paintAt(p, 'final');
      expect(mixPaint(final(o, 'us').pigments!)).toBe(mixPaint(final(o, 'them').pigments!));
    }
  });
  it('the toy numbers on the pots are the maths’: both ends reach the shared number', () => {
    for (const s of TOY.dh.secrets) {
      const o = paintAt(s.pigment as Pigment, 'final'),
        shared = sharedOf(publicOf(TOY.dh.supplier.secret), s.secret);
      expect(final(o, 'us').label).toBe(`SHARED ${shared}`);
      expect(sharedOf(publicOf(s.secret), TOY.dh.supplier.secret)).toBe(shared);
      expect(o.counter.map(i => i.label)).toEqual([`${publicOf(s.secret)}`, `${publicOf(TOY.dh.supplier.secret)}`]);
    }
  });
  it('the eavesdropper’s two pots mixed are a different colour', () => {
    for (const p of SECRETS) expect(mixPaint(['straw', p, 'straw', 'lilac'])).not.toBe(mixPaint(['straw', p, 'lilac']));
  });
  it('a single pigment mixes to itself, and tokens.css holds every pigment', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    for (const p of ALL) {
      expect(mixPaint([p])).toBe(PIGMENTS[p].hex);
      expect(css).toContain(`--paint-${p}: ${PIGMENTS[p].hex};`);
    }
  });
});

describe('the counter', () => {
  it('every pill passes contrast (4.5:1) against every pot colour', () => {
    const pots = new Set<string>();
    for (const a of ALL) for (const b of ALL) for (const c of ALL) pots.add(mixPaint([a, b, c]));
    for (const hex of pots) expect(contrast(INK, hex)).toBeGreaterThanOrEqual(4.5);
  });
  it('draws every part a callout may name, and the callout itself', () => {
    const o = { ...paintAt('rose', 'swapped'), eve: 'SEES' };
    for (const p of PAINT_PARTS) {
      expect(draw(o)).toContain(`data-prop="${p}"`);
      expect(draw({ ...o, say: { block: p, text: 'Here' } })).toContain('Here');
    }
  });
  it('pots fill their pills with their own paint, and only new pots pour', () => {
    const svg = draw(paintAt('sky', 'mixed'));
    expect(svg).toContain(`fill="${mixPaint(['straw', 'sky'])}"`);
    expect(svg.split('data-fresh').length - 1).toBe(2);
    for (const s of DH_STAGES) expect(draw(paintAt('sky', s))).toContain('data-item="pot"');
  });
  it('escapes every pill', () => {
    const svg = draw({ us: [{ kind: 'card', label: '<script>x</script>' }], counter: [], them: [] });
    expect(svg).not.toContain('<script>x');
    expect(svg).toContain('&lt;script&gt;');
  });
  it('draws the card picture, the hero plot and four items in the open middle', () => {
    expect(draw(PAINT_CARD)).toContain('SHARED');
    const four = draw({ us: [], counter: [0, 1, 2, 3].map(i => ({ kind: 'card', label: `M${i}` })), them: [] });
    expect(four.split('data-item="card"').length - 1).toBe(4);
    const plot = createElement(IsoStage, { board: PAINT_BOARD, scene: ctx => paintPlot(40, 40, ctx.top), label: '' });
    expect(renderToString(plot)).toContain('<path');
  });
});

describe('the secret picker (KTD15)', () => {
  it('is one native radio group, a radio per secret colour', () => {
    const html = renderToString(createElement(SecretPicker, { value: 'sky', onPick: () => {} }));
    expect(html).toContain('<fieldset');
    expect(html.split('type="radio"').length - 1).toBe(SECRETS.length);
    expect(html.split('name="ek-secret"').length - 1).toBe(SECRETS.length);
    expect(html).toMatch(/checked=""/);
  });
});
