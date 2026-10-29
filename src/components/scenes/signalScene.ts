// The Releases module's picture: the signal box (U17). Larkspur's checkout traffic runs in from the left through the
// pipeline's gates (a level-crossing barrier per gate, a lamp each: mint passed, tomato stopped, the boom down where
// the change stopped), then a junction splits it onto two
// tracks: the old version at the back, the new one in front. Twenty shoppers wait on their platforms, each one twentieth of
// the minute's checkouts: the share on the new track is lit mustard, and a shopper whose checkout failed this minute is
// tomato. The hero is the signal box behind the tracks: a brick locking room, a glazed operating floor and a hipped
// roof carrying the check's lamp (tomato once the alarm rang); the signalman stands at the rollback lever in front
// (tomato and pulled while the way back is under way). A semaphore by the junction is the feature flag: arm raised,
// on; level, off. Words only in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the
// counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  WOOD,
  P,
  PY,
  PZ,
  box,
  byDepth,
  castShadow,
  clipTo,
  cyl,
  hullInk,
  line,
  matOf,
  on,
  pd,
  rectUV,
  rod,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { CAST, hexa, person, type Item, type Look, type PersonOpts } from '../../lib/iso/figures';
import { pct, tickOf, type Run } from '../../lib/releases/sim';
import type { Pipeline } from '../../lib/releases/pipeline';
import type { Say } from '../story/steps';

export const SIGNAL_BOARD: Board = [0, 6, 196, 92];
/** Shoppers drawn along the tracks; each is a twentieth of the minute's checkouts. */
export const SLOTS = 20;
/** The parts a step's callout may name. */
export const SIGNAL_PARTS = ['gates', 'old', 'new', 'box', 'flag'] as const;

export interface SignalOpts {
  /** the share of checkouts on the new track this minute */
  share: number;
  newN: number;
  newErr: number;
  oldN: number;
  oldErr: number;
  /** the way back is under way */
  backing: boolean;
  /** the check's alarm has rung */
  alarm: boolean;
  /** the lever was refused */
  refused?: boolean;
  /** the change's short name, for the new track's pill */
  name: string;
  /** chapter 2: the change on the entry track and how the gates judged it */
  pipeline?: Pipeline;
  /** the flag, when the change sits behind one: on while any share is released */
  flag?: boolean;
  say?: Say;
  scale?: number;
}

/** The picture as of minute t of a run. */
export function signalAt(r: Run, t: number): Omit<SignalOpts, 'say' | 'scale'> {
  const k = tickOf(r, t);
  return {
    share: k.share,
    newN: k.newN,
    newErr: k.newErr,
    oldN: k.oldN,
    oldErr: k.oldErr,
    backing: k.backing,
    alarm: r.alarmAt !== null && r.alarmAt <= k.t,
    ...(r.refusedAt !== null && r.refusedAt <= k.t ? { refused: true } : {}),
    name: r.change.short,
    ...(r.policy.flag ? { flag: k.share > 0 && !k.backing } : {}),
  };
}

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function signalState(o: SignalOpts) {
  const lit = Math.round(o.share * SLOTS),
    rest = SLOTS - lit;
  const failed = (err: number, n: number, of: number) =>
    err > 0 && of > 0 ? Math.min(of, Math.max(1, Math.round((err / n) * of))) : 0;
  return { lit, rest, newFailed: failed(o.newErr, o.newN, lit), oldFailed: failed(o.oldErr, o.oldN, rest) };
}

const OLD_Y = 40,
  NEW_Y = 70,
  ENTRY_Y = 55,
  X0 = 64,
  X1 = 192;
const GATE_X = [14, 28, 42];
const JUNCTION = 52;
const BOX = { x0: 96, x1: 118, y0: 10, y1: 22 };
const FLAG = [84, 80];
/** a crossing barrier's post stands beside the entry track; its boom swings across it */
const POST_Y = ENTRY_Y - 6;
/** people stand at this size: a crowd of twenty fits along a platform and stays taller than 22 px on a phone */
const K = 0.6;
/** the island platform between the tracks; shoppers wait along its edges, each beside their track */
const PL = { y0: OLD_Y + 4.6, y1: NEW_Y - 4.6 },
  EDGE = 6;
const slotX = (i: number) => X0 + 4 + i * ((X1 - X0 - 8) / (SLOTS - 1));
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const OVER = '#f6c2b4';
const BALLAST = matOf('#b9b1a2'),
  STONE = matOf('#ddd5c4'),
  BRICK = matOf('#b8694a'),
  SLATE = matOf('#5d6b86');
type Mat = { l: string; m: string; d: string };
const bx = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
const item = (b: number[][], svg: string): Item => ({ box: b, svg });
/** a flat quad on a vertical face with outward normal n, drawn only when it faces the viewer */
const pane = (n: number[], q: number[][], c: string, w = 0.6) => (vis(n) ? shape(q, c, w) : '');
/** a rod as a sortable item */
const bar = (a: number[], b: number[], r: number, m: Mat, w = 0.8) =>
  item(
    [
      [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
      [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
    ],
    rod(a, b, r, m, toneI, w),
  );

/** A run of track along x at y. Real-object notes: a gravel bed; timber sleepers across it every 4 units; two steel
 * rails standing on them. */
function track(x0: number, x1: number, y: number) {
  let s = box(x0, y - 4, BH, x1, y + 4, BH + 0.7, BALLAST, toneI, 0.6);
  let d = '';
  for (let x = x0 + 2; x < x1 - 1; x += 4) d += pd(on(PZ(BH + 0.75), rectUV(x - 0.9, y - 3.2, x + 0.9, y + 3.2)));
  s += `<path d="${d}" fill="${WOOD.m}" stroke="#231e16" stroke-width=".4"/>`;
  for (const dy of [-1.8, 1.8]) s += box(x0, y + dy - 0.35, BH + 0.75, x1, y + dy + 0.35, BH + 1.6, METAL, toneI, 0.5);
  return s;
}
/** A track bent from the junction onto y: two rails on the diagonal. */
function bend(y: number) {
  const L = Math.hypot(X0 - JUNCTION, y - ENTRY_Y),
    nx = -(y - ENTRY_Y) / L,
    ny = (X0 - JUNCTION) / L;
  return [-1.8, 1.8]
    .map(k =>
      line(
        [
          [JUNCTION + nx * k, ENTRY_Y + ny * k, BH + 1.4],
          [X0 + nx * k, y + ny * k, BH + 1.4],
        ],
        1.3,
      ),
    )
    .join('');
}
/** The island platform: a stone slab between the tracks, a painted safety line along each edge. */
function platform() {
  const { y0, y1 } = PL;
  let s = box(X0, y0, BH, X1 - 2, y1, BH + 2, STONE, toneI, 0.9);
  for (const y of [y0 + 1.2, y1 - 1.9])
    s += shape(on(PZ(BH + 2.05), rectUV(X0 + 0.4, y, X1 - 2.4, y + 0.7)), PALS.mustard.l, 0);
  return item(bx(X0, y0, BH, X1 - 2, y1, BH + 2), `<g class="platform">${s}</g>`);
}

/** A person drawn once per look and placed by <use>: twenty shoppers in a handful of looks cost a handful of figures.
 * The figure is drawn at the origin and scaled by K about its feet (the projection is affine, so a 2D scale about the
 * projected foot is the 3D one); strokes are pre-thickened so the ink stays at full weight. */
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};
function placed(defs: Map<string, string>, x: number, y: number, z: number, opts: Omit<PersonOpts, 'x' | 'y' | 'z'>) {
  const p = person({ ...opts, x: 0, y: 0, z }),
    body = (byDepth(p.items) as string).replace(
      /stroke-width="([\d.]+)"/g,
      (_: string, w: string) => `stroke-width="${(+w / K).toFixed(2)}"`,
    ),
    id = `sgp${hash(body)}`;
  if (!defs.has(id)) defs.set(id, `<g id="${id}">${body}</g>`);
  const [ox, oy] = P(0, 0, z),
    [tx, ty] = P(x, y, z),
    m = `matrix(${K} 0 0 ${K} ${(tx - K * ox).toFixed(2)} ${(ty - K * oy).toFixed(2)})`;
  return {
    shadow: `<g transform="${m}">${p.shadow}</g>`,
    use: `<use href="#${id}" transform="${m}"/>`,
    box: bx(x - 11 * K, y - 11 * K, z, x + 11 * K, y + 11 * K, z + 36 * K),
  };
}
const LOOKS = ['shopper4', 'shopper3'] as const;
const SIGNALMAN: Look = {
  skin: '#e2ab82',
  top: '#ece6d6',
  legs: '#4a4642',
  hair: '#bdb7ab',
  cut: 'short',
  hat: 'cap',
  hatCol: '#272421',
};

/** The pipeline: a level-crossing barrier per gate (a post with its lamp, mint passed, tomato stopped; the boom down
 * across the track where the change stopped), and the change's wagon where it stands. */
function gates(o: SignalOpts) {
  const p = o.pipeline,
    items: Item[] = [];
  let shadow = '';
  GATE_X.forEach((x, i) => {
    const g = p?.gates[i],
      lamp = !g ? METAL : g.pass ? PALS.mint : PALS.tomato,
      down = !!g && !g.pass,
      pv = [x, POST_Y, BH + 9],
      tip = down ? [x, ENTRY_Y + 8, BH + 9] : [x + 1.2, POST_Y + 0.6, BH + 23];
    let s =
      cyl(x, POST_Y, BH, BH + 1.2, 1.8, DARK, toneI, 0.8, 12) +
      rod([x, POST_Y, BH], [x, POST_Y, BH + 18], 0.8, CERAMIC);
    // a crossbuck under the lamp
    s +=
      rod([x - 2.6, POST_Y, BH + 13], [x + 2.6, POST_Y, BH + 16.4], 0.45, CERAMIC, toneI, 0.6) +
      rod([x - 2.6, POST_Y, BH + 16.4], [x + 2.6, POST_Y, BH + 13], 0.45, CERAMIC, toneI, 0.6);
    s += cyl(x, POST_Y, BH + 18, BH + 21, 1.8, lamp, toneI, 0.8, 12);
    // the boom: tomato and white bands, a counterweight behind the pivot
    let b = '';
    const back = down ? [x, POST_Y - 3, BH + 9] : [x - 0.3, POST_Y - 0.2, BH + 5.5];
    b += rod(back, pv, 1, DARK, toneI, 0.7);
    for (let j = 0; j < 5; j++) {
      const a = j / 5,
        c = (j + 1) / 5,
        A = pv.map((v, k) => v + (tip[k] - v) * a),
        B = pv.map((v, k) => v + (tip[k] - v) * c);
      b += rod(A, B, 0.6, j % 2 ? CERAMIC : PALS.tomato, toneI, 0.7);
    }
    b += cyl(x, POST_Y, BH + 8.2, BH + 9.8, 0.9, DARK, toneI, 0.6, 10);
    items.push(
      item(
        bx(x - 2.7, POST_Y - 1.8, BH, x + 2.7, POST_Y + 1.8, BH + 21),
        `<g class="gate" data-gate="${i}" data-pass="${g ? (g.pass ? 1 : 0) : ''}">${s}</g>`,
      ),
      item(
        down
          ? bx(x - 1, POST_Y - 3.5, BH + 8, x + 1, ENTRY_Y + 8.5, BH + 10)
          : bx(x - 1, POST_Y - 1, BH + 5, x + 2, POST_Y + 1.5, BH + 23.5),
        b,
      ),
    );
    shadow += castShadow(boxCorners(x - 1, POST_Y - 1, BH, x + 1, POST_Y + 1, BH + 21), BH);
  });
  if (p) {
    const at = p.stoppedAt ? GATE_X[p.gates.length - 1] - 7 : JUNCTION - 4,
      pal = p.ships ? PALS.mustard : PALS.tomato;
    let w = box(at - 4.5, ENTRY_Y - 2.6, BH + 2.4, at + 4.5, ENTRY_Y + 2.6, BH + 3.2, DARK, toneI, 0.7);
    w += box(at - 4, ENTRY_Y - 3, BH + 3.2, at + 4, ENTRY_Y + 3, BH + 8.5, pal, toneI, 0.9);
    // planks down the sides that face the viewer
    for (const sy of [-1, 1])
      for (const dx of [-1.3, 1.3])
        w += pane(
          [0, sy, 0],
          [
            [at + dx, ENTRY_Y + sy * 3.05, BH + 3.4],
            [at + dx, ENTRY_Y + sy * 3.05, BH + 8.3],
          ],
          pal.d,
          0,
        ).replace('fill', 'stroke="#231e16" stroke-width=".5" fill');
    w += box(at - 4.3, ENTRY_Y - 3.3, BH + 8.5, at + 4.3, ENTRY_Y + 3.3, BH + 9.2, pal, toneI, 0.8);
    const wheels = [-2.6, 2.6].flatMap(dx =>
      [-1, 1].map(sy =>
        rod([at + dx, ENTRY_Y + sy * 2.4, BH + 2.4], [at + dx, ENTRY_Y + sy * 3.2, BH + 2.4], 1.5, DARK, toneI, 0.6),
      ),
    );
    const near = (sy: number) => vis([0, sy, 0]);
    const wg =
      wheels.filter((_, j) => !near(j % 2 ? 1 : -1)).join('') +
      w +
      wheels.filter((_, j) => near(j % 2 ? 1 : -1)).join('');
    items.push(
      item(
        bx(at - 4.5, ENTRY_Y - 3.3, BH, at + 4.5, ENTRY_Y + 3.3, BH + 9.2),
        `<g class="wagon" data-ships="${p.ships ? 1 : 0}">${wg}</g>`,
      ),
    );
    shadow += castShadow(boxCorners(at - 4.5, ENTRY_Y - 3, BH, at + 4.5, ENTRY_Y + 3, BH + 9), BH);
  }
  return {
    shadow,
    items: [
      item(
        bx(2, ENTRY_Y - 4, BH, JUNCTION, ENTRY_Y + 4, BH + 1.6),
        `<g data-prop="gates">${track(2, JUNCTION, ENTRY_Y)}</g>`,
      ),
      ...items,
    ],
  };
}

/** The signal box. Real-object notes: a brick locking room on the ground with a door; above it the operating floor,
 * glazed all round in small panes, on an overhanging timber sill; a hipped slate roof with eaves, the check's lamp on
 * its ridge; a timber stair up the side to the upper door; the lever frame in front with the signalman at it. */
function signalBox(o: SignalOpts, defs: Map<string, string>) {
  const { x0, x1, y0, y1 } = BOX,
    pulled = o.backing,
    zU = BH + 12,
    zR = BH + 22,
    xm = (x0 + x1) / 2,
    ym = (y0 + y1) / 2;
  const parts: Item[] = [];
  // the locking room
  let low = box(x0, y0, BH, x1, y1, zU, BRICK, toneI, 1);
  for (const [n, Y] of [
    [[0, 1, 0], y1 + 0.1],
    [[0, -1, 0], y0 - 0.1],
  ] as [number[], number][]) {
    if (!vis(n)) continue;
    // brick courses, a door, two small arched windows
    for (let z = BH + 2.5; z < zU; z += 2.5)
      low += line(
        [
          [x0 + 0.3, Y, z],
          [x1 - 0.3, Y, z],
        ],
        0.35,
      );
    low += shape(on(PY(Y), rectUV(x0 + 3, BH, x0 + 7, BH + 8)), WOOD.m, 0.8);
    for (const u of [x0 + 12, x0 + 17.5])
      low += shape(on(PY(Y + Math.sign(n[1]) * 0.05), rectUV(u - 1.6, BH + 5, u + 1.6, BH + 9)), CLEAR.m, 0.7);
  }
  parts.push(item(bx(x0, y0, BH, x1, y1, zU), low));
  // the operating floor: a timber sill, corner posts, glazing in small panes on every face toward the viewer
  const a0 = x0 - 1,
    a1 = x1 + 1,
    b0 = y0 - 1,
    b1 = y1 + 1;
  let up = box(a0 - 0.5, b0 - 0.5, zU, a1 + 0.5, b1 + 0.5, zU + 1.2, WOOD, toneI, 0.9);
  up += box(a0, b0, zU + 1.2, a1, b1, zR, CERAMIC, toneI, 1);
  const faces: [number[], (u: number, v: number) => number[], number, number][] = [
    [[0, 1, 0], (u, v) => [u, b1 + 0.1, v], a0, a1],
    [[0, -1, 0], (u, v) => [u, b0 - 0.1, v], a0, a1],
    [[1, 0, 0], (u, v) => [a1 + 0.1, u, v], b0, b1],
    [[-1, 0, 0], (u, v) => [a0 - 0.1, u, v], b0, b1],
  ];
  for (const [n, at, u0, u1] of faces) {
    if (!vis(n)) continue;
    const cols = Math.round((u1 - u0) / 4),
      w = (u1 - u0 - 1.6) / cols;
    for (let c = 0; c < cols; c++)
      for (const [v0, v1] of [
        [zU + 2.2, zU + 5.4],
        [zU + 5.9, zR - 1],
      ]) {
        const ua = u0 + 0.8 + c * w + 0.35,
          ub = ua + w - 0.7;
        up += shape([at(ua, v0), at(ub, v0), at(ub, v1), at(ua, v1)], c % 2 ? '#cfe9f0' : '#bfe0ea', 0.55);
      }
  }
  up += hullInk(boxCorners(a0 - 0.5, b0 - 0.5, zU, a1 + 0.5, b1 + 0.5, zR), 1.8);
  parts.push(item(bx(a0 - 0.5, b0 - 0.5, zU, a1 + 0.5, b1 + 0.5, zR), up));
  // the hipped roof, the ridge along x
  const e = 2.4,
    zr = zR + 5;
  const roof = [
    [a0 - e, b0 - e, zR],
    [a1 + e, b0 - e, zR],
    [a1 + e, b1 + e, zR],
    [a0 - e, b1 + e, zR],
    [a0 + 5, ym, zr],
    [a1 - 5, ym, zr],
    [a1 - 5, ym, zr],
    [a0 + 5, ym, zr],
  ];
  let rf = hexa(roof, SLATE, 1.1) + hullInk(roof, 2);
  rf += `<g class="lamp${o.alarm ? ' alarm' : ''}">${rod([xm, ym, zr - 0.5], [xm, ym, zr + 1], 0.5, DARK)}${cyl(xm, ym, zr + 1, zr + 4, 2, o.alarm ? PALS.tomato : PALS.mint, toneI, 0.9, 14)}</g>`;
  parts.push(item(bx(a0 - e, b0 - e, zR, a1 + e, b1 + e, zr + 4), rf));
  // the stair up the +x side to a door on the operating floor
  const sx0 = x1 + 1.6,
    sx1 = x1 + 5.4;
  for (let i = 0; i < 6; i++) {
    const ya = y1 + 1.5 - (i + 1) * 2,
      z1 = BH + (i + 1) * 2;
    parts.push(item(bx(sx0, ya, BH, sx1, ya + 2, z1), box(sx0, ya, BH, sx1, ya + 2, z1, WOOD, toneI, 0.7)));
  }
  parts.push(bar([sx1, y1 + 1.5, BH + 5], [sx1, y0 - 0.5, BH + 15], 0.35, DARK, 0.6));
  // the lever frame in front, the signalman at it (pulling when the way back runs)
  const lx = x1 - 5,
    ly = y1 + 3;
  const lever =
    box(lx - 3, ly - 1.5, BH, lx + 3, ly + 1.5, BH + 2, METAL, toneI, 0.8) +
    `<g class="lever${pulled ? ' pulled' : ''}">${rod([lx, ly, BH + 2], pulled ? [lx + 7, ly, BH + 9] : [lx - 2, ly, BH + 12], 0.6, METAL, toneI, 0.8)}${cyl(pulled ? lx + 7 : lx - 2, ly, pulled ? BH + 8 : BH + 11, pulled ? BH + 10 : BH + 13, 1.4, pulled ? PALS.tomato : PALS.mustard, toneI, 0.8, 10)}</g>`;
  const man = placed(defs, lx - 6, ly + 2.5, BH, { facing: '+x', pose: pulled ? 'reach' : 'stand', look: SIGNALMAN });
  return {
    shadow:
      castShadow(boxCorners(x0 - 1 - e, y0 - 1 - e, BH, x1 + 1 + e, y1 + 1 + e, zr), BH) +
      castShadow(boxCorners(sx0, y0, BH, sx1, y1 + 1.5, BH + 12), BH) +
      man.shadow,
    items: [
      item(
        bx(x0 - 1 - e, y0 - 1 - e, BH, sx1, y1 + 1 + e, zr + 4),
        `<g data-prop="box" data-alarm="${o.alarm ? 1 : 0}" data-backing="${pulled ? 1 : 0}">${byDepth(parts)}</g>`,
      ),
      item(bx(lx - 3, ly - 1.5, BH, lx + 8.5, ly + 1.5, BH + 13), lever),
      item(man.box, `<g class="signalman">${man.use}</g>`),
    ],
  };
}

/** The semaphore. Real-object notes: a tapered white post on a dark foot, a finial cap; the arm a painted blade with a
 * white band, pivoting on a boss near the top with a counterweight behind: raised while the flag is on, level off. */
function semaphore(on: boolean) {
  const [x, y] = FLAG,
    zp = BH + 19,
    ang = on ? (50 * Math.PI) / 180 : 0,
    m = on ? PALS.mint : PALS.tomato,
    at = (t: number, h: number) => [
      x + t * Math.cos(ang) - h * Math.sin(ang),
      y + 1.4,
      zp + t * Math.sin(ang) + h * Math.cos(ang),
    ];
  let post =
    cyl(x, y, BH, BH + 1.6, 2.2, DARK, toneI, 0.9, 14) +
    rod([x, y, BH + 1.6], [x, y, BH + 26], 0.9, CERAMIC, toneI, 1, 0.6);
  post += cyl(x, y, BH + 26, BH + 27, 1, DARK, toneI, 0.7, 10);
  // the blade, a flat plank in the x–z plane just in front of the post
  const q = (t0: number, t1: number) => [at(t0, -1.4), at(t1, -1.4), at(t1, 1.4), at(t0, 1.4)];
  const bladeFace = vis([0, 1, 0]) || vis([0, -1, 0]);
  let arm = rod(at(-3.2, 0), at(0, 0), 0.5, DARK, toneI, 0.7) + rod(at(-4.2, 0), at(-2.6, 0), 1.3, DARK, toneI, 0.7);
  if (bladeFace) {
    arm += shape(q(0.6, 11.5), m.l, 0.9) + shape(q(8.6, 10), CERAMIC.l, 0.6);
  }
  arm += cyl(x, y + 1.6, zp - 0.9, zp + 0.9, 0.9, DARK, toneI, 0.6, 10);
  // the arm sits on the +y side of the post: drawn after it when that side faces the viewer
  const front = vis([0, 1, 0]);
  return {
    shadow: castShadow(boxCorners(x - 1, y - 1, BH, x + 1, y + 1, BH + 27), BH),
    items: [
      item(
        bx(x - 4.5, y - 2.2, BH, x + 12, y + 2.8, BH + 30),
        `<g data-prop="flag" data-on="${on ? 1 : 0}">${front ? post + arm : arm + post}</g>`,
      ),
    ],
  };
}

/** The scene: every shadow first, then one sort over every part, then the pills. */
export const signalScene = (o: SignalOpts) => (ctx: SceneCtx) => {
  const st = signalState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    defs = new Map<string, string>();
  const g = gates(o),
    sb = signalBox(o, defs),
    fl = o.flag !== undefined ? semaphore(o.flag) : null;
  const people = Array.from({ length: SLOTS }, (_, i) => {
    const isNew = i < st.lit,
      failed = isNew ? i < st.newFailed : i - st.lit < st.oldFailed,
      m = failed ? PALS.tomato : isNew ? PALS.mustard : PALS.cobalt,
      x = slotX(i),
      y = isNew ? NEW_Y - EDGE : OLD_Y + EDGE;
    const p = placed(defs, x, y, BH + 2, {
      facing: isNew ? '+y' : '-y',
      // failed shoppers share one look: the scene stays inside its size budget in any mix of tracks and failures
      look: { ...CAST[LOOKS[failed ? 0 : i % 2]], top: m.l },
    });
    return {
      shadow: p.shadow,
      item: item(
        p.box,
        `<g class="shopper${failed ? ' failed' : ''}" data-track="${isNew ? 'new' : 'old'}" data-slot="${i}">${p.use}</g>`,
      ),
    };
  });
  const tracks: Item[] = [
    item(
      bx(JUNCTION, OLD_Y - 4, BH, X1, OLD_Y + 4, BH + 1.6),
      `<g data-prop="old" data-shoppers="${st.rest}">${bend(OLD_Y)}${track(X0, X1, OLD_Y)}</g>`,
    ),
    item(
      bx(JUNCTION, NEW_Y - 4, BH, X1, NEW_Y + 4, BH + 1.6),
      `<g data-prop="new" data-shoppers="${st.lit}" data-share="${o.share}">${bend(NEW_Y)}${track(X0, X1, NEW_Y)}</g>`,
    ),
  ];
  const shadows =
    castShadow(boxCorners(X0, PL.y0, BH, X1 - 2, PL.y1, BH + 2), BH) +
    g.shadow +
    sb.shadow +
    (fl?.shadow ?? '') +
    people.map(p => p.shadow).join('');
  const s =
    `<defs>${[...defs.values()].join('')}</defs>` +
    clipTo(ctx.top, shadows) +
    byDepth([...tracks, platform(), ...g.items, ...sb.items, ...(fl?.items ?? []), ...people.map(p => p.item)]);
  const oldEnd = [X1, OLD_Y, BH + 1],
    newEnd = [X1, NEW_Y, BH + 1],
    gateTop = [GATE_X[1], POST_Y, BH + 21],
    roof = [(BOX.x0 + BOX.x1) / 2, (BOX.y0 + BOX.y1) / 2, BH + 29],
    flagTop = [FLAG[0], FLAG[1], BH + 26];
  const p = o.pipeline;
  let pills = pill(
    gateTop,
    0,
    -14,
    narrow || !p ? 'PIPELINE' : p.ships ? 'PIPELINE · PASSED' : 'PIPELINE · STOPPED',
    !!p,
    scale,
    p && !p.ships ? OVER : undefined,
  );
  pills += pill(oldEnd, -6, -16, narrow ? 'OLD' : `OLD · ${pct(1 - o.share)}`, false, scale);
  pills += pill(newEnd, -6, 18, narrow ? 'NEW' : `NEW · ${o.name.toUpperCase()} · ${pct(o.share)}`, o.share > 0, scale);
  pills += pill(
    roof,
    0,
    -14,
    narrow
      ? 'BOX'
      : o.refused && !o.backing
        ? 'BOX · CAN’T GO BACK'
        : o.backing
          ? 'BOX · ROLLING BACK'
          : o.alarm
            ? 'BOX · ALARM'
            : 'SIGNAL BOX',
    o.backing,
    scale,
    o.alarm || o.refused ? OVER : undefined,
  );
  if (o.flag !== undefined)
    pills += pill(flagTop, -8, -12, narrow ? 'FLAG' : `FLAG · ${o.flag ? 'ON' : 'OFF'}`, o.flag, scale);
  // the callout stands over its part, a row above the part's pill
  pills +=
    sayAt(o.say, 'gates', gateTop, -14, scale) +
    sayAt(o.say, 'old', oldEnd, -16, scale) +
    sayAt(o.say, 'new', [X1 - 30, NEW_Y, BH + 12], -12, scale) +
    sayAt(o.say, 'box', roof, -14, scale) +
    sayAt(o.say, 'flag', flagTop, -12, scale);
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function signalLabel(o: SignalOpts): string {
  const p = o.pipeline;
  return (
    `Larkspur’s checkout tracks. ${pct(o.share)} of checkouts on the new track (${o.name}), the rest on the old one. ` +
    `This minute ${o.newErr} of ${o.newN} new-track checkouts failed, and ${o.oldErr} of ${o.oldN} on the old track.` +
    (p ? ` The pipeline ${p.ships ? 'passed the change' : `stopped the change at ${p.gates.at(-1)!.name}`}.` : '') +
    (o.flag !== undefined ? ` The flag is ${o.flag ? 'on' : 'off'}.` : '') +
    (o.backing ? ' Rolling back.' : o.refused ? ' The lever was refused.' : o.alarm ? ' The alarm rang.' : '')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function signalReadouts(o: SignalOpts): string[] {
  return [
    `${pct(o.share)} on new`,
    `new ${o.newErr}/${o.newN} failed`,
    `old ${o.oldErr}/${o.oldN} failed`,
    ...(o.backing ? ['rolling back'] : []),
  ];
}

/** The home card's picture (and the intro's hero): a canary on the new track, the rest on the old. */
export const signalCard = (r: Run, t: number, scale = 1.7): SignalOpts => ({ ...signalAt(r, t), scale });

/** The home hero's plot: a small signal box behind two short tracks, two lit shoppers on the new one, three on the
 * old. */
export function signalPlot(x: number, y: number, top: SceneCtx['top']): string {
  const rails = (ty: number) => box(x - 18, ty - 2, BH, x + 18, ty + 2, BH + 0.5, WOOD, toneI, 0.5);
  const who = (sx: number, sy: number, m: { l: string; m: string; d: string }) =>
    cyl(sx, sy, BH + 0.5, BH + 6.5, 1.5, m, toneI, 0.8, 10) +
    cyl(sx, sy, BH + 6.5, BH + 9, 1.1, CERAMIC, toneI, 0.7, 8);
  const cabin =
    box(x - 7, y - 16, BH, x + 7, y - 9, BH + 8, WOOD, toneI, 0.9) +
    box(x - 7, y - 16, BH + 8, x + 7, y - 9, BH + 13, CLEAR, toneI, 0.8) +
    box(x - 8, y - 17, BH + 13, x + 8, y - 8, BH + 15, PALS.cobalt, toneI, 0.8);
  return (
    castShadow(boxCorners(x - 8, y - 17, BH, x + 8, y - 8, BH + 15), BH, top) +
    byDepth([
      { at: [x, y - 12, 0], svg: cabin },
      { at: [x - 18, y - 2, 0], svg: rails(y - 2) },
      { at: [x - 18, y + 8, 0], svg: rails(y + 8) },
      ...[-12, -2, 8].map(dx => ({ at: [x + dx, y - 2, 1], svg: who(x + dx, y - 2, PALS.cobalt) })),
      ...[-12, -2].map(dx => ({ at: [x + dx, y + 8, 1], svg: who(x + dx, y + 8, PALS.mustard) })),
    ])
  );
}
