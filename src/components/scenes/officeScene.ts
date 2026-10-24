// Module 2's picture: Larkspur's back office as an isometric diorama. Four stations (the employee's desk, the host app's
// sorting desk, the model, the order system's filing cabinet) joined to the host by conveyor belts. The message being
// sent rides its belt as an envelope (coloured by kind, stamped like its card), so the picture follows the same
// transcript the Messages view draws. Checks stand on the belts: a schema arch between model and host, an ownership
// arch and an approval barrier between host and orders. Chapter 1 has no belt to the orders: nothing joins them yet.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import type { Msg } from '../../lib/iso/flat';
import { BH, renderers, blockShadow, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import type { Say } from '../story/steps';
import {
  INK,
  PALS,
  METAL,
  CERAMIC,
  DARK,
  WOOD,
  P,
  pd,
  on,
  PZ,
  PX,
  byDepth,
  box,
  cyl,
  rod,
  shape,
  line,
  ink,
  hullInk,
  castShadow,
  toneI,
  tag,
  inkK,
} from '../../lib/iso/core.js';

export const OFFICE_BOARD: Board = [100, 0, 286, 258];
type Station = 'emp' | 'host' | 'model' | 'orders';
// a cross on the board's axes, so gates across a belt face the viewer: the model in front to the right (+x), the employee
// in front to the left (+y), the order system behind to the right (-y)
const AT: Record<Station, number[]> = { host: [142, 134], model: [262, 134], orders: [142, 22], emp: [142, 236] };
const EDGE: Record<Station, number> = { host: 22, model: 19, orders: 18, emp: 14 }; // where a belt meets the station
const HT: Record<Station, number> = { host: 34, model: 32, orders: 44, emp: 20 }; // tallest part, for pill heights
const BW = 12; // belt width
/** The parts a step's callout (`say.block`) may name: the stations and the checks on the belts. */
export const OFFICE_PARTS = ['emp', 'host', 'model', 'orders', 'schema', 'owner', 'gate'] as const;
const KIND_PAL = { request: PALS.cobalt, result: PALS.mint, error: PALS.tomato, blocked: METAL };

// a belt runs from the host's edge (t = 0) to the station's edge (t = 1)
const ends = (st: Station) => {
  const [hx, hy] = AT.host,
    [sx, sy] = AT[st],
    L = Math.hypot(sx - hx, sy - hy),
    d = [(sx - hx) / L, (sy - hy) / L];
  return {
    a: [hx + d[0] * EDGE.host, hy + d[1] * EDGE.host],
    b: [sx - d[0] * EDGE[st], sy - d[1] * EDGE[st]],
    d,
    n: [-d[1], d[0]],
  };
};
const along = (st: Station, t: number, off = 0) => {
  const { a, b, n } = ends(st);
  return [a[0] + (b[0] - a[0]) * t + n[0] * off, a[1] + (b[1] - a[1]) * t + n[1] * off];
};

/** A conveyor belt on the board: a dark strip with rollers; `cut`: not built yet, a dashed outline only. */
const belt = (st: Station, cut: boolean) => {
  const { a, b, n } = ends(st);
  return beltAt(a, b, n, cut);
};
/** A belt from board point a to b; n: its sideways direction. */
export function beltAt(a: number[], b: number[], n: number[], cut: boolean) {
  const w = BW / 2,
    z = BH + 0.25;
  const q = [
    [a[0] + n[0] * w, a[1] + n[1] * w, z],
    [b[0] + n[0] * w, b[1] + n[1] * w, z],
    [b[0] - n[0] * w, b[1] - n[1] * w, z],
    [a[0] - n[0] * w, a[1] - n[1] * w, z],
  ];
  if (cut) return ink(pd(q), 1.1).replace('/>', ' stroke-dasharray="4 4"/>');
  let s = shape(q, DARK.m, 1.2);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let k = 7; k < L - 3; k += 8) {
    const p = [a[0] + ((b[0] - a[0]) * k) / L, a[1] + ((b[1] - a[1]) * k) / L];
    s += line(
      [
        [p[0] + n[0] * (w - 1.5), p[1] + n[1] * (w - 1.5), z + 0.05],
        [p[0] - n[0] * (w - 1.5), p[1] - n[1] * (w - 1.5), z + 0.05],
      ],
      0.6,
    ).replace(INK, DARK.l);
  }
  return s;
}

export type Part = { at: number[]; svg: string };
const LIT = '#ffb627';

/** The employee's desk: a wooden counter with a telephone. */
function desk(lit: boolean): Part {
  const [x, y] = AT.emp,
    z1 = BH + 14;
  let s = box(x - 18, y - 12, BH, x + 18, y + 12, z1, WOOD, toneI, 1);
  s +=
    box(x - 8, y - 6, z1, x + 4, y + 6, z1 + 4, PALS.tomato, toneI, 0.9) +
    rod([x - 2, y - 7, z1 + 6], [x - 2, y + 7, z1 + 6], 2, PALS.tomato);
  s += box(x + 7, y - 9, z1, x + 15, y - 1, z1 + 1.5, CERAMIC, toneI, 0.7); // a note pad
  if (lit) s += cyl(x + 11, y + 6, z1, z1 + 2, 2.4, { l: LIT, m: LIT, d: PALS.mustard.m }, toneI, 0.8, 14);
  return { at: [x, y, 0], svg: s + hullInk(boxCorners(x - 18, y - 12, BH, x + 18, y + 12, z1), 2.2) };
}

/** The host app's sorting desk: a blue desk, a pigeon-hole rack at the back, a lamp that lights while it handles a message. */
function sorter(lit: boolean, calls?: number, cap?: number): Part {
  const [x, y] = AT.host,
    z1 = BH + 16;
  let s = box(x - 20, y - 20, BH, x + 20, y + 20, z1, PALS.cobalt, toneI, 1);
  s += box(x - 20, y - 20, z1, x - 9, y + 20, BH + 34, METAL, toneI, 1);
  for (const v of [z1 + 6, z1 + 12])
    s += line(
      on(PX(x - 8.9), [
        [y - 20, v],
        [y + 20, v],
      ]),
      0.8,
    );
  for (const u of [y - 7, y + 7])
    s += line(
      on(PX(x - 8.9), [
        [u, z1],
        [u, BH + 34],
      ]),
      0.8,
    );
  // the call counter: one stud per call the cap allows, lit as calls are made
  if (cap)
    for (let i = 0; i < cap; i++)
      s += cyl(
        x + 4 + (i % 3) * 6,
        y - 12 + Math.floor(i / 3) * 6,
        z1,
        z1 + 2,
        2,
        i < (calls ?? 0) ? { l: LIT, m: LIT, d: PALS.mustard.m } : DARK,
        toneI,
        0.7,
        12,
      );
  s +=
    rod([x + 12, y + 12, z1], [x + 12, y + 12, z1 + 10], 0.9, METAL) +
    rod(
      [x + 12, y + 12, z1 + 10],
      [x + 6, y + 8, z1 + 13],
      3,
      lit ? { l: LIT, m: LIT, d: PALS.mustard.m } : PALS.mustard,
      toneI,
      0.9,
      1.5,
    );
  return {
    at: [x, y, 0],
    svg:
      s +
      hullInk(boxCorners(x - 20, y - 20, BH, x + 20, y + 20, z1), 2.4) +
      hullInk(boxCorners(x - 20, y - 20, z1, x - 9, y + 20, BH + 34), 2),
  };
}

/** The model: the LLM block, with the tool definitions it was sent fanned out on top like a menu. */
function model(state: 'ok' | 'warn' | 'bad' | undefined, tools: number): Part {
  const [x, y] = AT.model,
    z1 = BH + 32;
  let s = renderers.llm({ x, y, state });
  for (let i = 0; i < tools; i++)
    s +=
      box(
        x - 13 + i * 5,
        y - 13 + i * 4,
        z1 + i * 1.6,
        x + 3 + i * 5,
        y + 7 + i * 4,
        z1 + i * 1.6 + 1.4,
        CERAMIC,
        toneI,
        0.8,
      ) +
      shape(
        on(PZ(z1 + i * 1.6 + 1.45), [
          [x - 13 + i * 5, y - 13 + i * 4],
          [x - 8 + i * 5, y - 13 + i * 4],
          [x - 8 + i * 5, y + 7 + i * 4],
          [x - 13 + i * 5, y + 7 + i * 4],
        ]),
        [PALS.cobalt, PALS.mint, PALS.tomato][i % 3].l,
        0.6,
      );
  return { at: [x, y, 0], svg: s };
}

/** The order system: a metal filing cabinet; a drawer slides out while a call reads or changes it. */
function cabinet(open: boolean): Part {
  const [x, y] = AT.orders,
    x1 = x + 16,
    z1 = BH + 44;
  let s = box(x - 16, y - 16, BH, x1, y + 16, z1, METAL, toneI, 1);
  for (let i = 0; i < 3; i++) {
    const z = BH + 3 + i * 13.5;
    if (i === 1 && open) continue;
    s +=
      shape(
        on(PX(x1 + 0.05), [
          [y - 12, z],
          [y + 12, z],
          [y + 12, z + 11],
          [y - 12, z + 11],
        ]),
        METAL.m,
        0.8,
      ) + box(x1, y - 4, z + 7, x1 + 2, y + 4, z + 8.5, DARK, toneI, 0.6);
  }
  if (open) {
    const z = BH + 16.5;
    s +=
      shape(
        on(PX(x1 + 0.05), [
          [y - 12, z],
          [y + 12, z],
          [y + 12, z + 11],
          [y - 12, z + 11],
        ]),
        DARK.d,
        0.8,
      ) +
      box(x1, y - 12, z, x1 + 14, y + 12, z + 10, METAL, toneI, 0.9) +
      box(x1 + 3, y - 9, z + 10, x1 + 4.5, y + 9, z + 15, PALS.mustard, toneI, 0.7) +
      box(x1 + 7, y - 9, z + 10, x1 + 8.5, y + 9, z + 13, CERAMIC, toneI, 0.7) +
      box(x1 + 14, y - 4, z + 5, x1 + 16, y + 4, z + 6.5, DARK, toneI, 0.6);
  }
  return { at: [x, y, 0], svg: s + hullInk(boxCorners(x - 16, y - 16, BH, x1 + (open ? 16 : 2), y + 16, z1), 2.4) };
}

/** Larkspur's stock in the empty front corner: two crates of hardware and a potted plant (decoration only). */
function stock(): Part[] {
  const crate = (x: number, y: number, z: number) =>
    box(x - 9, y - 9, z, x + 9, y + 9, z + 14, WOOD, toneI, 1) +
    line(
      [
        [x + 9.05, y - 9, z + 7],
        [x + 9.05, y + 9, z + 7],
      ],
      0.7,
    ) +
    line(
      [
        [x - 9, y + 9.05, z + 7],
        [x + 9, y + 9.05, z + 7],
      ],
      0.7,
    );
  const leaf = (x: number, y: number, z: number, r: number) => cyl(x, y, z, z + r * 1.2, r, PALS.mint, toneI, 0.9, 16);
  return [
    { at: [236, 214, 0], svg: crate(236, 214, BH) + crate(236, 214, BH + 14) + crate(256, 214, BH) },
    {
      at: [262, 244, 0],
      svg:
        cyl(262, 244, BH, BH + 9, 6, PALS.tomato, toneI, 1, 18) +
        leaf(262, 244, BH + 9, 6) +
        leaf(260, 242, BH + 15, 4) +
        leaf(264, 246, BH + 13, 3.5),
    },
  ];
}

/** An arch over a belt: two posts and a bar, a lamp on top (green: passed, red: refused). */
const arch = (st: Station, t: number, lamp: 'ok' | 'bad' | null) => archAt(along(st, t), ends(st).n, lamp);
/** An arch across a belt at board point p; n: the belt's sideways direction. */
export function archAt([px, py]: number[], n: number[], lamp: 'ok' | 'bad' | null): Part {
  const w = BW / 2 + 3,
    zt = BH + 20;
  const a = [px + n[0] * w, py + n[1] * w],
    b = [px - n[0] * w, py - n[1] * w];
  const post = (q: number[]) => box(q[0] - 1.6, q[1] - 1.6, BH, q[0] + 1.6, q[1] + 1.6, zt, PALS.mustard, toneI, 0.9);
  const col = lamp === 'ok' ? PALS.mint : lamp === 'bad' ? PALS.tomato : DARK;
  return {
    at: [px, py, 0],
    svg:
      post(a) +
      post(b) +
      rod([a[0], a[1], zt], [b[0], b[1], zt], 1.8, PALS.mustard) +
      cyl(px, py, zt + 1.5, zt + 4, 2.4, col, toneI, 0.8, 14),
  };
}

/** A barrier across a belt: a post and an arm, down (closed) or raised (approved). */
const barrier = (st: Station, t: number, up: boolean, waiting: boolean) =>
  barrierAt(along(st, t), ends(st).n, up, waiting);
/** A barrier across a belt at board point p; n: the belt's sideways direction. */
export function barrierAt([px, py]: number[], n: number[], up: boolean, waiting: boolean): Part {
  const w = BW / 2 + 4,
    z = BH + 12;
  const p = [px + n[0] * w, py + n[1] * w];
  // raised: straight up, so it never reads as a closed arm seen at an angle
  const end = up ? [p[0], p[1], z + 30] : [px - n[0] * w, py - n[1] * w, z];
  let s =
    box(p[0] - 2.5, p[1] - 2.5, BH, p[0] + 2.5, p[1] + 2.5, z + 2, METAL, toneI, 0.9) +
    rod([p[0], p[1], z + 1], end, 1.5, PALS.tomato);
  // white bands on the arm, so it reads as a barrier and not a pipe
  for (const k of [0.3, 0.65]) {
    const q = [p[0] + (end[0] - p[0]) * k, p[1] + (end[1] - p[1]) * k, z + 1 + (end[2] - z - 1) * k];
    s += rod(
      q,
      [q[0] + (end[0] - p[0]) * 0.12, q[1] + (end[1] - p[1]) * 0.12, q[2] + (end[2] - z - 1) * 0.12],
      1.55,
      CERAMIC,
    );
  }
  s += cyl(
    p[0],
    p[1],
    z + 2,
    z + 5,
    2.2,
    waiting ? { l: LIT, m: LIT, d: PALS.mustard.m } : up ? PALS.mint : PALS.tomato,
    toneI,
    0.8,
    14,
  );
  return { at: [px, py, 0], svg: s };
}

/** A message envelope on a belt; `note`: a slip of paper poking out (a planted instruction). Travels in from its sender. */
export function envelope(m: Msg, p: number[], from: number[], note: boolean): Part {
  const [x, y] = p,
    z = BH + 0.3,
    pal = KIND_PAL[m.kind];
  let s =
    castShadow(boxCorners(x - 5, y - 4, z, x + 5, y + 4, z + 5), z) +
    box(x - 5, y - 4, z, x + 5, y + 4, z + 5, pal, toneI, 1) +
    line(
      [
        [x - 5, y - 4, z + 5.05],
        [x, y, z + 5.05],
        [x - 5, y + 4, z + 5.05],
      ],
      0.9,
    );
  if (m.kind === 'blocked')
    s += ink(
      pd(
        on(PZ(z + 5.1), [
          [x - 5, y - 4],
          [x + 5, y - 4],
          [x + 5, y + 4],
          [x - 5, y + 4],
        ]),
      ),
      1.2,
    ).replace('/>', ' stroke-dasharray="2 2"/>');
  // the planted note: a pink slip standing up out of the envelope, scribbled on
  if (note)
    s +=
      shape(
        [
          [x - 3, y - 1, z + 5],
          [x + 4, y - 3, z + 5],
          [x + 6, y - 3, z + 19],
          [x - 1, y - 1, z + 19],
        ],
        PALS.blush.l,
        1,
      ) +
      [16, 13, 10]
        .map(h =>
          line(
            [
              [x - 0.4, y - 1.4, z + h],
              [x + 4.4, y - 2.8, z + h],
            ],
            0.7,
          ).replace(INK, PALS.tomato.d),
        )
        .join('');
  const [X, Y] = P(x, y, z),
    [FX, FY] = P(from[0], from[1], z);
  return {
    at: [x, y, 1],
    svg: `<g class="capsule" style="--dx:${(FX - X).toFixed(1)}px;--dy:${(FY - Y).toFixed(1)}px">${s}</g>`,
  };
}

export interface OfficeOpts {
  msgs: Msg[];
  /** messages sent so far; the last one is on the belt */
  upTo?: number;
  /** tool definitions the host sends the model; 0 = none, and no belt to the order system */
  tools: number;
  host?: string;
  /** the front desk's name pill (default EMPLOYEE) */
  emp?: string;
  /** checks standing on the belts */
  schema?: boolean;
  owner?: boolean;
  gate?: boolean;
  /** the host's call cap, shown as studs on its desk */
  cap?: number;
  /** extra words on the order system's pill (a refund limit) */
  orders?: string;
  /** results from the order system carry a planted note */
  note?: boolean;
  /** station and check name pills, and the stock in the corner (default on); the home hero leaves them out */
  names?: boolean;
  scale?: number;
  /** the step's callout, a lit pill over one of OFFICE_PARTS */
  say?: Say;
}

const stationOf = (id: string): Station | undefined => (id in AT ? (id as Station) : undefined);

/** What the picture shows after `upTo` messages: who is busy, where each envelope is, how the checks stand. */
export function officeState({ msgs, upTo = msgs.length, tools, gate }: OfficeOpts) {
  const sent = msgs.slice(0, upTo),
    last = sent[sent.length - 1];
  // the envelopes in flight: the last message, or every message of its batch (parallel calls)
  const flying = last
    ? sent
        .map((m, i) => ({ m, i }))
        .filter(({ m, i }) => i === upTo - 1 || (last.batch !== undefined && m.batch === last.batch))
    : [];
  const gated = [...sent].reverse().find(m => m.from === 'host' && m.to === 'emp' && m.stamp);
  // the model's screen keeps showing what it last wrote: '...' while it reads, OK for a call or answer, ??? for a guess (no tools)
  const said = [...sent].reverse().find(m => m.from === 'model' || m.to === 'model');
  const screen: 'ok' | 'warn' | 'bad' | undefined =
    !said || said.to === 'model'
      ? undefined
      : said.stamp === 'INVALID' || said.stamp === 'STOPPED'
        ? 'bad'
        : tools
          ? 'ok'
          : 'warn';
  return {
    last,
    flying,
    screen,
    busy: last ? stationOf(last.to) : undefined,
    open: !!last && (last.to === 'orders' || last.from === 'orders'),
    calls: sent.filter(m => m.from === 'host' && m.to === 'orders').length,
    up: !!gate && gated?.stamp === 'APPROVED',
    waiting: !!gate && gated?.stamp === 'WAITING' && last === gated,
  };
}

/** The diorama. Pills: each station's name (lit while it is busy), and the message on the belt with its stamp. */
export const officeScene =
  (o: OfficeOpts) =>
  ({ top }: SceneCtx) => {
    const { tools, host = 'HOST APP', schema, owner, gate, cap, scale = 1, note } = o;
    const st = officeState(o),
      narrow = scale > 1;
    let s =
      blockShadow('llm', ...(AT.model as [number, number]), top) +
      castShadow(boxCorners(AT.host[0] - 20, AT.host[1] - 20, BH, AT.host[0] + 20, AT.host[1] + 20, BH + 34), BH, top) +
      castShadow(
        boxCorners(AT.orders[0] - 16, AT.orders[1] - 16, BH, AT.orders[0] + 16, AT.orders[1] + 16, BH + 44),
        BH,
        top,
      ) +
      castShadow(boxCorners(AT.emp[0] - 18, AT.emp[1] - 12, BH, AT.emp[0] + 18, AT.emp[1] + 12, BH + 20), BH, top) +
      (o.names === false
        ? ''
        : castShadow(boxCorners(227, 205, BH, 265, 223, BH + 28), BH, top) +
          castShadow(boxCorners(256, 238, BH, 268, 250, BH + 20), BH, top));
    s += (['model', 'emp', 'orders'] as Station[]).map(k => belt(k, k === 'orders' && !tools)).join('');
    const parts: Part[] = [
      ...(o.names === false ? [] : stock()),
      desk(st.busy === 'emp'),
      sorter(st.busy === 'host', st.calls, cap),
      model(st.screen, tools),
      cabinet(st.open),
    ];
    const lastBad = st.last?.stamp === 'INVALID';
    if (schema)
      parts.push(
        arch('model', 0.3, st.last?.from === 'model' && st.last.to === 'host' ? (lastBad ? 'bad' : 'ok') : null),
      );
    if (owner)
      parts.push(arch('orders', 0.3, st.last?.from === 'orders' ? (st.last.stamp === 'REFUSED' ? 'bad' : 'ok') : null));
    if (gate) parts.push(barrier('orders', 0.62, st.up, st.waiting));
    const pills: string[] = [];
    const callouts: string[] = [];
    const sign = (st2: Station, t: number, text: string, part: string) => {
      if (o.names === false) return;
      const [x, y] = along(st2, t);
      pills.push(
        `<g class="check-tag" aria-hidden="true" pointer-events="none">${tag([x, y, BH], 0, 16, text, false, scale)}</g>`,
      );
      callouts.push(sayAt(o.say, part, [x, y, BH], 16, scale));
    };
    if (schema) sign('model', 0.3, 'SCHEMA CHECK', 'schema');
    if (owner) sign('orders', 0.3, narrow ? 'OWNER' : 'OWNERSHIP CHECK', 'owner');
    if (gate) sign('orders', 0.62, `APPROVAL · ${st.up ? 'OPEN' : st.waiting ? 'WAITING' : 'CLOSED'}`, 'gate');
    st.flying.forEach(({ m }, j) => {
      const a = stationOf(m.from),
        b = stationOf(m.to),
        spoke = a === 'host' ? b : a;
      if (!a || !b || !spoke || spoke === 'host') return;
      const toward = b === 'host' ? 0 : 1; // belt parameter of the receiving end
      // arriving: most of the way along; an INVALID call is held on the model's side of the schema arch, a STOPPED one never leaves the model
      // toward the model it stops short: the model block, in front, would hide the far end of its belt;
      // and back from the orders it stops clear of the host desk, which stands in front of that belt's near end
      let t = toward ? (spoke === 'model' ? 0.6 : 0.78) : spoke === 'orders' ? 0.4 : 0.22;
      if (m.stamp === 'INVALID' && schema) t = 0.46;
      if (m.stamp === 'STOPPED') t = 0.6;
      // a batch rides side by side across the belt, so it stays clear of the checks along it
      const side = st.flying.length > 1 ? (j - (st.flying.length - 1) / 2) * 11 : 0;
      const p = along(spoke, t, side);
      const from = a === 'host' ? along(spoke, 0) : along(spoke, 1);
      const planted = !!note && m.kind === 'result' && (m.from === 'orders' || (m.from === 'host' && m.to === 'model'));
      parts.push(envelope(m, p, from, planted));
      // only the stamp rides on the envelope: the message's words are in the caption under the picture (and the drawer)
      if (j === 0 && (m.stamp || st.flying.length > 1))
        pills.push(
          `<g class="msg-tag" aria-hidden="true" pointer-events="none">${tag([p[0], p[1], BH + 6], 0, -16, m.stamp ?? 'AT ONCE', true, scale)}</g>`,
        );
    });
    s += byDepth(parts);
    const name = (k: Station, text: string) => {
      const p3 = [AT[k][0], AT[k][1], BH + HT[k]],
        dy = -14 - ((44 - HT[k]) / (inkK() * scale)) * 0.6;
      callouts.push(sayAt(o.say, k, p3, dy, scale));
      return `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p3, 0, dy, esc(text), st.busy === k, scale)}</g>`;
    };
    if (o.names === false) return s + pills.join('');
    s +=
      name('emp', o.emp ?? 'EMPLOYEE') +
      name('host', host.toUpperCase() + (cap ? ` · ${st.calls}/${cap} CALLS` : '')) +
      name('model', narrow ? 'MODEL' : `MODEL${tools ? ` · ${tools} TOOL${tools === 1 ? '' : 'S'}` : ' · NO TOOLS'}`) +
      name('orders', `ORDER SYSTEM${tools ? '' : ' · NOT LINKED'}${o.orders ? ` · ${o.orders}` : ''}`);
    return s + pills.join('') + callouts.join('');
  };

/** The picture in words, for its aria-label. */
export function officeLabel(o: OfficeOpts): string {
  const st = officeState(o),
    host = o.host ?? 'Host app';
  const name = (id: string) =>
    (({ emp: 'the employee', host, model: 'the model', orders: 'the order system' }) as Record<string, string>)[id] ??
    id;
  const checks = [
    o.schema && 'a schema check between the model and the host',
    o.owner && 'an ownership check before the order system',
    o.gate && `an approval barrier, ${st.up ? 'raised' : st.waiting ? 'down, waiting for a person' : 'down'}`,
  ].filter(Boolean);
  const head = `Larkspur's back office: the employee's desk, ${host}, the model${o.tools ? ` holding ${o.tools} tool definition${o.tools === 1 ? '' : 's'}` : ' with no tools'}, and the order system${o.tools ? '' : ', with nothing joining it to the host'}, joined by conveyor belts.${checks.length ? ` On the belts: ${checks.join('; ')}.` : ''}`;
  if (!st.last) return `${head} Nothing sent yet.`;
  const now =
    st.flying.length > 1
      ? `${st.flying.length} calls on the belt at once`
      : `from ${name(st.last.from)} to ${name(st.last.to)}: "${st.last.text}"${st.last.stamp ? `, stamped ${st.last.stamp.toLowerCase()}` : ''}`;
  return `${head} Message ${o.upTo ?? o.msgs.length} on the belt, ${now}.${o.cap ? ` Calls made: ${st.calls} of ${o.cap}.` : ''}`;
}
