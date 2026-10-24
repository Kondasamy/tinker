// Diffusion's picture: the darkroom (KTD15). A developing tray holds the current print: the 32×32 drawing, its pixels
// shaded in a few greys (so noise shows as speckle), or the 2-D dots with the ideal denoiser's training points as rings.
// A step dial stands beside it, its pointer on the step count, and a label card names the part asked for and the
// guidance. A red safelight hangs at the back. Words only in pills; on phones (scale > 1.5) the pills keep names and the
// caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  INK,
  METAL,
  PALS,
  box,
  byDepth,
  castShadow,
  cyl,
  f,
  hullInk,
  line,
  mix,
  P,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { SIZE, type Label } from '../../lib/diffusion/drawings';
import { STEPS } from '../../lib/diffusion/schedule';
import type { Say } from '../story/steps';

export const DARK_BOARD: Board = [0, 0, 200, 120];

/** What lies in the tray: pixels (values about -1 paper to 1 ink), or dots with optional training rings. `name` is its
 * short pill (a part's name, NOISE, DOTS). */
export type Print =
  | { kind: 'pixels'; px: ArrayLike<number>; name: string }
  | { kind: 'points'; pts: [number, number][]; train?: [number, number][]; name: string };

export interface DarkroomOpts {
  print?: Print;
  /** the step count the dial is set to */
  steps: number;
  /** steps taken so far, while a sample develops */
  done?: number;
  /** the part asked for; null or undefined for none */
  label?: Label | null;
  guidance?: number;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}
/** The parts a step's callout may name. */
export const DARKROOM_PARTS = ['tray', 'dial', 'label'] as const;

const TRAY = { x0: 30, y0: 22, x1: 114, y1: 106 },
  INNER = 6,
  RIM = 7,
  DIAL = [160, 40],
  CARD = [160, 88],
  LAMP = [22, 14];
/** Greys a pixel is shaded in, paper to ink. */
const LEVELS = 6;
const GREYS = Array.from({ length: LEVELS }, (_, i) => mix(CERAMIC.l, INK, i / (LEVELS - 1)));

/** The dial's pointer angle in degrees for a step count: the STEPS notches spread over 240°, fewest on the left. */
export const dialAngle = (steps: number) => {
  const i = Math.max(0, STEPS.indexOf(steps as (typeof STEPS)[number]));
  return -120 + (240 * i) / (STEPS.length - 1);
};

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale)}</g>`;

/** The print's area on the liquid surface. */
const area = () => ({
  x0: TRAY.x0 + INNER,
  y0: TRAY.y0 + INNER,
  x1: TRAY.x1 - INNER,
  y1: TRAY.y1 - INNER,
  z: BH + RIM - 2,
});
const quad = (x0: number, y0: number, x1: number, y1: number, z: number) =>
  'M' +
  [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]
    .map(([x, y]) => {
      const q = P(x, y, z);
      return `${f(q[0])} ${f(q[1])}`;
    })
    .join('L') +
  'Z';

/** The 32×32 pixels as one path per grey (paper is the tray's own white). */
function pixels(px: ArrayLike<number>) {
  const a = area(),
    c = (a.x1 - a.x0) / SIZE,
    paths: string[] = Array.from({ length: LEVELS }, () => '');
  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE; i++) {
      const v = Math.max(-1, Math.min(1, px[j * SIZE + i])),
        g = Math.round(((v + 1) / 2) * (LEVELS - 1));
      if (g > 0) paths[g] += quad(a.x0 + i * c, a.y0 + j * c, a.x0 + (i + 1) * c, a.y0 + (j + 1) * c, a.z + 0.05);
    }
  return `<g data-print="pixels">${paths.map((d, g) => (d ? `<path d="${d}" fill="${GREYS[g]}"/>` : '')).join('')}</g>`;
}

/** Points in the toy's plane (about -1.1 to 1.1, y up) placed on the print area. */
const at = ([x, y]: [number, number]) => {
  const a = area(),
    h = (a.x1 - a.x0) / 2;
  return [a.x0 + h + x * h * 0.85, a.y0 + h - y * h * 0.85];
};
function points(pts: [number, number][], train: [number, number][] = []) {
  const a = area(),
    r = 0.7;
  let dots = '';
  for (const p of pts) {
    const [x, y] = at(p);
    if (x < a.x0 || x > a.x1 || y < a.y0 || y > a.y1) continue;
    dots += quad(x - r, y - r, x + r, y + r, a.z + 0.05);
  }
  const rings = train
    .map(p => {
      const [x, y] = at(p),
        q = P(x, y, a.z + 0.1);
      return `<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="3.2" ry="1.9" fill="none" stroke="${PALS.tomato.d}" stroke-width="1.1"/>`;
    })
    .join('');
  return `<g data-print="points" data-dots="${pts.length}" data-rings="${train.length}"><path d="${dots}" fill="${INK}"/>${rings}</g>`;
}

/** The tray: a shallow box with a rim, the developer liquid, and the print in it. */
function tray(print?: Print) {
  const { x0, y0, x1, y1 } = TRAY,
    z = BH + RIM,
    a = area();
  let s = box(x0, y0, BH, x1, y1, z, DARK, toneI, 1);
  s += shape(
    [
      [x0 + 2, y0 + 2, z - 1],
      [x1 - 2, y0 + 2, z - 1],
      [x1 - 2, y1 - 2, z - 1],
      [x0 + 2, y1 - 2, z - 1],
    ],
    PALS.tomato.d,
    0.6,
  );
  s += shape(
    [
      [a.x0, a.y0, a.z],
      [a.x1, a.y0, a.z],
      [a.x1, a.y1, a.z],
      [a.x0, a.y1, a.z],
    ],
    CERAMIC.l,
    0.8,
  );
  s += !print
    ? '<g data-print="none"></g>'
    : print.kind === 'pixels'
      ? pixels(print.px)
      : points(print.pts, print.train);
  return `<g data-part="tray">${s + hullInk(boxCorners(x0, y0, BH, x1, y1, z), 1.6)}</g>`;
}

/** The step dial: a squat timer with notches for each step count and its pointer on the one set. */
function dial(steps: number) {
  const [cx, cy] = DIAL,
    top = BH + 12,
    R = 12,
    ang = dialAngle(steps);
  // the face lies flat; 0° points straight up the screen (to the back) and angles turn clockwise as seen
  const dir = (deg: number, r: number) => {
    const t = (deg * Math.PI) / 180,
      k = r / Math.SQRT2;
    return [cx + k * (Math.sin(t) - Math.cos(t)), cy - k * (Math.sin(t) + Math.cos(t))];
  };
  let s = cyl(cx, cy, BH, top, R + 2, METAL, toneI, 1.2);
  s += cyl(cx, cy, top, top + 1, R, CERAMIC, toneI, 0.8);
  for (const n of STEPS) {
    const d = dialAngle(n),
      [ax, ay] = dir(d, R - 1),
      [bx, by] = dir(d, R - 3.5);
    s += line(
      [
        [ax, ay, top + 1.05],
        [bx, by, top + 1.05],
      ],
      0.7,
    );
  }
  const [px, py] = dir(ang, R - 2.5);
  s += rod([cx, cy, top + 1.3], [px, py, top + 1.3], 0.9, { l: PALS.tomato.l, m: PALS.tomato.m, d: PALS.tomato.d });
  s += cyl(cx, cy, top + 1, top + 2.2, 1.6, DARK, toneI, 0.8);
  return `<g data-part="dial" data-steps="${steps}" data-angle="${ang}">${s}</g>`;
}

/** The label card: a card standing in a clip, mustard when a part is asked for, plain when not. */
function card(label?: Label | null) {
  const [cx, cy] = CARD;
  const s =
    box(cx - 9, cy - 3, BH, cx + 9, cy + 3, BH + 3, METAL, toneI, 1) +
    box(cx - 8, cy - 1, BH + 3, cx + 8, cy + 1, BH + 22, label ? PALS.mustard : CERAMIC, toneI, 1);
  return `<g data-part="label" data-label="${label ?? ''}">${s}</g>`;
}

/** The safelight: a red lamp on a short arm at the back. */
function lamp() {
  const [x, y] = LAMP;
  return (
    box(x - 2, y - 2, BH, x + 2, y + 2, BH + 46, METAL, toneI, 1) +
    rod([x, y, BH + 44], [x + 10, y + 10, BH + 44], 1, METAL) +
    cyl(x + 10, y + 10, BH + 36, BH + 44, 4, PALS.tomato, toneI, 1)
  );
}

/** The darkroom. Shadows, then the parts back to front, then the pills. */
export const darkroomScene = (o: DarkroomOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    a = area();
  let s =
    castShadow(boxCorners(TRAY.x0, TRAY.y0, BH, TRAY.x1, TRAY.y1, BH + RIM), BH, ctx.top) +
    castShadow(boxCorners(CARD[0] - 8, CARD[1] - 1, BH, CARD[0] + 8, CARD[1] + 1, BH + 22), BH, ctx.top);
  s += byDepth([
    { at: [LAMP[0], LAMP[1], 0], svg: lamp() },
    { at: [(TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2, 0], svg: tray(o.print) },
    { at: [DIAL[0], DIAL[1], 0], svg: dial(o.steps) },
    { at: [CARD[0], CARD[1], 0], svg: card(o.label) },
  ]);
  const running = o.done !== undefined && o.done < o.steps;
  const steps = narrow
    ? 'STEPS'
    : running
      ? `STEP ${o.done} OF ${o.steps}`
      : `${o.steps} STEP${o.steps === 1 ? '' : 'S'}`;
  const name = o.label ? o.label.toUpperCase() : 'NO LABEL';
  const label = narrow || !o.label || o.guidance === undefined ? name : `${name} · ×${o.guidance}`;
  const trayAt = [a.x1, a.y1, a.z],
    dialAt = [DIAL[0], DIAL[1], BH + 13],
    cardAt = [CARD[0], CARD[1], BH + 22];
  return (
    s +
    pill(trayAt, narrow ? 30 : 26, o.print?.name || 'EMPTY', false, scale) +
    pill(dialAt, -14, steps, running, scale) +
    pill(cardAt, -12, label, !!o.label, scale) +
    sayAt(o.say, 'tray', trayAt, narrow ? 30 : 26, scale, narrow) +
    sayAt(o.say, 'dial', dialAt, -14, scale, narrow) +
    sayAt(o.say, 'label', cardAt, -12, scale, narrow)
  );
};

/** The picture in words, for its aria-label. */
export function darkroomLabel(o: DarkroomOpts): string {
  const p = o.print;
  const what = !p
    ? 'The tray is empty.'
    : p.kind === 'pixels'
      ? `The tray holds a ${SIZE} × ${SIZE} print: ${p.name.toLowerCase()}.`
      : `The tray holds ${p.pts.length} dots${p.train?.length ? ` and ${p.train.length} training points, ringed` : ''}.`;
  const steps =
    o.done !== undefined && o.done < o.steps
      ? `developing: step ${o.done} of ${o.steps}`
      : `${o.steps} step${o.steps === 1 ? '' : 's'}`;
  const label = o.label
    ? `The label card asks for a ${o.label}${o.guidance === undefined ? '' : `, guidance ${o.guidance}`}.`
    : 'No label.';
  return `A darkroom under a red safelight. ${what} The step dial is set to ${steps}. ${label}`;
}

/** The home hero's plot (heroScene): a small developing tray with a print clearing in it, and a squat step dial. */
export function darkroomPlot(x: number, y: number, top: SceneCtx['top']): string {
  const z = BH + 4;
  let t = box(x - 16, y - 12, BH, x + 10, y + 12, z, DARK, toneI, 1);
  t += shape(
    [
      [x - 13, y - 9, z + 0.05],
      [x + 7, y - 9, z + 0.05],
      [x + 7, y + 9, z + 0.05],
      [x - 13, y + 9, z + 0.05],
    ],
    CERAMIC.l,
    0.7,
  );
  // a hinge-ish print, half developed: a leaf and a knuckle in ink, a few grey specks of noise
  t += shape(
    [
      [x - 10, y - 5, z + 0.1],
      [x + 4, y - 5, z + 0.1],
      [x + 4, y + 5, z + 0.1],
      [x - 10, y + 5, z + 0.1],
    ],
    GREYS[4],
    0,
  );
  t += shape(
    [
      [x - 4, y - 7, z + 0.15],
      [x - 2, y - 7, z + 0.15],
      [x - 2, y + 7, z + 0.15],
      [x - 4, y + 7, z + 0.15],
    ],
    INK,
    0,
  );
  t += hullInk(boxCorners(x - 16, y - 12, BH, x + 10, y + 12, z), 1.4);
  const d =
    cyl(x + 20, y - 4, BH, BH + 8, 6, METAL, toneI, 1) + cyl(x + 20, y - 4, BH + 8, BH + 9, 5, CERAMIC, toneI, 0.7);
  return (
    castShadow(boxCorners(x - 16, y - 12, BH, x + 10, y + 12, z), BH, top) +
    byDepth([
      { at: [x - 3, y, 0], svg: `<g>${t}</g>` },
      { at: [x + 20, y - 4, 0], svg: `<g>${d}</g>` },
    ])
  );
}
