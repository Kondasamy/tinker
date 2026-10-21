// Module 10's picture: the stencil press (KTD16). Tokens' press stands on the workshop board with the prompt's paper
// strip feeding it, and a stencil plate stands across its belt: the schema. Tiles the model writes pass through the
// plate onto the belt; the model's own first choice, when the schema blocks it, stops against the plate. With no
// schema there is no plate. Words only in pills; on phones (scale > 1.5) the pills keep short names and the caption
// carries the rest. Every string from a token or a prompt goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc } from '../../lib/iso/blocks';
import { PALS, METAL, CERAMIC, DARK, box, rod, shape, line, castShadow, hullInk, toneI, tag, byDepth } from '../../lib/iso/core.js';
import { beltAt } from './officeScene';
import { TILE_COLOURS } from './tokenScene';

export const STENCIL_BOARD: Board = [0, 0, 240, 120];

export interface StencilOpts {
  /** the prompt on the paper strip */
  prompt: string;
  /** the tokens written so far, as text */
  written: string[];
  /** how many of the vocabulary the schema lets through at this step; null: no schema, no plate */
  allowed: number | null;
  /** keep the count out of the picture (while a prediction about it is open) */
  hideCount?: boolean;
  /** the vocabulary's size */
  vocab?: number;
  /** the model's own first choice when the schema blocks it, as text; it stops at the plate */
  blocked?: string | null;
  /** the answer is finished (the schema accepted it, or no more room) */
  done?: boolean;
  scale?: number;
}

const Y = 60, PRESS = 62, PLATE = 104, TILE0 = 118, PITCH = 12, MAX_TILES = 9, SNIP = 20;
const BELT = { a: [76, Y], b: [234, Y], n: [0, 1] };

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function stencilState(o: StencilOpts) {
  const shown = Math.min(o.written.length, MAX_TILES);
  return { written: o.written.length, shown, hidden: o.written.length - shown, plate: o.allowed !== null, blocked: o.allowed !== null && !!o.blocked && !o.done };
}

/** A piece for a pill: a leading space as ␣, a new line as ↵, cut to fit. */
export const pieceWord = (s: string) => s.replace(/ /g, '␣').replace(/\n/g, '↵');
const cut = (s: string, n: number) => ([...s].length > n ? '…' + [...s].slice(-(n - 1)).join('') : s);

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
const tile = (i: number, x: number, z: number, cls = 'tile', mat = PALS[TILE_COLOURS[i % TILE_COLOURS.length]]) =>
  `<g class="${cls}">${box(x - 4.5, Y - 4.5, z, x + 4.5, Y + 4.5, z + 4, mat, toneI, .9)}</g>`;

/** Tokens' press (drawn as tokenScene draws it): a dark bed, two posts, a red crossbar and a steel head. */
function press(cutting: boolean, x = PRESS, y = Y, h = 40) {
  const z0 = BH + 4, top = BH + h, head = cutting ? z0 + 10 : z0 + 22;
  let s = box(x - 7, y - 14, z0, x + 7, y - 9, top, METAL, toneI, 1);
  s += box(x - 14, y - 14, BH, x + 14, y + 14, z0, DARK, toneI, 1);
  s += rod([x, y, top], [x, y, head + 8], 1.6, METAL) + box(x - 6, y - 7, head, x + 6, y + 7, head + 8, METAL, toneI, 1);
  s += box(x - 8, y - 15, top, x + 8, y + 15, top + 6, PALS.tomato, toneI, 1);
  s += box(x - 7, y + 9, z0, x + 7, y + 14, top, METAL, toneI, 1);
  return `<g data-prop="press" data-idle="${cutting ? 0 : 1}">${s + hullInk(boxCorners(x - 14, y - 15, BH, x + 14, y + 15, top + 6), 2.2)}</g>`;
}

/** The stencil plate across the belt: two posts and a plate with a window cut in it, lit while tokens pass. */
function plate(open: boolean) {
  const x = PLATE, z = BH, top = BH + 26;
  let s = box(x - 1.5, Y - 14, z, x + 1.5, Y - 11, top, METAL, toneI, 1) + box(x - 1.5, Y + 11, z, x + 1.5, Y + 14, top, METAL, toneI, 1);
  s += box(x - 1, Y - 11, z + 10, x + 1, Y + 11, top, open ? PALS.mint : PALS.cobalt, toneI, 1);
  // the window the allowed tiles pass under
  s += shape([[x + 1.05, Y - 6, z + 10.5], [x + 1.05, Y + 6, z + 10.5], [x + 1.05, Y + 6, z + 18], [x + 1.05, Y - 6, z + 18]], CERAMIC.l, .8);
  return `<g data-prop="plate">${s + hullInk(boxCorners(x - 1.5, Y - 14, z, x + 1.5, Y + 14, top), 1.8)}</g>`;
}

/** The prompt's paper strip, running into the press. */
function strip() {
  const z = BH + .25, x0 = 6, x1 = PRESS - 14;
  let s = shape([[x0, Y - 6, z], [x1, Y - 6, z], [x1, Y + 6, z], [x0, Y + 6, z]], CERAMIC.l, 1);
  for (let x = x0 + 8; x < x1 - 2; x += 9) s += line([[x, Y - 6, z + .05], [x, Y - 3, z + .05]], .5);
  return `<g data-prop="strip">${s}</g>`;
}

export const stencilScene = (o: StencilOpts) => (ctx: SceneCtx) => {
  const st = stencilState(o), scale = o.scale ?? 1, narrow = scale > 1.5, vocab = o.vocab ?? 768;
  let s = castShadow(boxCorners(PRESS - 14, Y - 15, BH, PRESS + 14, Y + 15, BH + 46), BH, ctx.top);
  s += `<g data-prop="belt" data-tiles="${st.shown}">${beltAt(BELT.a, BELT.b, BELT.n, false)}</g>`;
  s += strip();
  // the last tiles written, newest nearest the plate's far side
  const first = st.written - st.shown;
  const tiles = Array.from({ length: st.shown }, (_, k) => {
    const x = TILE0 + (st.shown - 1 - k) * PITCH;
    return { at: [x, Y, 1], svg: tile(first + k, x, BH + .3) };
  });
  const parts = [{ at: [PRESS, Y, 0], svg: press(!o.done) }, ...tiles];
  if (st.plate) parts.push({ at: [PLATE, Y, 2], svg: plate(!st.blocked) });
  if (st.blocked) parts.push({ at: [PLATE - 7, Y, 1], svg: tile(0, PLATE - 7, BH + .3, 'tile blocked', PALS.tomato) });
  s += byDepth(parts);
  const out = o.written.join('');
  s += pill([20, Y + 6, BH], -8, 30, narrow ? 'PROMPT' : `PROMPT · ${cut(o.prompt, SNIP)}`, false, scale);
  s += pill([PRESS, Y, BH + 46], 0, -14, 'LARKSPUR MINI', !o.done, scale);
  if (st.plate) s += pill([PLATE, Y - 14, BH + 26], 0, -22, narrow || o.hideCount ? 'SCHEMA' : `SCHEMA · ${o.allowed} OF ${vocab} PASS`, !st.blocked, scale);
  if (st.blocked && !narrow) s += pill([PLATE - 7, Y + 5, BH + 4], -6, 30, `BLOCKED · ${pieceWord(o.blocked!)}`, false, scale);
  s += pill([TILE0 + (MAX_TILES - 1) * PITCH, Y + 6, BH], narrow ? -10 : -6, narrow ? 30 : 30,
    narrow ? 'OUTPUT' : out ? `OUTPUT · ${cut(pieceWord(out), SNIP)}` : 'NOTHING WRITTEN YET', !!o.done, scale);
  return s;
};

/** The picture in words, for its aria-label. React escapes it. */
export function stencilLabel(o: StencilOpts): string {
  const st = stencilState(o), out = o.written.join('');
  const plateWords = st.plate ? ` A stencil plate, the schema, stands across the belt${o.hideCount ? '' : ` and lets ${o.allowed} of ${o.vocab ?? 768} tokens through at this step`}.` : ' No schema: nothing stands across the belt.';
  const blocked = st.blocked ? ` The model's first choice, “${o.blocked}”, is blocked and stops at the plate.` : '';
  return `A token press, Larkspur mini, reads the prompt “${o.prompt}” and drops tiles onto a belt.${plateWords}${blocked} `
    + (out ? `Written so far, ${o.written.length} token${o.written.length === 1 ? '' : 's'}: “${out}”${o.done ? ', finished' : ''}.` : 'Nothing written yet.');
}
