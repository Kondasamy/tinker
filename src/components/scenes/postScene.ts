// How email arrives' picture: Hollis's post room (U9). Its hero is the pigeonhole frame: a tall wooden case of
// cubbies standing at the left wall, a postal worker reaching into it. Along the back wall stand the servers that
// handed the message on, one small sorting office per hop (at most six), lit mint once the reader has peeled its
// postmark. On the sorting desk lies the envelope with its postmarks (cobalt stamps; a peeled one leaves a pale ring),
// a pillar box beside it. Behind the desk stand the checks: SPF's list board, DKIM's seal and DMARC's sign, each with a
// lamp (mint pass, tomato fail, metal none or not yet run), and the spam filter's needle dial, pointing at the score.
// In front sit three wire trays, inbox, junk and bounced; the letter lies in the one it ended in. Words only in pills;
// on phones (scale > 1.5) pills keep just the names and the caption carries the results.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  PALS,
  PX,
  WOOD,
  box,
  castShadow,
  cyl,
  cylX,
  ellUV,
  fill,
  hullInk,
  line,
  matOf,
  on,
  pd,
  rectUV,
  shape,
  tag,
  tone,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { SKIN, building, drawPieces, mini, person, type Look, type Piece } from '../../lib/iso/figures';
import type { Say } from '../story/steps';

export const POST_BOARD: Board = [0, 0, 190, 100];
/** Hops drawn at most (KTD13). */
export const MAX_HOPS = 6;
/** The parts a step's callout may name. */
export const POST_PARTS = [
  'hops',
  'envelope',
  'postmarks',
  'spf',
  'dkim',
  'dmarc',
  'spam',
  'inbox',
  'junk',
  'bounce',
] as const;

/** A check's lamp: pass, fail, or off (no record, or not run yet). */
export type Lamp = 'pass' | 'fail' | 'off';
export type Tray = 'inbox' | 'junk' | 'bounced';
export interface PostOpts {
  /** the From line's domain, for the envelope's pill */
  from: string;
  hops: number;
  /** postmarks peeled, from the bottom */
  peeled: number;
  /** each check's lamp and its word for the pill; absent: the check isn't in this picture */
  spf?: [Lamp, string];
  dkim?: [Lamp, string];
  dmarc?: [Lamp, string];
  /** the spam filter's score, 0 to 1, and its words */
  spam?: [number, string];
  /** where the letter ended; absent: still on the desk */
  fate?: Tray;
  say?: Say;
  scale?: number;
}

const HOP_X = (i: number) => 18 + i * 27,
  HOP_Y = 10;
const DESK = { x0: 14, x1: 86, y0: 40, y1: 72 },
  ENV = { x0: 24, x1: 76, y0: 46, y1: 66 };
const CHECK_Y = 38,
  CHECK_X = { spf: 100, dkim: 128, dmarc: 156 },
  GAUGE = [182, 38];
export { GAUGE };
export const TRAY_Y = 86,
  TRAY_X: Record<Tray, number> = { inbox: 108, junk: 136, bounced: 164 };
const TRAY_PAL: Record<Tray, typeof METAL> = {
  inbox: PALS.mint,
  junk: PALS.mustard,
  bounced: PALS.tomato,
};
const LAMP = { pass: PALS.mint, fail: PALS.tomato, off: METAL };
const OVER = '#f6c2b4';
// the hero: Hollis's pigeonhole frame, standing tall against the left wall behind the desk, and the postal worker at it
const FRAME = { x0: 2, x1: 10, y0: 36, y1: 74, h: 44 },
  WORKER = [8, 87],
  PILLAR = [94, 64];
const POSTIE: Look = {
  skin: SKIN[3],
  top: PALS.cobalt.m,
  legs: '#3b4566',
  hair: '#2b231c',
  cut: 'short',
  hat: 'cap',
  hatCol: PALS.tomato.m,
  prop: 'bag',
};
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
/** the stamps across the envelope's top edge, first hop at the left */
export const stampX = (i: number, n: number) => ENV.x0 + 6 + i * ((ENV.x1 - ENV.x0 - 12) / Math.max(1, n - 1));

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function postState(o: PostOpts) {
  const hops = Math.min(MAX_HOPS, o.hops);
  return { hops, peeled: Math.min(hops, o.peeled), more: o.hops - hops };
}

/** one sortable piece from a footprint box and its drawing; its shadow is the box's */
const lone = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, svg: string): Piece => {
  const b = [
    [x0, y0, z0],
    [x1, y1, z1],
  ];
  return { shadow: castShadow(boxCorners(x0, y0, z0, x1, y1, z1), z0), items: [{ box: b, svg }], box: b };
};
/** a quad on the vertical plane x = X, (u along y, v up) */
const qx = (X: number, u0: number, v0: number, u1: number, v1: number) => on(PX(X), rectUV(u0, v0, u1, v1));
/** a thin wire from a to b: an inked stroke with the metal's colour down its middle (a rod is ten times the SVG) */
const wire = (a: number[], b: number[], m: { m: string }) =>
  line([a, b], 1.7) + `<path d="${pd([a, b], false)}" stroke="${m.m}" stroke-width=".8" stroke-linecap="round"/>`;

/** Hollis's pigeonhole frame: a tall wooden case on feet, open toward the room in a grid of cubbies, some holding
 * letters, under a cornice. Real-object notes: the cubbies are recesses (dark back, a lit floor), the back panel is
 * plain boards. */
function frame(): Piece {
  const { x0, x1, y0, y1, h } = FRAME,
    z0 = BH + 3,
    zt = z0 + h - 3;
  let s = '';
  for (const fy of [y0 + 2, y1 - 2])
    for (const fx of [x0 + 2, x1 - 2]) s += box(fx - 1, fy - 1, BH, fx + 1, fy + 1, z0, WOOD, toneI, 0.7);
  s += box(x0, y0, z0, x1, y1, zt, WOOD, tone, 1.1);
  const front = vis([1, 0, 0]),
    X = front ? x1 + 0.1 : x0 - 0.1;
  if (front) {
    const cols = 4,
      rows = 5,
      cw = (y1 - y0 - 2) / cols,
      rh = (zt - z0 - 2) / rows;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const u0 = y0 + 1 + c * cw + 0.5,
          u1 = u0 + cw - 1,
          v0 = z0 + 1 + r * rh + 0.5,
          v1 = v0 + rh - 1;
        s += shape(qx(X, u0, v0, u1, v1), WOOD.d, 0.6);
        // the cubby's floor catches the light; a letter in some of them
        s += fill(pd(qx(X + 0.05, u0, v0, u1, v0 + 1)), WOOD.m);
        if ((c * 7 + r * 3) % 4 !== 0)
          s += shape(qx(X + 0.1, u0 + 1, v0 + 0.5, u1 - 1 - ((c + r) % 2), v0 + rh * 0.55), CERAMIC.l, 0);
      }
  } else
    for (let u = y0 + 6; u < y1; u += 6)
      s += line(
        [
          [X, u, z0 + 0.5],
          [X, u, zt - 0.5],
        ],
        0.6,
      );
  s += box(x0 - 1, y0 - 1, zt, x1 + 1.5, y1 + 1, zt + 3, WOOD, tone, 1);
  s += hullInk(boxCorners(x0 - 1, y0 - 1, BH, x1 + 1.5, y1 + 1, zt + 3), 2.4);
  return lone(x0 - 1, y0 - 1, BH, x1 + 1.5, y1 + 1, zt + 3, `<g class="frame" data-kit="pigeonholes">${s}</g>`);
}

/** A hop: a small sorting office on the back wall, mint once its postmark is peeled. */
function office(i: number, lit: boolean): Piece {
  const x = HOP_X(i),
    b = building({
      x,
      y: HOP_Y,
      d: 18,
      w: 12,
      h: 12,
      roof: 'gable',
      front: '+y',
      windows: 1,
      pal: lit ? PALS.mint : matOf('#e8d6b0'),
      roofPal: lit ? PALS.mustard : PALS.cobalt,
    });
  return {
    ...b,
    items: b.items.map(it => ({
      ...it,
      svg: `<g class="hop${lit ? ' lit' : ''}" data-hop="${i}" data-lit="${lit ? 1 : 0}">${it.svg}</g>`,
    })),
  };
}

/** The sorting desk: a top on four legs with a shelf below, the envelope (flap and postmarks) on top. */
function desk(o: PostOpts): Piece {
  const st = postState(o),
    top = BH + 10,
    { x0, x1, y0, y1 } = DESK;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 2, y0 + 2],
    [x1 - 2, y0 + 2],
    [x0 + 2, y1 - 2],
    [x1 - 2, y1 - 2],
  ])
    s += box(lx - 1.4, ly - 1.4, BH, lx + 1.4, ly + 1.4, top - 2, WOOD, toneI, 0.8);
  s += box(x0 + 3, y0 + 3, BH + 2, x1 - 3, y1 - 3, BH + 3, WOOD, toneI, 0.7);
  s += box(x0, y0, top - 2, x1, y1, top, WOOD, tone, 1) + hullInk(boxCorners(x0, y0, top - 2, x1, y1, top), 1.8);
  const onDesk = !o.fate;
  if (onDesk) {
    const z = top + 1.2,
      cx = (ENV.x0 + ENV.x1) / 2;
    s += `<g data-prop="envelope">${box(ENV.x0, ENV.y0, top, ENV.x1, ENV.y1, z, CERAMIC, toneI, 0.9)}${line(
      [
        [ENV.x0, ENV.y1, z],
        [cx, (ENV.y0 + ENV.y1) / 2 + 2, z],
        [ENV.x1, ENV.y1, z],
      ],
      0.7,
    )}</g>`;
  } else s += '<g data-prop="envelope"></g>';
  let stamps = '';
  for (let i = 0; i < st.hops; i++) {
    const peeled = i < st.peeled,
      x = stampX(i, st.hops),
      y = ENV.y0 + 5,
      z = top + 1.2;
    stamps += `<g class="postmark${peeled ? ' peeled' : ''}" data-postmark="${i}" data-peeled="${peeled ? 1 : 0}">${
      onDesk ? cyl(x, y, z, z + (peeled ? 0.3 : 1.6), 3.2, peeled ? CLEAR : PALS.cobalt, toneI, 0.8, 16) : ''
    }</g>`;
  }
  return lone(x0, y0, BH, x1, y1, top + 3, `<g data-prop="desk">${s}<g data-prop="postmarks">${stamps}</g></g>`);
}

function check(name: 'spf' | 'dkim' | 'dmarc', lamp: Lamp | undefined): Piece {
  const x = CHECK_X[name],
    y = CHECK_Y,
    on = lamp ?? 'off';
  let s = '';
  if (name === 'spf') {
    // a list board on two posts, three sheets pinned to it
    for (const px of [x - 6, x + 6]) s += box(px - 0.8, y - 0.8, BH, px + 0.8, y + 0.8, BH + 22, WOOD, toneI, 0.8);
    s += box(x - 7, y - 0.6, BH + 8, x + 7, y + 0.6, BH + 22, PALS.cobalt, toneI, 0.9);
    for (const sy of [-1, 1])
      if (vis([0, sy, 0]))
        for (const dz of [10, 14, 18])
          s += shape(
            [
              [x - 5, y + sy * 0.7, BH + dz],
              [x + 5, y + sy * 0.7, BH + dz],
              [x + 5, y + sy * 0.7, BH + dz + 2.4],
              [x - 5, y + sy * 0.7, BH + dz + 2.4],
            ],
            CERAMIC.l,
            0.5,
          );
  } else if (name === 'dkim') {
    // the seal: a wax stamp on a turned handle
    s += cyl(x, y, BH, BH + 3, 6, PALS.blush, toneI, 0.9, 18);
    s += cyl(x, y, BH + 3, BH + 10, 3.5, PALS.blush, toneI, 0.9, 16);
    s += cyl(x, y, BH + 10, BH + 16, 2, WOOD, toneI, 0.8, 12);
  } else {
    s += cyl(x, y, BH, BH + 1.5, 3, DARK, toneI, 0.8, 12);
    s += cyl(x, y, BH + 1.5, BH + 16, 0.9, METAL, toneI, 0.8, 10);
    s += box(x - 7, y - 1.2, BH + 16, x + 7, y + 1.2, BH + 24, PALS.cobalt, toneI, 0.9);
  }
  const lz = name === 'dkim' ? BH + 16 : BH + (name === 'spf' ? 22 : 24);
  s += cyl(x + (name === 'dkim' ? 0 : 5), y, lz, lz + 3, 1.8, LAMP[on], toneI, 0.8, 12);
  const r = name === 'dkim' ? 6 : 7;
  return lone(x - r, y - r, BH, x + r, y + r, lz + 3, `<g data-prop="${name}" data-lamp="${lamp ?? ''}">${s}</g>`);
}

/** The spam filter: a needle dial on a post, mint half then tomato half; the needle points at the score (no numerals). */
export function gauge(score: number | undefined): Piece {
  const [x, y] = GAUGE,
    zc = BH + 16,
    R = 5.5,
    sx = vis([1, 0, 0]) ? 1 : -1,
    X = x + sx * 1.15;
  // a point on the dial's face at angle a (degrees from straight up; low scores lean left as the viewer sees it)
  const at = (a: number, r: number) => {
    const t = (a * Math.PI) / 180;
    return [X, y + sx * r * Math.sin(t), zc + r * Math.cos(t)];
  };
  const arc = (a0: number, a1: number, r0: number, r1: number) => {
    const n = 8,
      out = Array.from({ length: n + 1 }, (_, i) => at(a0 + ((a1 - a0) * i) / n, r1)),
      inn = Array.from({ length: n + 1 }, (_, i) => at(a1 - ((a1 - a0) * i) / n, r0));
    return [...out, ...inn];
  };
  let s = cyl(x, y, BH, BH + 1.5, 3, DARK, toneI, 0.8, 12) + cyl(x, y, BH + 1.5, zc - R, 0.9, METAL, toneI, 0.8, 10);
  s += cylX(x - 1, x + 1, y, zc, R, DARK, toneI, 1.1, 22);
  s += shape(on(PX(X), ellUV(y, zc, R - 1, R - 1, 22)), CERAMIC.l, 0.6);
  s += shape(arc(-70, 0, 2.9, 4.1), PALS.mint.l, 0.4) + shape(arc(0, 70, 2.9, 4.1), PALS.tomato.l, 0.4);
  const a = -70 + 140 * Math.max(0, Math.min(1, score ?? 0));
  s += line([at(0, 0), at(a, 3.9)], 1.4) + fill(pd(on(PX(X + sx * 0.05), ellUV(y, zc, 0.8, 0.8, 8))), DARK.d);
  return lone(x - 1.2, y - R, BH, x + 1.2, y + R, zc + R, `<g data-prop="spam" data-score="${score ?? ''}">${s}</g>`);
}

/** A wire tray: a coloured floor in a cage of thin rails; the far rails behind the letter, the near ones in front. */
export function tray(t: Tray, holds: boolean): Piece {
  const x = TRAY_X[t],
    y = TRAY_Y,
    part = t === 'bounced' ? 'bounce' : t,
    m = TRAY_PAL[t],
    [a0, a1, b0, b1] = [x - 10, x + 10, y - 7, y + 7],
    z0 = BH + 1.4;
  const sides: [number[], number[][]][] = [
    [
      [1, 0, 0],
      [
        [a1, b0],
        [a1, b1],
      ],
    ],
    [
      [-1, 0, 0],
      [
        [a0, b0],
        [a0, b1],
      ],
    ],
    [
      [0, 1, 0],
      [
        [a0, b1],
        [a1, b1],
      ],
    ],
    [
      [0, -1, 0],
      [
        [a0, b0],
        [a1, b0],
      ],
    ],
  ];
  const rails = (near: boolean) =>
    sides
      .filter(([n]) => vis(n) === near)
      .map(([, [p, q]]) => [z0 + 2, z0 + 4.5].map(z => wire([p[0], p[1], z], [q[0], q[1], z], m)).join(''))
      .join('');
  let s = '';
  for (const [px, py] of [
    [a0, b0],
    [a1, b0],
    [a0, b1],
    [a1, b1],
  ])
    s += wire([px, py, BH], [px, py, z0 + 4.5], m);
  s += rails(false) + box(a0, b0, BH + 0.4, a1, b1, z0, m, toneI, 0.9);
  if (holds) s += `<g class="letter">${box(x - 7, y - 4.5, z0, x + 7, y + 4.5, z0 + 1.4, CERAMIC, toneI, 0.8)}</g>`;
  s += rails(true);
  return lone(a0, b0, BH, a1, b1, z0 + 5, `<g data-prop="${part}" data-holds="${holds ? 1 : 0}">${s}</g>`);
}

/** A pillar box: a red round post box with a domed cap, a dark slot under the cap and a door below. */
function pillar(): Piece {
  const [x, y] = PILLAR,
    r = 4.2,
    zt = BH + 17;
  let s =
    cyl(x, y, BH, BH + 1.6, r + 0.9, DARK, toneI, 0.9, 14) + cyl(x, y, BH + 1.6, zt, r, PALS.tomato, toneI, 1.1, 14);
  s +=
    cyl(x, y, zt, zt + 1.4, r + 0.9, PALS.tomato, toneI, 1, 14) +
    cyl(x, y, zt + 1.4, zt + 3, r * 0.75, PALS.tomato, toneI, 0.9, 14);
  s += cyl(x, y, zt + 3, zt + 4, r * 0.4, PALS.tomato, toneI, 0.8, 12);
  // slot and door on the side toward the viewer
  const d = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ].find(([a, b]) => vis([a, b, 0]))!;
  const n = [d[0] / Math.SQRT2, d[1] / Math.SQRT2],
    t = [-n[1], n[0]],
    p = (u: number, v: number, k = r + 0.05) => [x + n[0] * k + t[0] * u, y + n[1] * k + t[1] * u, v];
  s += shape([p(-2, zt - 3), p(2, zt - 3), p(2, zt - 2), p(-2, zt - 2)], DARK.d, 0.6);
  s += shape([p(-1.8, BH + 5), p(1.8, BH + 5), p(1.8, BH + 11), p(-1.8, BH + 11)], PALS.tomato.m, 0.6);
  return lone(x - r - 1, y - r - 1, BH, x + r + 1, y + r + 1, zt + 4, `<g class="pillar-box">${s}</g>`);
}

const WORD: Record<Lamp, string> = { pass: 'PASS', fail: 'FAIL', off: 'NONE' };

/** The scene: shadows, then the parts back to front, then the pills. */
export const postScene = (o: PostOpts) => (ctx: SceneCtx) => {
  const st = postState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const pieces: Piece[] = [
    {
      shadow: '',
      items: [
        {
          box: [
            [HOP_X(0) - 1, HOP_Y - 7, BH],
            [HOP_X(0), HOP_Y - 6, BH],
          ],
          svg: `<g data-prop="hops" data-hops="${st.hops}" data-lit="${st.peeled}"></g>`,
        },
      ],
      box: [],
    },
    frame(),
    person({ x: WORKER[0], y: WORKER[1], facing: 245, pose: 'reach', look: POSTIE }),
    ...Array.from({ length: st.hops }, (_, i) => office(i, i < st.peeled)),
    desk(o),
    pillar(),
    ...(o.spf ? [check('spf', o.spf[0])] : []),
    ...(o.dkim ? [check('dkim', o.dkim[0])] : []),
    ...(o.dmarc ? [check('dmarc', o.dmarc[0])] : []),
    ...(o.spam ? [gauge(o.spam[0])] : []),
    ...(['inbox', 'junk', 'bounced'] as Tray[]).map(t => tray(t, o.fate === t)),
  ];
  const s = drawPieces(pieces, ctx.top);
  const top = BH + 10;
  const hopTop = [HOP_X(Math.max(0, st.hops - 1) / 2), HOP_Y, BH + 18],
    envTop = [(ENV.x0 + ENV.x1) / 2, (ENV.y0 + ENV.y1) / 2, top + 1.2],
    stampTop = [stampX(0, st.hops), ENV.y0 + 5, top + 2];
  const lampTop = (name: 'spf' | 'dkim' | 'dmarc') => [CHECK_X[name], CHECK_Y, BH + 26];
  const gaugeTop = [GAUGE[0], GAUGE[1], BH + 22],
    trayTop = (t: Tray) => [TRAY_X[t], TRAY_Y, BH + 5];
  const hopText = narrow ? 'HOPS' : `HOPS · ${st.peeled} OF ${st.hops}${st.more ? ` · +${st.more}` : ''}`;
  let pills = pill(hopTop, 0, -14, hopText, st.peeled > 0 && st.peeled === st.hops, scale);
  if (!o.fate) pills += pill(envTop, -10, 22, narrow ? 'FROM' : `FROM · ${o.from.toUpperCase()}`, false, scale);
  for (const name of ['spf', 'dkim', 'dmarc'] as const) {
    const c = o[name];
    if (!c) continue;
    const [lamp, word] = c;
    pills += pill(
      lampTop(name),
      0,
      name === 'dkim' ? 22 : -14,
      narrow ? name.toUpperCase() : `${name.toUpperCase()} · ${word || WORD[lamp]}`,
      lamp === 'pass',
      scale,
      lamp === 'fail' ? OVER : undefined,
    );
  }
  if (o.spam)
    pills += pill(
      gaugeTop,
      6,
      26,
      narrow ? 'SPAM' : `SPAM · ${o.spam[1]}`,
      false,
      scale,
      o.spam[0] >= 0.5 ? OVER : undefined,
    );
  for (const t of ['inbox', 'junk', 'bounced'] as Tray[])
    pills += pill(trayTop(t), 0, 14, t.toUpperCase(), o.fate === t, scale);
  // the callout stands over its part, a row above the part's pill
  pills +=
    sayAt(o.say, 'hops', hopTop, -14, scale) +
    sayAt(o.say, 'envelope', envTop, -2, scale) +
    sayAt(o.say, 'postmarks', stampTop, -6, scale) +
    sayAt(o.say, 'spf', lampTop('spf'), -14, scale) +
    sayAt(o.say, 'dkim', lampTop('dkim'), -14, scale) +
    sayAt(o.say, 'dmarc', lampTop('dmarc'), -14, scale) +
    sayAt(o.say, 'spam', gaugeTop, -14, scale) +
    sayAt(o.say, 'inbox', trayTop('inbox'), -6, scale) +
    sayAt(o.say, 'junk', trayTop('junk'), -6, scale) +
    sayAt(o.say, 'bounce', trayTop('bounced'), -6, scale);
  return s + pills;
};

const LAMP_WORD: Record<Lamp, string> = { pass: 'passed', fail: 'failed', off: 'has nothing to check' };

/** The picture in words, for its aria-label. */
export function postLabel(o: PostOpts): string {
  const st = postState(o);
  const checks = (['spf', 'dkim', 'dmarc'] as const)
    .filter(n => o[n])
    .map(n => `${n.toUpperCase()} ${LAMP_WORD[o[n]![0]]}.`);
  return [
    `Hollis’s post room. A message from ${o.from}, ${st.hops} hops, ${st.peeled} postmarks peeled.`,
    ...checks,
    ...(o.spam ? [`Spam score ${o.spam[1]}.`] : []),
    o.fate ? `It ended in ${o.fate === 'bounced' ? 'the bounced tray' : o.fate}.` : 'It is on the sorting desk.',
  ].join(' ');
}

/** The results the caption carries (phones show only the names in the pills). */
export function postReadouts(o: PostOpts): string[] {
  return [
    `${o.peeled} of ${o.hops} postmarks`,
    ...(['spf', 'dkim', 'dmarc'] as const)
      .filter(n => o[n])
      .map(n => `${n.toUpperCase()} ${(o[n]![1] || WORD[o[n]![0]]).toLowerCase()}`),
    ...(o.spam ? [`spam ${o.spam[1]}`] : []),
    ...(o.fate ? [o.fate] : []),
  ];
}

/** The home hero's plot: Hollis's pigeonhole frame in miniature, the postal worker at it with a letter, and the
 * pillar box. */
export function postPlot(x: number, y: number, top: SceneCtx['top']): string {
  const fc = [(FRAME.x0 + FRAME.x1) / 2, (FRAME.y0 + FRAME.y1) / 2, BH];
  const pieces = [
    mini(frame(), fc, [x - 14, y - 4, BH], 0.48),
    mini(person({ x: 0, y: 0, facing: 200, pose: 'reach', look: POSTIE }), [0, 0, BH], [x - 2, y + 8, BH], 0.6),
    mini(pillar(), [...PILLAR, BH], [x + 14, y - 6, BH], 0.8),
  ];
  return drawPieces(pieces, top);
}
