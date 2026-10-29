// What a model remembers' picture: Larkspur's support desk (U25). The training ledger lies at the back left, its lines
// lit where a planted line repeats (mint where the PINs are scrubbed out). The model is RAG's LLM block, composed, the
// clerk who recites. In front of it an output filter stands as a gate over the reply slip. On the right the ranking
// column (KTD13's mechanic): a board where 201 candidate PINs settle by the model's log-probability, likeliest at the
// top; the true PIN is the tomato ball, and its slot from the top is its rank. With motion the true ball rises into
// place; without, it is drawn where it ends. Words only in pills; on phones (scale > 1.5) fewer pills.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, renderers, sayAt, calloutsLast } from '../../lib/iso/blocks';
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
const LEDGER = [26, 98],
  MODEL = [52, 46],
  GATE = [90, 54],
  SLIP = [112, 58],
  COL = [134, 24],
  COL_W = 18;

/** The ledger: a stack of sheets, lines on its top sheet; `lit` of them tomato (mint where scrubbed). */
function ledger(lit: number, scrub: boolean): Part {
  const [x, y] = LEDGER,
    w = 10,
    d = 8,
    h = 14;
  let s = box(x - w, y - d, BH, x + w, y + d, BH + h, CERAMIC, toneI, 0.8);
  for (let i = 0; i < LEDGER_LINES; i++) {
    const v = y - d + 2 + i * 1.75,
      on_ = i < lit,
      col = on_ ? (scrub ? PALS.mint.m : PALS.tomato.m) : CERAMIC.d;
    s += `<path class="line" data-lit="${on_ ? 1 : 0}" d="${pd(
      [
        [x - w + 2.5, v, BH + h + 0.2],
        [x + w - 2.5 - (i % 3) * 2, v, BH + h + 0.2],
      ],
      false,
    )}" stroke="${col}" stroke-width="${on_ ? 1.6 : 0.8}" stroke-linecap="round"/>`;
  }
  s += hullInk(boxCorners(x - w, y - d, BH, x + w, y + d, BH + h), 1.4);
  return { at: [x, y, 0], svg: `<g class="ledger" data-lit="${lit}" data-scrub="${scrub ? 1 : 0}">${s}</g>` };
}

/** The filter: a gate of two posts and a bar over the reply's path, mustard when on. */
function gate(lit: boolean): Part {
  const [x, y] = GATE,
    m = lit ? PALS.mustard : METAL,
    z1 = BH + 18;
  let s = box(x - 1.5, y - 14, BH, x + 1.5, y - 11, z1, m, toneI, 0.9);
  s += box(x - 1.5, y + 11, BH, x + 1.5, y + 14, z1, m, toneI, 0.9);
  s += box(x - 1.5, y - 14, z1, x + 1.5, y + 14, z1 + 3, m, toneI, 0.9);
  return { at: [x, y, 0], svg: `<g class="filter" data-on="${lit ? 1 : 0}">${s}</g>` };
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
  let s = box(x - 2, y - COL_W, BH, x, y + COL_W, top, WOOD, toneI, 1);
  s += hullInk(boxCorners(x - 2, y - COL_W, BH, x, y + COL_W, top), 1.5);
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
  let s = sh(LEDGER[0] - 10, LEDGER[1] - 8, LEDGER[0] + 10, LEDGER[1] + 8, 14);
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
      [LEDGER[0], LEDGER[1] - 8, BH + 0.3],
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
      svg: `<g class="model">${renderers.llm({ x: mx, y: my, state: o.asking ? 'ok' : st.reply?.leak ? 'bad' : undefined })}</g>`,
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

/** The home hero's plot: a small ledger, a squat model block and a ranking board with the true ball at the top. */
export function recitalPlot(x: number, y: number, top: SceneCtx['top']): string {
  const m = [x - 16, y - 12, BH, x + 2, y + 6, BH + 14];
  const model =
    box(m[0], m[1], m[2], m[3], m[4], m[5], PALS.blush, toneI, 1) +
    hullInk(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), 1.8);
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
  return (
    castShadow(boxCorners(m[0], m[1], m[2], m[3], m[4], m[5]), BH, top) +
    castShadow(boxCorners(bx - 1, y - 8, BH, bx + 1, y + 8, BH + 30), BH, top) +
    byDepth([
      { at: [x - 7, y - 3, 0], svg: model },
      { at: [bx, y, 0], svg: board + balls },
    ])
  );
}
