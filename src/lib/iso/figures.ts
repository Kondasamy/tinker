// The figure kit: people, the model machine, buildings, vehicles and props that two or more scenes share (KTD1).
// Every piece returns { shadow, items, box }: shadow paint only in `shadow`, sortable { box, svg } items with none, and
// the footprint it promises to stay inside. A scene paints every piece's shadow first, then runs one byDepth over all
// items (drawPieces does both). Pieces stand on z (default BH, the board top) and draw correctly in every VIEW turn:
// a face, and anything mounted on it, is drawn only when it faces the viewer.
import {
  PALS,
  METAL,
  CLEAR,
  CERAMIC,
  DARK,
  WOOD,
  P,
  pd,
  sp,
  on,
  PX,
  PY,
  PZ,
  rrUV,
  ellUV,
  sub,
  dot,
  cross,
  norm,
  avg,
  vis,
  tone,
  toneI,
  matOf,
  ink,
  fill,
  shape,
  line,
  loft,
  openShell,
  hull,
  hullInk,
  extrude,
  box as cube,
  cyl,
  rod,
  castShadow,
  clipTo,
  byDepth,
} from './core.js';
import { BH, HALF, STATE_COL, STATE_TXT, esc, faceText } from './shared';

type V = number[];
type Mat = { l: string; m: string; d: string };
export interface Item {
  at?: number[];
  box: number[][];
  svg: string;
}
export interface Piece {
  shadow: string;
  items: Item[];
  /** the footprint every item stays inside: [[x0, y0, z0], [x1, y1, z1]] */
  box: number[][];
}

/* ---------- small geometry helpers ---------- */
const add = (...vs: V[]) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]]);
const mul = (v: V, k: number) => v.map(x => x * k);
const bbox = (pts: V[]) => [0, 1].map(e => [0, 1, 2].map(k => (e ? Math.max : Math.min)(...pts.map(p => p[k]))));
const item = (pts: V[], svg: string): Item => ({ box: bbox(pts), svg });
/** heavy silhouette at a fixed weight (hullInk thins small parts; a person needs a bold edge at any size) */
const outline = (pts: V[], w: number) => ink(sp(hull(pts.map(p => P(p[0], p[1], p[2])))), w);
/** corners of a rod's bounding box: its end discs reach r × sin(angle to each axis) off the axis */
const rodPts = (a: V, b: V, r: number) => {
  const d: V = norm(sub(b, a)),
    e = d.map(v => r * Math.sqrt(Math.max(0, 1 - v * v)));
  return [sub(a, e), add(a, e), sub(b, e), add(b, e)];
};
const circle = (c: V, e1: V, e2: V, r1: number, r2: number, n = 14) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    return add(c, mul(e1, r1 * Math.cos(t)), mul(e2, r2 * Math.sin(t)));
  });
/** rings of a sphere cap about axis ax (e1, e2 perpendicular to it), latitudes l0..l1 in degrees */
const sphere = (c: V, ax: V, e1: V, e2: V, R: number, l0: number, l1: number, steps = 6, n = 14, k = 1) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const L = ((l0 + ((l1 - l0) * i) / steps) * Math.PI) / 180;
    return circle(add(c, mul(ax, R * Math.sin(L) * k)), e1, e2, R * Math.cos(L), R * Math.cos(L), n);
  });

/** A closed solid lofted through rings (a body, a head, a brim): banded sides, the end caps that face the viewer, ink. */
function solid(rings: V[][], m: Mat, w = 1, shade = toneI) {
  let s = '';
  for (let i = 0; i + 1 < rings.length; i++) s += loft(rings[i], rings[i + 1], (n: V) => shade(n, m));
  for (const [r, nb] of [
    [rings[0], rings[1]],
    [rings[rings.length - 1], rings[rings.length - 2]],
  ]) {
    const n = norm(sub(avg(r), avg(nb)));
    if (vis(n)) s += fill(pd(r), shade(n, m)) + ink(pd(r), w * 0.5);
  }
  return s + outline(rings.flat(), w);
}

const QUADS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
];
/** A convex six-faced solid from 8 corners (bottom ring then top ring): visible faces only, each shaded and inked. */
export function hexa(c: V[], m: Mat, w = 0.9, shade = toneI) {
  const ctr = avg(c);
  return QUADS.map(f => {
    const q = f.map(i => c[i]);
    let n = norm(cross(sub(q[1], q[0]), sub(q[3], q[0])));
    if (!Number.isFinite(n[0])) return '';
    if (dot(n, sub(avg(q), ctr)) < 0) n = mul(n, -1);
    return vis(n) ? shape(q, shade(n, m), w) : '';
  }).join('');
}

/* ---------- local frames: pieces that turn (people, vehicles, belts) model along F (forward), S (side), U (up) ---------- */
export type Facing = number | '+x' | '-x' | '+y' | '-y';
const DIR = { '+x': 0, '+y': 90, '-x': 180, '-y': 270 };
interface Fr {
  F: V;
  S: V;
  U: V;
  at: (a: number, b: number, c: number) => V;
}
function frameAt(o: V, facing: Facing = '+x', fallen = false): Fr {
  const t = ((typeof facing === 'number' ? facing : DIR[facing]) * Math.PI) / 180;
  let F = [Math.cos(t), Math.sin(t), 0],
    U = [0, 0, 1];
  const S = [-Math.sin(t), Math.cos(t), 0];
  // lying on its back, head toward where it came from
  if (fallen) [F, U] = [U, mul(F, -1)];
  return { F, S, U, at: (a, b, c) => add(o, mul(F, a), mul(S, b), mul(U, c)) };
}
const lbox = (fr: Fr, a0: number, a1: number, b0: number, b1: number, c0: number, c1: number) => [
  fr.at(a0, b0, c0),
  fr.at(a1, b0, c0),
  fr.at(a1, b1, c0),
  fr.at(a0, b1, c0),
  fr.at(a0, b0, c1),
  fr.at(a1, b0, c1),
  fr.at(a1, b1, c1),
  fr.at(a0, b1, c1),
];

/** Paint every piece's shadow (the floor layer, clipped to the board when given), then sort all items together. */
export const drawPieces = (pieces: Piece[], clip?: number[][]) => {
  const sh = pieces.map(p => p.shadow).join('');
  return (clip ? clipTo(clip, sh) : sh) + byDepth(pieces.flatMap(p => p.items));
};

/* ============================================================
   People. A toy peg figure, about 30 units tall on a CELL = 56 board (a person beside a 32-unit model machine).
   Real-object notes: legs from the hips (z 12.5) to shoes that point the way the person faces; a tapered body,
   widest at the shoulders; arms jointed at shoulder and elbow like the lamp's arm; a ball head with no face. Who it
   is reads from the silhouette (hat, hair, coat length, what they hold) as well as colour.
   ============================================================ */
export type Pose = 'stand' | 'walk' | 'sit' | 'reach' | 'carry' | 'fallen';
export const POSES: Pose[] = ['stand', 'walk', 'sit', 'reach', 'carry', 'fallen'];
export type Prop = 'parcel' | 'clipboard' | 'mug' | 'bag';
export type Cut = 'short' | 'bun' | 'long' | 'curly' | 'ponytail' | 'bald';
export type Hat = 'cap' | 'beanie' | 'hard' | 'fedora' | 'headset';
export interface Look {
  skin: string;
  top: string;
  legs: string;
  hair: string;
  cut: Cut;
  hat?: Hat;
  hatCol?: string;
  /** a long coat down to the knees */
  coat?: boolean;
  prop?: Prop;
}
export const SKIN = ['#f3cfae', '#e2ab82', '#c18456', '#8d5838', '#5f3b27'];
const HAIR = { black: '#2b231c', brown: '#6a4426', blond: '#d9b35c', grey: '#bdb7ab', red: '#a3482a' };
const TROUSERS = { navy: '#3b4566', denim: '#5a6f93', khaki: '#a8946a', charcoal: '#4a4642' };

export const CAST = {
  rosa: { skin: SKIN[2], top: PALS.mint.l, legs: TROUSERS.navy, hair: HAIR.black, cut: 'bun' },
  tomas: {
    skin: SKIN[1],
    top: PALS.cobalt.l,
    legs: TROUSERS.charcoal,
    hair: HAIR.black,
    cut: 'short',
    hat: 'cap',
    hatCol: PALS.tomato.l,
  },
  ines: { skin: SKIN[3], top: PALS.tomato.l, legs: TROUSERS.denim, hair: HAIR.black, cut: 'long' },
  mira: { skin: SKIN[4], top: PALS.mustard.l, legs: TROUSERS.navy, hair: HAIR.black, cut: 'curly' },
  tom: {
    skin: SKIN[0],
    top: '#b39ddb',
    legs: TROUSERS.khaki,
    hair: HAIR.red,
    cut: 'short',
    hat: 'beanie',
    hatCol: PALS.mint.m,
  },
  employee: { skin: SKIN[1], top: '#f4f1e8', legs: TROUSERS.navy, hair: HAIR.brown, cut: 'short', prop: 'mug' },
  operator: {
    skin: SKIN[3],
    top: '#ef8f3c',
    legs: TROUSERS.denim,
    hair: HAIR.black,
    cut: 'short',
    hat: 'hard',
    hatCol: PALS.mustard.l,
  },
  eve: {
    skin: SKIN[0],
    top: '#b8a274',
    legs: TROUSERS.charcoal,
    hair: HAIR.brown,
    cut: 'short',
    hat: 'fedora',
    hatCol: '#5a4a3a',
    coat: true,
  },
  supportLead: {
    skin: SKIN[2],
    top: PALS.cobalt.l,
    legs: TROUSERS.charcoal,
    hair: HAIR.grey,
    cut: 'short',
    hat: 'headset',
    hatCol: DARK.l,
    prop: 'clipboard',
  },
  shopper1: { skin: SKIN[0], top: PALS.blush.l, legs: TROUSERS.denim, hair: HAIR.blond, cut: 'ponytail', prop: 'bag' },
  shopper2: { skin: SKIN[2], top: PALS.mint.m, legs: TROUSERS.khaki, hair: HAIR.brown, cut: 'short' },
  shopper3: { skin: SKIN[4], top: PALS.mustard.m, legs: TROUSERS.navy, hair: HAIR.black, cut: 'bald', prop: 'bag' },
  shopper4: { skin: SKIN[1], top: PALS.cobalt.m, legs: TROUSERS.charcoal, hair: HAIR.grey, cut: 'bun' },
  shopper5: { skin: SKIN[3], top: PALS.tomato.m, legs: TROUSERS.denim, hair: HAIR.black, cut: 'curly' },
} satisfies Record<string, Look>;
export type CastKey = keyof typeof CAST;
const GENERIC: Look = { skin: SKIN[2], top: '#9fb3a0', legs: TROUSERS.charcoal, hair: HAIR.brown, cut: 'short' };
/** The look's silhouette marker: the hat, else the held prop, else the hair cut. */
export const markOf = (l: Look) => l.hat ?? l.prop ?? l.cut;
const lookOf = (k?: string | Look): Look =>
  typeof k === 'object' ? k : k && Object.hasOwn(CAST, k) ? CAST[k as CastKey] : GENERIC;

export interface PersonOpts {
  x: number;
  y: number;
  z?: number;
  facing?: Facing;
  pose?: Pose;
  /** a CAST key (unknown keys get the generic look) or a look of its own */
  look?: string | Look;
  /** overrides the look's prop; null holds nothing */
  holding?: Prop | null;
}

// [elbow, hand] for the right (-b) arm then the left (+b); legs as [hip, (knee,) ankle] each; drop lowers the body
type Arm = [V, V];
interface Rig {
  drop: number;
  arms: [Arm, Arm];
  legs: V[][];
}
const legsStraight = (ra: number, la: number): V[][] => [
  [
    [0, -1.9, 12.5],
    [ra, -1.9, 1.2],
  ],
  [
    [0, 1.9, 12.5],
    [la, 1.9, 1.2],
  ],
];
const side = (e: V, h: V): [Arm, Arm] => [
  [e, h],
  [
    [e[0], -e[1], e[2]],
    [h[0], -h[1], h[2]],
  ],
];
const RIG: Record<Pose, Rig> = {
  stand: { drop: 0, arms: side([0.2, -4.7, 17], [0.6, -4.9, 12.4]), legs: legsStraight(0, 0) },
  walk: {
    drop: 0,
    arms: [
      [
        [1.7, -4.6, 17.2],
        [3.9, -4.7, 13.5],
      ],
      [
        [-1.7, 4.6, 17.2],
        [-3.4, 4.7, 13.7],
      ],
    ],
    legs: legsStraight(3.6, -3.2),
  },
  sit: {
    drop: 5.5,
    arms: side([0.8, -4.6, 11.8], [4.6, -3.4, 9.8]),
    legs: [-1.9, 1.9].map(b => [
      [0, b, 7.5],
      [6.4, b, 7.5],
      [6.4, b, 1.2],
    ]),
  },
  reach: {
    drop: 0,
    arms: [
      [
        [3.2, -4.4, 22.6],
        [7.6, -3.8, 25.6],
      ],
      [
        [0.2, 4.7, 17],
        [0.6, 4.9, 12.4],
      ],
    ],
    legs: legsStraight(0.8, -0.6),
  },
  carry: { drop: 0, arms: side([1.8, -4.5, 16.4], [5.6, -3.4, 18]), legs: legsStraight(0, 0) },
  fallen: { drop: 0, arms: side([0.6, -6.8, 19], [1.4, -9.2, 22.2]), legs: legsStraight(0, 0) },
};
// the right hand when it holds something in front (mug, clipboard)
const HOLD: Arm = [
  [0.8, -4.6, 17],
  [4.2, -4.1, 15.6],
];

/** A person: a toy peg figure. Pose stand / walk / sit / reach / carry / fallen; facing an angle in degrees from +x
 * toward +y, or an axis. Footprint: 11 around (x, y), 36 tall; fallen, 34 around and 12 tall. */
export function person(o: PersonOpts): Piece {
  const pose = o.pose ?? 'stand',
    look = lookOf(o.look),
    z = o.z ?? BH,
    fallen = pose === 'fallen';
  // lying down, the figure rests on its widest part: curly hair, a coat's skirt, else the head
  const lift = look.cut === 'curly' ? 5.1 : look.coat ? 3.7 : 3.45;
  const fr = frameAt([o.x, o.y, z + (fallen ? lift : 0)], o.facing, fallen),
    { F, S, U } = fr;
  const rig = RIG[pose],
    dr = rig.drop;
  const M = { skin: matOf(look.skin), top: matOf(look.top), legs: matOf(look.legs), hair: matOf(look.hair) };
  const hatM = matOf(look.hatCol ?? look.top);
  const prop =
    pose === 'carry'
      ? 'parcel'
      : pose === 'stand' || pose === 'walk'
        ? o.holding === undefined
          ? look.prop
          : o.holding
        : undefined;
  const parts: Item[] = [];
  const pt = (v: V) => fr.at(v[0], v[1], v[2]);
  const limb = (a: V, b: V, r: number, m: Mat, r1 = r) =>
    parts.push(item(rodPts(a, b, r), rod(a, b, r, m, toneI, 1.2, r1, 12)));

  // legs and shoes
  for (const leg of rig.legs) {
    const ps = leg.map(pt);
    for (let i = 0; i + 1 < ps.length; i++) limb(ps[i], ps[i + 1], 1.65, M.legs);
    const [fa, fb] = leg[leg.length - 1];
    const sh = lbox(fr, fa - 1.3, fa + 2.5, fb - 1.15, fb + 1.15, 0, 1.7);
    parts.push(item(sh, hexa(sh, DARK, 0.8)));
  }
  // body: hips to rounded shoulders; a coat flares down to the knees
  const R = (c: number, ra: number, rb: number) => circle(fr.at(0, 0, c - dr), F, S, ra, rb);
  const body = [
    // seated, the coat's skirt lies on the lap instead of hanging below the seat
    ...(look.coat && pose !== 'sit' ? [R(5, 3.7, 4.9)] : []),
    R(11.4, 2.9, 4.1),
    R(16, 2.6, 3.9),
    R(20.6, 2.8, 4.5),
    R(22.7, 1.8, 3.1),
    R(23.4, 0.7, 1.4),
  ];
  parts.push(item(body.flat(), solid(body, M.top, 1.7)));
  if (look.coat && pose !== 'sit') {
    // the belt line of a trench coat, on the side toward the viewer
    const belt = circle(fr.at(0, 0, 13 - dr), F, S, 3.05, 4.3, 20).map((p, i, a) => [p, a[(i + 1) % a.length]]);
    parts.push(
      item(
        body[1],
        belt
          .filter(([p, q]) => vis(sub(avg([p, q]), fr.at(0, 0, 13 - dr))))
          .map(s => line(s, 0.7))
          .join(''),
      ),
    );
  }
  // arms: sleeve to the elbow, sleeve to the wrist, a skin hand
  const hold = prop === 'mug' || prop === 'clipboard';
  rig.arms.forEach(([e, h], i) => {
    if (i === 0 && hold) [e, h] = HOLD;
    const sh = pt([0, i ? 4.1 : -4.1, 21.6 - dr]),
      E = pt([e[0], e[1], e[2] - dr]),
      H = pt([h[0], h[1], h[2] - dr]),
      W = add(H, mul(norm(sub(E, H)), 1.7));
    limb(sh, E, 1.35, M.top);
    limb(E, W, 1.25, M.top);
    limb(W, H, 1.1, M.skin, 0.9);
  });

  // head, then hair and hat: shells outside the head go after it; parts behind it (a bun, a ponytail, a cap's bill
  // turned away) go before it when the back of the head faces away, after it when it faces the viewer
  const hc = fr.at(0, 0, 26.7 - dr),
    tilt = (deg: number) => {
      const t = (deg * Math.PI) / 180,
        ax = norm(add(mul(U, Math.cos(t)), mul(F, -Math.sin(t))));
      return [ax, norm(cross(S, ax)), S];
    };
  const head = sphere(hc, U, F, S, 3.45, -78, 80, 7);
  const behind: string[] = [],
    over: string[] = [];
  const back = vis(mul(F, -1)),
    rear = (s: string) => (back ? over : behind).push(s),
    front = (s: string) => (back ? behind : over).push(s);
  const hairCap = (deg: number, R0: number, l0: number, c = hc) => {
    const [ax, e1, e2] = tilt(deg);
    return solid(sphere(c, ax, e1, e2, R0, l0, 84, 5), M.hair, 1.1);
  };
  const hairPts: V[] = [];
  let hair = '';
  if (look.cut === 'curly') hair = hairCap(18, 4.6, -8, add(hc, mul(U, 0.5), mul(F, -0.5)));
  else if (look.cut !== 'bald' && look.hat !== 'beanie' && !(look.hat === 'hard' && !fallen))
    hair = hairCap(32, 3.8, 10);
  if (look.cut === 'bun') {
    const c = add(hc, mul(norm(add(mul(U, 0.55), mul(F, -0.85))), 3.7));
    rear(solid(sphere(c, U, F, S, 1.8, -75, 80, 5, 12), M.hair, 1));
    hairPts.push(add(c, [-2, -2, -2]), add(c, [2, 2, 2]));
  }
  if (look.cut === 'ponytail') {
    const a = fr.at(-3.2, 0, 28.3 - dr),
      b = fr.at(-5.2, 0, 23.4 - dr);
    rear(rod(a, b, 1.15, M.hair, toneI, 1, 0.6, 10));
    hairPts.push(...rodPts(a, b, 1.2));
  }
  if (look.cut === 'long') {
    const c = lbox(fr, -3.95, -1.4, -3.3, 3.3, 20.8 - dr, 27.6 - dr);
    rear(hexa(c, M.hair, 1));
    hairPts.push(...c);
  }
  over.unshift(`<g data-mark="${look.cut}">${hair}</g>`);
  // a brimmed hat falls off when its wearer falls
  if (look.hat && !(fallen && (look.hat === 'fedora' || look.hat === 'hard'))) {
    let hat = '';
    if (look.hat === 'cap') {
      const bill = lbox(fr, 1.8, 6.4, -2.6, 2.6, 28.4 - dr, 29 - dr);
      front(hexa(bill, hatM, 0.9));
      hairPts.push(...bill);
      hat = hairCap(14, 3.75, 22)
        .replaceAll(M.hair.l, hatM.l)
        .replaceAll(M.hair.m, hatM.m)
        .replaceAll(M.hair.d, hatM.d);
    } else if (look.hat === 'beanie') {
      hat =
        solid(sphere(hc, U, F, S, 3.85, -2, 84, 5), hatM, 1.1) +
        solid(sphere(add(hc, mul(U, 4.4)), U, F, S, 1.25, -75, 80, 4, 10), CERAMIC, 0.9);
      hairPts.push(add(hc, mul(U, 5.8)));
    } else if (look.hat === 'hard' || look.hat === 'fedora') {
      const fed = look.hat === 'fedora',
        br = fed ? 5.9 : 4.9,
        c0 = fed ? 1.6 : 1.1;
      const brim = [c0, c0 + 0.6].map(c => circle(add(hc, mul(U, c)), F, S, br, br, 18));
      hat = solid(brim, hatM, 1);
      hat += fed
        ? solid(
            [2.2, 5.3, 5.9].map((c, i) => circle(add(hc, mul(U, c)), F, S, [3.3, 2.9, 1.9][i], [3.4, 3.0, 2.0][i], 14)),
            hatM,
            1.1,
          )
        : solid(sphere(hc, U, F, S, 4.15, 24, 84, 5), hatM, 1.2);
      hairPts.push(...brim.flat(), add(hc, mul(U, 6)));
    } else {
      // headset: a band over the head, ear cups and a mic toward the mouth; pieces behind the head go first
      const arc = Array.from({ length: 9 }, (_, i) => {
        const t = (i / 8) * Math.PI;
        return add(hc, mul(S, 3.95 * Math.cos(t)), mul(U, 3.95 * Math.sin(t)));
      });
      for (let i = 0; i < 8; i++) {
        const s = rod(arc[i], arc[i + 1], 0.45, hatM, toneI, 0.8, 0.45, 8);
        vis(sub(avg([arc[i], arc[i + 1]]), hc)) ? over.push(s) : behind.push(s);
      }
      for (const k of [-1, 1]) {
        const cup = [3.3, 4.5].map(b => circle(add(hc, mul(S, k * b)), F, U, 1.6, 1.6, 12));
        vis(mul(S, k)) ? over.push(solid(cup, DARK, 0.9)) : behind.push(solid(cup, DARK, 0.9));
      }
      const m0 = add(hc, mul(S, 4.3), mul(U, -0.6)),
        m1 = add(hc, mul(F, 3.3), mul(S, 1.6), mul(U, -2.4));
      front(rod(m0, m1, 0.35, DARK, toneI, 0.7, 0.35, 8));
      hairPts.push(...arc, add(hc, mul(S, 4.6)), add(hc, mul(S, -4.6)), m1);
    }
    over.push(`<g data-mark="${look.hat}">${hat}</g>`);
  }
  const headPts = [...head.flat(), ...hairPts, add(hc, mul(U, 4.6)), add(hc, [4.6, 4.6, 0]), add(hc, [-4.6, -4.6, 0])];
  parts.push(item(headPts, behind.join('') + solid(head, M.skin, 1.5) + over.join('')));

  // what they hold
  if (prop) {
    const hold = rig.arms[0][1],
      [ha, hb, hcz] = prop === 'mug' || prop === 'clipboard' ? HOLD[1] : hold;
    let c: V[] = [],
      s = '';
    if (prop === 'parcel') {
      c = lbox(fr, 3.4, 9.6, -3.7, 3.7, 15.6 - dr, 21.2 - dr);
      s = hexa(c, WOOD, 1.1);
      if (vis(U)) s += line([fr.at(3.4, 0, 21.25 - dr), fr.at(9.6, 0, 21.25 - dr)], 0.9);
    } else if (prop === 'clipboard') {
      c = lbox(fr, ha + 0.2, ha + 0.8, hb - 0.6, hb + 5, hcz - 2.4, hcz + 5.4);
      s = hexa(c, WOOD, 0.9);
      if (vis(F)) {
        const pg = (b: number, cc: number) => fr.at(ha + 0.85, hb + b, hcz + cc);
        s += shape([pg(-0.1, -1.8), pg(4.5, -1.8), pg(4.5, 4.4), pg(-0.1, 4.4)], CERAMIC.l, 0.6);
        for (const cc of [2.8, 1.4, 0]) s += line([pg(0.6, cc), pg(3.8, cc)], 0.45);
      }
      const clip = lbox(fr, ha + 0.6, ha + 1.3, hb + 1.4, hb + 3, hcz + 4.6, hcz + 5.8);
      s += hexa(clip, METAL, 0.6);
      c.push(...clip);
    } else if (prop === 'mug') {
      const rings = [-1.4, 1.8].map(k => circle(fr.at(ha + 1.3, hb + 0.6, hcz + k), F, S, 1.35, 1.35, 12));
      s = solid(rings, CERAMIC, 0.9);
      if (vis(U)) s += fill(pd(circle(fr.at(ha + 1.3, hb + 0.6, hcz + 1.85), F, S, 1, 1, 12)), '#5a3a22');
      c = rings.flat();
    } else {
      c = lbox(fr, -2.1, 2.1, -6.6, -4.4, 5.2, 10.6);
      s = hexa(c, PALS.tomato, 1);
      const h = pt(hold);
      s += line([fr.at(-1.2, -5.5, 10.6), h], 0.6) + line([fr.at(1.2, -5.5, 10.6), h], 0.6);
    }
    parts.push(item(c, `<g data-mark="${prop}">${s}</g>`));
  }

  const all = parts.flatMap(p => [p.box[0], p.box[1]]);
  const r = fallen ? 34 : 11,
    h = fallen ? 12 : 36;
  return {
    // a slim column from the feet to the top of the head (lying down, the body's outline on the floor)
    shadow: castShadow([...circle(fr.at(0, 0, 0), F, S, 3.4, 4.6), ...circle(fr.at(0, 0, 29 - dr), F, S, 3.4, 4.6)], z),
    items: [
      item(
        all,
        `<g class="person" data-look="${esc(typeof o.look === 'string' ? o.look : 'custom')}" data-pose="${pose}">${byDepth(parts)}</g>`,
      ),
    ],
    box: [
      [o.x - r, o.y - r, z],
      [o.x + r, o.y + r, z + h],
    ],
  };
}
const boxPts = (b: number[][]) =>
  [0, 1].flatMap(i => [0, 1].flatMap(j => [0, 1].map(k => [b[i][0], b[j][1], b[k][2]])));

/* ============================================================
   The model machine (KTD6): the one model in every module.
   Real-object notes: a rounded blush cabinet on four short feet; a hood on top whose brow overhangs the front; a
   framed dark screen under the brow shows the state (OK / ??? / !! / ...); a slot below it feeds out a slip of paper
   (the answer); a lamp on the hood repeats the state colour; vents on the sides. At size 1 the footprint is the llm
   block's (2 × HALF square); height grows the cabinet (pre-training) and keeps the screen under the brow.
   ============================================================ */
export type ModelState = 'ok' | 'warn' | 'bad';
/** opts.z: what it stands on (default the board top); opts.pal: the cabinet's colour (the RAG agent is mustard). */
export function modelMachine(
  x: number,
  y: number,
  size = 1,
  state?: ModelState,
  height?: number,
  opts: { z?: number; pal?: Mat } = {},
): Piece {
  const k = size,
    hf = HALF * k,
    z0 = opts.z ?? BH,
    ht = height ?? 32 * k,
    // a squat machine (a short checkpoint, a hero plot) squashes feet, hood and screen so they still fit; taller ones keep them
    v = Math.min(k, ht / 32),
    zt = z0 + ht;
  const x0 = x - hf,
    x1 = x + hf,
    y0 = y - hf,
    y1 = y + hf;
  const bx0 = x0 + 3 * k,
    bx1 = x1 - 3 * k,
    zb = z0 + 3 * v,
    zh = zt - 7 * v;
  const OUT = rrUV(y0 + 1.5 * k, zb, y1 - 1.5 * k, zh + 1.5 * v, 6 * v),
    HOOD = rrUV(y0, zh, y1, zt, 3.2 * v);
  const m = opts.pal ?? PALS.blush;
  // the x face toward the viewer carries the screen (as the llm block does)
  const sx = vis([1, 0, 0]) ? 1 : -1,
    fx = sx > 0 ? bx1 : bx0,
    nx = [sx, 0, 0];
  let s = '';
  for (const [fx_, fy] of [
    [x0 + 5 * k, y0 + 5 * k],
    [x1 - 5 * k, y0 + 5 * k],
    [x0 + 5 * k, y1 - 5 * k],
    [x1 - 5 * k, y1 - 5 * k],
  ])
    s += cyl(fx_, fy, z0, zb + 0.5, 2.3 * k, DARK, toneI, 1);
  // cabinet: the cap toward the viewer, the rounded sides, then what is mounted on the front
  for (const [cx, n] of [
    [bx0, [-1, 0, 0]],
    [bx1, [1, 0, 0]],
  ] as [number, V][])
    if (vis(n)) s += fill(pd(on(PX(cx), OUT)), tone(n, m)) + ink(pd(on(PX(cx), OUT)), 2);
  // the cabinet and the hood each get their own silhouette: one hull round both would draw ink in the air under the brow
  s += extrude(OUT, bx0, bx1, m) + hullInk([...on(PX(bx0), OUT), ...on(PX(bx1), OUT)], 2.8);
  for (const sy of [-1, 1]) {
    if (!vis([0, sy, 0])) continue;
    const Y = sy > 0 ? y1 - 1.4 * k : y0 + 1.4 * k;
    for (let i = 0; i < 3; i++) {
      const zz = zh - 6 * v - i * 3 * v;
      s += line(
        on(PY(Y), [
          [x - 7 * k, zz],
          [x + 7 * k, zz],
        ]),
        1.1,
      );
    }
  }
  const zs1 = zh - 2 * v,
    zs0 = zs1 - 13 * v,
    X = fx + sx * 0.1;
  s += shape(on(PX(X), rrUV(y0 + 5 * k, zs0, y1 - 5 * k, zs1, 3 * v, 4)), CERAMIC.l, 1.4);
  s += shape(on(PX(X + sx * 0.05), rrUV(y0 + 7 * k, zs0 + 2 * v, y1 - 7 * k, zs1 - 2 * v, 2 * v, 4)), '#1d2a26', 0.9);
  s += faceText(
    nx,
    [fx + sx * 0.25, y, zs0 + 4.6 * v],
    state ? STATE_TXT[state] : '...',
    6.5 * v,
    state ? STATE_COL[state] : '#8a948f',
  );
  // the slot and the slip of paper it feeds out
  const zl = zs0 - 4 * v;
  s += shape(on(PX(X), rrUV(y - 6 * k, zl - 1.2 * v, y + 6 * k, zl + 1.2 * v, 1.1 * v, 3)), DARK.d, 0.9);
  s += shape(
    [
      [X, y - 4 * k, zl],
      [X, y + 4 * k, zl],
      [X + sx * 2.8 * k, y + 4 * k, zl - 4.5 * v],
      [X + sx * 2.8 * k, y - 4 * k, zl - 4.5 * v],
    ],
    CERAMIC.l,
    0.8,
  );
  // hood: a rounded lid over the cabinet, its brow overhanging the front and back
  for (const [cx, n] of [
    [x0, [-1, 0, 0]],
    [x1, [1, 0, 0]],
  ] as [number, V][])
    if (vis(n)) s += fill(pd(on(PX(cx), HOOD)), tone(n, m)) + ink(pd(on(PX(cx), HOOD)), 1.6);
  s += extrude(HOOD, x0, x1, m) + hullInk([...on(PX(x0), HOOD), ...on(PX(x1), HOOD)], 2.4);
  // the state lamp on top
  s += cyl(x - 6 * k, y + 6 * k, zt, zt + 2.6 * v, 2.4 * k, state ? matOf(STATE_COL[state]) : CERAMIC, toneI, 1, 14);
  const pts = [
    [x0, y0, z0],
    [x1, y1, zt + 2.6 * v],
  ];
  return {
    shadow: castShadow(boxPts(pts), z0),
    items: [{ box: pts, svg: `<g class="model" data-kit="model" data-state="${state ?? 'idle'}">${s}</g>` }],
    box: pts,
  };
}
/** A model machine filling the box [x0, y0, z0, x1, y1, z1] (a scene's old model block): centred, as wide as its
 * narrower side, as tall as the box. */
export const modelIn = (b: number[], state?: ModelState) =>
  modelMachine(
    (b[0] + b[3]) / 2,
    (b[1] + b[4]) / 2,
    Math.min(b[3] - b[0], b[4] - b[1]) / (2 * HALF),
    state,
    b[5] - b[2],
    { z: b[2] },
  );

/* ============================================================
   Buildings. Real-object notes: walls on the ground; a roof with eaves that overhang the walls; a door with a frame
   and a knob on the front wall; framed windows with glazing bars; an optional striped awning over the door, held
   off the front wall. Roofs: gable (two slopes, gable-end triangles, fascia), sawtooth (north-light teeth),
   parapet (flat roof behind a low wall, a vent box) and dome (a round barrel roof, ends showing its thickness).
   ============================================================ */
export type Roof = 'gable' | 'sawtooth' | 'parapet' | 'dome';
export type Side = '+x' | '-x' | '+y' | '-y';
export const ROOFS: Roof[] = ['gable', 'sawtooth', 'parapet', 'dome'];
export interface BuildingOpts {
  x: number;
  y: number;
  z?: number;
  /** depth along x, width along y, wall height */
  d: number;
  w: number;
  h: number;
  roof: Roof;
  front?: Side;
  door?: boolean;
  /** windows per wall */
  windows?: number;
  awning?: boolean;
  pal?: Mat;
  roofPal?: Mat;
}
const NORMAL: Record<Side, V> = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0] };

export function building(o: BuildingOpts): Piece {
  const z = o.z ?? BH,
    x0 = o.x - o.d / 2,
    x1 = o.x + o.d / 2,
    y0 = o.y - o.w / 2,
    y1 = o.y + o.w / 2,
    zt = z + o.h;
  const pal = o.pal ?? matOf('#e8d6b0'),
    rp = o.roofPal ?? PALS.tomato,
    front = o.front ?? '+x',
    e = 2.6;
  // a point on wall `sd` at (u along the wall, v height), pushed `out` off it
  const wall = (sd: Side) => {
    const n = NORMAL[sd],
      alongX = n[0] === 0,
      lo = alongX ? x0 : y0,
      hi = alongX ? x1 : y1,
      plane = (out: number) => (alongX ? PY((n[1] > 0 ? y1 : y0) + n[1] * out) : PX((n[0] > 0 ? x1 : x0) + n[0] * out));
    return { n, lo, hi, at: (u: number, v: number, out = 0.15) => plane(out)([u, v]) };
  };
  const walls = cube(x0, y0, z, x1, y1, zt, pal, tone, 1.2);
  let deco = '';
  for (const sd of Object.keys(NORMAL) as Side[]) {
    const W = wall(sd);
    if (!vis(W.n)) continue;
    const span = W.hi - W.lo,
      isFront = sd === front && o.door !== false,
      nwin = o.windows ?? 2;
    const slots = isFront
      ? [...Array(nwin)].map((_, i) => (i < nwin / 2 ? i + 0.5 : i + 1.5) / (nwin + 1))
      : [...Array(nwin)].map((_, i) => (i + 0.5) / nwin);
    const ww = Math.min(6.5, (span / Math.max(nwin + (isFront ? 1 : 0), 1)) * 0.55),
      wz = z + o.h * 0.42,
      wh = Math.min(8, o.h * 0.38);
    for (const t of slots) {
      const u = W.lo + span * t,
        q = (a: number, b: number, c: number, d: number, out = 0.15) => [
          W.at(a, b, out),
          W.at(c, b, out),
          W.at(c, d, out),
          W.at(a, d, out),
        ];
      deco += shape(q(u - ww / 2 - 0.9, wz - 0.9, u + ww / 2 + 0.9, wz + wh + 0.9), CERAMIC.l, 0.9);
      deco += shape(q(u - ww / 2, wz, u + ww / 2, wz + wh, 0.25), '#cfe9f0', 0.8);
      deco +=
        line([W.at(u, wz, 0.3), W.at(u, wz + wh, 0.3)], 0.7) +
        line([W.at(u - ww / 2, wz + wh / 2, 0.3), W.at(u + ww / 2, wz + wh / 2, 0.3)], 0.7);
    }
    if (isFront) {
      const u = (W.lo + W.hi) / 2,
        dh = Math.min(13, o.h - 4),
        dw = 3.6;
      deco += shape(
        [W.at(u - dw - 1, z), W.at(u + dw + 1, z), W.at(u + dw + 1, z + dh + 1), W.at(u - dw - 1, z + dh + 1)],
        CERAMIC.l,
        1,
      );
      deco += shape(
        [W.at(u - dw, z, 0.25), W.at(u + dw, z, 0.25), W.at(u + dw, z + dh, 0.25), W.at(u - dw, z + dh, 0.25)],
        WOOD.m,
        1,
      );
      deco += fill(pd(on((p: V) => W.at(p[0], p[1], 0.35), ellUV(u + dw - 1.6, z + dh * 0.48, 0.7, 0.7, 8))), DARK.d);
    }
  }
  // the awning, held off the front wall over the door
  let awning = '';
  const FW = wall(front),
    au = (FW.lo + FW.hi) / 2,
    aw = Math.min(11, (FW.hi - FW.lo) / 2 - 1),
    az = z + Math.min(13, o.h - 4) + 4,
    reach = 6.5;
  if (o.awning) {
    const N = 6;
    for (let i = 0; i < N; i++) {
      const u0 = au - aw + (2 * aw * i) / N,
        u1 = au - aw + (2 * aw * (i + 1)) / N,
        col = i % 2 ? CERAMIC : PALS.tomato;
      awning += shape(
        [FW.at(u0, az, 0), FW.at(u1, az, 0), FW.at(u1, az - 3.5, reach), FW.at(u0, az - 3.5, reach)],
        toneI([...FW.n.slice(0, 2), 1.6], col),
        0.7,
      );
      if (vis(FW.n))
        awning += shape(
          [FW.at(u0, az - 3.5, reach), FW.at(u1, az - 3.5, reach), FW.at(u1, az - 6, reach), FW.at(u0, az - 6, reach)],
          toneI(FW.n, col),
          0.7,
        );
    }
    awning += outline(
      [FW.at(au - aw, az, 0), FW.at(au + aw, az, 0), FW.at(au - aw, az - 6, reach), FW.at(au + aw, az - 6, reach)],
      1.4,
    );
  }

  // roofs, built across a (span) and along b (ridge) so the ridge runs along the longer side
  const alongY = o.w >= o.d,
    [a0, a1, b0, b1] = alongY ? [x0, x1, y0, y1] : [y0, y1, x0, x1],
    Q = (a: number, b: number, zz: number) => (alongY ? [a, b, zz] : [b, a, zz]),
    am = (a0 + a1) / 2,
    half = (a1 - a0) / 2;
  const facet = (q: V[], inside: V, m: Mat, w = 1, shade = tone) => {
    let n = norm(cross(sub(q[1], q[0]), sub(q[q.length - 1], q[0])));
    if (dot(n, sub(avg(q), inside)) < 0) n = mul(n, -1);
    return vis(n) ? shape(q, shade(n, m), w) : '';
  };
  let roof = '',
    roofTop = zt;
  const roofPts: V[] = [];
  if (o.roof === 'gable') {
    const rh = Math.min(half * 0.75, 14),
      drop = (e * rh) / half,
      ridge = zt + rh,
      inside = Q(am, (b0 + b1) / 2, zt + rh / 3);
    roofTop = ridge;
    for (const b of [b0, b1]) roof += facet([Q(a0, b, zt), Q(a1, b, zt), Q(am, b, ridge)], inside, pal, 1.1);
    for (const b of [b0 - e, b1 + e])
      for (const ae of [a0 - e, a1 + e])
        roof += facet(
          [Q(ae, b, zt - drop), Q(am, b, ridge), Q(am, b, ridge - 1.4), Q(ae, b, zt - drop - 1.4)],
          inside,
          rp,
          0.9,
        );
    for (const ae of [a0 - e, a1 + e]) {
      roof += facet(
        [
          Q(ae, b0 - e, zt - drop),
          Q(ae, b1 + e, zt - drop),
          Q(ae, b1 + e, zt - drop - 1.4),
          Q(ae, b0 - e, zt - drop - 1.4),
        ],
        inside,
        rp,
        0.9,
      );
      roof += facet(
        [Q(ae, b0 - e, zt - drop), Q(ae, b1 + e, zt - drop), Q(am, b1 + e, ridge), Q(am, b0 - e, ridge)],
        inside,
        rp,
        1.3,
      );
    }
    roofPts.push(Q(a0 - e, b0 - e, zt - drop - 1.4), Q(a1 + e, b1 + e, ridge));
  } else if (o.roof === 'sawtooth') {
    const n = Math.max(2, Math.round((a1 - a0) / 15)),
      th = 7,
      step = (a1 - a0) / n;
    const teeth: Item[] = [];
    for (let i = 0; i < n; i++) {
      const s0 = a0 + i * step,
        s1 = s0 + step,
        inside = Q(s0 + step / 3, (b0 + b1) / 2, zt + th / 3);
      let t = '';
      for (const b of [b0, b1]) t += facet([Q(s0, b, zt), Q(s1, b, zt), Q(s0, b, zt + th)], inside, pal, 1);
      const glass = [Q(s0, b0, zt), Q(s0, b1, zt), Q(s0, b1, zt + th), Q(s0, b0, zt + th)];
      const g = facet(glass, inside, CLEAR, 1, toneI);
      t += g;
      if (g)
        for (let j = 1; j < 4; j++)
          t += line([Q(s0, b0 + ((b1 - b0) * j) / 4, zt), Q(s0, b0 + ((b1 - b0) * j) / 4, zt + th)], 0.6);
      t += facet(
        [Q(s0, b0 - 1.4, zt + th), Q(s0, b1 + 1.4, zt + th), Q(s1, b1 + 1.4, zt), Q(s1, b0 - 1.4, zt)],
        inside,
        rp,
        1.2,
      );
      teeth.push(item([Q(s0, b0 - 1.4, zt), Q(s1, b1 + 1.4, zt + th)], t));
    }
    roof = byDepth(teeth);
    roofTop = zt + th;
    roofPts.push(Q(a0, b0 - 1.4, zt), Q(a1, b1 + 1.4, zt + th));
  } else if (o.roof === 'parapet') {
    const t = 1.6,
      ph = 3;
    const walls4 = [
      [x0, y0, x0 + t, y1],
      [x1 - t, y0, x1, y1],
      [x0 + t, y0, x1 - t, y0 + t],
      [x0 + t, y1 - t, x1 - t, y1],
    ].map(([p, q, r, s]) =>
      item(
        [
          [p, q, zt],
          [r, s, zt + ph],
        ],
        cube(p, q, zt, r, s, zt + ph, pal, tone, 1),
      ),
    );
    const vent = item(
      [
        [o.x - 3, o.y - 4, zt],
        [o.x + 3, o.y + 4, zt + 4],
      ],
      cube(o.x - 3, o.y - 4, zt, o.x + 3, o.y + 4, zt + 4, METAL, toneI, 0.9),
    );
    roof = byDepth([...walls4, vent]);
    roofTop = zt + Math.max(ph, 4);
    roofPts.push([x0, y0, zt], [x1, y1, roofTop]);
  } else {
    const R = half + 1.2,
      rz = 0.7,
      N = 12;
    const arch = (b: number, r: number) =>
      Array.from({ length: N + 1 }, (_, i) => {
        const t = (i / N) * Math.PI;
        return Q(am + r * Math.cos(t), b, zt + r * rz * Math.sin(t));
      });
    const A = arch(b0 - e, R),
      B = arch(b1 + e, R);
    roof = loft(A, B, (n: V) => tone(n, rp));
    for (const [b, r, sg] of [
      [b0 - e, A, -1],
      [b1 + e, B, 1],
    ] as [number, V[], number][]) {
      const n = alongY ? [0, sg, 0] : [sg, 0, 0];
      if (!vis(n)) continue;
      const inner = arch(b, R - 1.3).reverse();
      roof +=
        `<path d="${pd(r)}${pd(inner)}" fill="${tone(n, rp)}" fill-rule="evenodd"/>` +
        ink(pd(r), 1.1) +
        ink(pd(inner), 0.8);
      roof += fill(pd(arch(b - sg * 0.05, R - 1.3)), tone(n, pal));
    }
    // corrugation ribs, only where the roof faces the viewer
    for (let j = 1; j < 5; j++) {
      const b = b0 - e + ((b1 - b0 + 2 * e) * j) / 5,
        rib = arch(b, R + 0.05);
      for (let i = 0; i < N; i++) {
        const mid = avg([rib[i], rib[i + 1]]);
        if (vis(sub(mid, Q(am, b, zt)))) roof += line([rib[i], rib[i + 1]], 0.6);
      }
    }
    roof += outline([...A, ...B], 1.6);
    roofTop = zt + R * rz;
    roofPts.push(Q(am - R, b0 - e, zt), Q(am + R, b1 + e, roofTop));
  }

  // walls and their silhouette first; the awning hangs off the front (when the front faces away, the walls hide it)
  const shell =
    walls +
    hullInk(
      boxPts([
        [x0, y0, z],
        [x1, y1, zt],
      ]),
      2.4,
    );
  const svg = (vis(NORMAL[front]) ? shell + deco + awning : awning + shell + deco) + roof;
  const out = o.awning ? reach + 0.5 : 0,
    pts = [
      [x0, y0, z],
      [x1, y1, roofTop],
      ...roofPts,
      ...(o.awning ? [FW.at(au - aw, az - 6, reach), FW.at(au + aw, az, 0)] : []),
    ];
  const fb = bbox(pts);
  return {
    shadow: castShadow(boxPts(fb), z),
    items: [{ box: fb, svg: `<g class="building" data-roof="${o.roof}">${svg}</g>` }],
    box: [
      [x0 - e - out, y0 - e - out, z],
      [x1 + e + out, y1 + e + out, roofTop + 1],
    ],
  };
}

/* ============================================================
   Vehicles. Wheels are cylinders with thickness, a rim and a dark hub (never flat discs); the wheels on the far side
   sort behind the body, the near ones in front.
   ============================================================ */
/** A road wheel lying across S: tyre, metal rim and hub on whichever face looks at the viewer. */
function wheel(c: V, F: V, S: V, U: V, r: number, t: number): Item {
  const rings = [-t / 2, t / 2].map(k => circle(add(c, mul(S, k)), F, U, r, r, 18));
  let s = solid(rings, DARK, 1.1);
  for (const k of [-1, 1]) {
    const n = mul(S, k);
    if (!vis(n)) continue;
    const cc = add(c, mul(S, k * (t / 2 + 0.08)));
    s +=
      shape(circle(cc, F, U, r * 0.58, r * 0.58, 14), METAL.m, 0.8) +
      shape(circle(add(cc, mul(S, k * 0.05)), F, U, r * 0.22, r * 0.22, 10), DARK.d, 0.6);
  }
  return item(rings.flat(), s);
}

export interface VehicleOpts {
  x: number;
  y: number;
  z?: number;
  facing?: Facing;
  pal?: Mat;
}
/** A delivery van, 36 long and 16 wide. Real-object notes: a tall cargo box at the back with rear doors; a cab with a
 * sloped windscreen and side windows, a short bonnet with headlamps; a dark chassis between four wheels. driver: a
 * head and shoulders seen through the windscreen. */
export function van(o: VehicleOpts & { driver?: boolean }): Piece {
  const z = o.z ?? BH,
    fr = frameAt([o.x, o.y, z], o.facing),
    { F, S, U } = fr,
    pal = o.pal ?? CERAMIC,
    W = 8,
    r = 3.8;
  const items: Item[] = [];
  const chassis = lbox(fr, -17, 17, -W + 1.2, W - 1.2, 2, 4.2);
  items.push(item(chassis, hexa(chassis, DARK, 0.8)));
  for (const a of [-11, 10]) for (const k of [-1, 1]) items.push(wheel(fr.at(a, k * (W + 1.1), r), F, S, U, r, 2.2));
  const cargo = lbox(fr, -18, 5, -W, W, 4.2, 20.5);
  let cs = hexa(cargo, pal, 1.1);
  for (const k of [-1, 1])
    if (vis(mul(S, k)))
      cs += shape(
        [
          fr.at(-16, k * (W + 0.1), 9),
          fr.at(3, k * (W + 0.1), 9),
          fr.at(3, k * (W + 0.1), 12),
          fr.at(-16, k * (W + 0.1), 12),
        ],
        PALS.tomato.l,
        0.7,
      );
  if (vis(mul(F, -1)))
    cs += line([fr.at(-18.1, 0, 5), fr.at(-18.1, 0, 20)], 1) + line([fr.at(-18.1, -2, 12), fr.at(-18.1, -1, 12)], 1.2);
  items.push(item(cargo, cs + outline(cargo, 2)));
  const cab = [
    fr.at(5, -W, 4.2),
    fr.at(14, -W, 4.2),
    fr.at(14, W, 4.2),
    fr.at(5, W, 4.2),
    fr.at(5, -W, 16),
    fr.at(10.5, -W, 16),
    fr.at(10.5, W, 16),
    fr.at(5, W, 16),
  ];
  let cb = hexa(cab, pal, 1.1);
  // windscreen on the sloped face
  const wsn = norm(cross(sub(fr.at(14, W, 9.6), fr.at(14, -W, 9.6)), sub(fr.at(10.5, -W, 16), fr.at(14, -W, 9.6))));
  const towardF = dot(wsn, F) > 0 ? wsn : mul(wsn, -1);
  if (vis(towardF)) {
    const g = (b: number, t: number) => add(fr.at(14 - 3.5 * t, b, 9.6 + 6.4 * t), mul(towardF, 0.1));
    cb += shape([g(-W + 1.2, 0.12), g(W - 1.2, 0.12), g(W - 1.6, 0.86), g(-W + 1.6, 0.86)], '#cfe9f0', 1);
    if (o.driver) {
      const hd = g(-2.4, 0.55);
      cb += fill(pd(circle(hd, S, norm(sub(g(0, 1), g(0, 0))), 1.9, 2.2, 12)), '#7a5a44', 'opacity=".75"');
      cb += fill(
        pd(circle(g(-2.4, 0.2), S, norm(sub(g(0, 1), g(0, 0))), 3.6, 1.5, 12)),
        PALS.cobalt.m,
        'opacity=".75"',
      );
    }
    cb += fill(pd([g(-3, 0.2), g(-1, 0.2), g(2, 0.8), g(0, 0.8)]), '#ffffff', 'opacity=".45"');
  }
  for (const k of [-1, 1])
    if (vis(mul(S, k)))
      cb += shape(
        [
          fr.at(6.5, k * (W + 0.1), 10),
          fr.at(11.5, k * (W + 0.1), 10),
          fr.at(9.6, k * (W + 0.1), 14.8),
          fr.at(6.5, k * (W + 0.1), 14.8),
        ],
        '#cfe9f0',
        0.9,
      );
  items.push(item(cab, cb + outline(cab, 1.8)));
  const bonnet = lbox(fr, 14, 18, -W + 0.4, W - 0.4, 4.2, 9.6);
  let bs = hexa(bonnet, pal, 1);
  if (vis(F)) for (const k of [-1, 1]) bs += shape(circle(fr.at(18.1, k * 5, 7.4), S, U, 1.3, 1.1, 10), '#fff1b8', 0.7);
  items.push(item(bonnet, bs));
  return pieceOf(items, z, 'van');
}
/** Pack items into one sortable piece: shadow from every box, the footprint the items cover. */
function pieceOf(items: Item[], z: number, cls: string, split = false): Piece {
  const b = bbox(items.flatMap(i => i.box));
  return {
    shadow: castShadow(
      items.flatMap(i => boxPts(i.box)),
      z,
    ),
    items: split ? items : [{ box: b, svg: `<g class="${cls}">${byDepth(items)}</g>` }],
    box: [
      [b[0][0] - 0.01, b[0][1] - 0.01, z],
      [b[1][0] + 0.01, b[1][1] + 0.01, b[1][2] + 0.01],
    ],
  };
}

/** A two-wheeled hand cart (a postal or market cart). Real-object notes: an open tray with walls on a floor; two
 * wheels on an axle under its middle; a prop leg at the front; two handles and a grip at the back. */
export function cart(o: VehicleOpts): Piece {
  const z = o.z ?? BH,
    fr = frameAt([o.x, o.y, z], o.facing),
    { F, S, U } = fr,
    pal = o.pal ?? PALS.cobalt;
  const items: Item[] = [];
  const rect = (c: number) => rrUV(-9, -6, 9, 6, 1.2, 2).map(([a, b]: number[]) => fr.at(a, b, c));
  const A = rect(6.5),
    B = rect(12.5);
  const tray =
    fill(pd(A), toneI(U, pal)) +
    openShell(A, B, (n: V) => toneI(n, pal)) +
    ink(pd(B), 1.2) +
    outline([...A, ...B], 1.8);
  items.push(item([...A, ...B], tray));
  for (const k of [-1, 1]) items.push(wheel(fr.at(-1, k * 7.4, 5), F, S, U, 5, 1.8));
  items.push(
    item(
      rodPts(fr.at(7, 0, 6.5), fr.at(7, 0, 0.5), 0.8),
      rod(fr.at(7, 0, 6.5), fr.at(7, 0, 0.5), 0.75, DARK, toneI, 0.9),
    ),
  );
  let hs = '';
  for (const k of [-1, 1]) hs += rod(fr.at(-9, k * 5, 12), fr.at(-16, k * 5, 16.5), 0.7, DARK, toneI, 0.9);
  hs += rod(fr.at(-16, -5.6, 16.5), fr.at(-16, 5.6, 16.5), 0.9, WOOD, toneI, 0.9);
  items.push(item([fr.at(-9.1, -6, 11), fr.at(-17, 6, 17.5)], hs));
  return pieceOf(items, z, 'cart');
}

/** A delivery bike. Real-object notes: two wheels (tyre, metal rim, spokes, hub), a diamond frame from rear hub to
 * saddle to bottom bracket to head tube to the fork, a saddle, a handlebar across the stem. */
export function bike(o: VehicleOpts): Piece {
  const z = o.z ?? BH,
    fr = frameAt([o.x, o.y, z], o.facing),
    { F, S, U } = fr,
    pal = o.pal ?? PALS.tomato,
    R = 6.4;
  const items: Item[] = [];
  for (const a of [-9.5, 9.5]) {
    const c = fr.at(a, 0, R),
      rings = [-0.6, 0.6].map(k => circle(add(c, mul(S, k)), F, U, R, R, 20));
    let s = loft(rings[0], rings[1], (n: V) => toneI(n, DARK));
    const k = vis(S) ? 1 : -1,
      cc = add(c, mul(S, k * 0.65)),
      ringAt = (rr: number) => circle(cc, F, U, rr, rr, 20);
    s += `<path d="${pd(ringAt(R))}${pd(ringAt(R - 1.2).reverse())}" fill="${DARK.m}" fill-rule="evenodd"/>`;
    s += `<path d="${pd(ringAt(R - 1.2))}${pd(ringAt(R - 1.8).reverse())}" fill="${METAL.m}" fill-rule="evenodd"/>`;
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI;
      s += line(
        [
          add(cc, mul(F, (R - 1.6) * Math.cos(t)), mul(U, (R - 1.6) * Math.sin(t))),
          add(cc, mul(F, -(R - 1.6) * Math.cos(t)), mul(U, -(R - 1.6) * Math.sin(t))),
        ],
        0.4,
      );
    }
    s +=
      ink(pd(ringAt(R)), 1.1) +
      ink(pd(ringAt(R - 1.8)), 0.6) +
      shape(circle(add(cc, mul(S, k * 0.05)), F, U, 0.9, 0.9, 8), METAL.l, 0.6);
    items.push(item(rings.flat(), s));
  }
  const J = { rear: [-9.5, 0, R], seat: [-3, 0, 14.5], bb: [-0.5, 0, 5.5], head: [6.5, 0, 13.5], fork: [9.5, 0, R] };
  let fs = '';
  for (const [a, b] of [
    ['rear', 'seat'],
    ['rear', 'bb'],
    ['bb', 'seat'],
    ['bb', 'head'],
    ['seat', 'head'],
    ['head', 'fork'],
  ] as [keyof typeof J, keyof typeof J][])
    fs += rod(fr.at(J[a][0], 0, J[a][2]), fr.at(J[b][0], 0, J[b][2]), 0.6, pal, toneI, 0.8, 0.6, 8);
  const saddle = lbox(fr, -5, -1.5, -1.3, 1.3, 15, 16.4);
  fs += hexa(saddle, DARK, 0.8);
  fs +=
    rod(fr.at(6.5, 0, 13.5), fr.at(6.2, 0, 16), 0.6, DARK, toneI, 0.8) +
    rod(fr.at(6.2, -4.2, 16), fr.at(6.2, 4.2, 16), 0.65, DARK, toneI, 0.9);
  items.push(item([fr.at(-9.5, -4.3, 5), fr.at(9.5, 4.3, 16.8), ...saddle], fs));
  return pieceOf(items, z, 'bike');
}

/* ============================================================
   Props.
   ============================================================ */
/** A roller conveyor, len long and w wide, along `facing`. Real-object notes: legs in pairs every other section;
 * rollers across the bed every 4 units; side rails standing just proud of the rollers. Returned as one item per
 * section, so things beside or on the belt sort against the right stretch of it. */
export function conveyor(o: {
  x: number;
  y: number;
  z?: number;
  len: number;
  w?: number;
  h?: number;
  facing?: Facing;
}): Piece {
  const z = o.z ?? BH,
    fr = frameAt([o.x, o.y, z], o.facing),
    { S } = fr,
    w = o.w ?? 12,
    h = o.h ?? 8,
    hw = w / 2,
    n = Math.max(1, Math.round(o.len / 16)),
    step = o.len / n,
    nearK = vis(S) ? 1 : -1;
  const items: Item[] = [];
  for (let i = 0; i < n; i++) {
    const s0 = -o.len / 2 + i * step,
      s1 = s0 + step;
    let s = '';
    if (i % 2 === 0 || i === n - 1)
      for (const k of [-1, 1]) {
        const a = i % 2 === 0 ? s0 + 2 : s1 - 2;
        s += rod(fr.at(a, k * (hw - 1), 0), fr.at(a, k * (hw - 1), h - 1.5), 0.8, DARK, toneI, 0.9);
      }
    const rail = (k: number) => {
      const c = lbox(fr, s0, s1, k > 0 ? hw - 1.2 : -hw, k > 0 ? hw : -hw + 1.2, h - 2.6, h + 2.2);
      return hexa(c, PALS.mustard, 1);
    };
    s += rail(-nearK);
    for (let a = s0 + 2; a < s1; a += 4)
      s += rod(fr.at(a, -hw + 1.2, h), fr.at(a, hw - 1.2, h), 1.2, METAL, toneI, 0.8, 1.2, 10);
    s += rail(nearK);
    items.push(item([fr.at(s0, -hw, 0), fr.at(s1, hw, h + 2.2)], `<g class="conveyor">${s}</g>`));
  }
  return pieceOf(items, z, 'conveyor', true);
}

/** A telegraph pole: a tapered wooden pole; crossarm bolted across near the top with glass insulators standing on it.
 * The crossarm halves are their own items so wires and things beside the pole sort against them. */
export function pole(o: { x: number; y: number; z?: number; h?: number; crossarm?: boolean; facing?: Facing }): Piece {
  const z = o.z ?? BH,
    h = o.h ?? 46,
    fr = frameAt([o.x, o.y, z], o.facing),
    items: Item[] = [];
  const top = fr.at(0, 0, h);
  items.push(item(rodPts(fr.at(0, 0, 0), top, 1.4), rod(fr.at(0, 0, 0), top, 1.4, WOOD, toneI, 1.4, 1.05, 12)));
  if (o.crossarm !== false)
    for (const k of [-1, 1]) {
      const c = lbox(fr, -1, 1, k > 0 ? 1.1 : -10, k > 0 ? 10 : -1.1, h - 6, h - 4.2);
      let s = hexa(c, WOOD, 1);
      const ins: V[] = [];
      for (const b of [4, 8]) {
        const p = fr.at(0, k * b, h - 4.2);
        s += cyl(p[0], p[1], p[2], p[2] + 2.4, 0.9, PALS.mint, toneI, 0.8, 10);
        ins.push(add(p, [-1, -1, 0]), add(p, [1, 1, 2.4]));
      }
      items.push(item([...c, ...ins], s));
    }
  return pieceOf(items, z, 'pole', true);
}

/** A street lamp: a weighted base, a slim post, a glass lantern with a cap and a finial; lit glows warm. */
export function lamp(o: { x: number; y: number; z?: number; h?: number; lit?: boolean }): Piece {
  const z = o.z ?? BH,
    h = o.h ?? 30,
    { x, y } = o;
  let s = cyl(x, y, z, z + 2, 2.4, DARK, toneI, 1, 14) + rod([x, y, z + 2], [x, y, z + h], 0.75, DARK, toneI, 1);
  const glass = cube(
    x - 2.2,
    y - 2.2,
    z + h,
    x + 2.2,
    y + 2.2,
    z + h + 5,
    o.lit ? matOf('#ffd27a') : CLEAR,
    toneI,
    0.9,
  );
  const cap = [
    [x - 3, y - 3, z + h + 5],
    [x + 3, y - 3, z + h + 5],
    [x + 3, y + 3, z + h + 5],
    [x - 3, y + 3, z + h + 5],
    [x - 0.6, y - 0.6, z + h + 7.4],
    [x + 0.6, y - 0.6, z + h + 7.4],
    [x + 0.6, y + 0.6, z + h + 7.4],
    [x - 0.6, y + 0.6, z + h + 7.4],
  ];
  s += glass + hexa(cap, DARK, 0.9) + cyl(x, y, z + h + 7.4, z + h + 8.6, 0.6, DARK, toneI, 0.7, 8);
  return pieceOf(
    [
      item(
        [
          [x - 3, y - 3, z],
          [x + 3, y + 3, z + h + 8.6],
        ],
        `<g class="lamp${o.lit ? ' lit' : ''}">${s}</g>`,
      ),
    ],
    z,
    'lamp',
    true,
  );
}

/** A potted plant: a tapered terracotta pot with a lip and soil, leaves rising above it. size scales it. */
export function pottedPlant(o: { x: number; y: number; z?: number; size?: number }): Piece {
  const z = o.z ?? BH,
    k = o.size ?? 1,
    { x, y } = o,
    TC = matOf('#c8714c'),
    ring = (c: number, r: number, n = 16) => on(PZ(z + c * k), ellUV(x, y, r * k, r * k, n));
  const A = ring(0, 3.2),
    B = ring(7, 4.3);
  let s = openShell(A, B, (n: V) => toneI(n, TC), fill(pd(ring(6, 4.1)), '#5a3e2a'));
  s +=
    loft(ring(5.6, 4.7), ring(7.4, 4.7), (n: V) => toneI(n, TC)) +
    ink(pd(ring(7.4, 4.7)), 0.9) +
    outline([...A, ...ring(7.4, 4.7)], 1.6);
  const leaves: Item[] = [];
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * 2 * Math.PI + 0.4,
      rr = i === 5 ? 0 : 2.6,
      c = [x + Math.cos(t) * rr * k, y + Math.sin(t) * rr * k, z + (i === 5 ? 15 : 10.5 + (i % 2) * 2.2) * k],
      ax = norm([Math.cos(t) * 0.5, Math.sin(t) * 0.5, 1]),
      e1 = norm(cross([0, 0, 1], ax[0] || ax[1] ? ax : [1, 0, 0])),
      e2 = norm(cross(ax, e1));
    const rings = sphere(c, ax, e1, e2, 2.3 * k, -70, 70, 4, 10, 1.9);
    leaves.push(item(rings.flat(), solid(rings, i % 2 ? PALS.mint : matOf('#5fa77d'), 1)));
  }
  s += byDepth(leaves);
  return pieceOf(
    [
      item(
        [
          [x - 5 * k, y - 5 * k, z],
          [x + 5 * k, y + 5 * k, z + 20 * k],
        ],
        `<g class="plant">${s}</g>`,
      ),
    ],
    z,
    'plant',
    true,
  );
}

/** An open round container: tapered walls seen from inside at the back, contents, then the near wall and a rim. */
function tub(
  o: { x: number; y: number; z?: number; r?: number; h?: number; contents?: string },
  m: Mat,
  r0: number,
  h0: number,
  cls: string,
  weave: boolean,
): Piece {
  const z = o.z ?? BH,
    r = o.r ?? r0,
    h = o.h ?? h0,
    { x, y } = o,
    ring = (c: number, rr: number, n = 18) => on(PZ(z + c), ellUV(x, y, rr, rr, n));
  const A = ring(0, r * 0.82),
    B = ring(h, r);
  let s = fill(pd(A), toneI([0, 0, 1], m)) + openShell(A, B, (n: V) => toneI(n, m), o.contents ?? '');
  if (weave)
    for (let j = 1; j < 4; j++) {
      const t = j / 4,
        rg = ring(h * t, r * (0.82 + 0.18 * t) + 0.05);
      for (let i = 0; i < rg.length; i++) {
        const p = rg[i],
          q = rg[(i + 1) % rg.length];
        if (vis([...sub(avg([p, q]), [x, y, z + h * t]).slice(0, 2), 0])) s += line([p, q], 0.5);
      }
    }
  s +=
    loft(ring(h - 1.3, r + 0.45), ring(h, r + 0.45), (n: V) => toneI(n, m)) +
    ink(pd(ring(h, r + 0.45)), 1) +
    outline([...A, ...ring(h, r + 0.45)], 1.6);
  return pieceOf(
    [
      item(
        [
          [x - r - 0.5, y - r - 0.5, z],
          [x + r + 0.5, y + r + 0.5, z + h],
        ],
        `<g class="${cls}">${s}</g>`,
      ),
    ],
    z,
    cls,
    true,
  );
}
/** A wicker basket: tapered woven walls (weave bands on the side toward the viewer) and a rim. contents: SVG drawn inside. */
export const basket = (o: { x: number; y: number; z?: number; r?: number; h?: number; contents?: string }) =>
  tub(o, WOOD, 6, 6, 'basket', true);
/** A bin: a tall open metal tub with a rolled rim. contents: SVG drawn inside. */
export const bin = (o: { x: number; y: number; z?: number; r?: number; h?: number; contents?: string; pal?: Mat }) =>
  tub(o, o.pal ?? METAL, 5, 11, 'bin', false);

/** A padlock: a brass body with a keyhole on its face, a round steel shackle into its top. size scales it. */
export function padlock(o: { x: number; y: number; z?: number; size?: number; facing?: Facing }): Piece {
  const z = o.z ?? BH,
    k = o.size ?? 1,
    fr = frameAt([o.x, o.y, z], o.facing),
    { F, S, U } = fr;
  const items: Item[] = [];
  const c = lbox(fr, -2 * k, 2 * k, -4 * k, 4 * k, 0, 8 * k);
  let s = hexa(c, PALS.mustard, 1.2) + outline(c, 1.8);
  for (const sg of [-1, 1])
    if (vis(mul(F, sg))) {
      const kc = fr.at(sg * 2.05 * k, 0, 4.6 * k);
      s +=
        shape(circle(kc, S, U, 1 * k, 1 * k, 10), DARK.d, 0.6) +
        shape(
          [
            add(kc, mul(S, -0.4 * k)),
            add(kc, mul(S, 0.4 * k)),
            add(kc, mul(S, 0.5 * k), mul(U, -2.4 * k)),
            add(kc, mul(S, -0.5 * k), mul(U, -2.4 * k)),
          ],
          DARK.d,
          0,
        );
    }
  items.push(item(c, s));
  const R = 2.8 * k,
    zc = 8 * k + 2.4 * k,
    pts = [
      fr.at(0, -R, 8 * k),
      ...Array.from({ length: 9 }, (_, i) =>
        fr.at(0, -R * Math.cos((i / 8) * Math.PI), zc + R * Math.sin((i / 8) * Math.PI)),
      ),
      fr.at(0, R, 8 * k),
    ];
  for (let i = 0; i + 1 < pts.length; i++)
    items.push(
      item(rodPts(pts[i], pts[i + 1], 0.85 * k), rod(pts[i], pts[i + 1], 0.85 * k, METAL, toneI, 1, 0.85 * k, 10)),
    );
  return pieceOf(items, z, 'padlock');
}

/** Every piece the kit offers, for galleries and tests: name → a sample at (x, y). */
export const SAMPLES: Record<string, (x: number, y: number) => Piece> = {
  model: (x, y) => modelMachine(x, y, 1, 'ok'),
  van: (x, y) => van({ x, y, driver: true }),
  cart: (x, y) => cart({ x, y }),
  bike: (x, y) => bike({ x, y }),
  conveyor: (x, y) => conveyor({ x, y, len: 48 }),
  pole: (x, y) => pole({ x, y }),
  lamp: (x, y) => lamp({ x, y, lit: true }),
  pottedPlant: (x, y) => pottedPlant({ x, y }),
  basket: (x, y) => basket({ x, y }),
  bin: (x, y) => bin({ x, y }),
  padlock: (x, y) => padlock({ x, y, size: 1.6 }),
  ...Object.fromEntries(
    ROOFS.map(r => [
      `building-${r}`,
      (x: number, y: number) => building({ x, y, d: 34, w: 44, h: 22, roof: r, awning: r === 'gable' }),
    ]),
  ),
};
