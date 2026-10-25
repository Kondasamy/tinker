// The Payments module's picture: the tube exchange (KTD15). Five buildings stand in a ring, joined by pneumatic glass
// tubes: the customer's wallet, Larkspur's till, the acquirer (Larkspur's bank), the card network's tower and the
// issuer (the customer's bank). By day, capsules ride the tubes, coloured by message: a request cobalt, a yes mint, a
// no tomato, a challenge mustard, a capture blush, a chargeback tomato. The run's clock sets the time of day: past the
// cut-off the palette swaps to night, the windows light, a coin convoy carries the night's settlement from the issuer
// to Larkspur, and each fee lands in its party's jar (interchange at the issuer, the scheme fee at the tower, the
// acquirer's fee at the acquirer). There is no reader toggle; the palette is a pure function of the tick. Words only in
// pills; on phones (scale > 1.5) pills keep just the names and the caption carries the money.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  WOOD,
  board,
  box,
  byDepth,
  castShadow,
  cyl,
  hullInk,
  rod,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import {
  FEE_PARTIES,
  PARTY_NAME,
  cardAt,
  eur,
  isNight,
  type Ev,
  type FeeParty,
  type OrderRun,
  type Party,
  type Run,
} from '../../lib/payments/sim';
import type { Say } from '../story/steps';

export const TUBE_BOARD: Board = [16, 16, 204, 204];
type Mat = { l: string; m: string; d: string };

/** The night palette (KTD15): named here, swapped in by the clock alone. */
export const NIGHT = {
  board: { l: '#3a4468', m: '#2c3454', d: '#1d2340' } as Mat,
  wall: { l: '#8d97b8', m: '#6f7899', d: '#4b5374' } as Mat,
  wood: { l: '#8a6a52', m: '#6e533f', d: '#4a3729' } as Mat,
  metal: { l: '#a7afc4', m: '#838ba3', d: '#5c637a' } as Mat,
  glass: { l: '#9fb3d6', m: '#7f94bb', d: '#5d7097' } as Mat,
  window: PALS.mustard,
  /** the stage's backdrop at night, for the frame (payments.css reads the same value) */
  sky: '#1f2744',
};

export type CapKind = 'auth' | 'ok' | 'no' | 'challenge' | 'capture' | 'chargeback' | 'refund';
export const CAP_PAL: Record<CapKind, Mat> = {
  auth: PALS.cobalt,
  ok: PALS.mint,
  no: PALS.tomato,
  challenge: PALS.mustard,
  capture: PALS.blush,
  chargeback: PALS.tomato,
  refund: CERAMIC,
};
/** A capsule on its way between two buildings; n capsules of the same kind ride together (three at most drawn). */
export interface Capsule {
  from: Party;
  to: Party;
  kind: CapKind;
  n?: number;
}
export interface TubeOpts {
  /** past the cut-off: the night palette, the convoy and the jars */
  night: boolean;
  capsules: Capsule[];
  /** what the customer's card shows: held, charged, and how many charges */
  card: { held: number; charged: number; charges: number };
  /** what Larkspur has been paid so far, net */
  kept: number;
  /** each fee party's jar: its fees so far */
  jars: Record<FeeParty, number>;
  /** money settling tonight, riding the convoy */
  convoy: number;
  /** the buildings at work */
  lit: Party[];
  say?: Say;
  scale?: number;
}

/** The parts a step's callout may name: each building and the jars. */
export const TUBE_PARTS = ['wallet', 'till', 'acquirer', 'network', 'issuer', 'jars'] as const;
/** a building per party: the customer's is their wallet, Larkspur's its till */
export const PART_OF: Record<Party, (typeof TUBE_PARTS)[number]> = {
  customer: 'wallet',
  merchant: 'till',
  acquirer: 'acquirer',
  network: 'network',
  issuer: 'issuer',
};
const SITE: Record<Party, [number, number]> = {
  network: [44, 44],
  acquirer: [44, 122],
  issuer: [122, 44],
  merchant: [126, 176],
  customer: [176, 126],
};
const HALF: Record<Party, number> = { network: 8, acquirer: 13, issuer: 13, merchant: 13, customer: 12 };
const TOP: Record<Party, number> = {
  network: BH + 50,
  acquirer: BH + 26,
  issuer: BH + 26,
  merchant: BH + 14,
  customer: BH + 10,
};
const TZ = BH + 17; // tube height
const TUBES: [Party, Party][] = [
  ['customer', 'merchant'],
  ['merchant', 'acquirer'],
  ['acquirer', 'network'],
  ['network', 'issuer'],
  ['issuer', 'customer'],
];
/** where each fee's jar stands: in front of its building */
const JAR: Record<FeeParty, [number, number]> = { issuer: [146, 66], network: [66, 66], acquirer: [66, 146] };

const at = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
const ends = (a: Party, b: Party) => {
  const A = SITE[a],
    B = SITE[b],
    L = Math.hypot(B[0] - A[0], B[1] - A[1]),
    u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L],
    ka = HALF[a] + 2,
    kb = HALF[b] + 2;
  return [
    [A[0] + u[0] * ka, A[1] + u[1] * ka, TZ],
    [B[0] - u[0] * kb, B[1] - u[1] * kb, TZ],
  ];
};

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function tubeState(o: TubeOpts) {
  const max = Math.max(1, ...FEE_PARTIES.map(f => o.jars[f]));
  return {
    palette: o.night ? 'night' : 'day',
    // jar fill heights: proportional to the fee, so they keep the fees' order
    jars: Object.fromEntries(FEE_PARTIES.map(f => [f, o.jars[f] ? 1 + (13 * o.jars[f]) / max : 0])) as Record<
      FeeParty,
      number
    >,
    capsules: o.night ? [] : o.capsules.map(c => ({ ...c, drawn: Math.min(3, c.n ?? 1) })),
    convoy: o.night && o.convoy > 0,
    receipts: Math.min(3, o.card.charges),
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** a row of windows on the building's front (+x) face: glass by day, lit at night */
function windows(x: number, y: number, h: number, z0: number, z1: number, n: number, night: boolean) {
  let s = '';
  const m = night ? NIGHT.window : CLEAR;
  for (let i = 0; i < n; i++) {
    const y0 = y - h + 3 + (i * (2 * h - 6)) / n;
    s += box(x + h, y0, z0, x + h + 0.4, y0 + (2 * h - 6) / n - 1.6, z1, m, toneI, 0.6);
  }
  return s;
}

function building(p: Party, o: TubeOpts) {
  const [x, y] = SITE[p],
    h = HALF[p],
    zt = TOP[p],
    n = o.night;
  const wall = n ? NIGHT.wall : CERAMIC,
    wood = n ? NIGHT.wood : WOOD,
    metal = n ? NIGHT.metal : METAL;
  let s = '';
  if (p === 'network') {
    // the card network: a tall steel tower with a beacon and an aerial
    s += box(x - h, y - h, BH, x + h, y + h, zt, metal, toneI, 1);
    for (const z of [BH + 14, BH + 28, BH + 42])
      s += box(x - h - 0.4, y - h - 0.4, z, x + h + 0.4, y + h + 0.4, z + 1.6, PALS.mustard, toneI, 0.7);
    s += cyl(x, y, zt, zt + 4, 4, o.lit.includes(p) || n ? PALS.mustard : DARK, toneI, 0.9, 14);
    s += rod([x, y, zt + 4], [x, y, zt + 14], 0.6, metal);
    s += windows(x, y, h, BH + 30, BH + 38, 2, n);
  } else if (p === 'acquirer' || p === 'issuer') {
    // a bank: a stone hall, a coloured roof, windows along the front
    const roof = p === 'acquirer' ? PALS.cobalt : PALS.mint;
    s += box(x - h, y - h, BH, x + h, y + h, zt, wall, toneI, 1);
    s += box(x - h - 1.5, y - h - 1.5, zt, x + h + 1.5, y + h + 1.5, zt + 4, roof, toneI, 1);
    s += windows(x, y, h, BH + 10, BH + 20, 3, n);
    s += box(x + h, y - 3, BH, x + h + 3, y + 3, BH + 2, wall, toneI, 0.7);
  } else if (p === 'merchant') {
    // Larkspur's shop counter with the till on it
    s += box(x - h, y - h, BH, x + h, y + h, zt, wood, toneI, 1);
    s += box(x - 6, y - 7, zt, x + 6, y + 3, zt + 7, DARK, toneI, 0.9);
    s += box(x + 6, y - 6, zt + 2, x + 6.4, y + 2, zt + 6, n ? NIGHT.window : PALS.mustard, toneI, 0.6);
    s += box(x - 2, y + 5, zt, x + 6, y + 11, zt + 2, PALS.cobalt, toneI, 0.7);
  } else {
    // the customer's wallet, a card standing out of it (a masked fixture: no number drawn)
    s += box(x - h, y - h + 3, BH, x + h, y + h - 3, zt, PALS.blush, toneI, 1);
    s += box(
      x - h,
      y - h + 3,
      zt - 3,
      x + h,
      y + h - 3,
      zt,
      n ? NIGHT.wall : { l: '#f7c2d0', m: '#d8869c', d: '#4b2430' },
      toneI,
      0.8,
    );
    s += box(x - 5, y - 8, zt, x - 4, y + 6, zt + 9, CERAMIC, toneI, 0.8);
    s += box(x - 4, y - 8, zt + 6, x - 3.8, y + 6, zt + 7.4, PALS.cobalt, toneI, 0.4);
    // receipts: one per charge on the card, three at most
    for (let i = 0; i < Math.min(3, o.card.charges); i++) {
      const oy = y - 9 + i * 7;
      s += `<g class="receipt">${box(x + 3, oy, zt, x + 4.2, oy + 5.5, zt + 10, CERAMIC, toneI, 0.8)}${box(x + 4.2, oy + 1, zt + 6, x + 4.4, oy + 4.5, zt + 7.5, PALS.blush, toneI, 0.4)}</g>`;
    }
  }
  s += hullInk(boxCorners(x - h, y - h, BH, x + h, y + h, zt + (p === 'network' ? 4 : 2)), 2);
  return {
    at: [x, y, 0],
    svg: `<g data-prop="${PART_OF[p]}"${p === 'customer' ? ` data-charges="${o.card.charges}"` : ''}${o.lit.includes(p) ? ' data-lit="1"' : ''}>${s}</g>`,
  };
}

function tube(a: Party, b: Party, o: TubeOpts) {
  const [A, B] = ends(a, b),
    n = o.night,
    glass = n ? NIGHT.glass : CLEAR;
  let s = '';
  // two posts hold the tube up
  for (const k of [0.25, 0.75]) {
    const p = at(A, B, k);
    s += box(p[0] - 0.8, p[1] - 0.8, BH, p[0] + 0.8, p[1] + 0.8, TZ - 2, n ? NIGHT.metal : METAL, toneI, 0.7);
  }
  s += rod(A, B, 3, glass, toneI, 1);
  // capsules inside, spread along the way they are going
  for (const c of tubeState(o).capsules.filter(c => (c.from === a && c.to === b) || (c.from === b && c.to === a))) {
    const [P0, P1] = c.from === a ? [A, B] : [B, A];
    for (let i = 0; i < c.drawn; i++) {
      const k = 0.6 - i * 0.22,
        p = at(P0, P1, k),
        q = at(P0, P1, k + 0.14);
      s += `<g class="capsule" data-kind="${c.kind}" data-from="${PART_OF[c.from]}" data-to="${PART_OF[c.to]}">${rod(p, q, 2.5, CAP_PAL[c.kind], toneI, 0.9)}</g>`;
    }
  }
  const mid = at(A, B, 0.5);
  return { at: [mid[0], mid[1], 0], svg: `<g data-tube="${PART_OF[a]}-${PART_OF[b]}">${s}</g>` };
}

/** a fee jar: glass, filled with coins as high as its share */
function jar(f: FeeParty, fill: number) {
  const [x, y] = JAR[f];
  let s = cyl(x, y, BH, BH + 1, 4.6, NIGHT.glass, toneI, 0.8, 18);
  if (fill > 0) s += cyl(x, y, BH + 1, BH + 1 + fill, 3.8, PALS.mustard, toneI, 0.8, 18);
  s += cyl(x, y, BH + 1 + fill, BH + 16, 4.6, { l: '#dfe7f5', m: '#b7c4dd', d: '#8496b8' }, toneI, 0.9, 18).replace(
    /fill="#(?:dfe7f5|b7c4dd|8496b8)"/g,
    m => `${m} fill-opacity=".45"`,
  );
  return { at: [x, y, 0], svg: `<g class="jar" data-jar="${f}" data-fill="${fill.toFixed(2)}">${s}</g>` };
}

/** the night's coin convoy: stacks of coins on the ground, issuer → network → acquirer → Larkspur */
function convoy() {
  const path: Party[] = ['issuer', 'network', 'acquirer', 'merchant'];
  const parts = [];
  for (let i = 0; i < path.length - 1; i++) {
    const A = [...SITE[path[i]], 0],
      B = [...SITE[path[i + 1]], 0];
    for (const k of [0.38, 0.62]) {
      const p = at(A, B, k);
      parts.push({
        at: [p[0], p[1], 0],
        svg: `<g class="coins">${cyl(p[0], p[1], BH, BH + 2, 3, PALS.mustard, toneI, 0.8, 14)}${cyl(p[0], p[1], BH + 2, BH + 4, 3, PALS.mustard, toneI, 0.8, 14)}</g>`,
      });
    }
  }
  return parts;
}

/** The scene: the board (dark at night), shadows, then buildings, tubes, jars and coins back to front, then pills. */
export const tubeScene = (o: TubeOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    st = tubeState(o);
  let s = o.night ? board(...TUBE_BOARD, BH, 8, NIGHT.board) : '';
  s = `<g data-palette="${st.palette}">${s}`;
  for (const p of Object.keys(SITE) as Party[]) {
    const [x, y] = SITE[p];
    s += castShadow(boxCorners(x - HALF[p], y - HALF[p], BH, x + HALF[p], y + HALF[p], TOP[p]), BH, ctx.top);
  }
  s += byDepth([
    ...(Object.keys(SITE) as Party[]).map(p => building(p, o)),
    ...TUBES.map(([a, b]) => tube(a, b, o)),
    ...(o.night ? FEE_PARTIES.map(f => jar(f, st.jars[f])) : []),
    ...(st.convoy ? convoy() : []),
  ]);
  s += '</g>';
  // name pills: the back three above their roofs, the front two below their bases
  let pills = '';
  const wide: Record<Party, string> = {
    customer: o.card.held || o.card.charged ? `HELD ${eur(o.card.held)} · CHARGED ${eur(o.card.charged)}` : '',
    merchant: `KEPT ${eur(o.kept)}`,
    acquirer: '',
    network: '',
    issuer: '',
  };
  const NAME: Record<Party, string> = {
    customer: 'CUSTOMER',
    merchant: 'LARKSPUR',
    acquirer: 'ACQUIRER',
    network: 'NETWORK',
    issuer: 'ISSUER',
  };
  const pillAt = (p: Party): [number[], number] => {
    const [x, y] = SITE[p];
    // Larkspur's below its counter; every other name above its roof, so the two front pills never meet
    return p === 'merchant' ? [[x + HALF[p], y + HALF[p], BH], 22] : [[x, y, TOP[p] + (p === 'customer' ? 9 : 4)], -16];
  };
  for (const p of Object.keys(SITE) as Party[]) {
    const [p3, dy] = pillAt(p);
    pills += pill(p3, 0, dy, !narrow && wide[p] ? `${NAME[p]} · ${wide[p]}` : NAME[p], o.lit.includes(p), scale);
  }
  if (o.night && !narrow)
    for (const f of FEE_PARTIES) pills += pill([...JAR[f], BH + 16], 0, -12, eur(o.jars[f]), false, scale);
  for (const p of Object.keys(SITE) as Party[]) {
    const [p3, dy] = pillAt(p);
    pills += sayAt(o.say, PART_OF[p], p3, dy < 0 ? dy : -16, scale);
  }
  pills += sayAt(o.say, 'jars', [...JAR.network, BH + 16], -12, scale);
  return s + pills;
};

const PLAIN: Record<CapKind, string> = {
  auth: 'a request',
  ok: 'a yes',
  no: 'a no',
  challenge: 'a challenge',
  capture: 'a capture',
  chargeback: 'a chargeback',
  refund: 'a refund',
};
/** The picture in words, for its aria-label. */
export function tubeLabel(o: TubeOpts): string {
  const caps = o.night
    ? ''
    : o.capsules
        .map(
          c =>
            `${PLAIN[c.kind]}${(c.n ?? 1) > 1 ? ` (${c.n})` : ''} from the ${PARTY_NAME[c.from].toLowerCase()} to the ${PARTY_NAME[c.to].toLowerCase()}`,
        )
        .join('; ');
  return (
    `The tube exchange ${o.night ? 'at night' : 'by day'}: the customer’s wallet, Larkspur’s till, the acquirer, the card network and the issuer, joined by tubes. ` +
    (caps ? `In the tubes: ${caps}. ` : '') +
    `The card shows ${eur(o.card.held)} held and ${eur(o.card.charged)} charged. Larkspur has kept ${eur(o.kept)}.` +
    (o.night
      ? ` Fees so far: issuer ${eur(o.jars.issuer)}, network ${eur(o.jars.network)}, acquirer ${eur(o.jars.acquirer)}.${o.convoy ? ` ${eur(o.convoy)} settles tonight.` : ''}`
      : '')
  );
}
/** The money the caption carries (phones show only names in the pills). */
export function tubeReadouts(o: TubeOpts): string[] {
  return [
    `held ${eur(o.card.held)}`,
    `charged ${eur(o.card.charged)}`,
    `Larkspur kept ${eur(o.kept)}`,
    ...(o.night ? [`fees ${FEE_PARTIES.map(f => eur(o.jars[f])).join(' / ')}`] : []),
  ];
}

// ---- readers ----

/** Where each kind of event rides: the tube it is on and its way. */
const RIDE: Partial<Record<Ev['what'], Capsule>> = {
  auth: { from: 'network', to: 'issuer', kind: 'auth' },
  reauth: { from: 'network', to: 'issuer', kind: 'auth' },
  approved: { from: 'acquirer', to: 'merchant', kind: 'ok' },
  declined: { from: 'network', to: 'acquirer', kind: 'no' },
  abandoned: { from: 'customer', to: 'merchant', kind: 'no' },
  challenge: { from: 'issuer', to: 'customer', kind: 'challenge' },
  capture: { from: 'merchant', to: 'acquirer', kind: 'capture' },
  refund: { from: 'merchant', to: 'acquirer', kind: 'refund' },
  chargeback: { from: 'acquirer', to: 'merchant', kind: 'chargeback' },
  'issuer-pays': { from: 'issuer', to: 'customer', kind: 'refund' },
};
const ACTOR: Partial<Record<Ev['what'], Party[]>> = {
  auth: ['issuer'],
  reauth: ['issuer'],
  approved: ['issuer'],
  declined: ['issuer'],
  challenge: ['customer', 'issuer'],
  abandoned: ['customer'],
  capture: ['merchant'],
  refund: ['merchant'],
  chargeback: ['issuer'],
  'issuer-pays': ['issuer'],
};

/** The exchange at tick t of a run, for every order or just `ids`. */
export function tubeAt(r: Run, t: number, ids?: string[]): Omit<TubeOpts, 'say' | 'scale'> {
  const mine = (e: Ev) => !ids || ids.includes(e.order);
  const ev = r.events.filter(mine);
  const now = ev.filter(e => e.t === t);
  const capsules: Capsule[] = [];
  for (const e of now) {
    const c = RIDE[e.what];
    if (!c) continue;
    const same = capsules.find(x => x.from === c.from && x.to === c.to && x.kind === c.kind);
    if (same) same.n = (same.n ?? 1) + 1;
    else capsules.push({ ...c, n: 1 });
  }
  const upTo = ev.filter(e => e.t <= t);
  const jars = Object.fromEntries(
    FEE_PARTIES.map(f => [f, upTo.filter(e => e.what === 'settle').reduce((a, e) => a + (e.entries?.[f] ?? 0), 0)]),
  ) as Record<FeeParty, number>;
  const card = cardAt(r, t, ids);
  return {
    night: isNight(t),
    capsules,
    card: { held: card.held, charged: card.charged, charges: upTo.filter(e => e.what === 'capture').length },
    kept: upTo.reduce((a, e) => a + (e.entries?.merchant ?? 0), 0),
    jars,
    convoy: now.filter(e => e.what === 'settle').reduce((a, e) => a + e.cents, 0),
    lit: [
      ...new Set(
        now.flatMap(e => (isNight(t) ? (e.what === 'settle' ? (['merchant'] as Party[]) : []) : (ACTOR[e.what] ?? []))),
      ),
    ],
  };
}

/** One authorisation, hop by hop: the card's details to the till, the request out to the issuer, the answer back. */
export interface Hop {
  from: Party;
  to: Party;
  kind: CapKind;
}
export function journeyOf(o: OrderRun): Hop[] {
  const out: Hop[] = [
    { from: 'customer', to: 'merchant', kind: 'auth' },
    { from: 'merchant', to: 'acquirer', kind: 'auth' },
    { from: 'acquirer', to: 'network', kind: 'auth' },
    { from: 'network', to: 'issuer', kind: 'auth' },
  ];
  const first = o.events.find(e => e.t === 0 && ['challenge', 'approved', 'declined', 'abandoned'].includes(e.what));
  if (first?.what === 'challenge') out.push({ from: 'issuer', to: 'customer', kind: 'challenge' });
  const yes = o.final !== 'declined' && o.final !== 'abandoned';
  if (o.final === 'abandoned') return out;
  if (first?.what === 'challenge') out.push({ from: 'customer', to: 'issuer', kind: yes ? 'ok' : 'no' });
  const k: CapKind = yes ? 'ok' : 'no';
  out.push(
    { from: 'issuer', to: 'network', kind: k },
    { from: 'network', to: 'acquirer', kind: k },
    { from: 'acquirer', to: 'merchant', kind: k },
  );
  return out;
}
/** The exchange with one hop of a journey in its tube, by day; `card` and `kept` as the order stands then. */
export function hopAt(o: OrderRun, i: number): Omit<TubeOpts, 'say' | 'scale'> {
  const hops = journeyOf(o),
    h = hops[Math.max(0, Math.min(i, hops.length - 1))],
    last = i >= hops.length - 1 && h.kind === 'ok';
  return {
    night: false,
    capsules: [{ from: h.from, to: h.to, kind: h.kind }],
    card: { held: last ? o.order.cents : 0, charged: 0, charges: 0 },
    kept: 0,
    jars: { issuer: 0, network: 0, acquirer: 0 },
    convoy: 0,
    lit: [h.to],
  };
}
/** Before any order: every tube empty, by day. */
export const idleTubes = (): Omit<TubeOpts, 'say' | 'scale'> => ({
  night: false,
  capsules: [],
  card: { held: 0, charged: 0, charges: 0 },
  kept: 0,
  jars: { issuer: 0, network: 0, acquirer: 0 },
  convoy: 0,
  lit: [],
});

/** The home hero's plot: a small till and a bank tower joined by one glass tube, a mint capsule in it, and a fee jar
 * of coins. */
export function tubePlot(x: number, y: number, top: SceneCtx['top']): string {
  const till = [x + 10, y + 8],
    bank = [x - 12, y - 10];
  const parts = [
    {
      at: [...till, 0],
      svg:
        box(till[0] - 6, till[1] - 6, BH, till[0] + 6, till[1] + 6, BH + 7, WOOD, toneI, 1) +
        box(till[0] - 3, till[1] - 3, BH + 7, till[0] + 3, till[1] + 2, BH + 11, DARK, toneI, 0.8) +
        hullInk(boxCorners(till[0] - 6, till[1] - 6, BH, till[0] + 6, till[1] + 6, BH + 11), 1.6),
    },
    {
      at: [...bank, 0],
      svg:
        box(bank[0] - 5, bank[1] - 5, BH, bank[0] + 5, bank[1] + 5, BH + 16, CERAMIC, toneI, 1) +
        box(bank[0] - 6, bank[1] - 6, BH + 16, bank[0] + 6, bank[1] + 6, BH + 18.5, PALS.cobalt, toneI, 0.9) +
        hullInk(boxCorners(bank[0] - 6, bank[1] - 6, BH, bank[0] + 6, bank[1] + 6, BH + 18.5), 1.6),
    },
    {
      at: [x + 12, y - 10, 0],
      svg:
        cyl(x + 12, y - 10, BH, BH + 5, 2.8, PALS.mustard, toneI, 0.8, 14) +
        cyl(x + 12, y - 10, BH + 5, BH + 9, 3.2, CLEAR, toneI, 0.8, 14),
    },
  ];
  const A = [till[0] - 6, till[1] - 3, BH + 9],
    B = [bank[0] + 5, bank[1] + 3, BH + 9];
  return (
    castShadow(boxCorners(till[0] - 6, till[1] - 6, BH, till[0] + 6, till[1] + 6, BH + 10), BH, top) +
    castShadow(boxCorners(bank[0] - 6, bank[1] - 6, BH, bank[0] + 6, bank[1] + 6, BH + 18), BH, top) +
    byDepth(parts) +
    rod(A, B, 1.8, CLEAR, toneI, 0.8) +
    rod(at(A, B, 0.45), at(A, B, 0.6), 1.3, PALS.mint, toneI, 0.6)
  );
}
