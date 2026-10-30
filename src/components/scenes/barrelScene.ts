// The Rate limits module's picture (KTD8): Larkspur's stock API door, a brick-fronted back office with a lamp over the
// door (mint while the server answers, tomato once it has fallen over). Beside it stands the hero, a wooden rain
// barrel on a four-legged stand: a drip pipe from the gutter refills it (a drop per token a second), and a brass tap
// at its foot pours one cup per request served; an empty barrel's tap is shut, its handle tomato. Couriers queue at
// the door (at most 12 drawn, a count pill for the rest), each served one carrying a parcel; couriers turned away walk
// off with a red ticket (at most 6). A fixed window is the same barrel topped up all at once at the window's edge (a
// gush from the pipe); one barrel per partner key stands the barrels in a row, each with its partner's pill. Words
// only in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  arcUV,
  box,
  castShadow,
  cyl,
  ellUV,
  fill,
  line,
  matOf,
  on,
  pd,
  PZ,
  rod,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { bin, building, drawPieces, person, type Piece } from '../../lib/iso/figures';
import {
  hitsIn,
  isDown,
  levelAt,
  nameOf,
  plural,
  retryAfterOf,
  runOf,
  sizeOf,
  SCENES,
  type Run,
} from '../../lib/rate-limits/sim';
import type { Say } from '../story/steps';

export const BARREL_BOARD: Board = [30, 4, 160, 100];
/** At most this many couriers queue in the picture; a count pill carries the rest (KTD8). */
export const MAX_COURIERS = 12;
const MAX_AWAY = 4;

export interface BarrelState {
  key: string;
  name: string;
  /** tokens left (or the window's room) */
  level: number;
  size: number;
}
export interface BarrelOpts {
  /** none: no limit at the door */
  barrels: BarrelState[];
  /** tokens a second the pipe drips in; 0 for a fixed window */
  drip: number;
  /** a fixed window: topped up all at once at its edge */
  window?: boolean;
  /** the window was just topped up */
  gush?: boolean;
  /** in the last second: served, turned away (429) and failed at a fallen server */
  served: number;
  refused: number;
  failed: number;
  /** the server has fallen over */
  down: boolean;
  /** the last 429's Retry-After, seconds */
  retryAfter?: number;
  say?: Say;
  scale?: number;
}

/** The parts a step's callout may name. */
export const BARREL_PARTS = ['door', 'barrel', 'drip', 'tap', 'couriers', 'away'] as const;

/** The picture as of time t of a run. */
export function barrelAt(r: Run, t: number): Omit<BarrelOpts, 'say' | 'scale'> {
  const l = r.scene.limiter,
    last = hitsIn(r, t - 999, t + 1),
    ra = retryAfterOf(r, t);
  return {
    barrels: r.barrels.map(b => ({
      key: b,
      name: b === 'all' ? 'Barrel' : nameOf(b),
      level: levelAt(r, b, t),
      size: sizeOf(l),
    })),
    drip: l.kind === 'bucket' ? l.refill : 0,
    ...(l.kind === 'window' ? { window: true, gush: t % l.ms < 1000 && t >= l.ms } : {}),
    served: last.filter(h => h.verdict === 'ok').length,
    refused: last.filter(h => h.verdict === 'limited').length,
    failed: last.filter(h => h.verdict === 'down').length,
    down: isDown(r, t),
    ...(ra !== undefined ? { retryAfter: ra } : {}),
  };
}

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function barrelView(o: BarrelOpts) {
  const queue = o.served + o.failed,
    q = Math.min(MAX_COURIERS, queue);
  return {
    couriers: q,
    more: queue - q,
    carrying: Math.min(q, o.served),
    away: Math.min(MAX_AWAY, o.refused),
    barrels: o.barrels.length,
    empty: o.barrels.filter(b => b.level < 1).length,
    drops: o.window ? 0 : Math.min(4, Math.ceil(o.drip)),
  };
}

const DOOR = { x: 134, y: 24, d: 30, w: 32, h: 26 };
const DOOR_FRONT = DOOR.y + DOOR.w / 2;
const STAND_Y = 30,
  GUTTER_Z = BH + 48;
/** where each barrel stands: one big barrel, or a row of small ones */
const spots = (n: number) =>
  n <= 1 ? [{ x: 96, r: 10 }] : Array.from({ length: n }, (_, i) => ({ x: 106 - (n - 1 - i) * 16, r: 6.5 }));
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fillCol?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fillCol)}</g>`;
const OVER = '#f6c2b4';
const WATER = matOf('#7fb6d6');
const bx = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];

/** One barrel on its stand: four legs and a slatted top, the barrel (a wooden tub with two iron hoops and water inside
 * at its level), the brass tap at its foot toward the queue, pouring while there is a token, shut and tomato when not. */
function barrel(b: BarrelState, x: number, r: number, pouring: boolean): Piece {
  const y = STAND_Y,
    top = BH + 12,
    h = r * 2.3,
    frac = b.size ? Math.max(0, Math.min(1, b.level / b.size)) : 0;
  let s = '';
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    s += rod(
      [x + dx * r * 0.7, y + dy * r * 0.7, BH],
      [x + dx * r * 0.7, y + dy * r * 0.7, top],
      0.9,
      WOOD,
      toneI,
      0.9,
      0.9,
      6,
    );
  s += box(x - r - 1, y - r - 1, top, x + r + 1, y + r + 1, top + 1.6, WOOD, toneI, 0.9);
  // the water: a disc at its level inside the open top
  const wz = top + 1.6 + 1 + (h - 2) * frac,
    water =
      frac > 0
        ? fill(pd(on(PZ(wz), ellUV(x, y, r * (0.84 + 0.14 * frac), r * (0.84 + 0.14 * frac), 18))), WATER.l)
        : '';
  s += bin({ x, y, z: top + 1.6, r, h, pal: WOOD, contents: water }).items[0].svg;
  // two iron hoops, the near half of each
  for (const k of [0.25, 0.72])
    s += line(on(PZ(top + 1.6 + h * k), arcUV(x, y, r * (0.84 + 0.16 * k) + 0.3, -45, 135, 12)), 1.1);
  // the tap: a short brass spout toward +y, a handle on top (tomato and shut when empty), and its pour
  const tz = top + 4,
    ty = y + r * 0.86;
  s += rod([x, ty - 0.5, tz], [x, ty + 3, tz], 0.9, PALS.mustard, toneI, 0.9, 0.9, 6);
  s += rod([x, ty + 3, tz], [x, ty + 3, tz - 1.6], 0.8, PALS.mustard, toneI, 0.8, 0.8, 6);
  s += `<g class="tap${pouring ? ' open' : ' shut'}">${box(x - 1.8, ty + 1.2, tz + 1, x + 1.8, ty + 2, tz + 1.8, pouring ? DARK : PALS.tomato, toneI, 0.7)}</g>`;
  // the cup under the tap on the stand's step, filling while it pours
  s += cyl(x, ty + 3, top - 4.6, top - 1.6, 1.6, CERAMIC, toneI, 0.8, 8);
  if (pouring)
    s += `<g class="pour">${rod([x, ty + 3, tz - 1.6], [x, ty + 3, top - 1.6], 0.35, WATER, toneI, 0.4, 0.35, 8)}</g>`;
  const b3 = bx(x - r - 1, y - r - 1, BH, x + r + 1, y + r + 5, top + 1.6 + h);
  return {
    shadow: castShadow(boxCorners(x - r, y - r, BH, x + r, y + r, top + h), BH),
    items: [
      {
        box: b3,
        svg: `<g data-prop="barrel" data-key="${esc(b.key)}" data-level="${Math.floor(b.level)}" data-size="${b.size}">${s}</g>`,
      },
    ],
    box: b3,
  };
}

/** The gutter from the door's roof over the barrels, a downpipe over each, and its drops (or a gush). */
function gutter(o: BarrelOpts, xs: number[], top: number): Piece {
  const v = barrelView(o),
    x0 = Math.min(...xs) - 3,
    x1 = DOOR.x - DOOR.d / 2;
  let s = rod([x1, STAND_Y, GUTTER_Z], [x0, STAND_Y, GUTTER_Z], 1.1, METAL, toneI, 1, 1.1, 8);
  for (const x of xs) {
    s += rod([x, STAND_Y, GUTTER_Z], [x, STAND_Y, top + 6], 0.8, METAL, toneI, 0.9, 0.8, 6);
    if (o.window && o.gush)
      s += `<g class="gush">${rod([x, STAND_Y, top + 6], [x, STAND_Y, top - 4], 1.1, WATER, toneI, 0.5, 1.1, 10)}</g>`;
    for (let i = 0; i < v.drops; i++)
      s += `<g class="drop">${cyl(x, STAND_Y, top + 4 - i * 2.6, top + 4.9 - i * 2.6, 0.55, WATER, toneI, 0.4, 6)}</g>`;
  }
  // the gutter's bracket on the wall
  s += box(x1 - 1, STAND_Y - 1.5, GUTTER_Z - 3, x1 + 0.5, STAND_Y + 1.5, GUTTER_Z + 1.5, METAL, toneI, 0.8);
  const b = bx(x0 - 1, STAND_Y - 2, top, x1 + 1, STAND_Y + 2, GUTTER_Z + 2);
  return { shadow: '', items: [{ box: b, svg: `<g data-prop="drip" data-drip="${o.drip}">${s}</g>` }], box: b };
}

/** The stock API's door: Larkspur's back office, its lamp over the door. */
function door(o: BarrelOpts): Piece {
  const bld = building({
    x: DOOR.x,
    y: DOOR.y,
    d: DOOR.d,
    w: DOOR.w,
    h: DOOR.h,
    roof: 'parapet',
    front: '+y',
    windows: 2,
    pal: o.down ? matOf('#cfcac0') : matOf('#e8d6b0'),
  });
  const lamp = `<g class="lamp${o.down ? ' down' : ''}">${cyl(DOOR.x, DOOR_FRONT + 1.5, BH + DOOR.h - 6, BH + DOOR.h - 3, 1.8, o.down ? PALS.tomato : PALS.mint, toneI, 0.9, 14)}</g>`;
  const lb = bx(DOOR.x - 2, DOOR_FRONT, BH + DOOR.h - 6, DOOR.x + 2, DOOR_FRONT + 3.5, BH + DOOR.h - 3);
  return {
    shadow: bld.shadow,
    items: [
      ...bld.items.map(it => ({ ...it, svg: `<g data-prop="door" data-down="${o.down ? 1 : 0}">${it.svg}</g>` })),
      { box: lb, svg: lamp },
    ],
    box: bld.box,
  };
}

const LOOKS = ['shopper2', 'shopper4', 'tom', 'shopper5', 'mira', 'shopper3'];
/** Couriers queued at the door, two by two, facing it; the served ones carry a parcel. */
function couriers(o: BarrelOpts): Piece[] {
  const v = barrelView(o);
  return Array.from({ length: v.couriers }, (_, i) => {
    const p = person({
      x: DOOR.x - 1 + (i % 2) * 13,
      y: DOOR_FRONT + 12 + Math.floor(i / 2) * 9,
      facing: '-y',
      look: LOOKS[i % LOOKS.length],
      holding: i < v.carrying ? 'parcel' : null,
    });
    return { ...p, items: p.items.map(it => ({ ...it, svg: `<g class="courier">${it.svg}</g>` })) };
  });
}

/** Couriers turned away, walking off to the left with a red ticket. */
function away(o: BarrelOpts): Piece[] {
  const v = barrelView(o);
  return Array.from({ length: v.away }, (_, i) => {
    const x = 44 + (i % 3) * 12,
      y = 74 + Math.floor(i / 3) * 12;
    const p = person({ x, y, facing: '-x', pose: 'walk', look: LOOKS[(i + 3) % LOOKS.length], holding: null });
    const ticket = box(x - 4.6, y - 5.6, BH + 12.5, x - 3.8, y - 2.4, BH + 17, PALS.tomato, toneI, 0.7);
    return {
      ...p,
      items: [
        ...p.items.map(it => ({ ...it, svg: `<g class="away">${it.svg}</g>` })),
        { box: bx(x - 4.8, y - 5.8, BH + 12, x - 3.6, y - 2.2, BH + 17.5), svg: `<g class="ticket">${ticket}</g>` },
      ],
    };
  });
}

/** The scene: every shadow first, then all the parts in one depth sort, then the pills. */
export const barrelScene = (o: BarrelOpts) => (ctx: SceneCtx) => {
  const v = barrelView(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const sp = spots(o.barrels.length),
    pour = o.served > 0 && !o.down;
  const parts: Piece[] = [
    door(o),
    ...o.barrels.map((b, i) => barrel(b, sp[i].x, sp[i].r, pour && b.level >= 1)),
    ...(o.barrels.length
      ? [
          gutter(
            o,
            sp.map(s => s.x),
            BH + 13.6 + sp[0].r * 2.3,
          ),
        ]
      : []),
    ...couriers(o),
    ...away(o),
  ];
  const s = drawPieces(parts, ctx.top);
  const doorTop = [DOOR.x, DOOR_FRONT, BH + DOOR.h],
    queueEnd = [DOOR.x, DOOR_FRONT + 12 + 5 * 9, BH],
    awayAt = [56, 74, BH + 32],
    barrelTop = (i: number) => [sp[i].x, STAND_Y, BH + 13.6 + sp[i].r * 2.3];
  let pills = pill(
    doorTop,
    0,
    -16,
    narrow ? 'API' : o.down ? 'STOCK API · DOWN' : 'STOCK API · UP',
    false,
    scale,
    o.down ? OVER : undefined,
  );
  o.barrels.forEach((b, i) => {
    const short = b.key === 'all' ? 'BARREL' : b.name.split(/[ ’']/)[0].toUpperCase();
    pills += pill(
      barrelTop(i),
      0,
      o.barrels.length > 1 ? -10 - (o.barrels.length - 1 - i) * 16 : -16,
      narrow ? short : `${short} · ${Math.floor(b.level)}/${b.size}`,
      b.level < 1,
      scale,
      b.level < 1 ? OVER : undefined,
    );
  });
  if (o.barrels.length && !narrow)
    pills += pill(
      [DOOR.x - DOOR.d / 2 - 4, STAND_Y, GUTTER_Z],
      34,
      -8,
      o.window ? (o.gush ? 'TOPPED UP' : 'TOPS UP EACH MINUTE') : `DRIP · ${o.drip}/S`,
      !!o.gush,
      scale,
    );
  pills += pill(
    queueEnd,
    0,
    22,
    narrow ? 'COURIERS' : v.more > 0 ? `COURIERS · +${v.more}` : `COURIERS · ${o.served + o.failed}`,
    false,
    scale,
  );
  if (v.away)
    pills += pill(
      awayAt,
      0,
      -12,
      narrow ? '429' : o.retryAfter ? `429 · WAIT ${o.retryAfter} S` : `429 · ${o.refused}`,
      true,
      scale,
      OVER,
    );
  // the callout stands over its part, a row above the part's pill
  pills +=
    sayAt(o.say, 'door', doorTop, -16, scale) +
    sayAt(o.say, 'barrel', o.barrels.length ? barrelTop(0) : [86, STAND_Y, BH + 12], -16, scale) +
    sayAt(o.say, 'drip', [DOOR.x - DOOR.d / 2 - 4, STAND_Y, GUTTER_Z], -8, scale) +
    sayAt(o.say, 'tap', [sp[0].x, STAND_Y + sp[0].r, BH + 14], 8, scale) +
    sayAt(o.say, 'couriers', [DOOR.x, DOOR_FRONT + 12, BH + 30], -10, scale) +
    sayAt(o.say, 'away', awayAt, -12, scale);
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function barrelLabel(o: BarrelOpts): string {
  const limit = !o.barrels.length
    ? 'No barrel: nothing limits the requests at the door.'
    : o.barrels
        .map(
          b =>
            `${b.key === 'all' ? 'The barrel' : `${b.name}’s barrel`} holds ${Math.floor(b.level)} of ${b.size} tokens`,
        )
        .join('; ') + (o.window ? ', topped up at each minute.' : `, refilled ${o.drip} a second.`);
  return (
    `Larkspur’s stock API is ${o.down ? 'down' : 'up'}. ${limit} In the last second: ` +
    `${plural(o.served, 'request')} served, ${o.refused} turned away with 429` +
    `${o.failed ? `, ${o.failed} failed at the fallen server` : ''}.`
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function barrelReadouts(o: BarrelOpts): string[] {
  return [
    ...o.barrels.map(b => `${b.key === 'all' ? 'barrel' : b.name} ${Math.floor(b.level)}/${b.size}`),
    `${o.served} served`,
    ...(o.refused ? [`${o.refused} turned away`] : []),
    ...(o.failed ? [`${o.failed} failed`] : []),
    ...(o.down ? ['server down'] : []),
  ];
}

/** The home card's picture (and the intro's hero): chapter 4's moment, the barrel empty after Quickfix's burst, its
 * tap shut, the couriers it turned away walking off with 429 and Retry-After. */
export const barrelCard = (scale = 1.7): BarrelOpts => {
  const r = runOf(SCENES.ignore),
    t = r.hits.filter(h => h.n === 1).at(-1)!.at + 10;
  return { ...barrelAt(r, t), scale };
};
