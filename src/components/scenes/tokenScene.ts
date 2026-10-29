// Module 6's picture: the token press (KTD11). On the workshop board a paper strip (the text) runs off a spool into a
// cast-iron letterpress (the tokenizer), and token tiles drop out of it onto a belt of rollers, one tile per token,
// coloured in turn like the Tokens tab's row. With no text the press stands idle: platen up, no strip, an empty belt.
// Words only in pills; on phones (scale > 1.5) the pills keep short names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  METAL,
  CERAMIC,
  DARK,
  WOOD,
  box,
  cyl,
  rod,
  shape,
  line,
  loft,
  ink,
  fill,
  pd,
  vis,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { hexa } from '../../lib/iso/figures';
import { encode } from '../../lib/lm/bpe';
import { beltAt } from './officeScene';
import type { Say } from '../story/steps';

export const TOKEN_BOARD: Board = [0, 0, 240, 120];
/** The tiles' colours in turn: tile i wears TILE_COLOURS[i % 5], here and in the Tokens tab (as --<name>-l). */
export const TILE_COLOURS = ['mustard', 'cobalt', 'mint', 'blush', 'tomato'] as const;

export interface TokenOpts {
  text: string;
  /** tokens the text cut into (default: the site tokenizer's count); a recorded real tokenizer's count passes its own */
  tokens?: number;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout, over one of TOKEN_PARTS */
  say?: Say;
}
/** The parts a step's callout may name: the strip, the press and the belt of tiles. */
export const TOKEN_PARTS = ['strip', 'press', 'belt'] as const;

const Y = 60,
  PRESS = 98,
  BELT = { a: [114, Y], b: [234, Y], n: [0, 1] },
  TILE0 = 122,
  PITCH = 12,
  MAX_TILES = 9,
  SNIP = 18;

/** What the press shows. Pure, so the tests can check it without drawing; no division, so empty text is all zeros. */
export function tokenState({ text, tokens = encode(text).length }: TokenOpts) {
  const shown = Math.min(tokens, MAX_TILES);
  return { tokens, shown, more: tokens - shown, idle: tokens === 0 };
}

/** The strip's words for its pill: whitespace runs as one space, cut to fit. A wide character (CJK, emoji) counts as two.
 * shortcut: tag() sizes its pill for narrow characters, so wide ones still overrun it a little; measure if that shows. */
const snippet = (text: string) => {
  const t = [...text.replace(/\s+/g, ' ').trim()];
  let w = 0,
    i = 0;
  for (; i < t.length && w + (t[i] > '⹿' ? 2 : 1) <= SNIP; i++) w += t[i] > '⹿' ? 2 : 1;
  return i < t.length ? t.slice(0, Math.max(0, i - 1)).join('') + '…' : t.join('');
};
export const tokensWord = (n: number) => `${n} token${n === 1 ? '' : 's'}`;

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
/** One token tile lying on its back, centred at (x, y), standing on height z. */
export const tokenTile = (i: number, x: number, z: number, y = Y, cls = 'tile', mat = PALS[TILE_COLOURS[i % 5]]) =>
  `<g class="${cls}">${box(x - 4.5, y - 4.5, z, x + 4.5, y + 4.5, z + 4, mat, toneI, 0.9)}</g>`;

type Part = { box: number[][]; svg: string };
/** cast iron: a touch warmer than DARK */
const IRON = { l: '#5b5550', m: '#423d39', d: '#272320' };
/** A ring of points round centre c in the plane of unit vectors e1, e2. */
const ring = (c: number[], e1: number[], e2: number[], r: number, n = 20) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    return [0, 1, 2].map(k => c[k] + e1[k] * r * Math.cos(t) + e2[k] * r * Math.sin(t));
  });
const X = [1, 0, 0],
  Z = [0, 0, 1];

/** The flywheel on the press's +y cheek: a heavy cast rim with thickness, six spokes, a hub on a shaft into the cheek,
 * and a crank grip on the rim. */
function flywheel(x: number, y: number, z: number, r: number): Part {
  const t = 1.8,
    near = vis([0, 1, 0]) ? 1 : -1,
    yf = y + (near * t) / 2;
  let s = rod([x, y - near * 3.4, z], [x, y, z], 1.1, METAL, toneI, 0.8);
  const rims = [-t / 2, t / 2].map(k => ring([x, y + k, z], X, Z, r));
  s += loft(rims[0], rims[1], (n: number[]) => toneI(n, IRON));
  const at = (rr: number) => ring([x, yf, z], X, Z, rr);
  s += `<path d="${pd(at(r))}${pd(at(r - 2.2).reverse())}" fill="${IRON.m}" fill-rule="evenodd"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    s += rod([x, yf, z], [x + (r - 1.8) * Math.cos(a), yf, z + (r - 1.8) * Math.sin(a)], 0.6, IRON, toneI, 0.7, 0.6, 6);
  }
  s += ink(pd(at(r)), 1.6) + ink(pd(at(r - 2.2)), 0.8) + shape(at(2), METAL.l, 0.8);
  const hx = x + (r - 1.1) * Math.cos(2.4),
    hz = z + (r - 1.1) * Math.sin(2.4);
  s += rod([hx, yf, hz], [hx, yf + near * 3.6, hz], 0.9, WOOD, toneI, 0.8);
  return {
    box: [
      [x - r, Math.min(y - 3.4, yf + near * 3.6), z - r],
      [x + r, Math.max(y + 3.4, yf + near * 3.6), z + r],
    ],
    svg: `<g class="flywheel">${s}</g>`,
  };
}

/** The letterpress: a cast-iron hand press. Real-object notes: a heavy bed on the board (the strip runs onto it); two
 * tapered cheeks either side; a crown across their tops with a red cap; a screw down from the crown to the steel
 * platen, which comes down to cut; a flywheel on the near cheek; a lever with a ball grip pivoted on the crown. h is
 * the cap's height above the board (40 on the board, squat in the hero's plot); the footprint is the old press's. */
export function letterpress(cutting: boolean, fed: boolean, falling: number | null, x = PRESS, y = Y, h = 40) {
  const z0 = BH + 4,
    top = BH + h - 6,
    head = cutting ? z0 + h * 0.25 : z0 + h * 0.5,
    parts: Part[] = [];
  const paper = fed
    ? shape(
        [
          [x - 14, y - 6, z0 + 0.05],
          [x - 2, y - 6, z0 + 0.05],
          [x - 2, y + 6, z0 + 0.05],
          [x - 14, y + 6, z0 + 0.05],
        ],
        CERAMIC.l,
        0.7,
      )
    : '';
  // the bed and the paper on it are one item: a flat bed sorts in front of its load otherwise
  parts.push({
    box: [
      [x - 14, y - 14, BH],
      [x + 14, y + 14, z0],
    ],
    svg: box(x - 14, y - 14, BH, x + 14, y + 14, z0, IRON, toneI, 1.1) + paper,
  });
  if (falling !== null)
    parts.push({
      box: [
        [x + 4.5, y - 4.5, z0 + 3],
        [x + 13.5, y + 4.5, z0 + 7],
      ],
      svg: tokenTile(falling, x + 9, z0 + 3, y),
    });
  for (const k of [-1, 1]) {
    const b0 = k < 0 ? y - 14 : y + 10,
      b1 = b0 + 4;
    const c = [
      [x - 12, b0, z0],
      [x + 12, b0, z0],
      [x + 12, b1, z0],
      [x - 12, b1, z0],
      [x - 5.5, b0, top],
      [x + 5.5, b0, top],
      [x + 5.5, b1, top],
      [x - 5.5, b1, top],
    ];
    parts.push({
      box: [
        [x - 12, b0, z0],
        [x + 12, b1, top],
      ],
      svg: hexa(c, IRON, 1) + hullInk(c, 1.8),
    });
  }
  parts.push({
    box: [
      [x - 7, y - 8, head - 1.2],
      [x + 7, y + 8, top],
    ],
    svg:
      rod([x, y, top], [x, y, head + 5], 1.5, METAL, toneI, 0.9) +
      box(x - 6, y - 7, head - 1.2, x + 6, y + 7, head, DARK, toneI, 0.6) +
      box(x - 7, y - 8, head, x + 7, y + 8, head + 5, METAL, toneI, 1),
  });
  parts.push({
    box: [
      [x - 8, y - 15, top],
      [x + 8, y + 15, top + 6],
    ],
    svg:
      box(x - 8, y - 15, top, x + 8, y + 15, top + 4, IRON, toneI, 1.1) +
      box(x - 5, y - 11, top + 4, x + 5, y + 11, top + 6, PALS.tomato, toneI, 0.9),
  });
  parts.push(flywheel(x - 3, y + 16, BH + h * 0.46, Math.min(11, h * 0.3)));
  // the lever: pivoted on the crown's front corner, its arm down past the cheek to a ball grip
  const p0 = [x + 7, y + 12, top + 2],
    p1 = [x + 19, y + 12, top - h * 0.32];
  parts.push({
    box: [
      [x + 5.5, y + 9.8, p1[2] - 2.4],
      [x + 21.4, y + 14.2, top + 3.6],
    ],
    svg:
      rod(p0, p1, 0.9, METAL, toneI, 1) +
      cyl(p1[0], p1[1], p1[2] - 2.1, p1[2] + 1.5, 2.1, PALS.tomato, toneI, 1, 12) +
      cyl(p0[0], p0[1], p0[2] - 1.4, p0[2] + 1.4, 1.5, METAL, toneI, 0.8, 10),
  });
  return `<g data-prop="press" data-idle="${cutting ? 0 : 1}">${byDepth(parts)}</g>`;
}

/** The paper spool the strip runs off: a roll lying across the strip on two iron brackets. */
export function spool(x: number, y: number, r = 5) {
  const zc = BH + r + 1.5;
  let s = '';
  for (const k of [-1, 1]) s += box(x - 1.2, y + k * 8 - 0.8, BH, x + 1.2, y + k * 8 + 0.8, zc + 1, IRON, toneI, 0.8);
  const ends = [-7, 7].map(k => ring([x, y + k, zc], X, Z, r, 18));
  s += loft(ends[0], ends[1], (n: number[]) => toneI(n, CERAMIC));
  const k = vis([0, 1, 0]) ? 1 : 0,
    cap = ends[k];
  s += fill(pd(cap), CERAMIC.l) + ink(pd(ring([x, y + (k ? 7.05 : -7.05), zc], X, Z, r * 0.62, 14)), 0.5);
  s += fill(pd(ring([x, y + (k ? 7.1 : -7.1), zc], X, Z, 1.3, 10)), DARK.d) + ink(pd(cap), 1);
  s += hullInk([...ends[0], ...ends[1]], 1.8);
  s += rod([x, y - 8.6, zc], [x, y + 8.6, zc], 0.7, METAL, toneI, 0.7);
  return `<g data-prop="spool">${s}</g>`;
}

/** The paper strip on the board, running off its spool into the press; tick marks across it where a cut could fall. */
function strip(x0: number, x1: number, y = Y) {
  const z = BH + 0.25;
  let s = shape(
    [
      [x0, y - 6, z],
      [x1, y - 6, z],
      [x1, y + 6, z],
      [x0, y + 6, z],
    ],
    CERAMIC.l,
    1,
  );
  for (let x = x0 + 8; x < x1 - 2; x += 9)
    s += line(
      [
        [x, y - 6, z + 0.05],
        [x, y - 3, z + 0.05],
      ],
      0.5,
    );
  return `<g data-prop="strip">${s}</g>`;
}
/** The spool, the strip off it to the press's bed (fed), drawn as the floor layer under the press. */
export const feed = (fed: boolean, x0: number, x1: number, y = Y) => (fed ? strip(x0 + 3, x1, y) : '') + spool(x0, y);

/** The press scene. Shadows, then the belt and strip (floor), then the press and tiles back to front, then the pills. */
export const tokenScene = (o: TokenOpts) => (ctx: SceneCtx) => {
  const st = tokenState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = castShadow(boxCorners(PRESS - 14, Y - 15, BH, PRESS + 14, Y + 17, BH + 46), BH, ctx.top);
  s += castShadow(boxCorners(4, Y - 9, BH, 14, Y + 9, BH + 12), BH, ctx.top);
  s += `<g data-prop="belt" data-tiles="${st.shown}">${beltAt(BELT.a, BELT.b, BELT.n, false)}</g>`;
  s += feed(!st.idle, 9, PRESS - 14);
  const tiles = Array.from({ length: st.shown }, (_, i) => ({
    at: [TILE0 + i * PITCH, Y, 1],
    svg: tokenTile(i, TILE0 + i * PITCH, BH + 0.3),
  }));
  // more tiles than the belt holds: the next one is still dropping out of the press
  s += byDepth([{ at: [PRESS, Y, 0], svg: letterpress(!st.idle, !st.idle, st.more ? st.shown : null) }, ...tiles]);
  const words = narrow ? 'TEXT' : st.idle ? 'NO TEXT' : `TEXT · “${snippet(o.text)}”`;
  const count = narrow ? 'TOKENS' : `${tokensWord(st.tokens).toUpperCase()}${st.more ? ` · ${st.shown} SHOWN` : ''}`;
  const end = [TILE0 + (MAX_TILES - 1) * PITCH, Y + 6, BH];
  return (
    s +
    pill([24, Y + 6, BH], narrow ? -14 : -20, narrow ? -34 : 30, words, false, scale) +
    pill([PRESS, Y, BH + 46], 0, -14, 'TOKENIZER', !st.idle, scale) +
    pill(end, narrow ? -10 : 0, 30, count, false, scale) +
    sayAt(o.say, 'strip', [24, Y + 6, BH], narrow ? -34 : 30, scale) +
    sayAt(o.say, 'press', [PRESS, Y, BH + 46], -14, scale) +
    sayAt(o.say, 'belt', end, 30, scale)
  );
};

/** The picture in words, for its aria-label. React escapes it; the drawing escapes the strip's words (esc). */
export function tokenLabel(o: TokenOpts): string {
  const st = tokenState(o);
  if (st.idle) return 'A token press on a workshop board, standing idle: no text fed in, 0 tokens on the belt.';
  return (
    `A token press on a workshop board: a paper strip with the text “${o.text}” feeds the press, which cuts it into ` +
    `${tokensWord(st.tokens)}; the tiles drop onto a belt${st.more ? ` (the first ${st.shown} shown)` : ''}.`
  );
}

/** The home hero's plot (heroScene): a squat letterpress at (x, y), cutting, and three tiles it has dropped in a row in
 * front of it. Squat so the pill rows stacked above the hero's plots leave it in view. */
export const pressPlot = (x: number, y: number, top: SceneCtx['top']) =>
  castShadow(boxCorners(x - 14, y - 15, BH, x + 14, y + 15, BH + 30), BH, top) +
  byDepth([
    { at: [x, y, 0], svg: letterpress(true, false, null, x, y, 24) },
    ...[0, 1, 2].map(i => ({ at: [x + 8 - i * 11, y + 20, 1], svg: tokenTile(i, x + 8 - i * 11, BH + 0.3, y + 20) })),
  ]);
