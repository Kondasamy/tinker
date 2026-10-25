// Computer use's picture: the puppet desk (KTD15). A monitor shows the portal's current screen, drawn flat on its face
// as coloured boxes (buttons mustard, tiles mint, the planted notice and offer tomato and mustard); a camera on a stalk
// flashes when the host takes a screenshot; a hand on a mouse pulls a string up to a crosshair at the real click point;
// and a film strip of past screenshots lies on the desk in front. Words only in pills: the screen's own words live in
// the Screen view (screenView.tsx). On phones (scale > 1.5) the pills keep names and the strip its last three frames.
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
  on,
  P,
  PY,
  PZ,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { PORTAL, SCREEN, elFill, type Box, type View } from '../../lib/computer-use/screens';
import type { Say } from '../story/steps';

export const PUPPET_BOARD: Board = [0, 0, 220, 140];
/** The parts a step's callout may name. */
export const PUPPET_PARTS = ['screen', 'camera', 'hand', 'film'] as const;

export interface PuppetOpts {
  /** what the monitor shows */
  view?: View;
  /** the host's click on the real screen, and how it went */
  click?: { real: [number, number]; outcome: 'ok' | 'miss' | 'refused' | 'denied'; label?: string };
  /** the camera flashes: a screenshot is being taken */
  flash?: boolean;
  /** the screenshot shows a page that hasn't settled */
  stale?: boolean;
  /** the screenshots taken so far, oldest first (the strip keeps the last six, three on phones) */
  frames?: View[];
  /** the camera's pill: the look's number and its tokens, e.g. "LOOK 3 · 1,334 TOKENS" */
  camera?: string;
  scale?: number;
  say?: Say;
}

// the monitor: wide along x, thin along y, its screen on the +y face (u = x, v = z)
const MON = { x0: 46, x1: 156, y0: 54, y1: 60, z0: BH + 12 },
  MON_H = ((MON.x1 - MON.x0) * SCREEN.h) / SCREEN.w,
  MON_TOP = MON.z0 + MON_H,
  INSET = 3;
const CAM = [26, 76],
  CAM_Z = BH + 44,
  HAND = [190, 100],
  FILM = { x0: 30, y0: 108, fw: 22, fh: 14, gap: 4 };

/** A point on the real screen, on the monitor's face. */
export function onScreen(sx: number, sy: number): [number, number, number] {
  const w = MON.x1 - MON.x0 - 2 * INSET,
    h = MON_H - 2 * INSET;
  return [MON.x0 + INSET + (sx / SCREEN.w) * w, MON.y1 + 0.05, MON_TOP - INSET - (sy / SCREEN.h) * h];
}
const faceRect = ([x, y, w, h]: Box, fill: string, ink = 0.5) => {
  const a = onScreen(x, y),
    b = onScreen(x + w, y + h);
  return shape(
    on(PY(a[1]), [
      [a[0], a[2]],
      [b[0], a[2]],
      [b[0], b[2]],
      [a[0], b[2]],
    ]),
    fill,
    ink,
  );
};

/** The screen's boxes, flat on a face: `rect` places a real-screen box. */
function screenArt(v: View | undefined, rect: (b: Box, fill: string, ink?: number) => string) {
  if (!v) return '';
  let s = rect([0, 0, SCREEN.w, 46], v.host === PORTAL ? CERAMIC.m : PALS.tomato.l, 0);
  for (const p of v.panels) s += rect(p.box, p.fill, p.kind === 'row' ? 0 : 0.4);
  for (const e of v.els) s += rect(e.box, e.kind === 'link' ? PALS.cobalt.l : elFill(e), 0.5);
  return s;
}

function monitor(o: PuppetOpts) {
  const { x0, x1, y0, y1, z0 } = MON;
  let s =
    box(96, y0 - 6, BH, 106, y0 + 2, z0, METAL, toneI, 0.9) +
    box(84, y0 - 10, BH, 118, y0 + 6, BH + 2, METAL, toneI, 0.9) +
    box(x0 - 2, y0, z0 - 2, x1 + 2, y1, MON_TOP + 2, DARK, toneI, 1);
  // the glass: paper white, the portal drawn on it
  s += faceRect([0, 0, SCREEN.w, SCREEN.h], '#fffdf6', 0.6);
  s += `<g data-screen="${o.view?.screen ?? 'none'}">${screenArt(o.view, (b, c, w = 0.5) => faceRect(b, c, w))}</g>`;
  if (o.stale) s += faceRect([0, 0, SCREEN.w, SCREEN.h], 'rgba(65,83,143,.22)', 0);
  if (o.click) {
    const [cx, cy, cz] = onScreen(...o.click.real),
      bad = o.click.outcome !== 'ok',
      c = P(cx, cy, cz),
      col = bad ? PALS.tomato.d : INK;
    s += `<g data-crosshair="${o.click.real.join(',')}" data-outcome="${o.click.outcome}">`;
    s += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="4.2" fill="${bad ? PALS.tomato.l : PALS.mint.l}" fill-opacity=".55" stroke="${col}" stroke-width="1.2"/>`;
    s += `<path d="M${f(c[0] - 7)} ${f(c[1])}H${f(c[0] + 7)}M${f(c[0])} ${f(c[1] - 7)}V${f(c[1] + 7)}" stroke="${col}" stroke-width="1.2"/></g>`;
  }
  return `<g data-part="screen">${s}${hullInk(boxCorners(x0 - 2, y0, z0 - 2, x1 + 2, y1, MON_TOP + 2), 1.6)}</g>`;
}

/** The shot: dashed rays from the lens to the screen's four corners. */
const rays = (lens: number[]) =>
  [
    [0, 0],
    [SCREEN.w, 0],
    [SCREEN.w, SCREEN.h],
    [0, SCREEN.h],
  ]
    .map(([sx, sy]) => {
      const q = P(...onScreen(sx, sy));
      return `<path d="M${f(lens[0])} ${f(lens[1])}L${f(q[0])} ${f(q[1])}" stroke="${PALS.mustard.m}" stroke-width=".9" stroke-dasharray="3 2" fill="none"/>`;
    })
    .join('');

/** The camera on its stalk: a post, an arm, a body leaning toward the monitor, a flash lit while it shoots. */
function camera(flash: boolean) {
  const [x, y] = CAM;
  return (
    `<g data-part="camera" data-flash="${flash ? 1 : 0}">` +
    cyl(x, y, BH, BH + 2, 6, METAL, toneI, 1) +
    rod([x, y, BH + 2], [x, y, CAM_Z], 1.3, METAL) +
    box(x - 7, y - 5, CAM_Z - 6, x + 5, y + 5, CAM_Z + 4, DARK, toneI, 1) +
    box(x + 5, y - 3, CAM_Z - 4, x + 9, y + 3, CAM_Z + 2, METAL, toneI, 0.8) +
    box(x - 3, y - 3, CAM_Z + 4, x + 2, y + 3, CAM_Z + 7, flash ? PALS.mustard : CERAMIC, toneI, 0.8) +
    (flash ? rays(P(x + 9, y, CAM_Z - 1)) : '') +
    '</g>'
  );
}

/** The hand on the mouse, and its string up to the crosshair (the puppet's string). */
function hand(o: PuppetOpts) {
  const [x, y] = HAND;
  let s =
    box(x - 10, y - 8, BH, x + 10, y + 10, BH + 1, PALS.cobalt, toneI, 0.8) +
    box(x - 4, y - 5, BH + 1, x + 4, y + 6, BH + 5, CERAMIC, toneI, 1) +
    box(x - 5, y - 2, BH + 5, x + 5, y + 7, BH + 11, PALS.blush, toneI, 1) +
    box(x - 7, y - 2, BH + 5, x - 5, y + 3, BH + 9, PALS.blush, toneI, 0.8);
  if (o.click) {
    const a = P(x, y + 2, BH + 11),
      b = P(...onScreen(...o.click.real));
    s += `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${INK}" stroke-width=".8" stroke-dasharray="2 2" fill="none"/>`;
  }
  return `<g data-part="hand">${s}</g>`;
}

/** The film strip: the last screenshots lying flat on the desk, oldest on the left. */
function film(frames: View[], keep: number) {
  const shown = frames.slice(-keep),
    { x0, y0, fw, fh, gap } = FILM,
    w = Math.max(1, keep) * (fw + gap) + gap;
  let s = box(x0, y0, BH, x0 + w, y0 + fh + 6, BH + 0.6, DARK, toneI, 0.8);
  // empty frames still to fill, a shade lighter than the film
  for (let i = shown.length; i < keep; i++) {
    const fx = x0 + gap + i * (fw + gap);
    s += shape(
      on(PZ(BH + 0.65), [
        [fx, y0 + 3],
        [fx + fw, y0 + 3],
        [fx + fw, y0 + 3 + fh],
        [fx, y0 + 3 + fh],
      ]),
      DARK.l,
      0,
    );
  }
  shown.forEach((v, i) => {
    const fx = x0 + gap + i * (fw + gap),
      fy = y0 + 3,
      z = BH + 0.7;
    const rect = ([bx, by, bw, bh]: Box, fill: string, ink = 0.3) =>
      shape(
        on(PZ(z + 0.02), [
          [fx + (bx / SCREEN.w) * fw, fy + (by / SCREEN.h) * fh],
          [fx + ((bx + bw) / SCREEN.w) * fw, fy + (by / SCREEN.h) * fh],
          [fx + ((bx + bw) / SCREEN.w) * fw, fy + ((by + bh) / SCREEN.h) * fh],
          [fx + (bx / SCREEN.w) * fw, fy + ((by + bh) / SCREEN.h) * fh],
        ]),
        fill,
        ink,
      );
    s += `<g data-frame="${i}">${rect([0, 0, SCREEN.w, SCREEN.h], '#fffdf6', 0.5)}${screenArt(v, (b, c) => rect(b, c, 0))}</g>`;
  });
  return `<g data-part="film" data-frames="${shown.length}">${s}</g>`;
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** The puppet desk. Shadows, then the parts back to front, then the pills. */
export const puppetScene = (o: PuppetOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    keep = narrow ? 3 : 6,
    frames = o.frames ?? [];
  let s =
    castShadow(boxCorners(MON.x0, MON.y0, BH, MON.x1, MON.y1, MON.z0 + 18), BH, ctx.top) +
    castShadow(boxCorners(CAM[0] - 2, CAM[1] - 2, BH, CAM[0] + 2, CAM[1] + 2, CAM_Z), BH, ctx.top);
  s += byDepth([
    { at: [(MON.x0 + MON.x1) / 2, MON.y0, 0], svg: monitor(o) },
    { at: [CAM[0], CAM[1], 0], svg: camera(!!o.flash) },
    { at: [FILM.x0 + 60, FILM.y0 + 8, 0], svg: film(frames, keep) },
    { at: [HAND[0], HAND[1], 1], svg: hand(o) },
  ]);
  const bad = o.click && o.click.outcome !== 'ok';
  const screenAt = [MON.x1, MON.y1, MON_TOP],
    camAt = [CAM[0], CAM[1], CAM_Z + 7],
    handAt = [HAND[0], HAND[1], BH + 11],
    filmAt = [FILM.x0 + 30, FILM.y0 + FILM.fh, BH + 1];
  const screenName = o.view ? (narrow ? 'SCREEN' : o.view.title.toUpperCase()) : 'SCREEN OFF';
  const handName = !o.click
    ? 'MOUSE'
    : o.click.outcome === 'refused' || o.click.outcome === 'denied'
      ? 'REFUSED'
      : narrow
        ? 'CLICK'
        : `CLICK · ${(o.click.label ?? 'NOTHING').toUpperCase()}`;
  const cam = narrow ? 'CAMERA' : (o.camera ?? 'CAMERA');
  const filmName = narrow ? 'FILM' : `${frames.length} LOOK${frames.length === 1 ? '' : 'S'}`;
  return (
    s +
    pill(screenAt, -20, -22, o.stale ? `${screenName} · STALE` : screenName, !!o.stale, scale) +
    pill(camAt, -14, -18, cam, !!o.flash, scale) +
    pill(handAt, -6, -30, handName, !!o.click, scale, bad ? PALS.tomato.l : undefined) +
    pill(filmAt, 0, 22, filmName, false, scale) +
    sayAt(o.say, 'screen', screenAt, -22, scale, narrow) +
    sayAt(o.say, 'camera', camAt, -18, scale, narrow) +
    sayAt(o.say, 'hand', handAt, -30, scale, narrow) +
    sayAt(o.say, 'film', filmAt, 22, scale, narrow)
  );
};

/** The picture in words, for its aria-label. */
export function puppetLabel(o: PuppetOpts): string {
  const screen = o.view
    ? `The monitor shows ${o.view.title} at ${o.view.host}${o.stale ? ', not yet updated' : ''}.`
    : 'The monitor is off.';
  const click = o.click
    ? ` The hand clicked at ${o.click.real.join(', ')} on the real screen: ${o.click.label ?? 'nothing there'}${o.click.outcome === 'ok' ? '' : `, ${o.click.outcome}`}.`
    : '';
  const n = o.frames?.length ?? 0;
  return `A puppet desk: a camera on a stalk photographs a monitor, and a hand on a mouse pulls a string to the pointer. ${screen}${click} The film strip holds ${n} screenshot${n === 1 ? '' : 's'}.`;
}

/** The home hero's plot: a small monitor with a crosshair on a lit button, and a hand on a mouse in front. */
export function puppetPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = box(x - 14, y - 6, BH + 4, x + 12, y - 3, BH + 22, DARK, toneI, 1);
  const glass = shape(
    on(PY(y - 2.95), [
      [x - 12, BH + 20],
      [x + 10, BH + 20],
      [x + 10, BH + 6],
      [x - 12, BH + 6],
    ]),
    '#fffdf6',
    0.5,
  );
  const btn = shape(
    on(PY(y - 2.9), [
      [x + 1, BH + 11],
      [x + 8, BH + 11],
      [x + 8, BH + 8],
      [x + 1, BH + 8],
    ]),
    PALS.mustard.l,
    0.5,
  );
  const stand = box(x - 3, y - 6, BH, x + 1, y - 3, BH + 4, METAL, toneI, 0.8);
  const mouse =
    box(x + 6, y + 6, BH, x + 11, y + 12, BH + 3, CERAMIC, toneI, 0.9) +
    box(x + 6, y + 7, BH + 3, x + 11, y + 12, BH + 6, PALS.blush, toneI, 0.9);
  return (
    castShadow(boxCorners(x - 14, y - 6, BH, x + 12, y - 3, BH + 22), BH, top) +
    byDepth([
      { at: [x - 1, y - 5, 0], svg: `<g>${stand}${m}${glass}${btn}</g>` },
      { at: [x + 8, y + 9, 0], svg: `<g>${mouse}</g>` },
    ])
  );
}
