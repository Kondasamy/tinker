// Bias and fairness's picture: the sorting gate at Larkspur's trade counter (U12). Builders asking for a trade account
// walk in two lanes toward the counter: Northvale (region A) at the back on a cobalt lane, Eastmere (region B) at the
// front on a mustard one; each lane's turned-down pen lies on its near side. Each lane passes a score post (a round disc on Northvale's, a square plate on Eastmere's,
// a collar at the lane's bar), and a gate arm sends each applicant on to the counter or out to the lane's turned-down
// pen; someone who would have repaid but was turned down has dropped their bag. The model machine between the posts
// does the scoring. Applicants are generic shoppers whose looks repeat in the same order in both lanes, so region reads
// only from lane colour, side and post shape (R13). Drawn people stand for the lane's counts (at most 12, 6 on
// phones); a count pill carries the true totals. Words only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { CERAMIC, DARK, PALS, WOOD, box, castShadow, cyl, rod, shape, tag, toneI } from '../../lib/iso/core.js';
import { drawPieces, modelMachine, person, SKIN, tight, type Look, type Piece } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import type { Counts } from '../../lib/fairness/metrics';
import type { Region } from '../../lib/fairness/population';
import type { Say } from '../story/steps';

/** The gate's x; queues stand before it, the approved and the turned down after it. */
const GX = 100,
  /** a spot's pitch in a queue or pen: two abreast */
  STEP = 14,
  /** the counter's near edge */
  CX = 198;
/** Each lane's centre line and its pen's (the pen on the lane's outer side), and the post on its inner edge. */
const LANE: Record<Region, { y: number; pen: number; post: number; pal: { l: string; m: string; d: string } }> = {
  A: { y: 34, pen: 70, post: 48, pal: PALS.cobalt },
  B: { y: 114, pen: 148, post: 100, pal: PALS.mustard },
};
export const GATE_BOARD: Board = [-16, 14, 228, 166];
/** Drawn applicants per lane: wide, and on phones. */
export const CAP = 12,
  CAP_PHONE = 6;

/** The parts a step's callout may name. */
export const GATE_PARTS = ['check', 'lane-a', 'lane-b', 'post-a', 'post-b', 'out-a', 'out-b', 'counter'] as const;

export type Kind = 'tp' | 'fp' | 'fn' | 'tn';
const KINDS: Kind[] = ['tp', 'fp', 'fn', 'tn'];
export interface LaneView {
  /** the lane's true decision counts at its bar (metrics.ts) */
  counts: Counts;
  bar: number;
}
export interface GateOpts {
  lanes: Record<Region, LaneView>;
  /** each region's made-up name */
  names: Record<Region, string>;
  /** the share of each lane's drawn applicants already past the gate (the walk-through); 1 when omitted */
  through?: number;
  /** pill size; phones pass more, and draw at most CAP_PHONE a lane */
  scale?: number;
  say?: Say;
}

/** The lane's drawn applicants in walking order: `cap` people split across the four kinds by largest remainder, each
 * kind spread evenly along the queue. */
export function drawnOf(c: Counts, cap = CAP): Kind[] {
  const n = Math.min(cap, c.n),
    raw = KINDS.map(k => (c.n ? (c[k] * n) / c.n : 0)),
    got = raw.map(Math.floor);
  const order = KINDS.map((_, i) => i).sort((a, b) => raw[b] - got[b] - (raw[a] - got[a]) || a - b);
  for (let i = 0; got.reduce((s, v) => s + v, 0) < n; i++) got[order[i % 4]]++;
  return KINDS.flatMap((k, i) => Array.from({ length: got[i] }, (_, j) => ({ k, at: (j + 0.5) / got[i] + i * 1e-6 })))
    .sort((a, b) => a.at - b.at)
    .map(d => d.k);
}

/** What the picture shows of each lane. Pure, so the tests can check it without drawing. */
export function gateState(o: GateOpts) {
  const cap = (o.scale ?? 1) > 1.5 ? CAP_PHONE : CAP;
  return Object.fromEntries(
    (['A', 'B'] as Region[]).map(r => {
      const drawn = drawnOf(o.lanes[r].counts, cap),
        past = Math.round((o.through ?? 1) * drawn.length);
      return [r, { drawn, past, approved: drawn.slice(0, past).filter(k => k === 'tp' || k === 'fp').length }];
    }),
  ) as Record<Region, { drawn: Kind[]; past: number; approved: number }>;
}

// Looks repeat in the same order in both lanes: every skin tone, neutral tops (never a lane's colour, never the bag's
// tomato), mixed hair and cuts.
const TOPS = [PALS.blush.l, PALS.mint.m, '#b39ddb', '#9fb3a0', '#e8dcc4', '#c9a27e', '#f4f1e8'];
const HAIR = ['#2b231c', '#6a4426', '#d9b35c', '#bdb7ab', '#a3482a'];
const CUTS: Look['cut'][] = ['short', 'bun', 'curly', 'ponytail', 'long', 'bald'];
const LEGS = ['#3b4566', '#5a6f93', '#a8946a', '#4a4642'];
export const lookAt = (i: number): Look => ({
  skin: SKIN[i % SKIN.length],
  top: TOPS[(i * 3) % TOPS.length],
  legs: LEGS[i % LEGS.length],
  hair: HAIR[(i * 2) % HAIR.length],
  cut: CUTS[i % CUTS.length],
});

const flat = (x0: number, y0: number, x1: number, y1: number, c: string, w = 0.8) =>
  shape(
    [
      [x0, y0, BH + 0.02],
      [x1, y0, BH + 0.02],
      [x1, y1, BH + 0.02],
      [x0, y1, BH + 0.02],
    ],
    c,
    w,
  );
/** A one-item piece casting its box's shadow. */
const item = (svg: string, b: number[][]): Piece => ({
  shadow: castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH),
  items: [{ box: b, svg }],
  box: b,
});
/** Spot j of a two-abreast row starting at x0 and running `dir` along x, centred on y. */
const spot = (x0: number, dir: number, y: number, j: number) => [
  x0 + dir * STEP * Math.floor(j / 2),
  y + (j % 2 ? 6.5 : -6.5),
];
/** the model machine, between the posts */
const MX = GX,
  MY = (LANE.A.post + LANE.B.post) / 2;
/** the post's collar height for a bar */
const barZ = (bar: number) => BH + 6 + bar * 26;
const POST_TOP = BH + 36;

function lane(r: Region, o: GateOpts, st: ReturnType<typeof gateState>[Region]): Piece[] {
  const L = LANE[r],
    out: Piece[] = [];
  let left = 0,
    inn = 0,
    pen = 0;
  st.drawn.forEach((k, i) => {
    const through = i < st.past,
      ok = k === 'tp' || k === 'fp',
      look = lookAt(i);
    let at: number[];
    if (!through) at = spot(GX - 12, -1, L.y, left++);
    else if (ok) at = spot(CX - 12, -1, L.y, inn++);
    else at = spot(GX - 36, -1, L.pen, pen++);
    const dropped = through && k === 'fn';
    const p = person({
      x: at[0],
      y: at[1],
      // the turned down walk back out, away from the counter
      facing: through && !ok ? '-x' : '+x',
      pose: through && ok ? 'stand' : 'walk',
      look,
      holding: dropped ? null : 'bag',
    });
    // the queue packs people closer than the kit's 11-unit footprint, so each sorts by its body's own box; with the
    // footprints, neighbours' boxes overlap and byDepth's order between them is arbitrary
    const body = [
      [at[0] - 5, at[1] - 6, BH],
      [at[0] + 5, at[1] + 6, BH + 36],
    ];
    p.items = p.items.map((it, n) => ({
      box: body,
      svg: n
        ? it.svg
        : `<g class="applicant" data-lane="${r}" data-kind="${k}" data-past="${through ? 1 : 0}">${it.svg}</g>`,
    }));
    out.push(p);
    if (dropped) {
      // the bag left on the ground behind them, lying on its side
      const bx = at[0] + 5.5,
        by = at[1] + 1;
      out.push(
        item(`<g class="dropped">${box(bx, by, BH, bx + 5.4, by + 4, BH + 2.6, PALS.tomato, toneI, 0.9)}</g>`, [
          [bx, by, BH],
          [bx + 5.4, by + 4, BH + 2.6],
        ]),
      );
    }
  });
  // the score post: a dark pole, a collar at the bar, the lane's marker on top (a disc for A, a square plate for B)
  const px = GX,
    py = L.post,
    z = barZ(o.lanes[r].bar);
  let post = rod([px, py, BH], [px, py, POST_TOP], 0.9, DARK, toneI, 1);
  post += cyl(px, py, z - 1, z + 1, 2.2, PALS.tomato, toneI, 0.9, 14);
  post +=
    r === 'A'
      ? cyl(px, py, POST_TOP, POST_TOP + 1.6, 4.6, L.pal, toneI, 1, 18)
      : box(px - 4, py - 4, POST_TOP, px + 4, py + 4, POST_TOP + 1.6, L.pal, toneI, 1);
  out.push(
    item(`<g data-prop="post-${r.toLowerCase()}" data-bar="${o.lanes[r].bar}">${post}</g>`, [
      [px - 4.6, py - 4.6, BH],
      [px + 4.6, py + 4.6, POST_TOP + 1.6],
    ]),
  );
  // the gate arm: from the post across the lane toward its pen, at hip height
  const edge = 2 * L.y - L.post,
    a = [px, py, BH + 14],
    b = [px + 14, edge, BH + 14];
  out.push(
    item(`<g class="gate-arm">${rod(a, b, 0.9, PALS.tomato, toneI, 1)}</g>`, [
      [Math.min(a[0], b[0]) - 1, Math.min(a[1], b[1]) - 1, BH + 13],
      [Math.max(a[0], b[0]) + 1, Math.max(a[1], b[1]) + 1, BH + 15],
    ]),
  );
  return out;
}

/** The floor: each lane's coloured strip, its pen, and the post-to-counter run. Flat, so it goes under everything. */
function floorOf(o: GateOpts) {
  let s = '';
  for (const r of ['A', 'B'] as Region[]) {
    const L = LANE[r],
      c = o.lanes[r].counts;
    s += `<g data-part="lane-${r.toLowerCase()}" data-bar="${o.lanes[r].bar}" data-tp="${c.tp}" data-fp="${c.fp}" data-fn="${c.fn}" data-tn="${c.tn}">${flat(-12, L.y - 14, CX, L.y + 14, L.pal.l)}</g>`;
    s += `<g data-part="out-${r.toLowerCase()}">${flat(-12, L.pen - 13, GX - 28, L.pen + 13, CERAMIC.d, 1)}</g>`;
  }
  return s;
}

/** The trade counter across both lanes' ends, the clerk behind it, and the model machine between the posts. */
function fixtures(): Piece[] {
  const y0 = LANE.A.y - 14,
    y1 = LANE.B.y + 14,
    zt = BH + 14;
  const counter = item(
    `<g data-prop="counter">${box(CX, y0, BH, CX + 12, y1, zt - 1.5, WOOD, toneI, 1)}${box(CX - 1, y0 - 1, zt - 1.5, CX + 13, y1 + 1, zt, CERAMIC, toneI, 1)}</g>`,
    [
      [CX - 1, y0 - 1, BH],
      [CX + 13, y1 + 1, zt],
    ],
  );
  return [
    counter,
    person({ x: CX + 20, y: (LANE.A.y + LANE.B.y) / 2, facing: '-x', look: 'employee', holding: null }),
    modelMachine(MX, MY, 0.8, 'ok'),
  ];
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
const bar2 = (b: number) => b.toFixed(2);

/** The sorting gate. The floor, every shadow, then one depth sort over people, posts and fixtures, then the pills. */
export const gateScene = (o: GateOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    st = gateState(o);
  let s = floorOf(o);
  // two dozen people: compacted losslessly to stay inside the size budget
  s = compact(tight(s + drawPieces([...fixtures(), ...lane('A', o, st.A), ...lane('B', o, st.B)], ctx.top)));
  const pills: string[] = [];
  for (const r of ['A', 'B'] as Region[]) {
    const L = LANE[r],
      c = o.lanes[r].counts,
      back = r === 'A',
      name = o.names[r].toUpperCase();
    // the lane's count pill by the counter, on the lane's far edge: its true totals (the drawn people stand for them)
    pills.push(
      pill(
        [CX - 30, back ? L.y - 14 : L.y + 14, BH],
        0,
        back ? -70 : 30,
        narrow ? name : `${name} · ${c.n} · ${c.tp + c.fp} IN · ${c.fn + c.tn} OUT`,
        false,
        scale,
      ),
    );
    if (!narrow) {
      pills.push(pill([GX, L.post, POST_TOP + 1.6], back ? 34 : -34, -16, `BAR ${bar2(o.lanes[r].bar)}`, false, scale));
      pills.push(
        pill([0, back ? L.pen - 13 : L.pen + 13, BH], 0, back ? -44 : 26, `${c.fn} WRONGLY OUT`, c.fn > 0, scale),
      );
    }
    const part = r.toLowerCase();
    pills.push(
      sayAt(o.say, `lane-${part}`, [GX - 40, L.y, BH + 30], back ? -12 : -12, scale, narrow),
      sayAt(o.say, `post-${part}`, [GX, L.post, POST_TOP + 1.6], -16, scale, narrow),
      sayAt(o.say, `out-${part}`, [GX - 50, L.pen, BH + 30], -12, scale, narrow),
    );
  }
  pills.push(
    sayAt(o.say, 'check', [MX, MY, BH + 26], -8, scale, narrow),
    sayAt(o.say, 'counter', [CX + 6, LANE.A.y, BH + 14], -8, scale, narrow),
  );
  return s + calloutsLast(pills);
};

const pct = (x: number) => `${Math.round(x * 100)}%`;
/** The picture in words, for its aria-label. */
export function gateLabel(o: GateOpts): string {
  const lane = (r: Region) => {
    const c = o.lanes[r].counts,
      repaid = c.tp + c.fn;
    return (
      `${o.names[r]}'s lane, bar ${bar2(o.lanes[r].bar)}: ${c.tp + c.fp} of ${c.n} approved, ${c.fn + c.tn} turned down; ` +
      `${c.fn} who would have repaid were turned down (${pct(repaid ? c.fn / repaid : 0)} of those who repaid)`
    );
  };
  return `Two lanes of made-up applicants pass a score post to Larkspur's trade counter. ${lane('A')}. ${lane('B')}.`;
}
