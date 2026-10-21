// The home hero: Tinker as one workshop, a plot per module on a single board. RAG's pipeline (docs → retriever → model,
// wired and lit), tool calling's back office (an envelope riding a belt), then a grid of plots: one per later live module,
// then a roped-off building plot for each planned module (a crate and traffic cones: open for someone to build). The plots
// run in one staircase down the front-right edge, so each name pill gets its own row; the board grows with the registry.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, ACC, renderers, blockShadow, boxCorners, esc } from '../../lib/iso/blocks';
import { INK, PALS, CERAMIC, WOOD, pd, on, PZ, rrUV, byDepth, box, rod, line, fill, castShadow, toneI, tag } from '../../lib/iso/core.js';
import { archAt, officeScene } from './officeScene';
import { clipboard, helperDesk } from './agentScene';
import { testStack } from './evalScene';
import { postBox, trayProp } from './guardScene';
import { pressPlot } from './tokenScene';
import { SEQ_MSGS } from './toolSequence';
import { MODULES } from '../../lib/modules';
import type { Msg } from '../../lib/iso/flat';

// the back office at the back; RAG along the front-left edge and the building sites along the front-right one, so
// nothing tall stands in front of a plot
const RAG_Y = 294, RAG_X = [44, 112, 180];
const PLOT_X = 306, PLOT_Y0 = 150, STEP = 46;
/** slot i's centre, one step further down the front-right edge per slot */
const slotXY = (i: number): [number, number] => [PLOT_X, PLOT_Y0 + STEP * i];
/** slot i's mat on the board, [x0, y0, x1, y1] */
export const plotAt = (i: number): Board => { const [x, y] = slotXY(i); return [x - 22, y - 22, x + 30, y + 22]; };
/** the board for `slots` plots: at least deep enough for RAG's strip */
export const heroBoard = (slots: number): Board => [0, 0, 340, Math.max(336, plotAt(slots - 1)[3] + 6)];

/** a plot's floor: a tinted mat with a dashed edge */
const mat = (x0: number, y0: number, x1: number, y1: number, col: string) => {
  const q = on(PZ(BH + .15), rrUV(x0, y0, x1, y1, 6));
  return fill(pd(q), col, 'fill-opacity=".45"') + `<path d="${pd(q)}" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="4 4"/>`;
};
const cone = (x: number, y: number) => rod([x, y, BH], [x, y, BH + 11], 3.6, PALS.tomato, toneI, 1, .7)
  + rod([x, y, BH + 4.5], [x, y, BH + 6.5], 2.8, CERAMIC, toneI, .6, 2.3);
const crate = (x: number, y: number) => box(x - 9, y - 9, BH, x + 9, y + 9, BH + 15, WOOD, toneI, 1)
  + line([[x + 9.05, y - 9, BH], [x + 9.05, y + 9, BH + 15]], .7) + line([[x - 9, y + 9.05, BH], [x + 9, y + 9.05, BH + 15]], .7);
/** a sawhorse barrier across the plot's front: two posts and a striped bar */
const barrier = (x: number, y: number) => box(x - 1.5, y - 12, BH, x + 1.5, y - 9, BH + 9, CERAMIC, toneI, .8) + box(x - 1.5, y + 9, BH, x + 1.5, y + 12, BH + 9, CERAMIC, toneI, .8)
  + rod([x, y - 12, BH + 9], [x, y + 12, BH + 9], 1.6, PALS.mustard) + rod([x, y - 4, BH + 9], [x, y + 2, BH + 9], 1.65, INK);

/** a plot's pill text (short: plots sit one step apart), and for a live module after the second its drawing, centred on (x, y) */
export interface HeroPlot { name: string; draw?: (x: number, y: number, ctx: SceneCtx) => string }
/** live: RAG's plot, tool calling's, then any later live modules; planned: one building site each; ride: the envelope on the belt */
export const heroScene = ({ live, planned, ride }: { live: HeroPlot[]; planned: HeroPlot[]; ride: Msg[] }) => (ctx: SceneCtx) => {
  const { top } = ctx, scale = 1.15, later = live.slice(2), slots = [...later, ...planned];
  let s = mat(18, 270, 206, 318, PALS.mint.l) + mat(100, 0, 290, 256, PALS.cobalt.l)
    + slots.map((_, i) => { const [x0, y0, x1, y1] = plotAt(i); return mat(x0, y0, x1, y1, i < later.length ? PALS.mint.l : PALS.mustard.l); }).join('');
  // RAG: three blocks down the plot, joined by a lit wire
  s += RAG_X.map((x, i) => blockShadow((['docs', 'retriever', 'llm'] as const)[i], x, RAG_Y, top)).join('');
  const d = pd([[RAG_X[0], RAG_Y, BH + .3], [RAG_X[2], RAG_Y, BH + .3]], false);
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round"/>`;
  s += byDepth((['docs', 'retriever', 'llm'] as const).map((t, i) => ({ at: [RAG_X[i], RAG_Y, 0], svg: renderers[t]({ x: RAG_X[i], y: RAG_Y, lit: true, state: 'ok' }) })));
  // tool calling: the back office, its stations unnamed (the plot's pill names the module)
  s += officeScene({ msgs: ride, tools: 2, schema: true, names: false })(ctx);
  // later live modules: their own drawing
  s += later.map((p, i) => p.draw?.(...slotXY(i), ctx) ?? '').join('');
  // planned modules: building plots
  const plots = planned.map((_, j) => {
    const [x, y] = slotXY(later.length + j);
    return castShadow(boxCorners(x - 17, y - 9, BH, x + 1, y + 9, BH + 15), BH, top)
      + byDepth([
        { at: [x - 8, y, 0], svg: crate(x - 8, y) },
        { at: [x + 11, y - 12, 0], svg: cone(x + 11, y - 12) },
        { at: [x + 11, y + 12, 0], svg: cone(x + 11, y + 12) },
        { at: [x + 24, y, 0], svg: barrier(x + 24, y) },
      ]);
  }).join('');
  s += plots;
  const pill = (p: number[], text: string, onn: boolean, dy = -20) => `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text.toUpperCase()), onn, scale)}</g>`;
  const at = (i: number) => { const [x, y] = slotXY(i); return [x - 4, y, BH + 15]; };
  return s + pill([RAG_X[1], RAG_Y, BH + 34], live[0].name, true, -18) + pill([142, 134, BH + 34], live[1].name, true, -22)
    + later.map((m, i) => pill(at(i), m.name, true, -12)).join('')
    + planned.map((m, j) => pill(at(later.length + j), `Soon: ${m.name}`, false, -12)).join('');
};

/** later live modules' plots, by module id: agents is a small desk with its plan on a clipboard; evals a stack of graded test cards and a stamp;
 * guardrails an inbox tray, a screening arch and a post box (the mail room's way in, its check and its way out); tokens the token press
 * with the tiles it has cut */
const DRAW: Record<string, HeroPlot['draw']> = {
  // at the plot's right-hand corner, clear of the pill row
  agents: (x, y, { top }) => castShadow(boxCorners(x + 9, y - 21, BH, x + 27, y - 7, BH + 17), BH, top)
    + castShadow(boxCorners(x + 14, y - 4, BH, x + 40, y + 3, BH + 33), BH, top)
    + byDepth([helperDesk(x + 18, y - 14, true, false), clipboard(x + 27, y + 1, [{ done: true, struck: false }, { done: true, struck: false }, { done: false, struck: false }])]),
  evals: (x, y, { top }) => castShadow(boxCorners(x + 8, y - 15, BH, x + 28, y - 1, BH + 6), BH, top)
    + castShadow(boxCorners(x + 16, y + 2, BH, x + 24, y + 12, BH + 12), BH, top) + testStack(x + 18, y - 8),
  guardrails: (x, y, { top }) => castShadow(boxCorners(x + 4, y - 20, BH, x + 28, y - 2, BH + 6), BH, top)
    + castShadow(boxCorners(x + 26, y + 2, BH, x + 38, y + 14, BH + 23), BH, top)
    + byDepth([trayProp(x + 16, y - 11, false), archAt([x + 16, y + 6], [-1, 0], 'bad'), postBox(x + 32, y + 8)]),
  tokens: (x, y, { top }) => pressPlot(x + 16, y - 6, top),
};
const LIVE = MODULES.filter(m => m.status === 'live'), PLANNED = MODULES.filter(m => m.status === 'planned');
/** the home page's picture (and its share image), from the registry: the model's call riding to the host */
export const HERO_BOARD = heroBoard(LIVE.length - 2 + PLANNED.length);
export const HOME_HERO = heroScene({ live: LIVE.map((m, i) => ({ name: `Module ${i + 1} · ${m.title}`, draw: DRAW[m.id] })), planned: PLANNED.map(m => ({ name: m.id.replace(/-/g, ' ') })), ride: SEQ_MSGS.slice(0, 3) });
export const HOME_HERO_LABEL = `Tinker as one workshop with a plot per module: ${LIVE.map(m => m.title).join(' and ')}, live, and building sites for ${PLANNED.map(m => m.title).join(', ')}.`;
