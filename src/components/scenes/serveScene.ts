// Module 13's picture: the serving floor (KTD16). Requests wait as envelopes on a queue belt; the server is a rack with
// one batch seat per request it may run at once, lit for the requests in this iteration (mustard: reading its prompt,
// mint: writing its reply); beside it a KV shelf fills with the cache the requests in flight hold. For speculative
// decoding a small draft runner (the student) stands beside the rack with the tokens it guessed. Words only in pills;
// on phones (scale > 1.5) only the server's pill shows and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { modelIn } from '../../lib/iso/figures';
import {
  PALS,
  METAL,
  CERAMIC,
  DARK,
  WOOD,
  box,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  line,
} from '../../lib/iso/core.js';
import type { Result } from '../../lib/inference/server';
import { beltAt } from './officeScene';
import type { Say } from '../story/steps';

export const SERVE_BOARD: Board = [0, 34, 186, 140];

export type Seat = 'prefill' | 'decode' | 'empty';
export interface ServeOpts {
  /** one per batch seat (the cap), in order: prefill seats first, then decode, then empty */
  seats: Seat[];
  /** requests waiting in the queue */
  queued: number;
  /** share of the KV room in use, 0..1 */
  kv: number;
  /** speculative decoding: tokens the draft runner guessed and how many the server kept (none: no draft runner) */
  draft?: { drafted: number; accepted: number } | null;
  /** the step's callout, over one of SERVE_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: the server rack, the queue, the KV shelf and the draft runner (when drawn). */
export const SERVE_PARTS = ['server', 'queue', 'kv', 'draft'] as const;

const SLOTS = 10,
  MAX_ENV = 6,
  SERVER = [96, 84],
  HALF = 22,
  TOP = BH + 34;

/** The floor as of iteration i of a server run (default: the busiest one). */
export function floorAt(r: Result, i?: number, cap = r.settings.cap): Omit<ServeOpts, 'scale' | 'draft'> {
  const at =
    i ??
    r.iterations.reduce(
      (b, it, j) =>
        it.prefill.length + it.decode.length > r.iterations[b].prefill.length + r.iterations[b].decode.length ? j : b,
      0,
    );
  const it = r.iterations[Math.max(0, Math.min(at, r.iterations.length - 1))];
  const seats: Seat[] = [
    ...(it?.prefill ?? []).map(() => 'prefill' as const),
    ...(it?.decode ?? []).map(() => 'decode' as const),
  ];
  while (seats.length < cap) seats.push('empty');
  return { seats, queued: it?.queued ?? 0, kv: it ? it.kv / r.room : 0 };
}

/** What the floor shows. Pure, so the tests can check it without drawing. */
export function serveState({ seats, queued, kv, draft = null }: ServeOpts) {
  const filled = Math.min(SLOTS, Math.round(Math.max(0, kv) * SLOTS));
  return {
    seats,
    cap: seats.length,
    prefill: seats.filter(s => s === 'prefill').length,
    decode: seats.filter(s => s === 'decode').length,
    queued,
    envelopes: Math.min(queued, MAX_ENV),
    kvPct: Math.round(kv * 100),
    kvFilled: filled,
    draft,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
const SEAT_PAL = { prefill: PALS.mustard, decode: PALS.mint, empty: DARK };

/** The rack: a steel cabinet with vents, and on top a grid of seats, one per request it may run at once. */
function rack(seats: Seat[]) {
  const [x, y] = SERVER;
  let s = box(x - HALF, y - HALF, BH, x + HALF, y + HALF, TOP, METAL, toneI, 1);
  for (let i = 0; i < 4; i++)
    s += line(
      [
        [x + HALF + 0.05, y - 14, BH + 8 + i * 6],
        [x + HALF + 0.05, y + 14, BH + 8 + i * 6],
      ],
      0.7,
    );
  const n = seats.length,
    cols = Math.max(1, Math.min(n, 4)),
    rows = Math.ceil(n / cols),
    pitch = Math.min(10, (HALF * 2 - 6) / Math.max(cols, rows));
  seats.forEach((seat, i) => {
    const c = i % cols,
      r = Math.floor(i / cols),
      sx = x - ((cols - 1) * pitch) / 2 + c * pitch,
      sy = y - ((rows - 1) * pitch) / 2 + r * pitch,
      h = seat === 'empty' ? 1 : 3.5;
    s += `<g class="seat" data-seat="${seat}">${box(sx - pitch * 0.36, sy - pitch * 0.36, TOP, sx + pitch * 0.36, sy + pitch * 0.36, TOP + h, SEAT_PAL[seat], toneI, 0.8)}</g>`;
  });
  return {
    at: [x, y, 0],
    svg: `<g data-prop="server" data-cap="${n}">${s}${hullInk(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, TOP), 2.4)}</g>`,
  };
}

/** The KV shelf beside the rack: SLOTS cubbies from back to front, a box in each one the cache fills. */
const SHELF = { x0: 140, x1: 152, y0: 56, y1: 116 };
function shelf(filled: number) {
  const { x0, x1, y0, y1 } = SHELF,
    z1 = BH + 26,
    w = (y1 - y0 - 4) / SLOTS;
  let s = box(x0, y0, BH, x1, y1, BH + 2, WOOD, toneI, 1);
  s += box(x0, y0, BH + 2, x1, y0 + 2, z1, WOOD, toneI, 0.9);
  for (let i = 0; i < filled; i++)
    s += box(
      x0 + 1,
      y0 + 2 + i * w + 0.6,
      BH + 2,
      x1 - 1,
      y0 + 2 + (i + 1) * w - 0.6,
      BH + 12,
      i >= SLOTS - 1 ? PALS.tomato : PALS.cobalt,
      toneI,
      0.7,
    );
  s += box(x0, y1 - 2, BH + 2, x1, y1, z1, WOOD, toneI, 0.9) + box(x0, y0, z1, x1, y1, z1 + 2, WOOD, toneI, 1);
  return { at: [(x0 + x1) / 2, (y0 + y1) / 2, 0], svg: `<g data-prop="kv" data-filled="${filled}">${s}</g>` };
}

/** The draft runner: a small model machine (the student) with the tokens it guessed in a row on its desk, kept ones lit. */
function runner(drafted: number, accepted: number) {
  const x = 52,
    y = 116;
  let s = modelIn([x - 10, y - 10, BH, x + 10, y + 10, BH + 16]).items[0].svg;
  for (let i = 0; i < drafted; i++)
    s += `<g class="guess" data-kept="${i < accepted ? 1 : 0}">${box(x - 8 + i * 5, y + 13, BH, x - 4.5 + i * 5, y + 16.5, BH + 3, i < accepted ? PALS.mint : CERAMIC, toneI, 0.7)}</g>`;
  return { at: [x, y, 0], svg: `<g data-prop="draft" data-drafted="${drafted}" data-accepted="${accepted}">${s}</g>` };
}

/** An envelope waiting on the queue belt. */
const envelope = (x: number, y: number) => {
  const z = BH + 0.3;
  return {
    at: [x, y, 1],
    svg: `<g class="waiting">${box(x - 4.5, y - 3.5, z, x + 4.5, y + 3.5, z + 4.5, PALS.cobalt, toneI, 0.9)}${line(
      [
        [x - 4.5, y - 3.5, z + 4.55],
        [x, y, z + 4.55],
        [x - 4.5, y + 3.5, z + 4.55],
      ],
      0.8,
    )}</g>`,
  };
};

/** The floor. Shadows and the belt (floor), then the parts back to front, then the pills. */
export const serveScene = (o: ServeOpts) => (ctx: SceneCtx) => {
  const st = serveState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [x, y] = SERVER;
  let s =
    castShadow(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, TOP), BH, ctx.top) +
    castShadow(boxCorners(SHELF.x0, SHELF.y0, BH, SHELF.x1, SHELF.y1, BH + 28), BH, ctx.top);
  s += `<g data-prop="queue" data-waiting="${st.queued}">${beltAt([8, y], [x - HALF - 2, y], [0, 1], false)}</g>`;
  const parts = [
    rack(st.seats),
    shelf(st.kvFilled),
    ...Array.from({ length: st.envelopes }, (_, i) => envelope(x - HALF - 10 - i * 11, y)),
  ];
  if (st.draft) parts.push(runner(st.draft.drafted, st.draft.accepted));
  s += byDepth(parts);
  let pills = pill(
    [x, y, TOP + 4],
    narrow ? 0 : -14,
    -18,
    narrow ? 'SERVER' : `SERVER · ${st.prefill + st.decode} OF ${st.cap} SEATS`,
    st.prefill + st.decode > 0,
    scale,
  );
  if (!narrow) {
    pills += pill([24, y, BH + 6], 0, -24, `QUEUE · ${st.queued}`, false, scale);
    pills += pill([146, 100, BH + 28], 16, -4, `KV CACHE · ${st.kvPct}%`, st.kvPct >= 90, scale);
    if (st.draft)
      pills += pill(
        [52, 116, BH + 16],
        -10,
        -14,
        `DRAFT · ${st.draft.accepted} OF ${st.draft.drafted} KEPT`,
        st.draft.accepted > 0,
        scale,
      );
  }
  // the callout stands over its part, even where phones leave the part's pill out
  pills +=
    sayAt(o.say, 'server', [x, y, TOP + 4], -18, scale) +
    sayAt(o.say, 'queue', [24, y, BH + 6], -24, scale) +
    sayAt(o.say, 'kv', [146, 100, BH + 28], -4, scale) +
    (st.draft ? sayAt(o.say, 'draft', [52, 116, BH + 16], -14, scale) : '');
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function serveLabel(o: ServeOpts): string {
  const st = serveState(o);
  return (
    `A serving floor: ${st.queued} request${st.queued === 1 ? '' : 's'} waiting on the queue belt; a server rack with ${st.cap} batch seat${st.cap === 1 ? '' : 's'}, ` +
    `${st.prefill} reading a prompt and ${st.decode} writing a reply; the KV cache shelf beside it ${st.kvPct}% full.` +
    (st.draft
      ? ` A draft runner beside it guessed ${st.draft.drafted} token${st.draft.drafted === 1 ? '' : 's'}; the server kept ${st.draft.accepted}.`
      : '')
  );
}

/** The counts the caption carries (phones show only the server's pill). */
export function serveReadouts(o: ServeOpts): string[] {
  const st = serveState(o);
  return [
    `${st.prefill + st.decode} of ${st.cap} seats busy`,
    `${st.queued} waiting`,
    `KV cache ${st.kvPct}% full`,
    ...(st.draft ? [`draft: ${st.draft.accepted} of ${st.draft.drafted} kept`] : []),
  ];
}

/** The home hero's plot (KTD16): a small rack with four seats on top, three lit (two writing, one reading), beside a short
 * queue belt with two envelopes waiting. */
export function servePlot(x: number, y: number, top: SceneCtx['top']): string {
  const rx = x + 8,
    ry = y - 4,
    h = 7,
    z1 = BH + 18;
  let r = box(rx - h, ry - h, BH, rx + h, ry + h, z1, METAL, toneI, 1);
  for (let i = 0; i < 3; i++)
    r += line(
      [
        [rx + h + 0.05, ry - 4, BH + 5 + i * 4],
        [rx + h + 0.05, ry + 4, BH + 5 + i * 4],
      ],
      0.6,
    );
  (['decode', 'prefill', 'decode', 'empty'] as const).forEach((seat, i) => {
    const sx = rx - 3.2 + (i % 2) * 6.4,
      sy = ry - 3.2 + Math.floor(i / 2) * 6.4,
      sh = seat === 'empty' ? 0.8 : 2.5;
    r += box(sx - 2.4, sy - 2.4, z1, sx + 2.4, sy + 2.4, z1 + sh, SEAT_PAL[seat], toneI, 0.7);
  });
  r += hullInk(boxCorners(rx - h, ry - h, BH, rx + h, ry + h, z1), 1.8);
  return (
    castShadow(boxCorners(rx - h, ry - h, BH, rx + h, ry + h, z1 + 2), BH, top) +
    beltAt([x - 22, ry], [rx - h - 1, ry], [0, 1], false) +
    byDepth([{ at: [rx, ry, 0], svg: r }, envelope(x - 16, ry), envelope(x - 6, ry)])
  );
}
