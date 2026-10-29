// Module 13's picture: the serving floor as a diner (KTD16). Customers queue beside a belt where their orders wait as
// envelopes; the server is a blush diner counter whose stools are the batch seats, one per request it may run at once,
// their cushions lit for the requests in this iteration (mustard: reading its prompt, mint: writing its reply); beside
// it the KV shelf is an order-ticket rack, a ticket per cubby of cache the requests in flight hold. For speculative
// decoding a small draft runner (the student) stands by the queue with the tokens it guessed. Words only in pills; on
// phones (scale > 1.5) only the server's pill shows and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { modelIn, person, tight, type Item } from '../../lib/iso/figures';
import {
  PALS,
  METAL,
  CERAMIC,
  DARK,
  WOOD,
  box,
  castShadow,
  cyl,
  rod,
  toneI,
  tag,
  byDepth,
  line,
  on,
  PZ,
  ellUV,
  cylX,
  shape,
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

const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];

// the diner counter: an L inside the server's footprint, the kitchen inside it, the stools round its outside
const ARM_A = { x0: 88, x1: 98, y0: 62, y1: 98 },
  ARM_B = { x0: 74, x1: 88, y0: 88, y1: 98 },
  CTOP = BH + 15,
  // the stools stand along the counter's outside: down arm A's front, then along arm B's
  STOOL_PATH = [
    [104, 63],
    [104, 104],
    [76, 104],
  ];

// the diner's round sign on a post from the counter top, under the server's pill (no words: the pill names it)
const signSvg = () =>
  rod([93, 84, CTOP], [93, 84, BH + 31], 0.6, METAL, toneI, 0.7, 0.6, 6) +
  cylX(92.4, 93.6, 84, BH + 34.5, 4.4, PALS.blush, toneI, 1.2, 16) +
  cylX(93.6, 93.9, 84, BH + 34.5, 3.2, CERAMIC, toneI, 0.6, 14);

/** One arm of the diner counter. Real-object notes: a dark kick plate, a blush body (the server is the model), a
 * chrome top that overhangs the customer side. */
function arm(a: { x0: number; x1: number; y0: number; y1: number }, sign = false) {
  const s =
    box(a.x0 + 0.6, a.y0 + 0.6, BH, a.x1 - 0.6, a.y1 - 0.6, BH + 2, DARK, toneI, 0.8) +
    box(a.x0, a.y0, BH + 2, a.x1, a.y1, CTOP - 2, PALS.blush, toneI, 1) +
    box(a.x0 - 1, a.y0 - 1, CTOP - 2, a.x1 + 1.2, a.y1 + 1.2, CTOP, METAL, toneI, 1) +
    (sign ? signSvg() : '');
  return {
    box: span(a.x0 - 1, a.y0 - 1, BH, a.x1 + 1.2, a.y1 + 1.2, sign ? BH + 39 : CTOP),
    svg: `<g class="counter">${tight(s)}</g>`,
  };
}

/** Where stool i of n stands, evenly along the counter's outside. */
function stoolAt(i: number, n: number) {
  const segs = STOOL_PATH.slice(1).map((b, k) => {
      const a = STOOL_PATH[k];
      return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
    }),
    total = segs.reduce((t, g) => t + g.len, 0);
  let d = ((i + 0.5) * total) / n;
  for (const g of segs) {
    if (d <= g.len || g === segs[segs.length - 1]) {
      const t = Math.min(1, d / g.len);
      return [g.a[0] + (g.b[0] - g.a[0]) * t, g.a[1] + (g.b[1] - g.a[1]) * t];
    }
    d -= g.len;
  }
  return STOOL_PATH[0];
}

/** A batch seat: a diner stool. Real-object notes: a chrome post on a flat round foot, a cushion lit by what its
 * request is doing (mustard reading, mint writing, dark when empty). */
function stool(seat: Seat, x: number, y: number, r: number) {
  const s =
    shape(on(PZ(BH + 0.1), ellUV(x, y, r * 0.75, r * 0.75, 8)), DARK.m, 0.7) +
    line(
      [
        [x, y, BH + 0.2],
        [x, y, BH + 9],
      ],
      1.6,
    ) +
    cyl(x, y, BH + 9, BH + 11, r, SEAT_PAL[seat], toneI, 0.9, 10);
  return {
    box: span(x - r, y - r, BH, x + r, y + r, BH + 11),
    svg: `<g class="seat" data-seat="${seat}">${tight(s)}</g>`,
  };
}

/** The server: the diner counter, its kitchen (a coffee urn behind the counter) and a stool per batch seat. */
function counter(seats: Seat[]) {
  const n = seats.length,
    pitch = 69 / n,
    r = Math.min(2.6, pitch * 0.4);
  const ux = 80,
    uy = 72,
    urn =
      cyl(ux, uy, BH, BH + 2, 4.6, DARK, toneI, 0.9, 12) +
      cyl(ux, uy, BH + 2, BH + 19, 4, METAL, toneI, 1.2, 12) +
      cyl(ux, uy, BH + 19, BH + 21, 2.6, METAL, toneI, 0.9, 10) +
      rod([ux + 3.8, uy, BH + 9], [ux + 6, uy, BH + 9], 0.7, DARK, toneI, 0.7, 0.7, 6);
  return [
    {
      box: span(ux - 4.6, uy - 4.6, BH, ux + 4.6, uy + 4.6, BH + 21),
      svg: `<g data-prop="server" data-cap="${n}">${tight(urn)}</g>`,
    },
    arm(ARM_A, true),
    arm(ARM_B),
    ...seats.map((seat, i) => {
      const [sx, sy] = stoolAt(i, n);
      return stool(seat, sx, sy, r);
    }),
  ];
}

/** The KV shelf as an order-ticket rack beside the counter: a rail on two posts with SLOTS clips, a ticket hanging from
 * each clip the cache fills, the last one tomato. */
const SHELF = { x0: 140, x1: 152, y0: 56, y1: 116 };
function shelf(filled: number) {
  const { x0, x1, y0, y1 } = SHELF,
    z1 = BH + 26,
    mx = (x0 + x1) / 2,
    zr = z1 - 2,
    w = (y1 - y0 - 4) / SLOTS;
  let s =
    box(x0, y0, BH, x1, y1, BH + 2, WOOD, toneI, 1) +
    box(mx - 1.5, y0, BH + 2, mx + 1.5, y0 + 2, z1, WOOD, toneI, 0.9) +
    rod([mx, y0 + 2, zr], [mx, y1 - 2, zr], 0.7, METAL, toneI, 0.8, 0.7, 8);
  for (let i = 0; i < SLOTS; i++) {
    const c0 = y0 + 2 + i * w + 0.7,
      c1 = c0 + w - 1.4,
      cm = (c0 + c1) / 2;
    if (i < filled)
      s += box(mx - 0.4, c0, zr - 9, mx + 0.4, c1, zr - 1, i >= SLOTS - 1 ? PALS.tomato : PALS.cobalt, toneI, 0.6);
    s += line(
      [
        [mx + 0.8, cm, zr - 1.8],
        [mx + 0.8, cm, zr + 0.8],
      ],
      1.8,
    );
  }
  s += box(mx - 1.5, y1 - 2, BH + 2, mx + 1.5, y1, z1, WOOD, toneI, 0.9);
  return { box: span(x0, y0, BH, x1, y1, z1), svg: `<g data-prop="kv" data-filled="${filled}">${tight(s)}</g>` };
}

/** The draft runner: a small model machine (the student) with the tokens it guessed in a row on its desk, kept ones lit. */
function runner(drafted: number, accepted: number) {
  const x = 52,
    y = 116;
  let s = modelIn([x - 10, y - 10, BH, x + 10, y + 10, BH + 16]).items[0].svg;
  for (let i = 0; i < drafted; i++)
    s += `<g class="guess" data-kept="${i < accepted ? 1 : 0}">${box(x - 8 + i * 5, y + 13, BH, x - 4.5 + i * 5, y + 16.5, BH + 3, i < accepted ? PALS.mint : CERAMIC, toneI, 0.7)}</g>`;
  return {
    box: span(x - 10, y - 10, BH, x + 10, y + 17, BH + 18),
    svg: `<g data-prop="draft" data-drafted="${drafted}" data-accepted="${accepted}">${s}</g>`,
  };
}

/** An envelope waiting on the queue belt: an order the customer in line has handed in. */
const envelope = (x: number, y: number) => {
  const z = BH + 0.3;
  return {
    box: span(x - 4.5, y - 3.5, z, x + 4.5, y + 3.5, z + 4.6),
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

// the customer at the head of the queue, beside the belt, facing the counter (one drawn: a person costs ~15k of SVG; the pill counts them all)
const CUSTOMERS = ['shopper1'] as const;

/** The diner. Every shadow, then one sort over every part, then the pills. */
export const serveScene = (o: ServeOpts) => (ctx: SceneCtx) => {
  const st = serveState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [x, y] = SERVER;
  const folk = Array.from({ length: Math.min(st.queued, CUSTOMERS.length) }, (_, i) =>
    person({ x: 64 - i * 14, y: 97, facing: '+x', look: CUSTOMERS[i] }),
  );
  const solid: Item[] = [...counter(st.seats), shelf(st.kvFilled)];
  if (st.draft) solid.push(runner(st.draft.drafted, st.draft.accepted));
  let s =
    solid
      .filter(p => !p.svg.startsWith(`<g class="seat"`))
      .map(p => {
        const [[a, b, c], [d, e, f]] = p.box;
        return castShadow(boxCorners(a, b, c, d, e, p.svg.startsWith(`<g class="counter"`) ? CTOP : f), BH, ctx.top);
      })
      .join('') + folk.map(p => p.shadow).join('');
  s += `<g data-prop="queue" data-waiting="${st.queued}">${beltAt([8, y], [x - HALF - 2, y], [0, 1], false)}</g>`;
  s += byDepth([
    ...solid,
    ...Array.from({ length: st.envelopes }, (_, i) => envelope(x - HALF - 10 - i * 11, y)),
    ...folk.flatMap(p => p.items),
  ]);
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

/** The home hero's plot (KTD16): a short blush diner counter with four stools in front, three lit (two writing, one
 * reading), beside a short queue belt with two envelopes waiting. */
export function servePlot(x: number, y: number, top: SceneCtx['top']): string {
  const rx = x + 6,
    ry = y - 4,
    a = { x0: rx - 3, x1: rx + 3, y0: ry - 9, y1: ry + 9 },
    zt = BH + 10;
  const bar =
    box(a.x0, a.y0, BH, a.x1, a.y1, zt - 1.5, PALS.blush, toneI, 1) +
    box(a.x0 - 0.8, a.y0 - 0.8, zt - 1.5, a.x1 + 0.8, a.y1 + 0.8, zt, METAL, toneI, 0.9);
  const stools = (['decode', 'prefill', 'decode', 'empty'] as const).map((seat, i) => {
    const sx = rx + 7,
      sy = ry - 6.75 + i * 4.5;
    return {
      at: [sx, sy, 0],
      svg:
        rod([sx, sy, BH], [sx, sy, BH + 6], 0.4, METAL, toneI, 0.5, 0.4, 8) +
        cyl(sx, sy, BH + 6, BH + 7.4, 1.8, SEAT_PAL[seat], toneI, 0.8, 12),
    };
  });
  return (
    castShadow(boxCorners(a.x0, a.y0, BH, a.x1 + 9, a.y1, zt), BH, top) +
    beltAt([x - 22, ry], [a.x0 - 1, ry], [0, 1], false) +
    byDepth([{ at: [rx, ry, 0], svg: bar }, ...stools, envelope(x - 16, ry), envelope(x - 6, ry)])
  );
}
