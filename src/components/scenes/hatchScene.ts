// When the buyer is an agent's picture: the trading hatch (U20). Two counters meet at a hatch in a dividing wall, its
// shutter rolled up over a shelf. Reyes Decks' buying agent (a cobalt model machine with a satchel) stands on the left
// counter with Dana Reyes, the builder, behind it; Larkspur's sales agent (the blush machine) on the right. One paper
// slip, the spending mandate, stands at a counter or in the hatch: six field rows (shop.ts FIELDS, top to bottom), a
// wax seal once signed, and after the shop's checks a stamp on each row: a round mint stamp passes, a tomato cross
// fails, and a failed signature cracks the seal. A token coin may lie on the seller's counter, punched once spent. The
// Task tab draws the task's states as flat cards (flat.ts). Words only in pills and flat cards; esc() on every one.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { drawPieces, type Item, mini, type ModelState, modelMachine, person } from '../../lib/iso/figures';
import {
  CERAMIC,
  DARK,
  PALS,
  WOOD,
  box,
  castShadow,
  cyl,
  ellUV,
  line,
  matOf,
  on,
  PZ,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { arrow, card, DESK, flatPill, lane, type Kind, type Stamp } from '../../lib/iso/flat';
import { FIELDS, type Field } from '../../lib/agent-commerce/shop';
import type { TaskState } from '../../lib/agent-commerce/task';
import { BUILDER } from '../../lib/agent-commerce/story';
import type { Say } from '../story/steps';

export const HATCH_BOARD: Board = [0, 16, 224, 100];
/** The parts a step's callout may name; `slip` and `seal` draw only with a slip (`seal` once signed), `token` with one. */
export const HATCH_PARTS = ['builder', 'buyer', 'satchel', 'hatch', 'seller', 'slip', 'seal', 'token'] as const;
/** At most one slip and this many checks on it (KTD10). */
export const MAX_CHECKS = FIELDS.length;

export type SlipAt = 'buyer' | 'hatch' | 'seller';
export interface SlipView {
  at: SlipAt;
  signed: boolean;
  /** the shop's verdict per field, once checked; at most one stamp per field, in FIELDS order */
  checks?: { field: Field; pass: boolean }[];
}
export interface HatchOpts {
  slip?: SlipView | null;
  /** the machines' screens: ok, unsure (warn) or bad; none shows "..." */
  buyer?: ModelState;
  seller?: ModelState;
  /** a payment token on the seller's counter: live, or punched once spent */
  token?: 'live' | 'spent';
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}

const COUNTER_Z = BH + 18,
  WALL = { x0: 110, x1: 115, y0: 24, y1: 88, top: BH + 74, sill: COUNTER_Z, head: BH + 64, o0: 40, o1: 82 },
  BUYER = { x: 50, y: 46 },
  SELLER = { x: 178, y: 46 },
  DANA = { x: 12, y: 58 },
  SLIP_Y = 72,
  BUYER_SLIP_Y = 65,
  SLIP_X: Record<SlipAt, number> = { buyer: 86, hatch: WALL.x1, seller: 146 },
  TOKEN = { x: 196, y: 70 },
  BAG = matOf('#9a6a3e'),
  SEAL = PALS.tomato;
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];

/** A counter: a wooden body under a pale top. */
function counter(x0: number, x1: number): Item {
  const y0 = 32,
    y1 = 80;
  return {
    box: span(x0, y0, BH, x1, y1, COUNTER_Z),
    svg: `<g class="counter">${box(x0 + 1, y0 + 1, BH, x1 - 1, y1 - 1, COUNTER_Z - 2, WOOD, toneI, 1.1)}${box(x0, y0, COUNTER_Z - 2, x1, y1, COUNTER_Z, CERAMIC, toneI, 1.1)}</g>`,
  };
}

/** The dividing wall with the hatch cut through it: sill, two jambs, the lintel, the rolled shutter and the shelf. */
function wall(): Item[] {
  const { x0, x1, y0, y1, top, sill, head, o0, o1 } = WALL,
    m = matOf('#cfd8c9');
  const part = (a: number, b: number, z0: number, z1: number, cls: string): Item => ({
    box: span(x0, a, z0, x1, b, z1),
    svg: `<g class="${cls}">${box(x0, a, z0, x1, b, z1, m, toneI, 1.1)}</g>`,
  });
  return [
    part(y0, y1, BH, sill, 'wall'),
    part(y0, o0, sill, head, 'wall'),
    part(o1, y1, sill, head, 'wall'),
    part(y0, y1, head, top, 'wall'),
    {
      box: span(x1, o0 - 2, head - 6, x1 + 7, o1 + 2, head),
      svg: `<g class="shutter">${box(x1, o0 - 2, head - 6, x1 + 7, o1 + 2, head, PALS.mustard, toneI, 1)}</g>`,
    },
    {
      box: span(x0 - 8, o0, sill, x1 + 8, o1, sill + 2),
      svg: `<g class="shelf">${box(x0 - 8, o0, sill, x1 + 8, o1, sill + 2, WOOD, toneI, 1)}</g>`,
    },
  ];
}

/** The buying agent's satchel on its near side: a bag with a flap and a strap over the hood. */
function satchel(x: number, y: number, z: number): Item {
  const y1 = y + 17;
  let s = box(x - 8, y1, z + 6, x + 6, y1 + 4, z + 18, BAG, toneI, 1.1);
  s += shape(
    [
      [x - 8, y1 + 4.05, z + 18],
      [x + 6, y1 + 4.05, z + 18],
      [x + 6, y1 + 4.05, z + 12],
      [x - 1, y1 + 4.05, z + 10],
      [x - 8, y1 + 4.05, z + 12],
    ],
    BAG.d,
    0.9,
  );
  s += line(
    [
      [x - 7, y1 + 2, z + 18],
      [x - 7, y1 + 0.5, z + 30],
    ],
    1.6,
  );
  s += line(
    [
      [x + 5, y1 + 2, z + 18],
      [x + 5, y1 + 0.5, z + 30],
    ],
    1.6,
  );
  return { box: span(x - 8, y1, z + 6, x + 6, y1 + 4, z + 30), svg: `<g data-part="satchel">${s}</g>` };
}

const SLIP = { w: 28, h: 40, foot: COUNTER_Z + 2, row: 5.4, first: 32.5 };
const STAMP_U = 8;
const ROW_LEN = [13, 10, 12, 8, 11, 9];
/** A point on the slip's face: u across from its centre (left negative, as seen), v its height, d toward the viewer. */
type Face = (u: number, v: number, d?: number) => number[];
const poly = (f: Face, uv: number[][], d: number) => uv.map(([u, v]) => f(u, v, d));

/** A round stamp (pass) or a cross (fail) at (u, v) on the face. */
function stampAt(f: Face, u: number, v: number, pass: boolean, k: number) {
  if (pass) {
    const r = 2.4 * k;
    return (
      shape(poly(f, ellUV(u, v, r, r, 16), 0.1), PALS.mint.l, 1) +
      shape(poly(f, ellUV(u, v, r * 0.45, r * 0.45, 12), 0.15), PALS.mint.d, 0.6)
    );
  }
  // a cross: a plus turned 45°, arms a third of its reach wide
  const a = 2.6 * k,
    b = 0.9 * k,
    pts: number[][] = [];
  for (let q = 0; q < 4; q++) {
    const t = (q * Math.PI) / 2 + Math.PI / 4,
      c = Math.cos(t),
      s = Math.sin(t);
    // each arm: from the side of the centre, out to its tip and back
    for (const [px, pz] of [
      [b, -b],
      [a, -b],
      [a, b],
    ])
      pts.push([u + px * c - pz * s, v + px * s + pz * c]);
  }
  return shape(poly(f, pts, 0.1), PALS.tomato.l, 1);
}

const rect = (u0: number, v0: number, u1: number, v1: number) => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];
/** Where the slip is, its size factor and its face: on the buyer's counter it lies flat, head away, for Dana to sign
 * (so it hides no machine); in the hatch it stands facing the seller (+x), half through the opening; at the seller's
 * counter it stands in a clip facing the viewer (+y), drawn larger on phones so its stamps stay readable. */
function slipFrame(at: SlipAt, narrow: boolean) {
  const k = narrow && at === 'seller' ? 1.25 : 1,
    cx = at === 'hatch' ? WALL.x1 + 0.6 : SLIP_X[at],
    cy = at === 'hatch' ? (WALL.o0 + WALL.o1) / 2 : at === 'buyer' ? BUYER_SLIP_Y : SLIP_Y,
    foot = SLIP.foot;
  const f: Face =
    at === 'hatch'
      ? (u, v, d = 0) => [cx + d, cy - u, v]
      : at === 'buyer'
        ? (u, v, d = 0) => [cx - SLIP.h / 2 + (v - foot), cy + u, COUNTER_Z + 0.3 + d]
        : (u, v, d = 0) => [cx + u, cy + d, v];
  const top = foot + SLIP.h * k;
  return { k, cx, cy, f, top, pin: at === 'buyer' ? f(0, top) : [cx, cy, top], seal: f(-5 * k, foot + 3.6 * k) };
}

/** The slip: paper, a header band, six field rows (FIELDS, top to bottom) with their stamps, the seal. */
function slipAt(o: SlipView, narrow: boolean): Item {
  const { k, cx, cy, f, top } = slipFrame(o.at, narrow),
    w = (SLIP.w / 2) * k,
    foot = SLIP.foot;
  let s = '';
  // the clip stand it leans in
  if (o.at === 'seller') s += box(cx - 6, cy - 3, COUNTER_Z, cx + 6, cy + 1.5, foot + 1, DARK, toneI, 0.9);
  s += shape(poly(f, rect(-w, foot, w, top), 0), CERAMIC.l, 1.2);
  s += shape(poly(f, rect(-w + 1.5, top - 5 * k, w - 1.5, top - 1.5), 0.05), PALS.cobalt.l, 0.8);
  const checks = (o.checks ?? []).slice(0, MAX_CHECKS);
  FIELDS.forEach((field, i) => {
    const rz = foot + (SLIP.first - i * SLIP.row) * k,
      u0 = -w + 2.5 * k;
    s += line([f(u0, rz, 0.05), f(u0 + ROW_LEN[i] * k, rz, 0.05)], 0.7);
    // the rule under the row: each field has its own strip, where its stamp lands
    s += line([f(-w + 1.5, rz - SLIP.row * k * 0.5, 0.05), f(w - 1.5, rz - SLIP.row * k * 0.5, 0.05)], 0.35);
    const c = checks.find(x => x.field === field);
    if (c)
      s += `<g class="stamp-mark" data-field="${field}" data-pass="${c.pass ? 1 : 0}">${stampAt(f, STAMP_U * k, rz, c.pass, k)}</g>`;
  });
  if (o.signed) {
    const broken = checks.some(c => c.field === 'signature' && !c.pass),
      sz = foot + 3.6 * k,
      r = 3 * k,
      su = -5 * k;
    let seal = shape(poly(f, ellUV(su, sz, r, r, 18), 0.15), SEAL.l, 1.1);
    seal += shape(poly(f, ellUV(su, sz, r * 0.55, r * 0.55, 12), 0.2), SEAL.m, 0.6);
    if (broken)
      seal += line(
        poly(
          f,
          [
            [su - 1.2 * k, sz + r + 0.4],
            [su + 0.6 * k, sz + 1],
            [su - 0.8 * k, sz - 0.6],
            [su + 1 * k, sz - r - 0.4],
          ],
          0.25,
        ),
        1.6,
      );
    s += `<g data-part="seal" data-seal="${broken ? 'broken' : 'whole'}">${seal}</g>`;
  }
  return {
    box:
      o.at === 'hatch'
        ? span(cx, cy - w, foot, cx + 0.5, cy + w, top)
        : o.at === 'buyer'
          ? span(cx - SLIP.h / 2, cy - w, COUNTER_Z, cx + SLIP.h / 2, cy + w, COUNTER_Z + 0.5)
          : span(cx - w, cy - 3, COUNTER_Z, cx + w, cy + 1.5, top),
    svg: `<g data-part="slip" data-at="${o.at}" data-signed="${o.signed ? 1 : 0}">${s}</g>`,
  };
}

/** A token coin on the seller's counter; a spent one is punched through. */
function token(state: 'live' | 'spent'): Item {
  const { x, y } = TOKEN,
    z0 = COUNTER_Z,
    z1 = z0 + 1.8;
  let s = cyl(x, y, z0, z1, 5.2, PALS.mustard, toneI, 1.1, 20);
  s += shape(on(PZ(z1 + 0.05), ellUV(x, y, 3.2, 3.2, 16)), PALS.mustard.m, 0.6);
  if (state === 'spent') s += shape(on(PZ(z1 + 0.1), ellUV(x, y, 1.8, 1.8, 12)), DARK.d, 0.8);
  return {
    box: span(x - 5.2, y - 5.2, z0, x + 5.2, y + 5.2, z1),
    svg: `<g data-part="token" data-token="${state}">${s}</g>`,
  };
}

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale)}</g>`;
const firstName = (s: string) => s.split(' ')[0];
const NAMES: Record<Field, string> = {
  signature: 'SIGNATURE',
  merchant: 'MERCHANT',
  items: 'ITEMS',
  cap: 'CAP',
  expiry: 'EXPIRY',
  nonce: 'NONCE',
};
/** The slip's pill: unsigned, signed, or the shop's verdict (desktop names the failed fields). */
export function slipWords(o: SlipView, narrow = false): string {
  const fails = (o.checks ?? []).filter(c => !c.pass);
  if (o.checks?.length) {
    if (!fails.length) return 'ACCEPTED';
    return narrow ? 'REFUSED' : `REFUSED · ${fails.map(c => NAMES[c.field]).join(' · ')}`;
  }
  return o.signed ? 'SIGNED' : 'UNSIGNED';
}

/** The trading hatch. Shadows, then every item by depth, then the pills (callouts last). */
export const hatchScene = (o: HatchOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const items: Item[] = [counter(26, WALL.x0 - 4), counter(WALL.x1 + 4, 214), ...wall()];
  const buyer = modelMachine(BUYER.x, BUYER.y, 1, o.buyer, undefined, { z: COUNTER_Z, pal: PALS.cobalt }),
    seller = modelMachine(SELLER.x, SELLER.y, 1, o.seller, undefined, { z: COUNTER_Z });
  buyer.items = buyer.items.map(i => ({ ...i, svg: `<g data-part="buyer">${i.svg}</g>` }));
  seller.items = seller.items.map(i => ({ ...i, svg: `<g data-part="seller">${i.svg}</g>` }));
  const dana = person({ x: DANA.x, y: DANA.y, facing: '+x', pose: 'stand', look: BUILDER.cast });
  dana.items = dana.items.map(i => ({ ...i, svg: `<g data-part="builder">${i.svg}</g>` }));
  items.push(satchel(BUYER.x, BUYER.y, COUNTER_Z));
  const slip = o.slip ?? null;
  if (slip) items.push(slipAt(slip, narrow));
  if (o.token) items.push(token(o.token));
  const shadow =
    castShadow(boxCorners(26, 32, BH, 214, 80, COUNTER_Z), BH, ctx.top) +
    castShadow(boxCorners(WALL.x0, WALL.y0, BH, WALL.x1, WALL.y1, WALL.top), BH, ctx.top);
  const art = drawPieces([{ shadow, items }, buyer, seller, dana]);

  const machineTop = (p: { x: number; y: number }) => [p.x, p.y, COUNTER_Z + 35],
    hatchAt = [WALL.x1, (WALL.o0 + WALL.o1) / 2, WALL.top],
    sf = slip ? slipFrame(slip.at, narrow) : null,
    slipTop = sf?.pin ?? null,
    sealAt = sf?.seal ?? null,
    tokenAt = [TOKEN.x, TOKEN.y, COUNTER_Z + 2],
    danaHead = [DANA.x, DANA.y, BH + 36];
  const pills: string[] = [
    pill(danaHead, -14, narrow ? firstName(BUILDER.name) : BUILDER.name, false, scale),
    pill(machineTop(BUYER), -16, narrow ? 'BUYER' : 'BUYING AGENT', false, scale),
    pill(machineTop(SELLER), -16, narrow ? 'SELLER' : 'SALES AGENT', false, scale),
  ];
  // a slip lying on the buyer's counter takes its pill below, clear of the machine; a standing one above
  const slipDy = slip?.at === 'buyer' ? 40 : -10;
  if (slip && slipTop) pills.push(pill(slipTop, slipDy, slipWords(slip, narrow), !!slip.checks?.length, scale));
  pills.push(
    sayAt(o.say, 'builder', danaHead, -14, scale, narrow),
    sayAt(o.say, 'buyer', machineTop(BUYER), -16, scale, narrow),
    sayAt(o.say, 'satchel', [BUYER.x, BUYER.y + 21, COUNTER_Z + 8], 64, scale, narrow),
    sayAt(o.say, 'hatch', hatchAt, -16, scale, narrow),
    sayAt(o.say, 'seller', machineTop(SELLER), -16, scale, narrow),
  );
  if (slipTop) pills.push(sayAt(o.say, 'slip', slipTop, slipDy, scale, narrow));
  if (slip?.signed && sealAt) pills.push(sayAt(o.say, 'seal', sealAt, slip.at === 'buyer' ? -10 : 30, scale, narrow));
  if (o.token) pills.push(sayAt(o.say, 'token', tokenAt, 56, scale, narrow));
  return art + calloutsLast(pills);
};

const AT_WORDS: Record<SlipAt, string> = {
  buyer: 'at the buying agent’s counter',
  hatch: 'passing through the hatch',
  seller: 'at the sales agent’s counter',
};
const SCREEN: Record<ModelState, string> = { ok: 'OK', warn: 'unsure', bad: 'an error' };
/** The picture in words, for its aria-label. */
export function hatchLabel(o: HatchOpts): string {
  const who = `${BUILDER.name} stands behind her buying agent, a machine with a satchel, at one counter of a trading hatch; the shop’s sales agent stands at the other.`;
  const screens = [
    o.buyer ? ` The buying agent’s screen shows ${SCREEN[o.buyer]}.` : '',
    o.seller ? ` The sales agent’s screen shows ${SCREEN[o.seller]}.` : '',
  ].join('');
  const s = o.slip;
  let slip = '';
  if (s) {
    slip = ` ${s.signed ? 'A sealed' : 'An unsigned'} spending slip ${s.at === 'buyer' ? 'lies' : 'stands'} ${AT_WORDS[s.at]}.`;
    if (s.checks?.length) {
      const fails = s.checks.filter(c => !c.pass).map(c => c.field);
      slip += fails.length
        ? ` The shop stamped it: ${fails.join(', ')} fail${fails.length === 1 ? 's' : ''}, the other ${s.checks.length - fails.length} pass.`
        : ` The shop stamped every field a pass.`;
      if (fails.includes('signature')) slip += ' The seal is cracked.';
    }
  }
  const tok = o.token
    ? ` A payment token lies on the sales counter${o.token === 'spent' ? ', punched: spent' : ''}.`
    : '';
  return who + screens + slip + tok;
}

/** The home hero's plot (heroScene): the wall and its hatch with a sealed slip in it, set down small. */
export function hatchPlot(x: number, y: number, top: SceneCtx['top']): string {
  const at = [WALL.x1, (WALL.o0 + WALL.o1) / 2, BH];
  const p = mini(
    {
      shadow: castShadow(boxCorners(WALL.x0 - 8, WALL.y0, BH, WALL.x1 + 8, WALL.y1, WALL.top), BH, top),
      items: [...wall(), slipAt({ at: 'hatch', signed: true }, false)],
    },
    at,
    [x, y, BH],
    0.3,
  );
  return drawPieces([p]);
}

// ---- the Task tab: the task's states as flat cards in a snake (flat.ts) ----

const KIND_OF: Record<TaskState, Kind> = {
  submitted: 'request',
  working: 'request',
  'input-required': 'request',
  completed: 'result',
  failed: 'error',
  canceled: 'blocked',
};
const STAMP_OF: Partial<Record<TaskState, Stamp>> = {
  'input-required': 'WAITING',
  completed: 'PASS',
  failed: 'FAIL',
  canceled: 'STOPPED',
};
const LANE_DESK = { w: 600, cols: 5, pad: 12, head: 30, row: 62, fs: DESK.fs },
  LANE_PHONE = { w: 320, cols: 2, pad: 8, head: 30, row: 66, fs: 11 };

/** Where state i sits: rows of `cols`, every other row running back, so each arrow is straight. */
export const cellOf = (i: number, cols: number) => {
  const row = Math.floor(i / cols),
    c = i % cols;
  return { row, col: row % 2 ? cols - 1 - c : c };
};

/** The task's states as an SVG string (every text escaped) and its size. */
export function hatchLane(states: readonly TaskState[], { phone = false }: { phone?: boolean } = {}) {
  const L = phone ? LANE_PHONE : LANE_DESK,
    rows = Math.max(1, Math.ceil(states.length / L.cols)),
    colW = (L.w - 2 * L.pad) / L.cols,
    y0 = L.pad + L.head + 14,
    at = (i: number) => {
      const c = cellOf(i, L.cols);
      return [L.pad + colW * (c.col + 0.5), y0 + L.row * (c.row + 0.5)];
    };
  const h = y0 + rows * L.row + L.pad;
  let s = lane('task', 'TASK', PALS.cobalt, L.pad, L.pad, L.w - 2 * L.pad, L.head, L.fs, true);
  for (let i = 0; i + 1 < states.length; i++) {
    const [x1, y1] = at(i),
      [x2, y2] = at(i + 1);
    const half = colW * 0.5 - 4;
    s +=
      y1 === y2
        ? arrow(
            `s${i}`,
            `s${i + 1}`,
            x1 + Math.sign(x2 - x1) * half * 0.86,
            y1,
            x2 - Math.sign(x2 - x1) * half * 0.86,
            y2,
          )
        : arrow(`s${i}`, `s${i + 1}`, x1, y1 + L.fs * 1.4, x2, y2 - L.fs * 1.4);
  }
  states.forEach((st, i) => {
    const [x, y] = at(i);
    s += `<g class="task-state" data-state="${st}" data-i="${i}">${card(
      { from: 'task', to: 'task', kind: KIND_OF[st], text: st.toUpperCase(), stamp: STAMP_OF[st] },
      i,
      x,
      y,
      L.fs,
      18,
      0,
      0,
    )}</g>`;
  });
  if (!states.length) s += flatPill(L.w / 2, y0 + L.row / 2, 'NO TASK YET', L.fs);
  return { svg: s, w: L.w, h };
}

/** The lane in words, for its label. */
export const laneLabel = (states: readonly TaskState[]) =>
  states.length ? `The task’s states, in order: ${states.join(', then ')}.` : 'No task has been sent yet.';
