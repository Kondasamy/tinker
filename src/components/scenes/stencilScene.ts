// Module 10's picture: the stencil press (KTD16). Tokens' letterpress stands on the workshop board with the prompt's
// paper strip running off its spool into it, and a stencil stands across its belt: the schema, a sheet with shapes cut
// out of it, held in a frame on two feet. Tiles the model writes pass under the sheet onto the belt; the model's own
// first choice, when the schema blocks it, stops against the frame. With no schema there is no stencil. Words only in
// pills; on phones (scale > 1.5) the pills keep short names and the caption carries the rest. Every string from a token
// or a prompt goes through esc().
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  WOOD,
  box,
  shape,
  on,
  PX,
  rrUV,
  ellUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  vis,
} from '../../lib/iso/core.js';
import { beltAt } from './officeScene';
import { feed, letterpress, tokenTile } from './tokenScene';
import type { Say } from '../story/steps';

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
  /** the step's callout, over one of STENCIL_PARTS */
  say?: Say;
}
/** The parts a step's callout may name: the prompt's strip, the press, the schema plate, the blocked tile and the belt
 * of output tiles. A callout on the plate or the blocked tile stands where it would be, drawn or not. */
export const STENCIL_PARTS = ['strip', 'press', 'plate', 'blocked', 'belt'] as const;

const Y = 60,
  PRESS = 62,
  PLATE = 104,
  TILE0 = 118,
  PITCH = 12,
  MAX_TILES = 9,
  SNIP = 20;
const BELT = { a: [76, Y], b: [234, Y], n: [0, 1] };

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function stencilState(o: StencilOpts) {
  const shown = Math.min(o.written.length, MAX_TILES);
  return {
    written: o.written.length,
    shown,
    hidden: o.written.length - shown,
    plate: o.allowed !== null,
    blocked: o.allowed !== null && !!o.blocked && !o.done,
  };
}

/** A piece for a pill: a leading space as ␣, a new line as ↵, cut to fit. */
export const pieceWord = (s: string) => s.replace(/ /g, '␣').replace(/\n/g, '↵');
const cut = (s: string, n: number) => ([...s].length > n ? '…' + [...s].slice(-(n - 1)).join('') : s);

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The stencil across the belt. Real-object notes: a wooden frame on two splayed feet, its bottom rail clear of the
 * tiles; in it a thin sheet (the schema) with shapes cut through it, a slot, a round hole, a wide window, a notch; the
 * sheet is blue while it blocks the first choice, mint while tokens pass. The footprint is the old plate's. */
function stencil(open: boolean, x = PLATE, y = Y) {
  const z = BH,
    top = BH + 26,
    sheet = open ? PALS.mint : PALS.cobalt,
    sx = vis([1, 0, 0]) ? 1 : -1,
    parts: { box: number[][]; svg: string }[] = [];
  // feet and uprights, one per side, then the rails and the sheet between them
  for (const k of [-1, 1]) {
    const y0 = k < 0 ? y - 14 : y + 11.5,
      y1 = y0 + 2.5;
    parts.push({
      box: [
        [x - 5, y0, z],
        [x + 5, y1, top + 1.5],
      ],
      svg:
        box(x - 5, y0, z, x + 5, y1, z + 1.6, WOOD, toneI, 0.8) +
        box(x - 1.5, y0, z + 1.6, x + 1.5, y1, top + 1.5, WOOD, toneI, 1),
    });
  }
  const fx = x + sx * 0.75,
    cutOut = (uv: number[][]) => shape(on(PX(fx + sx * 0.05), uv), CERAMIC.l, 0.8);
  let sh =
    box(x - 1.5, y - 11.5, z + 9, x + 1.5, y + 11.5, z + 11.5, WOOD, toneI, 1) +
    box(x - 0.75, y - 11.5, z + 11.5, x + 0.75, y + 11.5, top - 1, sheet, toneI, 1);
  // the cut-outs, through the sheet: a wide window the passing tiles show through, and smaller shapes beside it
  sh += cutOut(rrUV(y - 8.5, z + 12.8, y + 0.5, z + 19.5, 1.6, 3));
  sh += cutOut(ellUV(y + 5.5, z + 20.5, 2.6, 2.6, 12));
  sh += cutOut(rrUV(y + 2.5, z + 13, y + 9, z + 15.4, 1.1, 3));
  sh += cutOut([
    [y - 8.5, z + 21.5],
    [y - 3.5, z + 21.5],
    [y - 6, z + 24],
  ]);
  sh += box(x - 1.5, y - 11.5, top - 1, x + 1.5, y + 11.5, top + 1.5, WOOD, toneI, 1);
  parts.push({
    box: [
      [x - 1.5, y - 11.5, z + 9],
      [x + 1.5, y + 11.5, top + 1.5],
    ],
    svg: sh,
  });
  return `<g data-prop="plate">${byDepth(parts) + hullInk(boxCorners(x - 1.5, y - 14, z + 1.6, x + 1.5, y + 14, top + 1.5), 1.6)}</g>`;
}

export const stencilScene = (o: StencilOpts) => (ctx: SceneCtx) => {
  const st = stencilState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    vocab = o.vocab ?? 768;
  let s = castShadow(boxCorners(PRESS - 14, Y - 15, BH, PRESS + 14, Y + 17, BH + 46), BH, ctx.top);
  s += castShadow(boxCorners(4, Y - 9, BH, 14, Y + 9, BH + 12), BH, ctx.top);
  if (st.plate) s += castShadow(boxCorners(PLATE - 1.5, Y - 14, BH, PLATE + 1.5, Y + 14, BH + 27.5), BH, ctx.top);
  s += `<g data-prop="belt" data-tiles="${st.shown}">${beltAt(BELT.a, BELT.b, BELT.n, false)}</g>`;
  s += feed(true, 9, PRESS - 14);
  // the last tiles written, newest nearest the plate's far side
  const first = st.written - st.shown;
  const tiles = Array.from({ length: st.shown }, (_, k) => {
    const x = TILE0 + (st.shown - 1 - k) * PITCH;
    return { at: [x, Y, 1], svg: tokenTile(first + k, x, BH + 0.3) };
  });
  const parts = [{ at: [PRESS, Y, 0], svg: letterpress(!o.done, false, null, PRESS) }, ...tiles];
  if (st.plate) parts.push({ at: [PLATE, Y, 2], svg: stencil(!st.blocked) });
  if (st.blocked)
    parts.push({ at: [PLATE - 7, Y, 1], svg: tokenTile(0, PLATE - 7, BH + 0.3, Y, 'tile blocked', PALS.tomato) });
  s += byDepth(parts);
  const out = o.written.join('');
  s += pill([20, Y + 6, BH], -8, 30, narrow ? 'PROMPT' : `PROMPT · ${cut(o.prompt, SNIP)}`, false, scale);
  s += pill([PRESS, Y, BH + 46], 0, -14, 'LARKSPUR MINI', !o.done, scale);
  if (st.plate)
    s += pill(
      [PLATE, Y - 14, BH + 26],
      0,
      -22,
      narrow || o.hideCount ? 'SCHEMA' : `SCHEMA · ${o.allowed} OF ${vocab} PASS`,
      !st.blocked,
      scale,
    );
  if (st.blocked && !narrow)
    s += pill([PLATE - 7, Y + 5, BH + 4], -6, 30, `BLOCKED · ${pieceWord(o.blocked!)}`, false, scale);
  s += pill(
    [TILE0 + (MAX_TILES - 1) * PITCH, Y + 6, BH],
    narrow ? -10 : -6,
    narrow ? 30 : 30,
    narrow ? 'OUTPUT' : out ? `OUTPUT · ${cut(pieceWord(out), SNIP)}` : 'NOTHING WRITTEN YET',
    !!o.done,
    scale,
  );
  return (
    s +
    sayAt(o.say, 'strip', [20, Y + 6, BH], 30, scale) +
    sayAt(o.say, 'press', [PRESS, Y, BH + 46], -14, scale) +
    sayAt(o.say, 'plate', [PLATE, Y - 14, BH + 26], -22, scale) +
    sayAt(o.say, 'blocked', [PLATE - 7, Y + 5, BH + 4], 30, scale) +
    sayAt(o.say, 'belt', [TILE0 + (MAX_TILES - 1) * PITCH, Y + 6, BH], 30, scale)
  );
};

/** The picture in words, for its aria-label. React escapes it. */
export function stencilLabel(o: StencilOpts): string {
  const st = stencilState(o),
    out = o.written.join('');
  const plateWords = st.plate
    ? ` A stencil plate, the schema, stands across the belt${o.hideCount ? '' : ` and lets ${o.allowed} of ${o.vocab ?? 768} tokens through at this step`}.`
    : ' No schema: nothing stands across the belt.';
  const blocked = st.blocked ? ` The model's first choice, “${o.blocked}”, is blocked and stops at the plate.` : '';
  return (
    `A token press, Larkspur mini, reads the prompt “${o.prompt}” and drops tiles onto a belt.${plateWords}${blocked} ` +
    (out
      ? `Written so far, ${o.written.length} token${o.written.length === 1 ? '' : 's'}: “${out}”${o.done ? ', finished' : ''}.`
      : 'Nothing written yet.')
  );
}

/** The home hero's plot (KTD16): a small press, a short belt across a blue stencil, a tomato tile stopped before it and
 * two tiles past it. (x, y) is the plot's centre. */
export const stencilPlot = (x: number, y: number, top: SceneCtx['top']) => {
  const px = x - 10,
    gx = x + 14;
  return (
    castShadow(boxCorners(px - 14, y - 15, BH, px + 14, y + 15, BH + 30), BH, top) +
    beltAt([px + 14, y], [x + 34, y], [0, 1], false) +
    byDepth([
      { at: [px, y, 0], svg: letterpress(true, false, null, px, y, 24) },
      { at: [gx - 6, y, 1], svg: tokenTile(0, gx - 6, BH + 0.3, y, 'tile blocked', PALS.tomato) },
      { at: [gx, y, 2], svg: stencil(false, gx, y) },
      ...[0, 1].map(i => ({ at: [gx + 7 + i * 9, y, 1], svg: tokenTile(i + 1, gx + 7 + i * 9, BH + 0.3, y) })),
    ])
  );
};
