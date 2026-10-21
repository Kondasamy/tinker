// Module 6's picture: the token press (KTD11). On the workshop board a paper strip (the text) feeds a cutting press (the
// tokenizer), and token tiles drop out of it onto a belt, one tile per token, coloured in turn like the Tokens tab's row.
// With no text the press stands idle: head up, no strip, an empty belt. Words only in pills; on phones (scale > 1.5)
// the pills keep short names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc } from '../../lib/iso/blocks';
import { PALS, METAL, CERAMIC, DARK, box, rod, shape, line, castShadow, hullInk, toneI, tag, byDepth } from '../../lib/iso/core.js';
import { encode } from '../../lib/lm/bpe';
import { beltAt } from './officeScene';

export const TOKEN_BOARD: Board = [0, 0, 240, 120];
/** The tiles' colours in turn: tile i wears TILE_COLOURS[i % 5], here and in the Tokens tab (as --<name>-l). */
export const TILE_COLOURS = ['mustard', 'cobalt', 'mint', 'blush', 'tomato'] as const;

export interface TokenOpts {
  text: string;
  /** tokens the text cut into (default: the site tokenizer's count); a recorded real tokenizer's count passes its own */
  tokens?: number;
  /** pill size; phones pass more */
  scale?: number;
}

const Y = 60, PRESS = 98, BELT = { a: [114, Y], b: [234, Y], n: [0, 1] }, TILE0 = 122, PITCH = 12, MAX_TILES = 9, SNIP = 18;

/** What the press shows. Pure, so the tests can check it without drawing; no division, so empty text is all zeros. */
export function tokenState({ text, tokens = encode(text).length }: TokenOpts) {
  const shown = Math.min(tokens, MAX_TILES);
  return { tokens, shown, more: tokens - shown, idle: tokens === 0 };
}

/** The strip's words for its pill: whitespace runs as one space, cut to fit. A wide character (CJK, emoji) counts as two.
 * shortcut: tag() sizes its pill for narrow characters, so wide ones still overrun it a little; measure if that shows. */
const snippet = (text: string) => {
  const t = [...text.replace(/\s+/g, ' ').trim()];
  let w = 0, i = 0;
  for (; i < t.length && w + (t[i] > '\u2e7f' ? 2 : 1) <= SNIP; i++) w += t[i] > '\u2e7f' ? 2 : 1;
  return i < t.length ? t.slice(0, Math.max(0, i - 1)).join('') + '…' : t.join('');
};
export const tokensWord = (n: number) => `${n} token${n === 1 ? '' : 's'}`;

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
/** One token tile lying on its back, centred at (x, y), standing on height z. */
const tile = (i: number, x: number, z: number) =>
  `<g class="tile">${box(x - 4.5, Y - 4.5, z, x + 4.5, Y + 4.5, z + 4, PALS[TILE_COLOURS[i % TILE_COLOURS.length]], toneI, .9)}</g>`;

/** The press: a dark bed the strip runs onto, two posts, a red crossbar and a steel head that comes down to cut. The
 * back post goes first and the front post last, so the head and a falling tile sit between them. */
function press(cutting: boolean, fed: boolean, falling: number | null) {
  const x = PRESS, z0 = BH + 4, top = BH + 40, head = cutting ? z0 + 10 : z0 + 22;
  let s = box(x - 7, Y - 14, z0, x + 7, Y - 9, top, METAL, toneI, 1);
  s += box(x - 14, Y - 14, BH, x + 14, Y + 14, z0, DARK, toneI, 1);
  if (fed) s += shape([[x - 14, Y - 6, z0 + .05], [x - 2, Y - 6, z0 + .05], [x - 2, Y + 6, z0 + .05], [x - 14, Y + 6, z0 + .05]], CERAMIC.l, .7);
  if (falling !== null) s += tile(falling, x + 9, z0 + 3);
  s += rod([x, Y, top], [x, Y, head + 8], 1.6, METAL) + box(x - 6, Y - 7, head, x + 6, Y + 7, head + 8, METAL, toneI, 1);
  s += box(x - 8, Y - 15, top, x + 8, Y + 15, top + 6, PALS.tomato, toneI, 1);
  s += box(x - 7, Y + 9, z0, x + 7, Y + 14, top, METAL, toneI, 1);
  return `<g data-prop="press" data-idle="${cutting ? 0 : 1}">${s + hullInk(boxCorners(x - 14, Y - 15, BH, x + 14, Y + 15, top + 6), 2.2)}</g>`;
}

/** The paper strip on the board, running into the press; tick marks across it where a cut could fall. */
function strip() {
  const z = BH + .25, x0 = 8, x1 = PRESS - 14;
  let s = shape([[x0, Y - 6, z], [x1, Y - 6, z], [x1, Y + 6, z], [x0, Y + 6, z]], CERAMIC.l, 1);
  for (let x = x0 + 8; x < x1 - 2; x += 9) s += line([[x, Y - 6, z + .05], [x, Y - 3, z + .05]], .5);
  return `<g data-prop="strip">${s}</g>`;
}

/** The press scene. Shadows, then the belt and strip (floor), then the press and tiles back to front, then the pills. */
export const tokenScene = (o: TokenOpts) => (ctx: SceneCtx) => {
  const st = tokenState(o), scale = o.scale ?? 1, narrow = scale > 1.5;
  let s = castShadow(boxCorners(PRESS - 14, Y - 15, BH, PRESS + 14, Y + 15, BH + 46), BH, ctx.top);
  s += `<g data-prop="belt" data-tiles="${st.shown}">${beltAt(BELT.a, BELT.b, BELT.n, false)}</g>`;
  if (!st.idle) s += strip();
  const tiles = Array.from({ length: st.shown }, (_, i) => ({ at: [TILE0 + i * PITCH, Y, 1], svg: tile(i, TILE0 + i * PITCH, BH + .3) }));
  // more tiles than the belt holds: the next one is still dropping out of the press
  s += byDepth([{ at: [PRESS, Y, 0], svg: press(!st.idle, !st.idle, st.more ? st.shown : null) }, ...tiles]);
  const words = narrow ? 'TEXT' : st.idle ? 'NO TEXT' : `TEXT · “${snippet(o.text)}”`;
  const count = narrow ? 'TOKENS' : `${tokensWord(st.tokens).toUpperCase()}${st.more ? ` · ${st.shown} SHOWN` : ''}`;
  return s + pill([24, Y + 6, BH], narrow ? -14 : -20, narrow ? -34 : 30, words, false, scale)
    + pill([PRESS, Y, BH + 46], 0, -14, 'TOKENIZER', !st.idle, scale)
    + pill([TILE0 + (MAX_TILES - 1) * PITCH, Y + 6, BH], narrow ? -10 : 0, 30, count, false, scale);
};

/** The picture in words, for its aria-label. React escapes it; the drawing escapes the strip's words (esc). */
export function tokenLabel(o: TokenOpts): string {
  const st = tokenState(o);
  if (st.idle) return 'A token press on a workshop board, standing idle: no text fed in, 0 tokens on the belt.';
  return `A token press on a workshop board: a paper strip with the text “${o.text}” feeds the press, which cuts it into `
    + `${tokensWord(st.tokens)}; the tiles drop onto a belt${st.more ? ` (the first ${st.shown} shown)` : ''}.`;
}
