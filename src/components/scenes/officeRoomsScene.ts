// Mixture of experts' picture: the sorting office (KTD15). The prompt's last tokens wait as parcels on a belt at the
// front (at most 8; the selected one mustard, a dropped one tomato). Each layer is a floor: a doorman (the router) at
// the head of a row of eight rooms (the experts). For the selected token only two rooms per floor light up, with a lit
// path from the doorman to each; in dense mode every room lights (one big kitchen). Chapter 5 stacks the crates each
// room was sent in front of it, tomato past its capacity. The guess booth at the end reads the model's next token. Room
// pills carry the expert's most-routed training tokens (meta.json). Words only in pills; on phones (scale > 1.5) pills
// keep just the names and the caption carries the rest. No motion: rooms light without the walk.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  INK,
  P,
  box,
  byDepth,
  castShadow,
  cyl,
  f,
  hullInk,
  matOf,
  on,
  PY,
  rrUV,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { conveyor, mini, person, shaded, type Look, type Piece, drawPieces } from '../../lib/iso/figures';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { EXPERTS, LAYERS, ROOMS, SHOWN, quote, roomName, showPiece } from '../../lib/mixture-of-experts/routes';
import type { Say } from '../story/steps';

export const ROOMS_BOARD: Board = [0, 2, 204, 104];
/** The parts a step's callout may name. */
export const ROOMS_PARTS = ['doorman', 'rooms', 'upstairs', 'belt', 'guess'] as const;

export interface RoomsOpts {
  /** the shown tokens, oldest first (at most SHOWN): their ids */
  tokens: number[];
  /** index into tokens of the selected one, or null */
  sel: number | null;
  /** [layer]: the experts the selected token runs */
  lit?: number[][];
  /** every room works on every token */
  dense?: boolean;
  /** the reader overrode the doorman for this token */
  forced?: boolean;
  /** the model's next-token guess */
  guess?: number | null;
  /** chapter 5: [layer][expert] tokens sent, and each room's seats (null: no limit) */
  load?: { asked: number[][]; capacity: number | null };
  /** indexes into tokens of tokens a full room turned away */
  dropped?: number[];
  say?: Say;
  scale?: number;
}

const ROW_Y = [60, 14]; // floor 1 in front, floor 2 behind
const DEPTH = 16,
  ROOM_W = 14,
  PITCH = 18,
  X0 = 30,
  WALL = 14;
const DOOR_X = 13;
const BELT = { x0: 32, x1: 172, y: 93 };
const BOOTH = { x: 190, y: 46 };
const roomX = (e: number) => X0 + e * PITCH;
const OVER = '#f6c2b4';
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function roomsState(o: RoomsOpts) {
  const lit = Array.from({ length: LAYERS }, (_, l) =>
    o.dense ? Array.from({ length: EXPERTS }, (_, e) => e) : o.sel === null ? [] : (o.lit?.[l] ?? []),
  );
  const over = o.load
    ? o.load.asked.map(row => row.flatMap((n, e) => (o.load!.capacity !== null && n > o.load!.capacity ? [e] : [])))
    : [[], []];
  return { parcels: Math.min(SHOWN, o.tokens.length), lit, over };
}

/** Each flat's front door, its own colour (never mustard: mustard is a lit flat). */
const DOORS = ['#e0634f', '#5b7fc4', '#5fa77d', '#e88fa6', '#9c84cf', '#3f9a96', '#b8643c', '#7a4e7e'];
const BLOCK = matOf('#e6d3b3'),
  ROOF = matOf('#b9b2a6'),
  GALLERY = 4.5;
/** A thin painted bar (an ink stroke under a coloured one): a railing's look at a sliver of a rod's SVG. */
const bar = (p: number[], q: number[], w: number, col = DARK.l) => {
  const d = `M${P(p[0], p[1], p[2]).map(f).join(' ')}L${P(q[0], q[1], q[2]).map(f).join(' ')}`;
  return `<path d="${d}" stroke="${INK}" stroke-width="${w + 1.4}" stroke-linecap="round"/><path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
};

/** A room: one flat of the apartment block. Real-object notes: party walls shared with the next flat, so a floor's
 * eight flats read as one long block; its front door, a colour of its own, and a window set back on an open gallery
 * under the roof, a railing along the gallery's edge and a post at each end; a flat roof slab. Mustard walls, a lit
 * window and a lamp on the roof when it works on the selected token. The footprint is the old room's (plus the party
 * walls that close the gaps between flats). */
function room(l: number, e: number, lit: boolean, full: boolean, asked: number | null, cap: number | null) {
  const x = roomX(e),
    y = ROW_Y[l],
    xa = x - (PITCH - ROOM_W) / 2,
    xb = x + ROOM_W + (PITCH - ROOM_W) / 2,
    yf = y + DEPTH - GALLERY,
    zr = BH + WALL;
  const m = lit ? PALS.mustard : BLOCK;
  let s = box(xa, y, BH, xb, yf, zr, m, toneI, 1);
  // the gallery: its floor slab, then the door and window on the set-back front
  s += box(xa, yf, BH, xb, y + DEPTH, BH + 1.4, METAL, toneI, 0.8);
  if (vis([0, 1, 0])) {
    const F = (uv: number[][]) => on(PY(yf + 0.1), uv);
    s += shape(F(rrUV(x + 0.6, BH + 1.4, x + 9.4, BH + 12, 1, 2)), CERAMIC.l, 1);
    s += shape(F(rrUV(x + 1.6, BH + 1.4, x + 8.4, BH + 11, 0.8, 2)), DOORS[e % DOORS.length], 1);
    s += shape(F(rrUV(x + 6.6, BH + 5.8, x + 7.4, BH + 6.6, 0.4, 2)), METAL.l, 0.5);
    s += shape(F(rrUV(x + 11, BH + 6, x + 14.6, BH + 11, 0.5, 2)), lit ? '#ffd27a' : '#cfe9f0', 0.9);
  }
  // the roof slab, over the flat and its gallery, held at the gallery's corners; mustard when lit, tomato over capacity
  s += bar([xa + 0.6, y + DEPTH - 0.6, BH + 1.4], [xa + 0.6, y + DEPTH - 0.6, zr], 1.2, BLOCK.m);
  s += box(
    xa - 0.4,
    y - 0.6,
    zr,
    xb + 0.4,
    y + DEPTH + 0.6,
    zr + 1.6,
    full ? PALS.tomato : lit ? PALS.mustard : ROOF,
    toneI,
    0.9,
  );
  // the railing along the gallery's edge: balusters and a top rail
  for (let i = 1; i < 4; i++)
    s += bar([xa + i * 4.5, y + DEPTH - 0.4, BH + 1.4], [xa + i * 4.5, y + DEPTH - 0.4, BH + 6], 0.5);
  s += bar([xa, y + DEPTH - 0.4, BH + 6], [xb, y + DEPTH - 0.4, BH + 6], 0.9);
  if (lit) s += cyl(x + ROOM_W / 2, y + DEPTH / 2, zr + 1.6, zr + 4.6, 2.2, PALS.mint, toneI, 0.8, 12);
  // crates the doorman sent: two columns in front of the door, tomato past the room's seats
  let crates = '';
  if (asked !== null)
    for (let i = 0; i < Math.min(asked, 8); i++) {
      const cx = x + 2 + (i % 2) * 5,
        cz = BH + Math.floor(i / 2) * 3.4;
      crates += box(
        cx,
        y + DEPTH + 2,
        cz,
        cx + 4,
        y + DEPTH + 6,
        cz + 3.2,
        cap !== null && i >= cap ? PALS.tomato : WOOD,
        toneI,
        0.6,
      );
    }
  return [
    {
      box: [
        [xa - 0.4, y - 0.6, BH],
        [xb + 0.4, y + DEPTH + 0.6, zr + 5],
      ],
      svg: `<g class="room${lit ? ' lit' : ''}" data-floor="${l + 1}" data-room="${e + 1}" data-lit="${lit ? 1 : 0}"${full ? ' data-full="1"' : ''}>${s}</g>`,
    },
    ...(crates
      ? [
          {
            box: [
              [x + 2, y + DEPTH + 2, BH],
              [x + 11, y + DEPTH + 6, BH + 14],
            ],
            svg: `<g class="crates" data-asked="${asked}">${crates}</g>`,
          },
        ]
      : []),
  ];
}

/** The lit path on the floor from a floor's doorman to a room's door. */
const path = (l: number, e: number) => ({
  box: [
    [DOOR_X, ROW_Y[l] + DEPTH + 7, BH],
    [roomX(e) + ROOM_W / 2 + 1.5, ROW_Y[l] + DEPTH + 9, BH + 0.3],
  ],
  svg: `<g class="path">${box(DOOR_X, ROW_Y[l] + DEPTH + 7, BH, roomX(e) + ROOM_W / 2 + 1.5, ROW_Y[l] + DEPTH + 9, BH + 0.3, PALS.mustard, toneI, 0.4)}</g>`,
});

/** A kit piece drawn at k of its size about its foot (x, y, z): the projection is linear, so scaling the picture about
 * the foot's screen point is scaling the figure about its foot. Ink thins less than the figure, to keep it bold. */
function scaled(p: Piece, k: number, foot: number[]): Piece {
  const [fx, fy] = P(foot[0], foot[1], foot[2]),
    t = `matrix(${k} 0 0 ${k} ${f(fx * (1 - k))} ${f(fy * (1 - k))})`,
    bold = (s: string) =>
      s.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${+(w / k ** 0.6).toFixed(2)}"`),
    sc = (b: number[][]) => b.map(v => v.map((c, i) => foot[i] + (c - foot[i]) * k));
  return {
    shadow: `<g transform="${t}">${p.shadow}</g>`,
    items: p.items.map(i => ({ box: sc(i.box), svg: `<g transform="${t}">${bold(i.svg)}</g>` })),
    box: sc(p.box),
  };
}
const DOORMAN: Look = {
  skin: '#8d5838',
  top: PALS.cobalt.l,
  legs: '#3b4566',
  hair: '#2b231c',
  cut: 'short',
  hat: 'cap',
  hatCol: '#2f3a5c',
};
/** A doorman on each landing, at the head of its floor: a uniformed figure in a peaked cap behind a lectern, in tomato
 * while the reader overrides him. Drawn at 0.7 of a person, to stand with the flats. */
function doorman(l: number, forced: boolean): Piece {
  const x = DOOR_X,
    y = ROW_Y[l] + DEPTH / 2 + 2;
  const man = scaled(
    person({ x, y: y - 2, facing: 90, look: forced ? { ...DOORMAN, top: PALS.tomato.l } : DOORMAN }),
    0.7,
    [x, y - 2, BH],
  );
  const lectern = {
    box: [
      [x - 3.5, y + 3, BH],
      [x + 3.5, y + 6.5, BH + 10],
    ],
    svg:
      box(x - 1.2, y + 4, BH, x + 1.2, y + 5.5, BH + 8, WOOD, toneI, 0.8) +
      box(x - 3.5, y + 3, BH + 8, x + 3.5, y + 6.5, BH + 10, WOOD, toneI, 0.9),
  };
  const items = [...man.items, lectern];
  return {
    shadow: man.shadow + castShadow(boxCorners(x - 3.5, y + 3, BH, x + 3.5, y + 6.5, BH + 10), BH),
    items: [
      {
        box: [
          [x - 4, y - 6, BH],
          [x + 4, y + 6.5, BH + 24],
        ],
        svg: `<g class="doorman" data-floor="${l + 1}"${forced ? ' data-forced="1"' : ''}>${byDepth(items)}</g>`,
      },
    ],
    box: man.box,
  };
}

/** The belt, a roller conveyor, and its parcels, one per shown token: one item, so the parcels ride on its rollers. */
function belt(o: RoomsOpts): Piece {
  const { x0, x1, y } = BELT,
    n = roomsState(o).parcels,
    step = (x1 - x0 - 12) / Math.max(1, SHOWN - 1),
    c = conveyor({ x: (x0 + x1) / 2, y, len: x1 - x0, w: 8, h: 4, facing: '+x' });
  let s = byDepth(c.items);
  for (let i = 0; i < n; i++) {
    const px = x0 + 6 + i * step,
      m = i === o.sel ? PALS.mustard : o.dropped?.includes(i) ? PALS.tomato : WOOD;
    s += `<g class="parcel" data-i="${i}"${i === o.sel ? ' data-sel="1"' : ''}${o.dropped?.includes(i) ? ' data-dropped="1"' : ''}>${box(px - 4, y - 3, BH + 5.2, px + 4, y + 3, BH + 10, m, toneI, 0.8)}</g>`;
  }
  return {
    shadow: c.shadow,
    items: [
      {
        box: [
          [x0, y - 4, BH],
          [x1, y + 4, BH + 10],
        ],
        svg: `<g data-prop="belt" data-tokens="${n}">${s}</g>`,
      },
    ],
    box: c.box,
  };
}
const parcelAt = (i: number) => [BELT.x0 + 6 + (i * (BELT.x1 - BELT.x0 - 12)) / (SHOWN - 1), BELT.y, BH + 10];

function booth(o: RoomsOpts) {
  const { x, y } = BOOTH;
  let s = box(x - 7, y - 7, BH, x + 7, y + 7, BH + 16, PALS.cobalt, toneI, 1);
  s += box(x - 8, y - 8, BH + 16, x + 8, y + 8, BH + 18, WOOD, toneI, 0.9);
  s += box(x - 4, y + 7, BH + 6, x + 4, y + 7.4, BH + 12, o.guess != null ? PALS.mint : DARK, toneI, 0.7);
  s += hullInk(boxCorners(x - 8, y - 8, BH, x + 8, y + 8, BH + 18), 1.8);
  return {
    box: [
      [x - 8, y - 8, BH],
      [x + 8, y + 8, BH + 18],
    ],
    svg: `<g data-prop="guess"${o.guess != null ? ` data-guess="${o.guess}"` : ''}>${s}</g>`,
  };
}

/** Where a room's pill hangs: floor 2's above its roof, floor 1's below its door, toward the belt; a second lit room's
 * pill a row further out, so two neighbours never overlap. */
const pillSpot = (l: number, e: number, rank: number): [number[], number, number] =>
  l === 1
    ? [[roomX(e) + ROOM_W / 2, ROW_Y[l], BH + WALL + 5], 0, -18 - rank * 26]
    : [[roomX(e) + ROOM_W / 2, ROW_Y[l] + DEPTH, BH], -6, 16 + rank * 15];

/** A room's pill: its name, and on wide screens its two most-routed training tokens. */
export const roomWords = (l: number, e: number, narrow: boolean) =>
  narrow
    ? roomName(e).toUpperCase()
    : `${roomName(e).toUpperCase()} · ${ROOMS.tops[l][e]
        .slice(0, 2)
        .map(t => `“${showPiece(t)}”`)
        .join(' ')}`;

/** The scene: shadows, then the parts back to front, then the pills. */
export const roomsScene = (o: RoomsOpts) => (ctx: SceneCtx) => {
  const st = roomsState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = '';
  for (const y of ROW_Y)
    s += castShadow(
      boxCorners(X0 - 3, y - 1, BH, roomX(EXPERTS - 1) + ROOM_W + 3, y + DEPTH + 1, BH + WALL + 2),
      BH,
      ctx.top,
    );
  s += castShadow(boxCorners(BOOTH.x - 8, BOOTH.y - 8, BH, BOOTH.x + 8, BOOTH.y + 8, BH + 18), BH, ctx.top);
  const parts: { box: number[][]; svg: string }[] = [],
    people = [0, 1].map(l => doorman(l, !!o.forced)),
    conv = belt(o);
  // every shadow first (the doormen's and the belt's with the blocks'), then one sort over everything
  s += [...people, conv].map(p => p.shadow).join('');
  parts.push(...people.flatMap(p => p.items), ...conv.items);
  for (let l = 0; l < LAYERS; l++) {
    for (const e of st.lit[l]) if (!o.dense) parts.push(path(l, e));
    for (let e = 0; e < EXPERTS; e++)
      parts.push(
        ...room(
          l,
          e,
          st.lit[l].includes(e),
          st.over[l].includes(e),
          o.load ? o.load.asked[l][e] : null,
          o.load?.capacity ?? null,
        ),
      );
  }
  parts.push(booth(o));
  s += byDepth(parts);

  // pills: the doormen, the lit rooms (floor 1 below its row, floor 2 above), the token, the guess
  let pills = '';
  for (let l = 0; l < LAYERS; l++) {
    const head = [DOOR_X, ROW_Y[l] + DEPTH / 2, BH + 22];
    pills += pill(
      head,
      l === 0 ? -18 : 0,
      l === 0 ? 8 : -16,
      narrow ? `FLOOR ${l + 1}` : `FLOOR ${l + 1} · ${o.forced ? 'OVERRIDDEN' : 'DOORMAN'}`,
      false,
      scale,
      o.forced ? OVER : undefined,
    );
  }
  if (!o.dense && !o.load)
    st.lit.forEach((es, l) =>
      // rank by room order, not route order, so the further room's pill always sits a row higher
      [...es]
        .sort((x, y) => x - y)
        .forEach((e, rank) => {
          const [at, dx, dy] = pillSpot(l, e, rank);
          pills += pill(at, dx, dy, roomWords(l, e, narrow), true, scale);
        }),
    );
  if (o.dense)
    pills += pill(
      [roomX(EXPERTS - 1), ROW_Y[1], BH + WALL + 2],
      0,
      -16,
      narrow ? 'ALL ROOMS' : 'EVERY ROOM WORKS',
      true,
      scale,
    );
  if (o.load)
    st.over.forEach((es, l) =>
      es.slice(0, 2).forEach((e, rank) => {
        const n = o.load!.asked[l][e];
        const [at, dx, dy] = pillSpot(l, e, rank);
        pills += pill(
          at,
          dx,
          dy,
          narrow ? `${n} > ${o.load!.capacity}` : `${roomName(e).toUpperCase()} · ${n} FOR ${o.load!.capacity}`,
          false,
          scale,
          OVER,
        );
      }),
    );
  if (o.sel !== null && o.sel < st.parcels) pills += pill(parcelAt(o.sel), 0, 30, quote(o.tokens[o.sel]), true, scale);
  pills += pill(
    [BOOTH.x, BOOTH.y, BH + 18],
    0,
    -16,
    narrow || o.guess == null ? 'GUESS' : `GUESS · ${quote(o.guess)}`,
    o.guess != null,
    scale,
  );
  const lit0 = st.lit[0][0] ?? 0;
  pills +=
    sayAt(o.say, 'doorman', [DOOR_X, ROW_Y[0] + DEPTH / 2, BH + 22], -14, scale) +
    sayAt(o.say, 'upstairs', [DOOR_X, ROW_Y[1] + DEPTH / 2, BH + 22], -14, scale) +
    sayAt(o.say, 'rooms', [roomX(lit0) + ROOM_W / 2, ROW_Y[0], BH + WALL + 5], -12, scale) +
    sayAt(o.say, 'belt', parcelAt(o.sel ?? 0), 30 + 48, scale) +
    sayAt(o.say, 'guess', [BOOTH.x, BOOTH.y, BH + 18], -16, scale);
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function roomsLabel(o: RoomsOpts): string {
  const st = roomsState(o);
  const tok = o.sel !== null && o.sel < o.tokens.length ? quote(o.tokens[o.sel]) : null;
  const floors = st.lit
    .map((es, l) =>
      o.dense
        ? `floor ${l + 1}: every room`
        : `floor ${l + 1}: ${es.length ? es.map(e => roomName(e)).join(' and ') : 'no room'}`,
    )
    .join('; ');
  const load = o.load
    ? ` ${o.load.capacity === null ? 'No room has a limit.' : `Each room seats ${o.load.capacity}.`} ${
        st.over.flat().length ? `${st.over.flat().length} rooms are over.` : 'No room is over.'
      }`
    : '';
  return (
    `Larkspur’s sorting office: ${st.parcels} tokens on the belt${tok ? `, ${tok} selected` : ''}. ` +
    `${o.forced ? 'The reader overrides the doormen. ' : ''}${tok || o.dense ? `Lit rooms, ${floors}.` : ''}${load}` +
    `${o.guess != null ? ` The guess: ${quote(o.guess)}.` : ''}`
  );
}

/** The home hero's plot: three flats of the first floor in miniature, each front door its own colour, the middle one
 * lit, and the doorman at his lectern. */
export function roomsPlot(x: number, y: number, top: SceneCtx['top']): string {
  const pieces = [shaded([0, 1, 2].flatMap(e => room(0, e, e === 1, false, null, null))), doorman(0, false)].map(p =>
    mini(p, [48, ROW_Y[0] + DEPTH / 2, BH], [x + 2, y, BH], 0.62),
  );
  return drawPieces(pieces, top);
}

/** The home card's picture (and the intro's hero): chapter 2's word, its two rooms lit on each floor. */
export const roomsCard = (scale = 1.7): RoomsOpts => {
  const c = pinned.card;
  return { tokens: c.tokens, sel: c.tokens.length - 1, lit: c.lit, guess: c.guess, scale };
};

/** The office's shown tokens from a prompt's ids: its last SHOWN. */
export const tokensOf = (ids: number[]) => ids.slice(-SHOWN);
