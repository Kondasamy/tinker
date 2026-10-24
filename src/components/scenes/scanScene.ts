// Module 16's picture: the scanning table (KTD16). On the workshop board a document (or a photo print) lies under a camera
// on a post, with a patch grid drawn over it. Read by vision, the patches drop onto a belt as token tiles (coloured in turn,
// as Tokens' press drops them) and ride into the model (RAG's LLM block, composed); read by OCR, a strip of text rides the
// belt instead. Before a reading the belt is empty. Words only in pills; on phones (scale > 1.5) the pills keep short
// names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, renderers, sayTag } from '../../lib/iso/blocks';
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
import { image, type ImageId } from '../../lib/multimodal/images';
import { costOf, sent, METHOD_NAME, type Method } from '../../lib/multimodal/readings';
import { thousands } from '../../lib/multimodal/patches';
import { beltAt } from './officeScene';
import { TILE_COLOURS } from './tokenScene';

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
  say?: { block: string; text: string };
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
  return `<g data-prop="sheet" data-cols="${cols}" data-rows="${rows}">${s + hullInk(boxCorners(x0, y0, BH, x1, y1, z), 1.6)}</g>`;
}

/** The camera: a post behind the sheet, an arm over it, and a dark body looking down with its lens. Lit when reading. */
function camera(on: boolean) {
  const [cx, cy] = CAM,
    px = cx - 30,
    py = cy - 30,
    top = BH + 64;
  let s = box(px - 3, py - 3, BH, px + 3, py + 3, top, METAL, toneI, 1);
  s += rod([px, py, top - 2], [cx, cy, top - 2], 1.4, METAL);
  s += cyl(cx, cy, top - 14, top - 8, 3.4, on ? PALS.mustard : DARK, toneI, 1);
  s += box(cx - 7, cy - 6, top - 8, cx + 7, cy + 6, top + 1, DARK, toneI, 1);
  return `<g data-prop="camera" data-on="${on ? 1 : 0}">${s}</g>`;
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
  let s =
    castShadow(boxCorners(CAM[0] - 33, CAM[1] - 33, BH, CAM[0] - 27, CAM[1] - 27, BH + 64), BH, ctx.top) +
    castShadow(boxCorners(mx - 17, my - 17, BH, mx + 17, my + 17, BH + 32), BH, ctx.top);
  s += `<g data-prop="belt" data-tiles="${st.tiles}">${beltAt(BELT.a, BELT.b, BELT.n, false)}</g>`;
  if (st.strip) s += strip();
  const tiles = Array.from({ length: st.tiles }, (_, i) => ({
    at: [TILE0 + i * PITCH, Y, 1],
    svg: tile(i, TILE0 + i * PITCH),
  }));
  const state = st.method ? 'ok' : undefined;
  s += byDepth([
    { at: [CAM[0], CAM[1], 0], svg: sheet(st.photo, st.lines.cols, st.lines.rows) },
    { at: [CAM[0] - 30, CAM[1] - 30, 2], svg: camera(st.method === 'vision') },
    { at: [mx, my, 0], svg: `<g class="model">${renderers.llm({ x: mx, y: my, state })}</g>` },
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
  // sayAt's phone rule, keyed to narrow: desktop pills here are already 1.2
  const say = (part: string, p: number[], dy: number) =>
    o.say?.block === part && (!narrow || o.say.text.length <= 16) ? sayTag(p, o.say.text, scale, dy - 24) : '';
  return (
    s +
    pill([CAM[0] + 10, CAM[1] + 25, BH + 1], narrow ? 0 : 10, narrow ? 34 : 30, doc, false, scale) +
    pill([CAM[0], CAM[1], BH + 66], 0, -12, narrow && !st.method ? '—' : how, !!st.method, scale) +
    pill([BELT.b[0] - 30, Y + 6, BH], 0, narrow ? 34 : 30, count, false, scale) +
    say('sheet', [CAM[0] + 10, CAM[1] + 25, BH + 1], narrow ? 34 : 30) +
    say('camera', [CAM[0], CAM[1], BH + 66], -12) +
    say('belt', [BELT.b[0] - 30, Y + 6, BH], narrow ? 34 : 30)
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

/** The home hero's plot (heroScene): a small scanning table at (x, y): a sheet with a grid, a camera post, three tiles. */
export function scanPlot(x: number, y: number, top: SceneCtx['top']): string {
  const z = BH + 1;
  let sheetSvg = box(x - 12, y - 14, BH, x + 4, y + 8, z, CERAMIC, toneI, 1);
  for (let i = 1; i < 3; i++)
    sheetSvg +=
      line(
        [
          [x - 12 + (i * 16) / 3, y - 14, z + 0.05],
          [x - 12 + (i * 16) / 3, y + 8, z + 0.05],
        ],
        0.5,
      ) +
      line(
        [
          [x - 12, y - 14 + (i * 22) / 3, z + 0.05],
          [x + 4, y - 14 + (i * 22) / 3, z + 0.05],
        ],
        0.5,
      );
  sheetSvg += hullInk(boxCorners(x - 12, y - 14, BH, x + 4, y + 8, z), 1.4);
  const post =
    box(x - 18, y - 20, BH, x - 14, y - 16, BH + 26, METAL, toneI, 1) +
    box(x - 9, y - 8, BH + 20, x + 1, y + 2, BH + 26, DARK, toneI, 1);
  return (
    castShadow(boxCorners(x - 18, y - 20, BH, x - 14, y - 16, BH + 26), BH, top) +
    byDepth([
      { at: [x - 4, y - 3, 0], svg: sheetSvg },
      { at: [x - 16, y - 18, 1], svg: post },
      ...[0, 1, 2].map(i => ({
        at: [x + 10 + i * 10, y + 14, 1],
        svg: `<g>${box(x + 6 + i * 10, y + 10, BH + 0.3, x + 14 + i * 10, y + 18, BH + 4, PALS[TILE_COLOURS[i]], toneI, 0.9)}</g>`,
      })),
    ])
  );
}
