// What a model remembers' picture: Larkspur's support desk (U25). The training ledger is a bound book open on a
// lectern at the front left, its lines lit where a planted line repeats (mint where the PINs are scrubbed out). The
// model is the model machine, the clerk who recites. In front of it the output filter stands as a sieve in a hoop
// across the reply's path to the slip. On the right the ranking column (KTD13's mechanic): a framed peg board on feet
// where 201 candidate PINs settle by the model's log-probability, likeliest at the
// top; the true PIN is the tomato ball, and its slot from the top is its rank. With motion the true ball rises into
// place; without, it is drawn where it ends. Words only in pills; on phones (scale > 1.5) fewer pills.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
import { hexa, mini, modelIn, shaded, floor } from '../../lib/iso/figures';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  pd,
  on,
  P,
  PZ,
  rrUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  cyl,
  rod,
  line,
  shape,
  vis,
} from '../../lib/iso/core.js';
import type { Say } from '../story/steps';

export const RECITAL_BOARD: Board = [0, 0, 160, 124];
/** The parts a step's callout may point at; all are always drawn. */
export const RECITAL_PARTS = ['ledger', 'model', 'filter', 'reply', 'column'] as const;
/** Lines on the ledger's top sheet. */
export const LEDGER_LINES = 8;

export interface RecitalOpts {
  /** the training ledger: its pill, how many lines are lit (a planted line's copies, capped), PINs scrubbed */
  ledger: { label: string; lit: number; scrub?: boolean };
  /** the model's pill */
  model?: string;
  /** the model is answering */
  asking?: boolean;
  /** the output filter is on */
  filter?: boolean;
  /** what the reply slip says (a short pill), and whether it gives a secret away */
  reply?: { text: string; leak?: boolean } | null;
  /** the column: every candidate's log-probability, the true PIN's first, and its pill; null: the empty board */
  column?: { lps: number[]; label: string } | null;
  /** the true ball rises into place (off with reduced motion) */
  rise?: boolean;
  scale?: number;
  say?: Say;
}

/** Log-probability at the board's foot and top: candidates below LO sit on the floor. */
const LO = -45,
  COL_H = 70;
/** A ball's height on the board for a log-probability. */
export const heightOf = (lp: number) => BH + 4 + COL_H * Math.max(0, Math.min(1, (lp - LO) / -LO));

/** What the desk shows. Pure, so the tests can check it without drawing. Slot 1 is the top; ties go to the true PIN. */
export function recitalState(o: RecitalOpts) {
  const lps = o.column?.lps ?? [];
  const order = lps.map((lp, i) => ({ i, lp })).sort((a, b) => b.lp - a.lp || a.i - b.i);
  const slots = new Array<number>(lps.length);
  order.forEach((b, k) => {
    slots[b.i] = k + 1;
  });
  return {
    lit: Math.max(0, Math.min(LEDGER_LINES, o.ledger.lit)),
    scrub: !!o.ledger.scrub,
    filter: !!o.filter,
    reply: o.reply ?? null,
    balls: lps.map((lp, i) => ({ i, lp, slot: slots[i], z: heightOf(lp), truth: i === 0 })),
    rank: lps.length ? slots[0] : null,
  };
}

type Part = { at: number[]; svg: string };
type Mat = { l: string; m: string; d: string };
const LEDGER = [26, 98],
  MODEL = [52, 46],
  GATE = [90, 54],
  SLIP = [112, 58],
  COL = [134, 24],
  COL_W = 18;

/** The ledger: a bound book lying open on a lectern. Real-object notes: a weighted base, a square post, a sloping
 * reading desk with a ledge along its low edge; on it the book's cobalt cover, two page blocks either side of the
 * spine, a tomato ribbon over the ledge. The text lines run across the pages, four a page, read left page first;
 * `lit` of them tomato (mint where scrubbed). */
function ledger(lit: number, scrub: boolean): Part {
  const [x, y] = LEDGER,
    hi = BH + 15, // the desk's top edge, at -x
    lo = BH + 10.5, // its low edge, at +x, toward the reader
    xa = x - 11,
    xb = x + 9;
  const zAt = (xx: number) => hi + ((lo - hi) * (xx - xa)) / (xb - xa),
    // a slab lying on the slope: x from u0 to u1, y from v0 to v1, lifted dz, t thick
    slab = (u0: number, u1: number, v0: number, v1: number, dz: number, t: number, m: Mat) =>
      hexa(
        [
          [u0, v0, zAt(u0) + dz],
          [u1, v0, zAt(u1) + dz],
          [u1, v1, zAt(u1) + dz],
          [u0, v1, zAt(u0) + dz],
          [u0, v0, zAt(u0) + dz + t],
          [u1, v0, zAt(u1) + dz + t],
          [u1, v1, zAt(u1) + dz + t],
          [u0, v1, zAt(u0) + dz + t],
        ],
        m,
        0.8,
      );
  let s =
    box(x - 6, y - 6, BH, x + 6, y + 6, BH + 1.6, WOOD, toneI, 0.9) +
    box(x - 1.6, y - 1.6, BH + 1.6, x + 1.6, y + 1.6, BH + 11, WOOD, toneI, 0.9) +
    slab(xa, xb, y - 11, y + 11, -2, 2, WOOD) +
    box(xb - 0.4, y - 11, lo - 2.4, xb + 1.2, y + 11, lo + 1.2, WOOD, toneI, 0.8);
  const up = vis([(hi - lo) / (xb - xa), 0, 1]);
  s += slab(xa + 0.5, xb - 0.5, y - 10.6, y + 10.6, 0, 0.6, PALS.cobalt);
  s +=
    slab(xa + 1, xb - 1, y - 10, y - 0.3, 0.6, 1.3, CERAMIC) + slab(xa + 1, xb - 1, y + 0.3, y + 10, 0.6, 1.3, CERAMIC);
  let lines = '';
  if (up)
    for (let i = 0; i < LEDGER_LINES; i++) {
      const right = i >= LEDGER_LINES / 2,
        u = xa + 3.5 + (i % 4) * 3.8,
        z = zAt(u) + 2.05,
        v0 = right ? y + 1.6 : y - 8.6,
        v1 = (right ? y + 8.6 : y - 1.6) - ((i * 5) % 3) * 1.3,
        on_ = i < lit,
        col = on_ ? (scrub ? PALS.mint.m : PALS.tomato.m) : CERAMIC.d;
      lines += `<path class="line" data-lit="${on_ ? 1 : 0}" d="${pd(
        [
          [u, v0, z],
          [u, v1, z],
        ],
        false,
      )}" stroke="${col}" stroke-width="${on_ ? 1.6 : 0.8}" stroke-linecap="round"/>`;
    }
  // the ribbon: from the spine down over the ledge
  const ribbon = shape(
    [
      [xb - 1, y + 0.6, zAt(xb - 1) + 2],
      [xb - 1, y + 2, zAt(xb - 1) + 2],
      [xb + 1.3, y + 2.2, lo - 3],
      [xb + 1.3, y + 0.8, lo - 3.6],
    ],
    PALS.tomato.l,
    0.6,
  );
  return {
    at: [x, y, 0],
    svg: `<g class="ledger" data-lit="${lit}" data-scrub="${scrub ? 1 : 0}">${s}${lines}${ribbon}</g>`,
  };
}

/** The filter: a sieve in a hoop across the reply's path, held between two posts; mustard when on. Real-object
 * notes: round posts with ball finials, a rolled rim, a wire mesh you can see through. */
function gate(lit: boolean): Part {
  const [x, y] = GATE,
    m = lit ? PALS.mustard : METAL,
    R = 9.5,
    zc = BH + 11.5,
    hoop = Array.from({ length: 33 }, (_, i) => {
      const t = (i / 32) * 2 * Math.PI;
      return [x, y + Math.cos(t) * R, zc + Math.sin(t) * R];
    });
  let posts = '';
  for (const sy of [-1, 1]) {
    const py = y + sy * 13;
    posts +=
      cyl(x, py, BH, BH + 19, 1.4, m, toneI, 0.9, 12) +
      cyl(x, py, BH + 19, BH + 20.5, 1.9, m, toneI, 0.9, 12) +
      rod([x, py, zc], [x, y + sy * R, zc], 0.7, METAL, toneI, 0.7);
  }
  let mesh = `<path d="${pd(hoop)}" fill="${m.l}" fill-opacity=".28"/>`;
  for (let k = -8; k <= 8; k += 2) {
    const h = Math.sqrt(R * R - k * k) - 0.3;
    mesh += line(
      [
        [x, y - h, zc + k],
        [x, y + h, zc + k],
      ],
      0.4,
    );
    mesh += line(
      [
        [x, y + k, zc - h],
        [x, y + k, zc + h],
      ],
      0.4,
    );
  }
  const d = pd(hoop, false),
    rim = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.4"/><path d="${d}" fill="none" stroke="${m.m}" stroke-width="1.8"/>`;
  return { at: [x, y, 0], svg: `<g class="filter" data-on="${lit ? 1 : 0}">${posts}${mesh}${rim}</g>` };
}
/** The reply slip on the desk, ringed tomato when it gives a secret away. */
function slip(leak: boolean, shown: boolean): Part {
  const [x, y] = SLIP;
  let s = leak
    ? `<path d="${pd(on(PZ(BH + 0.3), rrUV(x - 13, y - 8, x + 13, y + 8, 3)))}" fill="none" stroke="${PALS.tomato.m}" stroke-width="2.4"/>`
    : '';
  s += box(x - 10, y - 6, BH, x + 10, y + 6, BH + 1.5, shown ? CERAMIC : DARK, toneI, 0.8);
  return { at: [x, y, 0], svg: `<g class="reply" data-leak="${leak ? 1 : 0}">${s}</g>` };
}

/** The ranking board, then its balls: decoys small and pale, the true PIN large and tomato. */
function column(balls: ReturnType<typeof recitalState>['balls'], rise: boolean): Part {
  const [x, y] = COL,
    top = BH + COL_H + 8;
  // a standing frame: two feet, a cream peg-board panel pierced with holes, a wooden frame proud of it
  let s = '';
  for (const sy of [-1, 1])
    s += box(x - 7, y + sy * (COL_W - 3) - 1.5, BH, x + 5, y + sy * (COL_W - 3) + 1.5, BH + 2.5, WOOD, toneI, 0.9);
  s += box(x - 2, y - COL_W, BH + 1, x, y + COL_W, top, CERAMIC, toneI, 1);
  if (vis([1, 0, 0]))
    for (let zz = BH + 6; zz < top - 3; zz += 6)
      for (let yy = y - COL_W + 4; yy < y + COL_W - 2; yy += 4) {
        const [hx, hy] = P(x + 0.05, yy, zz);
        s += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r=".45" fill="${DARK.m}"/>`;
      }
  s +=
    box(x - 2, y - COL_W, BH + 1, x + 1.2, y - COL_W + 2, top, WOOD, toneI, 0.8) +
    box(x - 2, y + COL_W - 2, BH + 1, x + 1.2, y + COL_W, top, WOOD, toneI, 0.8) +
    box(x - 2, y - COL_W, BH + 1, x + 1.2, y + COL_W, BH + 3, WOOD, toneI, 0.8) +
    box(x - 2.4, y - COL_W - 0.6, top - 2, x + 1.6, y + COL_W + 0.6, top, WOOD, toneI, 0.9);
  s += hullInk(boxCorners(x - 2.4, y - COL_W - 0.6, BH + 1, x + 1.6, y + COL_W + 0.6, top), 1.5);
  // a rule at the top: rank 1's end
  s += `<path d="${pd(
    [
      [x + 0.2, y - COL_W, top - 3],
      [x + 0.2, y + COL_W, top - 3],
    ],
    false,
  )}" stroke="${INK}" stroke-width=".6" stroke-dasharray="2 2"/>`;
  let decoys = '',
    truth = '';
  for (const b of balls) {
    // decoys spread across the board by index (a fixed scatter), the true ball centred
    const by = b.truth ? y : y - COL_W + 2 + ((b.i * 37) % 97) * ((2 * COL_W - 4) / 96);
    const [cx, cy] = P(x + 1.5, by, b.z);
    if (b.truth)
      truth = `<g class="truth${rise ? ' mem-rise' : ''}" data-slot="${b.slot}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.4" fill="${PALS.tomato.m}" stroke="${INK}" stroke-width="1.2"/></g>`;
    else
      decoys += `<circle class="ball" data-slot="${b.slot}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.3" fill="${CERAMIC.l}" stroke="${DARK.l}" stroke-width=".4"/>`;
  }
  return {
    at: [x, y, 0],
    svg: `<g class="column" data-balls="${balls.length}">${s}${decoys}${truth}</g>`,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The support desk. Shadows, the reply's path, then the parts back to front, then every pill on top. */
export const recitalScene = (o: RecitalOpts) => (ctx: SceneCtx) => {
  const st = recitalState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [mx, my] = MODEL;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  let s = sh(LEDGER[0] - 10, LEDGER[1] - 11, LEDGER[0] + 10, LEDGER[1] + 11, 14);
  s += sh(mx - 17, my - 17, mx + 17, my + 17, 32);
  s += sh(COL[0] - 2, COL[1] - COL_W, COL[0], COL[1] + COL_W, COL_H + 8);
  // the ledger feeds the model; the model's reply runs through the gate to the slip
  const wire = (pts: number[][], lit: boolean) => {
    const d = pd(pts, false);
    return (
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 5 : 3.6}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 2.8 : 1.6}" stroke-linecap="round"/>`
    );
  };
  s += wire(
    [
      [LEDGER[0], LEDGER[1] - 11, BH + 0.3],
      [LEDGER[0], my + 17, BH + 0.3],
    ],
    st.lit > 0,
  );
  s += wire(
    [
      [mx + 17, SLIP[1], BH + 0.3],
      [SLIP[0] - 10, SLIP[1], BH + 0.3],
    ],
    !!o.asking,
  );
  const parts: Part[] = [
    ledger(st.lit, st.scrub),
    {
      at: [mx, my, 0],
      svg: renderers.llm({ x: mx, y: my, state: o.asking ? 'ok' : st.reply?.leak ? 'bad' : undefined }),
    },
    gate(st.filter),
    slip(!!st.reply?.leak, !!st.reply),
    column(st.balls, !!o.rise),
  ];
  s += byDepth(parts);
  const ledgerAt = [LEDGER[0], LEDGER[1], BH + 14],
    modelAt = [mx, my, BH + 32],
    gateAt = [GATE[0], GATE[1], BH + 21],
    slipAt = [SLIP[0], SLIP[1], BH + 2],
    colAt = [COL[0], COL[1], BH + COL_H + 8];
  const pills = [
    sayAt(o.say, 'ledger', ledgerAt, -14, scale),
    sayAt(o.say, 'model', modelAt, -16, scale),
    sayAt(o.say, 'filter', gateAt, -12, scale),
    sayAt(o.say, 'reply', slipAt, -12, scale),
    sayAt(o.say, 'column', colAt, -12, scale),
    pill(ledgerAt, 0, -14, o.ledger.label, st.lit > 0, scale),
    pill(colAt, 0, -12, o.column?.label ?? 'NO RANKING', !!o.column, scale),
  ];
  if (!narrow) pills.push(pill(modelAt, 0, -16, o.model ?? 'CANARY MODEL', !!o.asking, scale));
  if (st.filter || !narrow) pills.push(pill(gateAt, 0, -12, st.filter ? 'FILTER ON' : 'NO FILTER', st.filter, scale));
  if (st.reply) pills.push(pill(slipAt, 0, -12, st.reply.text, !!st.reply.leak, scale));
  return s + calloutsLast(pills);
};

/** The picture in words, for its aria-label. */
export function recitalLabel(o: RecitalOpts): string {
  const st = recitalState(o);
  return (
    `A support desk: the training ledger (${o.ledger.label.toLowerCase()}) with ${st.lit} of ${LEDGER_LINES} lines lit` +
    `${st.scrub ? ', the PINs scrubbed out' : ''}; the model${o.asking ? ', answering' : ''}; ` +
    `${st.filter ? 'an output filter on' : 'no output filter'}; ` +
    (st.reply
      ? `the reply slip says “${st.reply.text}”${st.reply.leak ? ', a secret given away' : ''}. `
      : 'no reply yet. ') +
    (st.rank
      ? `On the ranking board ${st.balls.length} candidate PINs settle by likelihood; the true PIN sits in slot ${st.rank} from the top.`
      : 'The ranking board is empty.')
  );
}

/** The home hero's plot: the ledger open on its lectern, a squat model machine and the ranking board with the true
 * ball at the top. */
export function recitalPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 16, y - 12, BH, x + 2, y + 6, BH + 14];
  const model = modelIn(m).items[0].svg;
  const bx = x + 14,
    board =
      box(bx - 1, y - 8, BH, bx + 1, y + 8, BH + 30, WOOD, toneI, 1) +
      hullInk(boxCorners(bx - 1, y - 8, BH, bx + 1, y + 8, BH + 30), 1.4);
  let balls = '';
  for (let i = 0; i < 12; i++) {
    const [cx, cy] = P(bx + 1.5, y - 6 + ((i * 5) % 12), BH + 4 + ((i * 7) % 11));
    balls += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1" fill="${CERAMIC.l}" stroke="${DARK.l}" stroke-width=".4"/>`;
  }
  const [tx, ty] = P(bx + 1.5, y, BH + 27);
  balls += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="2.6" fill="${PALS.tomato.m}" stroke="${INK}" stroke-width="1"/>`;
  // the ledger: the bound book open on its lectern, in front, a few lines lit
  const [lx, ly] = LEDGER,
    book = mini(
      shaded([
        {
          box: [
            [lx - 11, ly - 11, BH],
            [lx + 11, ly + 11, BH + 16],
          ],
          svg: ledger(3, false).svg,
        },
      ]),
      [lx, ly, BH],
      [x - 2, y + 16, BH],
      0.5,
    );
  return (
    castShadow(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), BH, top) +
    castShadow(boxCorners(bx - 1, y - 8, BH, bx + 1, y + 8, BH + 30), BH, top) +
    floor(book.shadow, top) +
    byDepth([{ at: [x - 7, y - 3, 0], svg: model }, { at: [bx, y, 0], svg: board + balls }, ...book.items])
  );
}
