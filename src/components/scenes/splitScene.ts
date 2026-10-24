// The A/B testing module's picture: the shop floor (KTD15). Shoppers queue at the front; a turnstile sends each one at
// random down one of two belts, to checkout A (today's) on the left or checkout B (the change) on the right. Beside each
// checkout a tower of mint crates grows with its share of shoppers who buy, and, when the guardrail is watched, a tower
// of tomato crates with its share of orders sent back. At the back a scoreboard holds two bars, A cobalt and B mint, as
// tall as their rates, under the verdict pill. Words only in pills; on phones (scale > 1.5) pills keep just the names
// and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, sayAt, calloutsLast } from '../../lib/iso/blocks';
import {
  PALS,
  METAL,
  CERAMIC,
  DARK,
  INK,
  WOOD,
  box,
  cyl,
  rod,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  pd,
} from '../../lib/iso/core.js';
import { ASSUMPTIONS, resultAt, type Plan, type Run } from '../../lib/ab-testing/sim';
import type { Say } from '../story/steps';

export const SPLIT_BOARD: Board = [24, 24, 140, 140];

export interface ArmView {
  /** the checkout's name in its pill ("A", or a colour) */
  name: string;
  visitors: number;
  orders: number;
  returns: number;
}
export interface SplitOpts {
  arms: [ArmView, ArmView];
  /** days run so far, and planned */
  day: number;
  days: number;
  /** the scoreboard's verdict pill */
  verdict: string;
  /** the verdict is a finding (lit), or a warning (tomato) */
  tone: 'none' | 'win' | 'warn';
  /** shoppers ride the belts (a test is running) */
  running: boolean;
  /** the returns towers show (the guardrail is watched) */
  guardrail?: boolean;
  /** the step's callout, over one of SPLIT_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name. */
export const SPLIT_PARTS = ['turnstile', 'a', 'b', 'scoreboard'] as const;

const TURN = [100, 100],
  A = [42, 100],
  B = [100, 42],
  SCORE = [42, 42],
  COUNTER_Z = BH + 12,
  CRATE = 3.6;
/** Where each checkout's towers stand: beside the counter, on the side toward the middle. */
const TOWER = {
  a: [
    [A[0] + 1, A[1] - 21],
    [A[0] + 9, A[1] - 21],
  ],
  b: [
    [B[0] - 21, B[1] + 1],
    [B[0] - 21, B[1] + 9],
  ],
};
const BAR_K = 200; // bar height per unit rate: 10% stands 20 tall

const rate = (n: number, of: number) => (of > 0 ? n / of : 0);
/** Crates in a tower: one per 2 points of conversion, one per 2.5 points of returns, eight at most. */
export const ordersCrates = (v: ArmView) => (v.visitors ? Math.min(8, Math.round(rate(v.orders, v.visitors) * 50)) : 0);
export const returnCrates = (v: ArmView) => (v.orders ? Math.min(8, Math.round(rate(v.returns, v.orders) * 40)) : 0);
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

const idle = (name: string): ArmView => ({ name, visitors: 0, orders: 0, returns: 0 });
/** An idle floor: nobody through the turnstile yet. */
export const IDLE: Omit<SplitOpts, 'say' | 'scale'> = {
  arms: [idle('A'), idle('B')],
  day: 0,
  days: 14,
  verdict: 'READY',
  tone: 'none',
  running: false,
};

/** The floor after day index t of a run (t < 0: nothing yet), comparing arm `arm` against A. The verdict reads the
 * test at that day: a significant difference names the winner. */
export function splitAt(
  r: Run,
  p: Plan,
  t: number,
  { arm = 1, name = 'B', guardrail = false, level = ASSUMPTIONS.level } = {},
): Omit<SplitOpts, 'say' | 'scale'> {
  if (t < 0) return { ...IDLE, arms: [idle('A'), idle(name)], days: p.days, guardrail };
  const d = r[Math.min(t, r.length - 1)],
    res = resultAt(r, t, level, arm);
  const view = (i: number, n: string): ArmView => ({
    name: n,
    visitors: d.visitors[i],
    orders: d.orders[i],
    returns: d.returns[i],
  });
  return {
    arms: [view(0, 'A'), view(arm, name)],
    day: Math.min(t, r.length - 1) + 1,
    days: p.days,
    verdict: res.significant ? `${res.diff > 0 ? name : 'A'} WINS` : 'NO WINNER',
    tone: res.significant ? 'win' : 'none',
    running: t < p.days - 1,
    guardrail,
  };
}

/** What the floor shows. Pure, so the tests can check it without drawing. */
export function splitState(o: SplitOpts) {
  return {
    crates: o.arms.map(ordersCrates),
    returns: o.guardrail ? o.arms.map(returnCrates) : [0, 0],
    bars: o.arms.map(v => Math.max(1.5, rate(v.orders, v.visitors) * BAR_K)),
    riders: o.running ? 2 : 0,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** A floor path of ink with a coloured stripe, as the apprentice's bench draws its belts. */
function belt(points: number[][], lit: boolean, side: string) {
  const d = pd(
    points.map(([x, y]) => [x, y, BH + 0.3]),
    false,
  );
  return (
    `<g class="belt" data-belt="${side}" data-on="${lit ? 1 : 0}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 6 : 5}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 3.4 : 2.6}" stroke-linecap="round" stroke-linejoin="round"/></g>`
  );
}

/** A shopper: a small round token. */
const shopper = (x: number, y: number, cls = 'shopper') => ({
  at: [x, y, 1],
  svg: `<g class="${cls}">${cyl(x, y, BH, BH + 5, 2.6, PALS.blush, toneI, 0.9)}</g>`,
});

function turnstile() {
  const [x, y] = TURN;
  let s = box(x - 5, y - 5, BH, x + 5, y + 5, BH + 2, DARK, toneI, 0.9);
  s += cyl(x, y, BH + 2, BH + 14, 1.8, METAL, toneI, 0.9);
  for (const [dx, dy] of [
    [7, 0],
    [-3.5, 6],
    [-3.5, -6],
  ])
    s += rod([x, y, BH + 11], [x + dx, y + dy, BH + 11], 0.8, METAL);
  return { at: [x, y, 0], svg: `<g data-prop="turnstile">${s}</g>` };
}

/** A checkout counter with its till, long side facing its belt. */
function counter(side: 'a' | 'b', v: ArmView, crates: number, back: number) {
  const [x, y] = side === 'a' ? A : B,
    [hx, hy] = side === 'a' ? [8, 13] : [13, 8];
  let s = box(x - hx, y - hy, BH, x + hx, y + hy, COUNTER_Z, CERAMIC, toneI, 1);
  s += box(x - hx, y - hy, COUNTER_Z, x + hx, y + hy, COUNTER_Z + 1.5, WOOD, toneI, 0.8);
  s += box(x - 3, y - 3, COUNTER_Z + 1.5, x + 3, y + 3, COUNTER_Z + 6, DARK, toneI, 0.8);
  s += hullInk(boxCorners(x - hx, y - hy, BH, x + hx, y + hy, COUNTER_Z + 6), 2);
  const tower = (at: number[], n: number, m: { l: string; m: string; d: string }, cls: string) => {
    let t = '';
    for (let i = 0; i < n; i++)
      t += box(at[0] - CRATE, at[1] - CRATE, BH + i * 4, at[0] + CRATE, at[1] + CRATE, BH + i * 4 + 3.6, m, toneI, 0.8);
    return { at: [at[0], at[1], 0], svg: `<g class="${cls}" data-arm="${side}" data-n="${n}">${t}</g>` };
  };
  const [ot, rt] = TOWER[side];
  return [
    { at: [x, y, 0], svg: `<g data-prop="${side}" data-visitors="${v.visitors}" data-orders="${v.orders}">${s}</g>` },
    tower(ot, crates, PALS.mint, 'orders'),
    tower(rt, back, PALS.tomato, 'returns'),
  ];
}

function scoreboard(bars: number[], tone: SplitOpts['tone']) {
  const [x, y] = SCORE,
    h = 8;
  let s = box(x - h, y - h, BH, x + h, y + h, BH + 5, DARK, toneI, 1);
  s += hullInk(boxCorners(x - h, y - h, BH, x + h, y + h, BH + 5), 1.8);
  // A's bar to the left on screen (+y), B's to the right (+x)
  s += box(x - 4, y + 1, BH + 5, x - 1, y + 4, BH + 5 + bars[0], PALS.cobalt, toneI, 0.9);
  s += box(x + 1, y - 4, BH + 5, x + 4, y - 1, BH + 5 + bars[1], PALS.mint, toneI, 0.9);
  return {
    at: [x, y, 0],
    svg: `<g data-prop="scoreboard" data-tone="${tone}" data-bars="${bars.map(b => b.toFixed(1)).join(',')}">${s}</g>`,
  };
}

/** The floor: shadows and belts (floor), the parts back to front, then the pills. */
export const splitScene = (o: SplitOpts) => (ctx: SceneCtx) => {
  const st = splitState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    [tx, ty] = TURN;
  let s =
    castShadow(boxCorners(A[0] - 8, A[1] - 13, BH, A[0] + 8, A[1] + 13, COUNTER_Z + 6), BH, ctx.top) +
    castShadow(boxCorners(B[0] - 13, B[1] - 8, BH, B[0] + 13, B[1] + 8, COUNTER_Z + 6), BH, ctx.top) +
    castShadow(boxCorners(SCORE[0] - 8, SCORE[1] - 8, BH, SCORE[0] + 8, SCORE[1] + 8, BH + 20), BH, ctx.top);
  s += belt(
    [
      [tx - 6, ty],
      [A[0] + 9, A[1]],
    ],
    o.running,
    'a',
  );
  s += belt(
    [
      [tx, ty - 6],
      [B[0], B[1] + 9],
    ],
    o.running,
    'b',
  );
  const parts = [
    turnstile(),
    ...counter('a', o.arms[0], st.crates[0], st.returns[0]),
    ...counter('b', o.arms[1], st.crates[1], st.returns[1]),
    scoreboard(st.bars, o.tone),
    // the queue at the front, and shoppers riding the belts while the test runs
    ...[10, 18, 26].map(d => shopper(tx + d, ty + d)),
  ];
  for (let i = 0; i < st.riders; i++) {
    parts.push(shopper(tx - 18 - i * 16, ty, 'shopper rider'));
    parts.push(shopper(tx, ty - 18 - i * 16, 'shopper rider'));
  }
  s += byDepth(parts);
  const warn = '#f6c2b4';
  const armPill = (i: number) => {
    const v = o.arms[i],
      side = i === 0 ? 'a' : 'b',
      [x, y] = side === 'a' ? A : B,
      name = v.name.toUpperCase();
    const back = o.guardrail && v.orders ? ` · ${pct1(rate(v.returns, v.orders))} BACK` : '';
    return pill(
      [x, y, COUNTER_Z + 6],
      0,
      -16,
      narrow || !v.visitors ? name : `${name} · ${pct1(rate(v.orders, v.visitors))}${back}`,
      false,
      scale,
    );
  };
  const pills = [
    sayAt(o.say, 'turnstile', [tx, ty, BH + 14], 18, scale),
    sayAt(o.say, 'a', [A[0], A[1], COUNTER_Z + 6], -16, scale),
    sayAt(o.say, 'b', [B[0], B[1], COUNTER_Z + 6], -16, scale),
    sayAt(o.say, 'scoreboard', [SCORE[0], SCORE[1], BH + 30], -14, scale),
    pill(
      [tx, ty, BH + 14],
      0,
      18,
      narrow || !o.day ? 'SPLIT' : `DAY ${o.day} OF ${o.days}`,
      o.running && o.day > 0,
      scale,
    ),
    armPill(0),
    armPill(1),
    pill(
      [SCORE[0], SCORE[1], BH + 30],
      0,
      -14,
      o.verdict,
      o.tone === 'win',
      scale,
      o.tone === 'warn' ? warn : undefined,
    ),
  ];
  return s + calloutsLast(pills);
};

/** The floor in words, for its aria-label. */
export function splitLabel(o: SplitOpts): string {
  const arm = (v: ArmView) =>
    v.visitors
      ? `${v.name}: ${v.orders.toLocaleString('en-US')} of ${v.visitors.toLocaleString('en-US')} shoppers bought (${pct1(rate(v.orders, v.visitors))})` +
        (o.guardrail ? `, ${pct1(rate(v.returns, v.orders))} of orders returned` : '')
      : `${v.name}: no shoppers yet`;
  return (
    `The shop floor: a turnstile splits shoppers at random between checkout ${o.arms[0].name} and checkout ${o.arms[1].name}. ` +
    (o.day ? `Day ${o.day} of ${o.days}. ` : 'Nobody through yet. ') +
    `${o.arms.map(arm).join('. ')}. Scoreboard: ${o.verdict.charAt(0)}${o.verdict.slice(1).toLowerCase()}.`
  );
}

/** The numbers the caption carries (phones show only the names in the pills). */
export function splitReadouts(o: SplitOpts): string[] {
  if (!o.day) return [];
  return [
    `day ${o.day} of ${o.days}`,
    ...o.arms.map(v => `${v.name} ${pct1(rate(v.orders, v.visitors))}`),
    ...(o.guardrail ? o.arms.map(v => `${v.name} returns ${pct1(rate(v.returns, v.orders))}`) : []),
  ];
}

/** The home hero's plot: a small turnstile with two counters behind it, each with a crate tower, B's one taller. */
export function splitPlot(x: number, y: number, top: SceneCtx['top']): string {
  const a = [x - 12, y + 2],
    b = [x + 2, y - 12],
    t = [x + 8, y + 8],
    k = (c: number[], m: { l: string; m: string; d: string }, z1: number) =>
      box(c[0] - 4, c[1] - 4, BH, c[0] + 4, c[1] + 4, z1, m, toneI, 1) +
      hullInk(boxCorners(c[0] - 4, c[1] - 4, BH, c[0] + 4, c[1] + 4, z1), 1.4);
  const crates = (c: number[], n: number) => {
    let s = '';
    for (let i = 0; i < n; i++)
      s += box(c[0] - 2, c[1] - 2, BH + i * 3, c[0] + 2, c[1] + 2, BH + i * 3 + 2.6, PALS.mint, toneI, 0.7);
    return s;
  };
  const stile =
    cyl(t[0], t[1], BH, BH + 9, 1.4, METAL, toneI, 0.8) +
    rod([t[0], t[1], BH + 7], [t[0] + 5, t[1], BH + 7], 0.6, METAL) +
    rod([t[0], t[1], BH + 7], [t[0], t[1] + 5, BH + 7], 0.6, METAL);
  return (
    castShadow(boxCorners(a[0] - 4, a[1] - 4, BH, a[0] + 4, a[1] + 4, BH + 8), BH, top) +
    castShadow(boxCorners(b[0] - 4, b[1] - 4, BH, b[0] + 4, b[1] + 4, BH + 8), BH, top) +
    byDepth([
      { at: [a[0], a[1], 0], svg: k(a, CERAMIC, BH + 7) },
      { at: [b[0], b[1], 0], svg: k(b, CERAMIC, BH + 7) },
      { at: [a[0] + 1, a[1] - 8, 0], svg: crates([a[0] + 1, a[1] - 8], 2) },
      { at: [b[0] - 8, b[1] + 1, 0], svg: crates([b[0] - 8, b[1] + 1], 3) },
      { at: [t[0], t[1], 0], svg: stile },
    ])
  );
}
