// The Backups module's picture (KTD8): Larkspur's server room, cut away, with the order database's server rack at the
// back and the hero, the **tape-reel cabinet**: open shelves where every copy is a reel of tape (at most 7 drawn, the
// newest; a count pill for the rest; a full copy is a big cobalt reel, an incremental a small mint one). Mira stands
// by it. Outside, the courier's **lockbox on a handcart**, the offline copy; across town, the warehouse that takes
// copies over the network (a wire on a pole while it is on). A disaster draws on the places it hits: the dead disk
// smokes, fire burns the room and chars the reels, ransomware hangs a padlock on everything the network reaches. The
// copy the restore came from wears a mint ring; a tape that never reads back turns tomato once it is found out.
// Words only in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  castShadow,
  cyl,
  line,
  matOf,
  rod,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { building, cart, drawPieces, padlock, person, pole, type Piece } from '../../lib/iso/figures';
import {
  KIND,
  SCENES,
  STRIKES,
  clock,
  copiesAt,
  weekOf,
  ordersIn,
  plural,
  restore,
  type Kind,
  type Place,
  type Strike,
  type Week,
} from '../../lib/backups/sim';
import type { Say } from '../story/steps';

export const SAFE_BOARD: Board = [0, 10, 198, 100];
/** At most this many reels on the cabinet's shelves; a count pill carries the rest (KTD8). */
export const MAX_REELS = 7;
/** The parts a step's callout may name. */
export const SAFE_PARTS = ['server', 'cabinet', 'warehouse', 'lockbox'] as const;

export interface Reel {
  t: number;
  full: boolean;
  /** never reads back, and found out (struck or tested) */
  bad?: boolean;
  /** the restore came from this tape */
  used?: boolean;
}
export interface SafeOpts {
  hour: number;
  /** orders written so far this week */
  orders: number;
  /** the cabinet's tapes so far, oldest first */
  reels: Reel[];
  /** copies at the warehouse and in the lockbox; null when that place is off */
  warehouse: number | null;
  lockbox: number | null;
  /** the disaster, once struck: what it hit and where the restore came from */
  strike?: { kind: Kind; hit: Place[]; from: Place | null; point: number | null; lost: number; down: number | null };
  /** a test restore caught the bad copy job at this hour */
  caught?: number | null;
  say?: Say;
  scale?: number;
}

/** The picture at the end of `hour` of a week, struck or not. */
export function safeAt(w: Week, hour: number, strike?: Strike | null): Omit<SafeOpts, 'say' | 'scale'> {
  const at = strike ? strike.hour : hour,
    r = strike ? restore(w, strike) : null,
    caught = w.caught !== null && w.caught <= at ? w.caught : null;
  const reels = copiesAt(w, at, 'cabinet').map(c => ({
    t: c.t,
    full: c.full,
    ...(c.bad && (r || caught !== null) ? { bad: true } : {}),
    ...(r?.from === 'cabinet' && r.point === c.t ? { used: true } : {}),
  }));
  return {
    hour: at,
    orders: ordersIn(0, at),
    reels,
    warehouse: w.policy.warehouse ? copiesAt(w, at, 'warehouse').length : null,
    lockbox: w.policy.lockbox ? copiesAt(w, at, 'lockbox').length : null,
    ...(r
      ? { strike: { kind: r.strike.kind, hit: r.hit, from: r.from, point: r.point, lost: r.lost, down: r.down } }
      : {}),
    ...(caught !== null ? { caught } : {}),
  };
}

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function safeState(o: SafeOpts) {
  const shown = o.reels.slice(-MAX_REELS),
    hit = new Set(o.strike?.hit ?? []);
  return {
    reels: shown.length,
    more: o.reels.length - shown.length,
    how: o.strike ? KIND[o.strike.kind].how : null,
    serverDown: !!o.strike,
    cabinetLost: hit.has('cabinet'),
    warehouseLost: o.warehouse !== null && hit.has('warehouse'),
    restored: o.strike?.from ?? null,
  };
}

const ROOM = { x0: 6, x1: 92, y0: 14, y1: 62, h: 40 };
const RACK = [24, 28];
const CAB = { x0: 44, x1: 86, y0: 18, y1: 28 };
const CART = [128, 74];
const WARE = [176, 36];
const FLOOR = BH + 1.5;
const BURNT = matOf('#5b524a');
const OVER = '#f6c2b4';
const COURIER_LOOK = {
  skin: '#c18456',
  top: PALS.tomato.m,
  legs: '#3b4566',
  hair: '#2b231c',
  cut: 'short' as const,
  hat: 'cap' as const,
  hatCol: PALS.mustard.l,
};
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const bx = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
const piece = (b: number[][], svg: string, shadow = true): Piece => ({
  shadow: shadow ? castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH) : '',
  items: [{ box: b, svg }],
  box: b,
});

/** The server room's floor and its two back walls (cut away at the front), a window in the long wall. */
function room(o: SafeOpts): Piece {
  const burnt = safeState(o).how === 'burnt',
    wall = burnt ? BURNT : matOf('#efe6d2');
  const { x0, x1, y0, y1, h } = ROOM;
  let s = box(x0, y0, BH, x1, y1, FLOOR, burnt ? BURNT : matOf('#d8d2c4'), toneI, 1);
  s += box(x0, y0 - 2, FLOOR, x1, y0, FLOOR + h, wall, toneI, 1);
  s += box(x0 - 2, y0 - 2, FLOOR, x0, y1, FLOOR + h, wall, toneI, 1);
  // a window in the side wall, toward the street
  s += box(x0 + 0.1, y0 + 30, FLOOR + 16, x0 + 0.4, y0 + 42, FLOOR + 30, burnt ? DARK : PALS.cobalt, toneI, 0.8);
  return piece(bx(x0 - 2, y0 - 2, BH, x1, y1, FLOOR + h), `<g data-prop="room">${s}</g>`, false);
}

/** The server rack holding the order database: a tall dark cabinet, rows of drive bays with a lamp each. */
function rack(o: SafeOpts): Piece {
  const [x, y] = RACK,
    st = safeState(o),
    lamp = st.serverDown ? PALS.tomato : PALS.mint,
    body = st.how === 'burnt' ? BURNT : DARK;
  let s = box(x - 6, y - 6, FLOOR, x + 6, y + 6, FLOOR + 36, body, toneI, 1.1);
  for (let i = 0; i < 6; i++) {
    const z = FLOOR + 5 + i * 5;
    s += box(x - 4.5, y + 6, z, x + 4.5, y + 6.4, z + 3.4, METAL, toneI, 0.5);
    s += box(x + 2.2, y + 6.4, z + 1, x + 3.6, y + 6.8, z + 2.4, lamp, toneI, 0.4);
  }
  if (st.how === 'dead')
    for (const [dx, dz, r] of [
      [0, 40, 3],
      [3, 45, 4],
      [-2, 51, 4.6],
    ])
      s += `<g class="smoke">${cyl(x + dx, y, FLOOR + dz, FLOOR + dz + r * 0.8, r, METAL, toneI, 0.8, 16)}</g>`;
  if (st.how === 'locked') s += lockOn([x, y + 7, FLOOR + 16]);
  return piece(
    bx(x - 6, y - 6, FLOOR, x + 6, y + 7, FLOOR + 36),
    `<g data-prop="server" data-down="${st.serverDown ? 1 : 0}">${s}</g>`,
  );
}

/** A padlock hung on a part's front (ransomware), drawn as one svg string. */
const lockOn = (p: number[]) => {
  const l = padlock({ x: p[0], y: p[1], z: p[2], size: 1.3, facing: '+y' });
  return `<g class="ransom">${l.items.map(i => i.svg).join('')}</g>`;
};

/** The tape-reel cabinet, the hero: a back panel, two sides, a top and two shelves; each copy a reel of tape standing
 * on a shelf, facing out. Full copies are big cobalt reels, incrementals small mint ones. */
function cabinet(o: SafeOpts): Piece {
  const { x0, x1, y0, y1 } = CAB,
    st = safeState(o),
    burnt = st.how === 'burnt',
    frame = burnt ? BURNT : WOOD,
    top = FLOOR + 40;
  let s = box(x0, y0, FLOOR, x1, y0 + 1.5, top, frame, toneI, 1);
  for (const sx of [x0, x1 - 1.5]) s += box(sx, y0, FLOOR, sx + 1.5, y1, top, frame, toneI, 1);
  s += box(x0, y0, top - 1.5, x1, y1, top, frame, toneI, 1);
  const shelves = [FLOOR + 2, FLOOR + 21];
  for (const z of shelves) s += box(x0 + 1.5, y0 + 1.5, z - 1.5, x1 - 1.5, y1, z, frame, toneI, 0.8);
  const shown = o.reels.slice(-MAX_REELS);
  shown.forEach((r, i) => {
    const lower = i < 4,
      x = lower ? x0 + 7 + i * 9.5 : x0 + 11.5 + (i - 4) * 9.5,
      R = r.full ? 4.4 : 3.3,
      z = (lower ? shelves[0] : shelves[1]) + R,
      m = burnt ? BURNT : r.bad ? PALS.tomato : r.full ? PALS.cobalt : PALS.mint;
    let reel = rod([x, y0 + 4, z], [x, y0 + 7.5, z], R, m, toneI, 0.9, R, 20);
    reel += rod([x, y0 + 7.5, z], [x, y0 + 7.9, z], R * 0.32, burnt ? DARK : CERAMIC, toneI, 0.6, R * 0.32, 12);
    if (r.used) reel += rod([x, y0 + 7.9, z], [x, y0 + 8.2, z], R + 1.1, PALS.mint, toneI, 1.2, R + 1.1, 20);
    s += `<g class="reel${r.full ? ' full' : ''}${r.bad ? ' bad' : ''}${r.used ? ' used' : ''}" data-t="${r.t}">${reel}</g>`;
  });
  if (st.how === 'locked') s += lockOn([(x0 + x1) / 2, y1 + 1, FLOOR + 18]);
  if (burnt) s += flames((x0 + x1) / 2, y1 + 6);
  return piece(
    bx(x0, y0, FLOOR, x1, y1 + 1, top),
    `<g data-prop="cabinet" data-reels="${o.reels.length}" data-shown="${st.reels}" data-lost="${st.cabinetLost ? 1 : 0}">${s}</g>`,
  );
}

/** Flames: tapering tongues of tomato and mustard, standing on the floor in front of what burns. */
function flames(x: number, y: number) {
  let s = '';
  for (const [dx, dy, h, r, m] of [
    [-14, 0, 22, 3.4, PALS.tomato],
    [-6, 3, 30, 4.2, PALS.tomato],
    [-4, 4, 18, 2.6, PALS.mustard],
    [4, 1, 26, 3.8, PALS.tomato],
    [6, 3, 15, 2.4, PALS.mustard],
    [14, 0, 20, 3.2, PALS.tomato],
  ] as const)
    s += rod([x + dx, y + dy, FLOOR], [x + dx, y + dy, FLOOR + h], r, m, toneI, 0.9, 0.2, 12);
  return `<g class="fire">${s}</g>`;
}

/** Mira by the cabinet: reaching for a reel while copies run, standing still after a disaster. */
function mira(o: SafeOpts): Piece {
  return person({ x: 106, y: 32, facing: '-x', pose: o.strike ? 'stand' : 'reach', look: 'mira' });
}

/** The courier's handcart with the lockbox on its tray: a steel box with a padlock on its front. */
function lockbox(o: SafeOpts): Piece[] {
  const [x, y] = CART,
    on = o.lockbox !== null,
    used = o.strike?.from === 'lockbox';
  const c = cart({ x, y, facing: '-x' });
  const z = BH + 12.5;
  const parts: Piece[] = [c, person({ x: x + 22, y: y + 1, facing: '-x', pose: 'stand', look: COURIER_LOOK })];
  if (on) {
    let s = box(x - 7, y - 5, z, x + 7, y + 5, z + 9, PALS.cobalt, toneI, 1.1);
    s += box(x - 7.4, y - 5.4, z + 9, x + 7.4, y + 5.4, z + 10.4, DARK, toneI, 1);
    if (used) s += box(x - 8, y - 6, z + 10.4, x + 8, y + 6, z + 11, PALS.mint, toneI, 1.1);
    const l = padlock({ x, y: y + 5.6, z: z + 1, size: 1, facing: '+y' });
    s += l.items.map(i => i.svg).join('');
    parts.push({
      shadow: '',
      items: [
        {
          box: bx(x - 8, y - 6, z, x + 8, y + 7, z + 11),
          svg: `<g data-prop="lockbox" data-copies="${o.lockbox}"${used ? ' data-used="1"' : ''}>${s}</g>`,
        },
      ],
      box: bx(x - 8, y - 6, z, x + 8, y + 7, z + 11),
    });
  } else parts.push(piece(bx(x - 1, y - 1, z, x, y, z + 0.1), '<g data-prop="lockbox" data-copies="off"></g>', false));
  return parts;
}

/** The warehouse across town: a sawtooth-roofed shed; the wire from the server room runs to it on a pole while
 * copies go there. Ransomware padlocks its door too. */
function warehouse(o: SafeOpts): Piece[] {
  const [x, y] = WARE,
    on = o.warehouse !== null,
    st = safeState(o);
  const shed = building({
    x,
    y,
    d: 26,
    w: 30,
    h: 20,
    roof: 'sawtooth',
    front: '+y',
    windows: 2,
    pal: on ? matOf('#e8d6b0') : matOf('#d9d4c8'),
  });
  const b = shed.box;
  const extra = st.warehouseLost ? lockOn([x, y + 15.5, BH + 8]) : '';
  const used =
    o.strike?.from === 'warehouse' ? box(x - 14, y + 15, BH, x + 14, y + 16, BH + 1.2, PALS.mint, toneI, 1) : '';
  return [
    {
      shadow: shed.shadow,
      items: [
        {
          box: b,
          svg: `<g data-prop="warehouse" data-copies="${o.warehouse ?? 'off'}"${st.warehouseLost ? ' data-lost="1"' : ''}>${shed.items.map(i => i.svg).join('')}${extra}${used}</g>`,
        },
      ],
      box: b,
    },
    ...(on ? [pole({ x: 136, y: 20, h: 46 })] : []),
  ];
}

/** The wire from the server room's back corner to the pole and on to the warehouse, drawn over the ground. */
const wire = (o: SafeOpts) =>
  o.warehouse === null
    ? ''
    : `<g class="wire">${line(
        [
          [ROOM.x1, ROOM.y0 - 1, FLOOR + ROOM.h - 2],
          [136, 20 - 4, BH + 42],
          [WARE[0] - 13, WARE[1] - 6, BH + 18],
        ],
        0.9,
      )}</g>`;

/** The scene: every shadow first, then all the parts in one depth sort, then the wire and the pills. */
export const safeScene = (o: SafeOpts) => (ctx: SceneCtx) => {
  const st = safeState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const s = drawPieces([room(o), rack(o), cabinet(o), mira(o), ...lockbox(o), ...warehouse(o)], ctx.top);
  const P_SERVER = [RACK[0], RACK[1], FLOOR + 38],
    P_CAB = [(CAB.x0 + CAB.x1) / 2, CAB.y0, FLOOR + 40],
    P_WARE = [WARE[0], WARE[1], BH + 28],
    P_BOX = [CART[0], CART[1], BH + 24];
  let pills = pill(
    P_SERVER,
    0,
    -16,
    narrow ? 'SERVER' : st.serverDown ? 'SERVER · DOWN' : `SERVER · ${o.orders} ORDERS`,
    false,
    scale,
    st.serverDown ? OVER : undefined,
  );
  pills += pill(
    P_CAB,
    0,
    -16,
    narrow ? 'TAPES' : `TAPES · ${o.reels.length}${st.cabinetLost ? ' LOST' : ''}`,
    st.restored === 'cabinet',
    scale,
    st.cabinetLost ? OVER : undefined,
  );
  if (st.more > 0) pills += pill([CAB.x0 + 4, CAB.y1, FLOOR + 10], -14, 14, `+${st.more}`, true, scale);
  pills += pill(
    P_WARE,
    0,
    -16,
    narrow
      ? 'WAREHOUSE'
      : o.warehouse === null
        ? 'WAREHOUSE · OFF'
        : `WAREHOUSE · ${o.warehouse}${st.warehouseLost ? ' LOST' : ''}`,
    st.restored === 'warehouse',
    scale,
    st.warehouseLost ? OVER : undefined,
  );
  pills += pill(
    P_BOX,
    0,
    -16,
    narrow ? 'LOCKBOX' : o.lockbox === null ? 'LOCKBOX · OFF' : `LOCKBOX · ${o.lockbox}`,
    st.restored === 'lockbox',
    scale,
  );
  if (o.strike)
    pills += pill(
      [ROOM.x0 + 30, ROOM.y1, FLOOR],
      0,
      20,
      narrow
        ? KIND[o.strike.kind].name.toUpperCase()
        : `${KIND[o.strike.kind].name.toUpperCase()} · ${clock(o.hour).toUpperCase()}`,
      false,
      scale,
      OVER,
    );
  pills +=
    sayAt(o.say, 'server', P_SERVER, -16, scale) +
    sayAt(o.say, 'cabinet', P_CAB, -16, scale) +
    sayAt(o.say, 'warehouse', P_WARE, -16, scale) +
    sayAt(o.say, 'lockbox', P_BOX, -16, scale);
  return `<g class="safe${o.strike ? ` struck ${st.how}` : ''}">${s}${wire(o)}</g>${pills}`;
};

/** The picture in words, for its aria-label. */
export function safeLabel(o: SafeOpts): string {
  const st = safeState(o);
  const places =
    `${plural(o.reels.length, 'tape')} in the server room’s cabinet` +
    (o.warehouse === null ? '' : `, ${o.warehouse} ${o.warehouse === 1 ? 'copy' : 'copies'} at the warehouse`) +
    (o.lockbox === null ? '' : `, ${o.lockbox} in the courier’s lockbox`);
  const s = o.strike;
  const after = !s
    ? `${o.orders} orders written so far.`
    : `${KIND[s.kind].name} at ${clock(o.hour)}: it hit ${['the server', ...s.hit.map(p => `the ${p}`)].join(', ')}. ` +
      (s.from === null
        ? 'No copy survived: every order is gone.'
        : `Restored from the ${s.from} copy of ${clock(s.point!)}: ${plural(s.lost, 'order')} lost, ${s.down} hours down.`);
  return `Larkspur’s server room at ${clock(o.hour)}: ${places}${st.more ? ` (${st.reels} drawn)` : ''}. ${after}`;
}

/** The counts the caption carries (phones show only the names in the pills). */
export function safeReadouts(o: SafeOpts): string[] {
  const s = o.strike;
  return [
    `${plural(o.reels.length, 'tape')}`,
    ...(o.warehouse !== null ? [`${o.warehouse} at the warehouse`] : []),
    ...(o.lockbox !== null ? [`${o.lockbox} in the lockbox`] : []),
    ...(s
      ? s.from === null
        ? ['nothing to restore']
        : [`back to ${clock(s.point!)}`, `${s.lost} orders lost`, `${s.down} h down`]
      : [`${o.orders} orders`]),
  ];
}

/** The home card's picture (and the intro's hero): chapter 5's moment, ransomware has padlocked the server room and
 * the warehouse, and the courier's lockbox restores. */
export const safeCard = (scale = 1.7): SafeOpts => ({ ...safeAt(weekOf(SCENES.lockbox), 0, STRIKES.ransom), scale });
