// The home hero: Tinker as one workshop, a plot per module on a single board. RAG's pipeline (docs → retriever → model,
// wired and lit), tool calling's back office (an envelope riding a belt), then a grid of plots: one per later live module,
// then a roped-off building plot for each planned module (a crate and traffic cones: open for someone to build). The plots
// fill the board's empty ground: a column on each side of the back office, then rows in front of it; the board grows with the registry.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, ACC, renderers, blockShadow, boxCorners, esc } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  CERAMIC,
  WOOD,
  pd,
  on,
  PZ,
  rrUV,
  byDepth,
  box,
  rod,
  line,
  fill,
  castShadow,
  toneI,
  tag,
} from '../../lib/iso/core.js';
import { archAt, officeScene } from './officeScene';
import { clipboard, helperDesk } from './agentScene';
import { testStack } from './evalScene';
import { postBox, trayProp } from './guardScene';
import { pressPlot } from './tokenScene';
import { enginePlot } from './engineScene';
import { deskPlot } from './windowScene';
import { benchPlot } from './trainScene';
import { stencilPlot } from './stencilScene';
import { deskPadPlot } from './thinkScene';
import { apprenticePlot } from './routerScene';
import { servePlot } from './serveScene';
import { controlRoomPlot } from './traceScene';
import { glassRoomPlot } from './sandboxScene';
import { scanPlot } from './scanScene';
import { phonePlot } from './phoneScene';
import { forgePlot } from './forgeScene';
import { examPlot } from './examScene';
import { fusePlot } from './fuseScene';
import { depotPlot } from './depotScene';
import { archivePlot } from './archiveScene';
import { stockPlot } from './stockScene';
import { SEQ_MSGS } from './toolSequence';
import { MODULES } from '../../lib/modules';
import type { Msg } from '../../lib/iso/flat';

// the back office at the back; RAG along the front-left edge; plots in the ground the two leave empty
const RAG_Y = 294,
  RAG_X = [44, 112, 180];
// STEP is a little more than two pill heights apart on screen, so pills down a column never touch; front rows sit a
// little further apart (ROW), so 32 pills shown at once still clear each other (KTD14)
const COLUMN = 5,
  STEP = 50,
  ROW = 54,
  COLS = [132, 206, 280, 354],
  /** the front row level with RAG keeps only the columns clear of its strip */
  BESIDE_RAG = COLS.filter(x => x - 22 >= 206);
/** slot i's centre: down the column left of the back office, down the column right of it, then four to a row in front
 * (the first row, level with RAG, two), row by row to the front */
const slotXY = (i: number): [number, number] => {
  if (i < COLUMN) return [44, 30 + STEP * i];
  if (i < 2 * COLUMN) return [318, 30 + STEP * (i - COLUMN)];
  const j = i - 2 * COLUMN;
  if (j < BESIDE_RAG.length) return [BESIDE_RAG[j], 292];
  const k = j - BESIDE_RAG.length;
  return [COLS[k % COLS.length], 292 + ROW * (1 + Math.floor(k / COLS.length))];
};
/** a pill floats higher over the column right of the back office and over each front row's left-most slot: their
 * neighbours sit at about their height on screen, and all show at once with reduced motion and in the share image */
const lift = (i: number) => {
  const k = i - 2 * COLUMN - BESIDE_RAG.length;
  return (i >= COLUMN && i < 2 * COLUMN) || (k >= 0 && k % COLS.length === 0) ? -14 : 0;
};
/** slot i's mat on the board, [x0, y0, x1, y1] */
export const plotAt = (i: number): Board => {
  const [x, y] = slotXY(i);
  return [x - 22, y - 22, x + 30, y + 22];
};
/** the board for `slots` plots: at least wide enough for the back office and deep enough for RAG's strip */
export const heroBoard = (slots: number): Board => {
  const plots = Array.from({ length: slots }, (_, i) => plotAt(i));
  return [0, 0, Math.max(340, ...plots.map(p => p[2] + 6)), Math.max(336, ...plots.map(p => p[3] + 6))];
};

/** a plot's floor: a tinted mat with a dashed edge */
const mat = (x0: number, y0: number, x1: number, y1: number, col: string) => {
  const q = on(PZ(BH + 0.15), rrUV(x0, y0, x1, y1, 6));
  return (
    fill(pd(q), col, 'fill-opacity=".45"') +
    `<path d="${pd(q)}" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="4 4"/>`
  );
};
const cone = (x: number, y: number) =>
  rod([x, y, BH], [x, y, BH + 11], 3.6, PALS.tomato, toneI, 1, 0.7) +
  rod([x, y, BH + 4.5], [x, y, BH + 6.5], 2.8, CERAMIC, toneI, 0.6, 2.3);
const crate = (x: number, y: number) =>
  box(x - 9, y - 9, BH, x + 9, y + 9, BH + 15, WOOD, toneI, 1) +
  line(
    [
      [x + 9.05, y - 9, BH],
      [x + 9.05, y + 9, BH + 15],
    ],
    0.7,
  ) +
  line(
    [
      [x - 9, y + 9.05, BH],
      [x + 9, y + 9.05, BH + 15],
    ],
    0.7,
  );
/** a sawhorse barrier across the plot's front: two posts and a striped bar */
const barrier = (x: number, y: number) =>
  box(x - 1.5, y - 12, BH, x + 1.5, y - 9, BH + 9, CERAMIC, toneI, 0.8) +
  box(x - 1.5, y + 9, BH, x + 1.5, y + 12, BH + 9, CERAMIC, toneI, 0.8) +
  rod([x, y - 12, BH + 9], [x, y + 12, BH + 9], 1.6, PALS.mustard) +
  rod([x, y - 4, BH + 9], [x, y + 2, BH + 9], 1.65, INK);

/** a live plot's drawing (or its pill) in the home page's wave, which hops plot i, then i + 1, and shows the pill only on its turn */
const hop = (i: number, svg: string) => `<g class="hero-hop" style="--i:${i}">${svg}</g>`;

/** a plot's pill text (short: plots sit one step apart), and for a live module after the second its drawing, centred on (x, y) */
export interface HeroPlot {
  name: string;
  draw?: (x: number, y: number, ctx: SceneCtx) => string;
}
/** live: RAG's plot, tool calling's, then any later live modules; planned: one building site each; ride: the envelope on the belt */
export const heroScene =
  ({ live, planned, ride }: { live: HeroPlot[]; planned: HeroPlot[]; ride: Msg[] }) =>
  (ctx: SceneCtx) => {
    const { top } = ctx,
      // pills keep one size on screen whatever the board, so 32 of them shown at once need this smaller one (KTD14)
      scale = 1,
      later = live.slice(2),
      slots = [...later, ...planned];
    let s =
      mat(18, 270, 206, 318, PALS.mint.l) +
      mat(100, 0, 290, 256, PALS.cobalt.l) +
      slots
        .map((_, i) => {
          const [x0, y0, x1, y1] = plotAt(i);
          return mat(x0, y0, x1, y1, i < later.length ? PALS.mint.l : PALS.mustard.l);
        })
        .join('');
    // RAG: three blocks down the plot, joined by a lit wire
    s += RAG_X.map((x, i) => blockShadow((['docs', 'retriever', 'llm'] as const)[i], x, RAG_Y, top)).join('');
    const d = pd(
      [
        [RAG_X[0], RAG_Y, BH + 0.3],
        [RAG_X[2], RAG_Y, BH + 0.3],
      ],
      false,
    );
    s +=
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path class="hero-flow" d="${d}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="2 9" opacity=".55"/>`;
    s += hop(
      0,
      byDepth(
        (['docs', 'retriever', 'llm'] as const).map((t, i) => ({
          at: [RAG_X[i], RAG_Y, 0],
          svg: renderers[t]({ x: RAG_X[i], y: RAG_Y, lit: true, state: 'ok' }),
        })),
      ),
    );
    // tool calling: the back office, its stations unnamed (the plot's pill names the module)
    s += officeScene({ msgs: ride, tools: 2, schema: true, names: false })(ctx);
    // later live modules: their own drawing
    s += later.map((p, i) => hop(i + 2, p.draw?.(...slotXY(i), ctx) ?? '')).join('');
    // planned modules: building plots
    const plots = planned
      .map((_, j) => {
        const [x, y] = slotXY(later.length + j);
        return (
          castShadow(boxCorners(x - 17, y - 9, BH, x + 1, y + 9, BH + 15), BH, top) +
          byDepth([
            { at: [x - 8, y, 0], svg: crate(x - 8, y) },
            { at: [x + 11, y - 12, 0], svg: cone(x + 11, y - 12) },
            { at: [x + 11, y + 12, 0], svg: cone(x + 11, y + 12) },
            { at: [x + 24, y, 0], svg: barrier(x + 24, y) },
          ])
        );
      })
      .join('');
    s += plots;
    const pill = (p: number[], text: string, onn: boolean, dy = -20, dx = 0) =>
      `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text.toUpperCase()), onn, scale)}</g>`;
    // a pill floats above its plot's centre: on the home page only one shows at a time, so they never crowd
    const at = (i: number) => {
      const [x, y] = slotXY(i);
      return [x + 4, y, BH + 15];
    };
    return (
      s +
      hop(0, pill([RAG_X[1], RAG_Y, BH + 34], live[0].name, false, -18)) +
      hop(1, pill([142, 134, BH + 34], live[1].name, false, -22)) +
      later.map((m, i) => hop(i + 2, pill(at(i), m.name, false, -24 + lift(i)))).join('') +
      // planned pills sit out the wave (its timing is per live plot): the animated home hides them, still pictures show them all
      planned
        .map(
          (m, j) =>
            `<g class="hero-soon">${pill(at(later.length + j), m.name, false, -24 + lift(later.length + j))}</g>`,
        )
        .join('')
    );
  };

/** later live modules' plots, by module id: agents is a small desk with its plan on a clipboard; evals a stack of graded test cards and a stamp;
 * guardrails an inbox tray, a screening arch and a post box (the mail room's way in, its check and its way out); tokens the token press
 * with the tiles it has cut; transformers a small engine room, a head's desk lit and a thread of attention over three tiles; context
 * a small desk with the window on it, a glass case of stacked papers; fine-tuning a small training bench, the model with its adapter
 * clipped on and the weights lever pulled; structured outputs a small press, its belt crossing a blue schema plate, a tomato tile
 * stopped before the plate and two tiles past it; reasoning a small scratchpad desk, a squat model, a pad of thinking papers
 * and a small effort dial; small models a small apprentice's bench, a model block, a squat student in front of it and
 * the router's plate, its lever leaning toward the student; inference a small server rack, three of its four seats lit, beside a
 * short queue belt with two envelopes waiting; observability a short wall of three trace cards, one failed, over a sorting bin;
 * sandboxing a small walled yard, the agent's desk inside and a gated door in its front wall; multimodal a small scanning
 * table, a sheet with its patch grid under a camera post and three token tiles; voice a small phone desk, a squat telephone
 * and a mint ear drum on a short belt */
const DRAW: Record<string, HeroPlot['draw']> = {
  // at the plot's right-hand corner, clear of the pill row
  agents: (x, y, { top }) =>
    castShadow(boxCorners(x + 9, y - 21, BH, x + 27, y - 7, BH + 17), BH, top) +
    castShadow(boxCorners(x + 14, y - 4, BH, x + 40, y + 3, BH + 33), BH, top) +
    byDepth([
      helperDesk(x + 18, y - 14, true, false),
      clipboard(x + 27, y + 1, [
        { done: true, struck: false },
        { done: true, struck: false },
        { done: false, struck: false },
      ]),
    ]),
  evals: (x, y, { top }) =>
    castShadow(boxCorners(x + 8, y - 15, BH, x + 28, y - 1, BH + 6), BH, top) +
    castShadow(boxCorners(x + 16, y + 2, BH, x + 24, y + 12, BH + 12), BH, top) +
    testStack(x + 18, y - 8),
  guardrails: (x, y, { top }) =>
    castShadow(boxCorners(x + 4, y - 20, BH, x + 28, y - 2, BH + 6), BH, top) +
    castShadow(boxCorners(x + 26, y + 2, BH, x + 38, y + 14, BH + 23), BH, top) +
    byDepth([trayProp(x + 16, y - 11, false), archAt([x + 16, y + 6], [-1, 0], 'bad'), postBox(x + 32, y + 8)]),
  tokens: (x, y, { top }) => pressPlot(x + 16, y - 6, top),
  transformers: (x, y, { top }) => enginePlot(x + 14, y - 4, top),
  context: (x, y, { top }) => deskPlot(x + 14, y - 4, top),
  'fine-tuning': (x, y, { top }) => benchPlot(x + 14, y - 4, top),
  'structured-outputs': (x, y, { top }) => stencilPlot(x, y - 4, top),
  reasoning: (x, y, { top }) => deskPadPlot(x + 14, y - 4, top),
  'small-models': (x, y, { top }) => apprenticePlot(x + 14, y - 4, top),
  inference: (x, y, { top }) => servePlot(x + 14, y - 4, top),
  observability: (x, y, { top }) => controlRoomPlot(x + 14, y - 2, top),
  sandboxing: (x, y, { top }) => glassRoomPlot(x + 8, y - 2, top),
  multimodal: (x, y, { top }) => scanPlot(x + 14, y - 2, top),
  voice: (x, y, { top }) => phonePlot(x + 14, y - 2, top),
  'pre-training': (x, y, { top }) => forgePlot(x + 14, y - 2, top),
  'post-training': (x, y, { top }) => examPlot(x + 14, y - 2, top),
  interpretability: (x, y, { top }) => fusePlot(x + 14, y - 2, top),
  caching: (x, y, { top }) => depotPlot(x + 14, y - 4, top),
  databases: (x, y, { top }) => archivePlot(x + 14, y - 2, top),
  consistency: (x, y, { top }) => stockPlot(x + 14, y - 2, top),
};
const LIVE = MODULES.filter(m => m.status === 'live'),
  PLANNED = MODULES.filter(m => m.status === 'planned');
/** the home page's share image, from the registry: the model's call riding to the host */
export const HERO_BOARD = heroBoard(LIVE.length - 2 + PLANNED.length);
export const HOME_HERO = heroScene({
  live: LIVE.map(m => ({ name: m.id.replace(/-/g, ' '), draw: DRAW[m.id] })),
  planned: PLANNED.map(m => ({ name: m.id.replace(/-/g, ' ') })),
  ride: SEQ_MSGS.slice(0, 3),
});
/** the hero's accessible label: building sites are named only while some module is planned */
export const heroLabel = (live: string[], planned: string[]) =>
  `Tinker as one workshop with a plot per module: ${live.join(' and ')}, live${planned.length ? `, and building sites for ${planned.join(', ')}` : ''}.`;
/** the live modules (in registry order) whose plot has no drawing: RAG's and tool calling's are drawn by heroScene itself */
export const undrawn = (live: string[]) => live.slice(2).filter(id => !DRAW[id]);
/** the hero's caption: an invitation to build while a plot is open, to propose once none is */
export const heroCaption = (planned: boolean) =>
  planned ? { text: 'The empty plots are open:', link: 'build one' } : { text: 'Room for more:', link: 'propose one' };
export const HOME_HERO_LABEL = heroLabel(
  LIVE.map(m => m.title),
  PLANNED.map(m => m.title),
);
