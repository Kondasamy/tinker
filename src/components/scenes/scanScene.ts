// Module 16's picture: the scanning table (KTD16). On the workshop board a document (or a photo print) lies under a camera
// on a jointed arm, with a patch grid drawn over it; a warehouse worker stands by it holding the broken bracket. Read by vision, the patches drop onto a belt as token tiles (coloured in turn,
// as Tokens' press drops them) and ride into the model (RAG's LLM block, composed); read by OCR, a strip of text rides the
// belt instead. Before a reading the belt is empty. Words only in pills; on phones (scale > 1.5) the pills keep short
// names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, renderers, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  box,
  cyl,
  rod,
  shape,
  line,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { SKIN, hexa, mini, person, shaded, type Item, type Look, drawPieces } from '../../lib/iso/figures';
import { image, type ImageId } from '../../lib/multimodal/images';
import { costOf, sent, METHOD_NAME, type Method } from '../../lib/multimodal/readings';
import { thousands } from '../../lib/multimodal/patches';
import { beltAt } from './officeScene';
import { TILE_COLOURS } from './tokenScene';
import type { Say } from '../story/steps';

export const SCAN_BOARD: Board = [0, 0, 240, 120];

export interface ScanOpts {
  image: ImageId;
  /** the long edge it is sent at, px */
  size: number;
  /** how it is read; null before a reading (the belt stands empty) */
  method: Method | null;
  /** pill size; phones pass more */
  scale?: number;
  /** the step's callout, over one of SCAN_PARTS */
  say?: Say;
}
/** The parts a step's callout may name: the sheet, the camera and the belt to the model. */
export const SCAN_PARTS = ['sheet', 'camera', 'belt'] as const;

const Y = 65,
  CAM = [38, 65],
  BELT = { a: [70, Y], b: [178, Y], n: [0, 1] },
  TILE0 = 80,
  PITCH = 11,
  MAX_TILES = 9,
  MODEL = [206, Y];
/** Most grid lines drawn across the sheet each way: the picture shows the idea; the Patches tab has every patch. */
export const MAX_LINES = 12;

/** What the table shows. Pure, so the tests can check it without drawing. */
export function scanState({ image: id, size, method }: ScanOpts) {
  const im = image(id),
    s = sent(id, size),
    c = s.count,
    tokens = method ? costOf(id, size, method) : c.tokens;
  return {
    title: im.title,
    photo: id.startsWith('part') || id === 'label',
    w: s.w,
    h: s.h,
    read: c,
    method,
    // vision reads the image's tokens; OCR hands the model text, counted with the site tokenizer
    tokens,
    tiles: method === 'vision' ? Math.min(MAX_TILES, c.tokens) : 0,
    strip: method === 'ocr',
    lines: { cols: Math.min(MAX_LINES, c.cols), rows: Math.min(MAX_LINES, c.rows) },
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
const tile = (i: number, x: number) =>
  `<g class="tile">${box(x - 4.5, Y - 4.5, BH + 0.3, x + 4.5, Y + 4.5, BH + 4.3, PALS[TILE_COLOURS[i % TILE_COLOURS.length]], toneI, 0.9)}</g>`;

/** The sheet on the table: portrait for documents, landscape for photos; a few printed rows and the patch grid on top. */
function sheet(photo: boolean, cols: number, rows: number) {
  const [cx, cy] = CAM,
    hw = photo ? 26 : 20,
    hh = photo ? 20 : 27,
    z = BH + 1;
  const x0 = cx - hw,
    x1 = cx + hw,
    y0 = cy - hh,
    y1 = cy + hh;
  let s = box(x0, y0, BH, x1, y1, z, photo ? PALS.cobalt : CERAMIC, toneI, 1);
  if (photo)
    s += shape(
      [
        [x0 + 4, y0 + 4, z + 0.02],
        [x1 - 4, y0 + 4, z + 0.02],
        [x1 - 4, y1 - 4, z + 0.02],
        [x0 + 4, y1 - 4, z + 0.02],
      ],
      METAL.l,
      0.6,
    );
  else
    for (let i = 0; i < 6; i++)
      s += line(
        [
          [x0 + 5, y0 + 6 + i * 7, z + 0.03],
          [x1 - (i % 3 ? 8 : 4), y0 + 6 + i * 7, z + 0.03],
        ],
        0.7,
      );
  // the grid's lines run across x (columns) and y (rows) of the sheet
  for (let i = 1; i < cols; i++) {
    const x = x0 + ((x1 - x0) * i) / cols;
    s += line(
      [
        [x, y0, z + 0.05],
        [x, y1, z + 0.05],
      ],
      0.35,
    ).replace('stroke="#231e16"', `stroke="${PALS.tomato.d}"`);
  }
  for (let j = 1; j < rows; j++) {
    const y = y0 + ((y1 - y0) * j) / rows;
    s += line(
      [
        [x0, y, z + 0.05],
        [x1, y, z + 0.05],
      ],
      0.35,
    ).replace('stroke="#231e16"', `stroke="${PALS.tomato.d}"`);
  }
  return {
    box: [
      [x0, y0, BH],
      [x1, y1, z],
    ],
    svg: `<g data-prop="sheet" data-cols="${cols}" data-rows="${rows}">${s + hullInk(boxCorners(x0, y0, BH, x1, y1, z), 1.6)}</g>`,
  };
}

// the arm: a weighted base off the sheet's far corner (so the arm reads across the view), shoulder, elbow and wrist
// joints, the camera head over the sheet's middle
const BASE = [70, 20],
  SH = [70, 20, BH + 6],
  EL = [67, 25, BH + 56],
  WR = [45, 59, BH + 61],
  CAM_TOP = BH + 64;
// joint bolts run across the arm's plane (base to camera), so each hub reads as a drum from the side
const ACROSS = (() => {
  const d = [CAM[0] - BASE[0], CAM[1] - BASE[1]],
    l = Math.hypot(d[0], d[1]);
  return [-d[1] / l, d[0] / l, 0];
})();
const hub = (j: number[], r: number) =>
  rod(
    j.map((v, k) => v - ACROSS[k] * 2.4),
    j.map((v, k) => v + ACROSS[k] * 2.4),
    r,
    DARK,
    toneI,
    1,
  );
const ptsBox = (pts: number[][]): number[][] =>
  [0, 1].map(e => [0, 1, 2].map(k => (e ? Math.max : Math.min)(...pts.map(p => p[k]))));
const ARM_PTS = {
  lower: [
    [BASE[0] - 6, BASE[1] - 6, BH],
    [BASE[0] + 6, BASE[1] + 6, BH + 6],
    [EL[0] - 3, EL[1] - 3, EL[2] - 3],
    [EL[0] + 3, EL[1] + 3, EL[2] + 3],
  ],
  upper: [
    [EL[0] + 1, EL[1] + 1, EL[2] - 2],
    [WR[0], WR[1], WR[2] + 2],
  ],
  head: [
    [CAM[0] - 8, CAM[1] - 7, BH + 49],
    [CAM[0] + 7, CAM[1] + 6, CAM_TOP + 3],
  ],
};

/** The camera on a jointed arm (after the upstream desk lamp). Real-object notes: a heavy round base with a swivel
 * collar; a lower and an upper steel tube jointed at shoulder, elbow and wrist by bolted hubs; a dark camera body
 * hanging from the wrist, its lens barrel pointing straight down at the sheet; a tally light on top, lit while it
 * reads. Three items, so the sheet and the belt sort against each stretch of the arm. */
function camera(on: boolean): Item[] {
  const [cx, cy] = CAM,
    [bx, by] = BASE;
  const lower =
    cyl(bx, by, BH, BH + 3, 6, DARK, toneI, 1.4, 20) +
    cyl(bx, by, BH + 3, SH[2], 2.6, METAL, toneI, 1, 14) +
    rod(SH, EL, 1.6, METAL, toneI, 1.1) +
    hub(SH, 2.6);
  const upper = rod(EL, WR, 1.5, METAL, toneI, 1.1) + hub(EL, 2.6);
  const head =
    hub(WR, 2.2) +
    cyl(cx, cy, BH + 50, CAM_TOP - 8, 3.4, on ? PALS.mustard : DARK, toneI, 1) +
    box(cx - 7, cy - 6, CAM_TOP - 8, cx + 7, cy + 6, CAM_TOP + 1, DARK, toneI, 1.2) +
    box(cx - 3, cy - 6.5, CAM_TOP - 6, cx + 3, cy - 2, CAM_TOP - 1, METAL, toneI, 0.8) +
    cyl(cx + 3.5, cy + 3, CAM_TOP + 1, CAM_TOP + 2.4, 1.4, on ? PALS.tomato : DARK, toneI, 0.8, 10);
  const g = (svg: string) => `<g data-prop="camera" data-on="${on ? 1 : 0}">${svg}</g>`;
  return [
    { box: ptsBox(ARM_PTS.lower), svg: g(lower) },
    { box: ptsBox(ARM_PTS.upper), svg: g(upper) },
    { box: ptsBox(ARM_PTS.head), svg: g(head) },
  ];
}

/** The warehouse worker who brought the broken part: hi-vis vest, beanie, the snapped bracket held out in both hands. */
const WORKER: Look = {
  skin: SKIN[2],
  top: '#c6d84e',
  legs: '#3b4566',
  hair: '#2b231c',
  cut: 'short',
  hat: 'beanie',
  hatCol: PALS.cobalt.m,
};
const W_AT = [12, 102],
  W_FACING = 20;
/** The broken bracket: a steel L, its long arm snapped off short with a bright break, held at the worker's hands. */
function bracket(): Item {
  const t = (W_FACING * Math.PI) / 180,
    F = [Math.cos(t), Math.sin(t), 0],
    S = [-Math.sin(t), Math.cos(t), 0],
    O = [W_AT[0], W_AT[1], BH],
    at = (a: number, b: number, c: number) => [0, 1, 2].map(k => O[k] + F[k] * a + S[k] * b + (k === 2 ? c : 0));
  const slab = (a0: number, a1: number, b0: number, b1: number, c0: number, c1: number) => [
    at(a0, b0, c0),
    at(a1, b0, c0),
    at(a1, b1, c0),
    at(a0, b1, c0),
    at(a0, b0, c1),
    at(a1, b0, c1),
    at(a1, b1, c1),
    at(a0, b1, c1),
  ];
  const foot = slab(6, 9, -4.5, 3.5, 17.4, 18.4),
    leg = slab(6, 7, -4.5, -3.5, 18.4, 25),
    stub = slab(6, 7, 2.5, 3.5, 18.4, 21);
  const svg =
    hexa(foot, METAL, 0.9) +
    hexa(leg, METAL, 0.9) +
    hexa(stub, METAL, 0.9) +
    shape([at(6, 2.5, 21), at(7, 2.5, 21), at(7, 3.5, 22.2), at(6, 3.5, 22.2)], PALS.tomato.l, 0.8);
  return { box: ptsBox([...foot, ...leg, ...stub]), svg: `<g data-prop="part">${svg}</g>` };
}

/** The text strip OCR hands on: a paper ribbon along the belt with ruled marks for words. */
function strip() {
  const z = BH + 0.4,
    x0 = BELT.a[0] + 6,
    x1 = BELT.b[0] - 10;
  let s = shape(
    [
      [x0, Y - 5, z],
      [x1, Y - 5, z],
      [x1, Y + 5, z],
      [x0, Y + 5, z],
    ],
    CERAMIC.l,
    0.9,
  );
  for (let x = x0 + 4; x < x1 - 6; x += 10)
    s += line(
      [
        [x, Y - 1, z + 0.05],
        [x + 6, Y - 1, z + 0.05],
      ],
      0.6,
    );
  return `<g data-prop="strip">${s}</g>`;
}

/** The table. Shadows, then the belt (floor), then the parts back to front, then the pills. */
export const scanScene = (o: ScanOpts) => (ctx: SceneCtx) => {
  const st = scanState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const cam = camera(st.method === 'vision'),
    worker = person({ x: W_AT[0], y: W_AT[1], facing: W_FACING, pose: 'carry', look: WORKER, holding: null }),
    part = bracket();
  const shade = (b: number[][]) =>
    castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH, ctx.top);
  // every shadow first (the floor layer), then one sort over every item
  let s =
    [...cam, part].map(i => shade(i.box)).join('') +
    worker.shadow +
    castShadow(boxCorners(mx - 17, my - 17, BH, mx + 17, my + 17, BH + 32), BH, ctx.top);
  s += `<g data-prop="belt" data-tiles="${st.tiles}">${beltAt(BELT.a, BELT.b, BELT.n, false)}</g>`;
  if (st.strip) s += strip();
  const tiles = Array.from({ length: st.tiles }, (_, i) => ({
    box: [
      [TILE0 + i * PITCH - 4.5, Y - 4.5, BH + 0.3],
      [TILE0 + i * PITCH + 4.5, Y + 4.5, BH + 4.3],
    ],
    svg: tile(i, TILE0 + i * PITCH),
  }));
  const state = st.method ? 'ok' : undefined;
  s += byDepth([
    sheet(st.photo, st.lines.cols, st.lines.rows),
    ...cam,
    ...worker.items,
    part,
    {
      box: [
        [mx - 17, my - 17, BH],
        [mx + 17, my + 17, BH + 35],
      ],
      svg: `<g class="model">${renderers.llm({ x: mx, y: my, state })}</g>`,
    },
    ...tiles,
  ]);
  const name = st.title.toUpperCase();
  const doc = narrow ? name.split(' ').pop()! : `${name} · ${st.w}×${st.h}`;
  const how = st.method ? METHOD_NAME[st.method].toUpperCase() : 'NOT READ YET';
  const count = narrow
    ? 'TOKENS'
    : st.method === 'ocr'
      ? `${thousands(st.tokens)} TEXT TOKENS`
      : `${thousands(st.read.tokens)} IMAGE TOKENS`;
  return (
    s +
    pill([CAM[0] + 10, CAM[1] + 25, BH + 1], narrow ? 0 : 10, narrow ? 34 : 30, doc, false, scale) +
    pill([CAM[0], CAM[1], BH + 66], 0, -12, narrow && !st.method ? '—' : how, !!st.method, scale) +
    pill([BELT.b[0] - 30, Y + 6, BH], 0, narrow ? 34 : 30, count, false, scale) +
    sayAt(o.say, 'sheet', [CAM[0] + 10, CAM[1] + 25, BH + 1], narrow ? 34 : 30, scale, narrow) +
    sayAt(o.say, 'camera', [CAM[0], CAM[1], BH + 66], -12, scale, narrow) +
    sayAt(o.say, 'belt', [BELT.b[0] - 30, Y + 6, BH], narrow ? 34 : 30, scale, narrow)
  );
};

/** The picture in words, for its aria-label. */
export function scanLabel(o: ScanOpts): string {
  const st = scanState(o);
  const head = `A scanning table: the ${st.title.toLowerCase()} lies under a camera, sent at ${st.w} × ${st.h} px${st.read.downscaled ? ` (scaled down to ${st.read.w} × ${st.read.h} to fit the model’s limits)` : ''}, cut into ${st.read.cols} × ${st.read.rows} patches.`;
  if (!st.method) return `${head} It has not been read yet; the belt to the model is empty.`;
  return st.method === 'vision'
    ? `${head} Read by vision: ${thousands(st.read.tokens)} image tokens ride the belt into the model.`
    : `${head} Read by OCR: a strip of text, ${thousands(st.tokens)} text tokens, rides the belt into the model instead of the image.`;
}

/** The home hero's plot: the camera on its jointed arm over the sheet, in miniature, the worker holding the broken
 * part, and three image tokens. */
export function scanPlot(x: number, y: number, top: SceneCtx['top']): string {
  const from = [CAM[0] + 8, CAM[1] - 10, BH],
    to = [x - 8, y - 6, BH],
    k = 0.36,
    worker = person({ x: W_AT[0], y: W_AT[1], facing: W_FACING, pose: 'carry', look: WORKER, holding: null }),
    tiles = [0, 1, 2].map(i => ({
      box: [
        [x + 6 + i * 10, y + 10, BH + 0.3],
        [x + 14 + i * 10, y + 18, BH + 4],
      ],
      svg: box(x + 6 + i * 10, y + 10, BH + 0.3, x + 14 + i * 10, y + 18, BH + 4, PALS[TILE_COLOURS[i]], toneI, 0.9),
    })),
    pieces = [
      mini(shaded([sheet(false, 3, 4), ...camera(true)]), from, to, k),
      mini({ shadow: worker.shadow, items: [...worker.items, bracket()] }, [...W_AT, BH], [x - 18, y + 10, BH], 0.5),
      { shadow: '', items: tiles },
    ];
  return drawPieces(pieces, top);
}
