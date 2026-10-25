// Calibration's picture: the forecaster's booth (KTD15). Glass jars stand on a long shelf that is a ruler of stated
// confidence, 0% on the left to 100% on the right, one jar per reliability bin at its guesses' mean confidence. Each jar
// holds 20 marbles in proportion: mint for the guesses that were right, tomato for the wrong, mint at the bottom. A
// mustard ring is painted on each jar at its stated level: an honest jar's mint comes up to its ring. A temperature dial
// at the front right mirrors the chapter's range input; a help desk at the front left takes the answers below the
// hand-over line (a post on the shelf); a slate at the back carries a score. Words only in pills; on phones (scale >
// 1.5) the jars' pills keep only percentages and the caption carries the counts. Marbles can drop in (CSS, off with
// reduced motion).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, esc, sayAt } from '../../lib/iso/blocks';
import {
  CLEAR,
  DARK,
  INK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  f,
  fill,
  hull,
  ink,
  line,
  on,
  P,
  PZ,
  rod,
  sp,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import type { Bin } from '../../lib/calibration/score';
import type { Say } from '../story/steps';

export const JAR_BOARD: Board = [0, 0, 150, 150];
/** The parts a step's callout may name: the least and the most sure jar, the dial, the help desk, the slate. */
export const JAR_PARTS = ['low', 'top', 'dial', 'desk', 'slate'] as const;
/** Marbles in every jar, split in proportion (KTD15's cap). */
export const MARBLES = 20;

export interface JarOpts {
  /** the reliability bins, one jar each; none draws the ten empty jars */
  jars: Bin[];
  /** the dial's setting and notches; no notches, no dial */
  T?: number;
  temps?: readonly number[];
  /** the hand-over line: answers stated below it go to the help desk */
  threshold?: number;
  /** how many went to the help desk */
  handed?: number;
  /** the slate's words (a score), when shown */
  slate?: string;
  /** marbles drop in (the CSS animation; reduced motion shows them settled) */
  drop?: boolean;
  scale?: number;
  say?: Say;
}

// the shelf runs along x + y = ROW, screen left to right; u = x − y is the confidence ruler
const ROW = 150,
  U0 = -130,
  U1 = 130,
  SHELF = 6,
  R = 8,
  H = 34,
  BALL = 2.35,
  LAYER = 4.6,
  DIAL = [143, 60],
  DESK = [60, 143],
  SLATE = [22, 22];
const xy = (u: number, s = ROW) => [(s + u) / 2, (s - u) / 2];
/** Where confidence c sits on the ruler. */
export const uOf = (c: number) => U0 + (U1 - U0) * c;
const MIN_GAP = 24; // in u: jars stay a hand apart (R = 8)

/** The jars' places on the ruler: each at its bin's mean confidence, pushed apart where two crowd, kept on the shelf. */
export function jarPlaces(bins: Pick<Bin, 'conf'>[]): number[] {
  const u = bins.map(b => Math.max(U0, uOf(b.conf)));
  for (let i = 1; i < u.length; i++) u[i] = Math.max(u[i], u[i - 1] + MIN_GAP);
  for (let i = u.length - 1; i >= 0; i--) u[i] = Math.min(u[i], i === u.length - 1 ? U1 : u[i + 1] - MIN_GAP);
  return u;
}
/** A jar's marbles: mint for right, tomato for wrong, 20 in all, split by the bin's counts. */
export const marblesOf = (b: Pick<Bin, 'n' | 'right'>) => {
  const mint = b.n ? Math.round((MARBLES * b.right) / b.n) : 0;
  return { mint, tomato: b.n ? MARBLES - mint : 0 };
};
export const pct = (x: number) => `${Math.round(x * 100)}%`;

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number, fillCol?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale, fillCol)}</g>`;

/** The shelf: a long slab along the row, its front face a ruler with a tick each tenth. */
function shelf() {
  const d = 11,
    z0 = BH,
    z1 = BH + SHELF,
    a = xy(U0 - 16, ROW - d),
    b = xy(U1 + 16, ROW - d),
    c = xy(U1 + 16, ROW + d),
    e = xy(U0 - 16, ROW + d);
  const top = [
    [a[0], a[1], z1],
    [b[0], b[1], z1],
    [c[0], c[1], z1],
    [e[0], e[1], z1],
  ];
  const front = [
    [e[0], e[1], z0],
    [c[0], c[1], z0],
    [c[0], c[1], z1],
    [e[0], e[1], z1],
  ];
  const endR = [
    [b[0], b[1], z0],
    [c[0], c[1], z0],
    [c[0], c[1], z1],
    [b[0], b[1], z1],
  ];
  const poly = (pts: number[][], col: string, w = 0.9) => {
    const q = pts.map(p => P(p[0], p[1], p[2]));
    return fill(sp(q), col) + ink(sp(q), w);
  };
  let s = poly(endR, WOOD.d) + poly(front, WOOD.m) + poly(top, WOOD.l);
  for (let i = 0; i <= 10; i++) {
    const [x, y] = xy(uOf(i / 10), ROW + d);
    s += line(
      [
        [x, y, z1 - 0.3],
        [x, y, z1 - (i % 5 === 0 ? 4 : 2.2)],
      ],
      0.8,
    );
  }
  return s;
}

const ring = (cx: number, cy: number, z: number, r = R) => on(PZ(z), ellUV(cx, cy, r, r, 28));
/** The front half of a ring (the side toward the viewer), as an open path. */
function frontArc(cx: number, cy: number, z: number, r = R) {
  const pts = Array.from({ length: 15 }, (_, i) => {
    const a = (-Math.PI / 4) + (i / 14) * Math.PI; // from (1,-1) round through (1,1) to (-1,1)
    return P(cx + r * Math.cos(a), cy + r * Math.sin(a), z);
  });
  return `M${pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}`;
}

/** One marble: a ball with a highlight. */
function marble(x: number, y: number, z: number, col: { l: string; m: string }, i: number, drop: boolean) {
  const [X, Y] = P(x, y, z + BALL);
  const anim = drop ? ` class="jm" style="--i:${i}"` : '';
  return `<g${anim}><circle cx="${f(X)}" cy="${f(Y)}" r="${BALL + 0.15}" fill="${col.m}" stroke="${INK}" stroke-width=".7"/><circle cx="${f(X - 0.6)}" cy="${f(Y - 0.7)}" r=".55" fill="${col.l}"/></g>`;
}
// four to a layer, back ones first
const SPOTS = [
  [-3, -3],
  [3, -3],
  [-3, 3],
  [3, 3],
].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));

/** A glass jar on the shelf at (cx, cy): glass behind, marbles, glass in front, its painted ring and a cork lid. */
function jar(cx: number, cy: number, b: Bin | null, drop: boolean, gone: boolean) {
  const z0 = BH + SHELF,
    z1 = z0 + H,
    sil = hull([...ring(cx, cy, z0), ...ring(cx, cy, z1)].map(p => P(p[0], p[1], p[2])));
  let s = fill(sp(sil), CLEAR.l, 'fill-opacity=".55"');
  s += ink(sp(ring(cx, cy, z0).map(p => P(p[0], p[1], p[2]))), 0.6);
  if (b && !gone) {
    const m = marblesOf(b);
    for (let k = 0; k < MARBLES; k++) {
      const [dx, dy] = SPOTS[k % 4],
        z = z0 + 0.3 + Math.floor(k / 4) * LAYER;
      s += marble(cx + dx, cy + dy, z, k < m.mint ? PALS.mint : PALS.tomato, k, drop);
    }
  }
  // the front pane, a glint, the outline and the rim
  s += fill(sp(sil), CLEAR.m, 'fill-opacity=".22"');
  const g0 = P(cx - R * 0.15, cy + R * 0.95, z0 + 3),
    g1 = P(cx - R * 0.15, cy + R * 0.95, z1 - 4);
  s += `<path d="M${f(g0[0])} ${f(g0[1])}L${f(g1[0])} ${f(g1[1])}" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/>`;
  if (b && !gone) {
    const zm = z0 + 0.3 + (MARBLES / 4) * LAYER * b.conf;
    s += `<path class="mark" d="${frontArc(cx, cy, zm, R + 0.2)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    s += `<path d="${frontArc(cx, cy, zm, R + 0.2)}" fill="none" stroke="${PALS.mustard.l}" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  s += ink(sp(sil), 1.3) + ink(sp(ring(cx, cy, z1).map(p => P(p[0], p[1], p[2]))), 0.9);
  s += cyl(cx, cy, z1, z1 + 3, R - 1.2, WOOD, toneI, 0.9);
  return s;
}

/** The temperature dial: a squat drum with a notch per setting and its pointer on the one set (mirrors the range). */
export const dialAngle = (T: number, temps: readonly number[]) => {
  const i = Math.max(0, temps.indexOf(T));
  return -120 + (240 * i) / Math.max(1, temps.length - 1);
};
function dial(T: number, temps: readonly number[]) {
  const [cx, cy] = DIAL,
    top = BH + 10,
    r = 10,
    ang = dialAngle(T, temps);
  const dir = (deg: number, rr: number) => {
    const t = (deg * Math.PI) / 180,
      k = rr / Math.SQRT2;
    return [cx + k * (Math.sin(t) - Math.cos(t)), cy - k * (Math.sin(t) + Math.cos(t))];
  };
  let s = cyl(cx, cy, BH, top, r + 2, METAL, toneI, 1.2) + cyl(cx, cy, top, top + 1, r, PALS.cobalt, toneI, 0.8);
  for (const t of temps) {
    const d = dialAngle(t, temps),
      [ax, ay] = dir(d, r - 1),
      [bx, by] = dir(d, r - 3.2);
    s += line(
      [
        [ax, ay, top + 1.05],
        [bx, by, top + 1.05],
      ],
      t === 1 ? 1.2 : 0.7,
    );
  }
  const [px, py] = dir(ang, r - 2.2);
  s += rod([cx, cy, top + 1.3], [px, py, top + 1.3], 0.9, PALS.tomato);
  s += cyl(cx, cy, top + 1, top + 2.2, 1.6, DARK, toneI, 0.8);
  return `<g data-part="dial" data-t="${T}" data-angle="${ang}">${s}</g>`;
}

/** The help desk: a small counter with a bell and a tray of handed-over marbles (cobalt: not graded here). */
function desk(handed: number) {
  const [cx, cy] = DESK,
    z = BH + 12;
  let s = box(cx - 13, cy - 8, BH, cx + 13, cy + 8, z, PALS.blush, toneI, 1);
  s += box(cx - 9, cy - 5, z, cx + 5, cy + 5, z + 1.5, METAL, toneI, 0.8);
  const n = Math.min(12, handed);
  for (let k = 0; k < n; k++) {
    const x = cx - 7 + (k % 4) * 3.6,
      y = cy - 3 + Math.floor(k / 4) * 3;
    s += marble(x, y, z + 1.4, PALS.cobalt, k, false);
  }
  s += cyl(cx + 9, cy, z, z + 1, 2.6, METAL, toneI, 0.8) + cyl(cx + 9, cy, z + 1, z + 3.2, 1.8, PALS.mustard, toneI, 0.8);
  return `<g data-part="desk" data-handed="${handed}">${s}</g>`;
}

/** The hand-over line: a post on the shelf at the threshold, with a tomato flag. */
function post(threshold: number) {
  const [x, y] = xy(uOf(threshold), ROW + 7),
    z = BH + SHELF;
  return (
    rod([x, y, z], [x, y, z + H + 8], 0.8, METAL) +
    `<path d="M${(() => {
      const a = P(x, y, z + H + 8),
        b = P(x + 4, y - 4, z + H + 5.5),
        c = P(x, y, z + H + 3);
      return `${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(c[0])} ${f(c[1])}Z`;
    })()}" fill="${PALS.tomato.l}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>`
  );
}

const CRATE = [104, 104];
/** The crate in front: the marbles still to sort, mint and tomato mixed. */
function crate() {
  const [x, y] = CRATE,
    z = BH + 9;
  let s = box(x - 10, y - 10, BH, x + 10, y + 10, z, WOOD, toneI, 1.1);
  s += box(x - 8.5, y - 8.5, z - 1.5, x + 8.5, y + 8.5, z - 0.2, WOOD, toneI, 0);
  const mix = [PALS.mint, PALS.tomato, PALS.tomato, PALS.mint, PALS.tomato, PALS.mint, PALS.mint, PALS.tomato, PALS.mint];
  mix.forEach((c, k) => {
    s += marble(x - 5 + (k % 3) * 5, y - 5 + Math.floor(k / 3) * 5, z - 2.3, c, k, false);
  });
  return `<g data-part="crate">${s}</g>`;
}

/** The slate at the back: a dark board on two legs. */
function slate() {
  const [x, y] = SLATE;
  return (
    rod([x - 6, y + 6, BH], [x - 6, y + 6, BH + 30], 0.8, WOOD) +
    rod([x + 6, y - 6, BH], [x + 6, y - 6, BH + 30], 0.8, WOOD) +
    `<g data-part="slate">${(() => {
      const q = [
        [x - 9, y + 9, BH + 14],
        [x + 9, y - 9, BH + 14],
        [x + 9, y - 9, BH + 32],
        [x - 9, y + 9, BH + 32],
      ].map(p => P(p[0], p[1], p[2]));
      return fill(sp(q), DARK.m) + ink(sp(q), 1.4);
    })()}</g>`
  );
}

/** The booth. Shadows, then the parts back to front, then the pills (jar pills staggered in rows so neighbours clear). */
export const jarScene = (o: JarOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    bins = o.jars,
    us = bins.length ? jarPlaces(bins) : Array.from({ length: 10 }, (_, i) => uOf((i + 0.5) / 10)),
    gone = (b: Bin) => o.threshold !== undefined && b.hi <= o.threshold + 1e-9;
  const zTop = BH + SHELF + H + 3;
  let s = castShadow(
    [
      [...xy(U0 - 16, ROW - 11), BH],
      [...xy(U1 + 16, ROW - 11), BH],
      [...xy(U1 + 16, ROW + 11), BH],
      [...xy(U0 - 16, ROW + 11), BH],
      [...xy(U0 - 16, ROW), zTop],
      [...xy(U1 + 16, ROW), zTop],
    ],
    BH,
    ctx.top,
  );
  const parts: { at: number[]; svg: string }[] = [{ at: [...xy(0, ROW + 11), 0], svg: shelf() }];
  us.forEach((u, i) => {
    const [x, y] = xy(u),
      b = bins[i] ?? null;
    parts.push({
      at: [x, y, 1],
      svg: `<g data-jar="${i}"${b ? ` data-n="${b.n}" data-right="${b.right}" data-mint="${marblesOf(b).mint}" data-conf="${b.conf.toFixed(3)}"${gone(b) ? ' data-gone="1"' : ''}` : ''}>${jar(x, y, b, !!o.drop, !!b && gone(b))}</g>`,
    });
  });
  if (o.threshold !== undefined) {
    const [x, y] = xy(uOf(o.threshold), ROW + 7);
    parts.push({ at: [x, y, 2], svg: `<g data-part="line">${post(o.threshold)}</g>` });
    parts.push({ at: [...DESK, 0], svg: desk(o.handed ?? 0) });
  }
  if (o.temps?.length && o.T !== undefined) parts.push({ at: [...DIAL, 0], svg: dial(o.T, o.temps) });
  if (o.slate) parts.push({ at: [...SLATE, 0], svg: slate() });
  parts.push({ at: [...CRATE, 0], svg: crate() });
  s += byDepth(parts);

  // pills: each jar its stated level (and count, on wide screens), in staggered rows; then the props
  const rows = narrow ? 2 : 3,
    pills: string[] = [];
  us.forEach((u, i) => {
    const [x, y] = xy(u),
      b = bins[i];
    if (!b) return;
    const text = narrow ? pct(b.conf) : `${pct(b.conf)} · ${b.n}`;
    pills.push(pill([x, y, zTop], -10 - 18 * (i % rows), text, false, scale, gone(b) ? '#e9e4d6' : undefined));
  });
  // a jar's callout floats above the highest row of pills, so it clears every neighbour's
  const lowAt = bins.length ? [...xy(us[0]), zTop] : null,
    topAt = bins.length ? [...xy(us.at(-1)!), zTop] : null,
    above = -10 - 18 * (rows - 1);
  const dialAt = [DIAL[0], DIAL[1], BH + 12],
    deskAt = [DESK[0], DESK[1], BH + 14],
    slateAt = [SLATE[0], SLATE[1], BH + 32];
  if (o.temps?.length && o.T !== undefined) pills.push(pill(dialAt, -14, `T ${o.T}`, o.T !== 1, scale));
  if (o.threshold !== undefined)
    pills.push(pill(deskAt, -14, narrow ? `${o.handed ?? 0}` : `HELP DESK · ${o.handed ?? 0}`, false, scale));
  if (o.slate) pills.push(pill(slateAt, -10, o.slate, true, scale));
  if (lowAt) pills.push(sayAt(o.say, 'low', lowAt, above, scale, narrow));
  if (topAt) pills.push(sayAt(o.say, 'top', topAt, above, scale, narrow));
  pills.push(sayAt(o.say, 'dial', dialAt, -14, scale, narrow));
  pills.push(sayAt(o.say, 'desk', deskAt, -14, scale, narrow));
  pills.push(sayAt(o.say, 'slate', slateAt, -10, scale, narrow));
  return s + pills.join('');
};

/** The picture in words, for its aria-label. */
export function jarLabel(o: JarOpts): string {
  if (!o.jars.length) return 'A forecaster’s booth: ten empty glass jars on a shelf marked 0% to 100% confidence.';
  const jars = o.jars
    .map(b => {
      const m = marblesOf(b);
      return `stated ${pct(b.conf)}, ${b.n} guesses, ${pct(b.right / b.n)} right (${m.mint} mint marbles of ${MARBLES})`;
    })
    .join('; ');
  const dial = o.temps?.length && o.T !== undefined ? ` The temperature dial is at ${o.T}.` : '';
  const desk = o.threshold !== undefined ? ` Below ${pct(o.threshold)}, ${o.handed ?? 0} go to the help desk.` : '';
  const sl = o.slate ? ` The slate reads ${o.slate}.` : '';
  return `A forecaster’s booth: ${o.jars.length} glass jar${o.jars.length === 1 ? '' : 's'} of marbles on a confidence shelf, each with a ring painted at its stated level. ${jars}.${dial}${desk}${sl}`;
}

/** The home hero's plot (heroScene): a short shelf with three jars, mint and tomato marbles under their painted rings. */
export function jarPlot(x: number, y: number, top: SceneCtx['top']): string {
  const z0 = BH + 3,
    h = 18,
    r = 4.4;
  const spots: [number, number, number][] = [
    [-11, 11, 0.6],
    [0, 0, 0.75],
    [11, -11, 0.9],
  ];
  let s = castShadow(
    [
      [x - 16, y + 10, BH],
      [x + 10, y - 16, BH],
      [x + 16, y - 10, BH],
      [x - 10, y + 16, BH],
      [x, y, z0 + h],
    ],
    BH,
    top,
  );
  s += box(x - 15, y - 15, BH, x + 15, y + 15, z0, WOOD, toneI, 1);
  const jars = spots.map(([dx, dy, c]) => {
    const cx = x + dx,
      cy = y + dy,
      sil = hull([...ring(cx, cy, z0, r), ...ring(cx, cy, z0 + h, r)].map(p => P(p[0], p[1], p[2])));
    let g = fill(sp(sil), CLEAR.l, 'fill-opacity=".55"');
    const mint = Math.round(8 * c * 0.8);
    for (let k = 0; k < 8; k++) {
      const [ox, oy] = SPOTS[k % 4].map(v => v * 0.62);
      const [X, Y] = P(cx + ox, cy + oy, z0 + 1.4 + Math.floor(k / 4) * 3);
      g += `<circle cx="${f(X)}" cy="${f(Y)}" r="1.5" fill="${k < mint ? PALS.mint.m : PALS.tomato.m}" stroke="${INK}" stroke-width=".6"/>`;
    }
    g += `<path d="${frontArc(cx, cy, z0 + 0.5 + 6 * c, r + 0.1)}" fill="none" stroke="${PALS.mustard.l}" stroke-width="1.4"/>`;
    g += fill(sp(sil), CLEAR.m, 'fill-opacity=".2"') + ink(sp(sil), 1.1) + cyl(cx, cy, z0 + h, z0 + h + 2, r - 1, WOOD, toneI, 0.8);
    return { at: [cx, cy, 0], svg: `<g>${g}</g>` };
  });
  return s + byDepth(jars);
}
