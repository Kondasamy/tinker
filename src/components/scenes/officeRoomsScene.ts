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
  box,
  byDepth,
  castShadow,
  cyl,
  hullInk,
  tag,
  toneI,
} from '../../lib/iso/core.js';
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

/** A room: a small building, mustard and lamp-lit when it works on the selected token. */
function room(l: number, e: number, on: boolean, full: boolean, asked: number | null, cap: number | null) {
  const x = roomX(e),
    y = ROW_Y[l];
  const m = on ? PALS.mustard : CERAMIC;
  let s = box(x, y, BH, x + ROOM_W, y + DEPTH, BH + WALL, m, toneI, 1);
  // the door, on the front face
  s += box(x + 4, y + DEPTH, BH, x + 10, y + DEPTH + 0.4, BH + 8, on ? PALS.mustard : DARK, toneI, 0.7);
  s += box(
    x - 0.6,
    y - 0.6,
    BH + WALL,
    x + ROOM_W + 0.6,
    y + DEPTH + 0.6,
    BH + WALL + 2,
    full ? PALS.tomato : WOOD,
    toneI,
    0.9,
  );
  if (on) s += cyl(x + ROOM_W / 2, y + DEPTH / 2, BH + WALL + 2, BH + WALL + 5, 2.2, PALS.mint, toneI, 0.8, 12);
  s += hullInk(boxCorners(x - 0.6, y - 0.6, BH, x + ROOM_W + 0.6, y + DEPTH + 0.6, BH + WALL + 2), 1.6);
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
      at: [x + ROOM_W / 2, y + DEPTH / 2, 0],
      svg: `<g class="room${on ? ' lit' : ''}" data-floor="${l + 1}" data-room="${e + 1}" data-lit="${on ? 1 : 0}"${full ? ' data-full="1"' : ''}>${s}</g>`,
    },
    { at: [x + 4, y + DEPTH + 4, 0], svg: crates ? `<g class="crates" data-asked="${asked}">${crates}</g>` : '' },
  ];
}

/** The lit path on the floor from a floor's doorman to a room's door. */
const path = (l: number, e: number) =>
  `<g class="path">${box(DOOR_X, ROW_Y[l] + DEPTH + 7, BH, roomX(e) + ROOM_W / 2 + 1.5, ROW_Y[l] + DEPTH + 9, BH + 0.3, PALS.mustard, toneI, 0.4)}</g>`;

/** A doorman at the head of a floor: a figure at a lectern. */
function doorman(l: number, forced: boolean) {
  const x = DOOR_X,
    y = ROW_Y[l] + DEPTH / 2 + 2;
  const s =
    box(x - 4, y + 3, BH, x + 4, y + 7, BH + 9, WOOD, toneI, 0.9) +
    cyl(x, y - 2, BH, BH + 15, 3.2, forced ? PALS.tomato : PALS.cobalt, toneI, 1.1, 16) +
    cyl(x, y - 2, BH + 15, BH + 20, 2.4, CERAMIC, toneI, 1, 14) +
    cyl(x, y - 2, BH + 20, BH + 22, 2.8, DARK, toneI, 0.9, 14);
  return { at: [x, y, 0], svg: `<g class="doorman" data-floor="${l + 1}"${forced ? ' data-forced="1"' : ''}>${s}</g>` };
}

/** The belt and its parcels, one per shown token. */
function belt(o: RoomsOpts) {
  const { x0, x1, y } = BELT,
    n = roomsState(o).parcels,
    step = (x1 - x0 - 12) / Math.max(1, SHOWN - 1);
  let s =
    box(x0, y - 4, BH, x1, y + 4, BH + 4, METAL, toneI, 1) + hullInk(boxCorners(x0, y - 4, BH, x1, y + 4, BH + 4), 1.6);
  for (let i = 0; i < n; i++) {
    const px = x0 + 6 + i * step,
      m = i === o.sel ? PALS.mustard : o.dropped?.includes(i) ? PALS.tomato : WOOD;
    s += `<g class="parcel" data-i="${i}"${i === o.sel ? ' data-sel="1"' : ''}${o.dropped?.includes(i) ? ' data-dropped="1"' : ''}>${box(px - 4, y - 3, BH + 4, px + 4, y + 3, BH + 10, m, toneI, 0.8)}</g>`;
  }
  return { at: [(x0 + x1) / 2, y, 0], svg: `<g data-prop="belt" data-tokens="${n}">${s}</g>` };
}
const parcelAt = (i: number) => [BELT.x0 + 6 + (i * (BELT.x1 - BELT.x0 - 12)) / (SHOWN - 1), BELT.y, BH + 10];

function booth(o: RoomsOpts) {
  const { x, y } = BOOTH;
  let s = box(x - 7, y - 7, BH, x + 7, y + 7, BH + 16, PALS.cobalt, toneI, 1);
  s += box(x - 8, y - 8, BH + 16, x + 8, y + 8, BH + 18, WOOD, toneI, 0.9);
  s += box(x - 4, y + 7, BH + 6, x + 4, y + 7.4, BH + 12, o.guess != null ? PALS.mint : DARK, toneI, 0.7);
  s += hullInk(boxCorners(x - 8, y - 8, BH, x + 8, y + 8, BH + 18), 1.8);
  return { at: [x, y, 0], svg: `<g data-prop="guess"${o.guess != null ? ` data-guess="${o.guess}"` : ''}>${s}</g>` };
}

/** Where a room's pill hangs: floor 2's above its roof, floor 1's below its door, toward the belt; a second lit room's
 * pill a row further out, so two neighbours never overlap. */
const pillSpot = (l: number, e: number, rank: number): [number[], number, number] =>
  l === 1
    ? [[roomX(e) + ROOM_W / 2, ROW_Y[l], BH + WALL + 5], 0, -18 - rank * 15]
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
      boxCorners(X0 - 1, y - 1, BH, roomX(EXPERTS - 1) + ROOM_W + 1, y + DEPTH + 1, BH + WALL + 2),
      BH,
      ctx.top,
    );
  s += castShadow(boxCorners(BOOTH.x - 8, BOOTH.y - 8, BH, BOOTH.x + 8, BOOTH.y + 8, BH + 18), BH, ctx.top);
  const parts: { at: number[]; svg: string }[] = [];
  for (let l = 0; l < LAYERS; l++) {
    parts.push(doorman(l, !!o.forced));
    for (const e of st.lit[l]) if (!o.dense) parts.push({ at: [DOOR_X, ROW_Y[l] + DEPTH + 8, 0], svg: path(l, e) });
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
  parts.push(belt(o), booth(o));
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
      es.forEach((e, rank) => {
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

/** The home hero's plot: a doorman before four small rooms, two of them lit. */
export function roomsPlot(x: number, y: number, top: SceneCtx['top']): string {
  const r = (rx: number, ry: number, on: boolean) => {
    let s = box(rx - 5, ry - 5, BH, rx + 5, ry + 5, BH + 9, on ? PALS.mustard : CERAMIC, toneI, 0.9);
    s += box(rx - 5.4, ry - 5.4, BH + 9, rx + 5.4, ry + 5.4, BH + 10.5, WOOD, toneI, 0.8);
    if (on) s += cyl(rx, ry, BH + 10.5, BH + 12.5, 1.5, PALS.mint, toneI, 0.7, 10);
    return s + hullInk(boxCorners(rx - 5.4, ry - 5.4, BH, rx + 5.4, ry + 5.4, BH + 10.5), 1.3);
  };
  const man =
    cyl(x - 16, y + 6, BH, BH + 10, 2.3, PALS.cobalt, toneI, 0.9, 12) +
    cyl(x - 16, y + 6, BH + 10, BH + 13.5, 1.7, CERAMIC, toneI, 0.8, 10);
  return (
    castShadow(boxCorners(x - 8, y - 12, BH, x + 18, y + 10, BH + 10), BH, top) +
    byDepth([
      { at: [x - 2, y - 6, 0], svg: r(x - 2, y - 6, false) },
      { at: [x + 12, y - 6, 0], svg: r(x + 12, y - 6, true) },
      { at: [x - 2, y + 6, 0], svg: r(x - 2, y + 6, true) },
      { at: [x + 12, y + 6, 0], svg: r(x + 12, y + 6, false) },
      { at: [x - 16, y + 6, 0], svg: man },
    ])
  );
}

/** The home card's picture (and the intro's hero): chapter 2's word, its two rooms lit on each floor. */
export const roomsCard = (scale = 1.7): RoomsOpts => {
  const c = pinned.card;
  return { tokens: c.tokens, sel: c.tokens.length - 1, lit: c.lit, guess: c.guess, scale };
};

/** The office's shown tokens from a prompt's ids: its last SHOWN. */
export const tokensOf = (ids: number[]) => ids.slice(-SHOWN);
