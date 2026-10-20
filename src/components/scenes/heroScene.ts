// The home hero: Tinker as one workshop, a plot per module on a single board. RAG's pipeline (docs → retriever → model,
// wired and lit), tool calling's back office (an envelope riding a belt), and a roped-off building plot for each planned
// module (a crate and traffic cones: open for someone to build). Plot names come from the registry.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, ACC, renderers, blockShadow, boxCorners, esc } from '../../lib/iso/blocks';
import { INK, PALS, CERAMIC, WOOD, pd, on, PZ, rrUV, byDepth, box, rod, line, fill, castShadow, toneI, tag } from '../../lib/iso/core.js';
import { officeScene } from './officeScene';
import { SEQ_MSGS } from './toolSequence';
import { MODULES } from '../../lib/modules';
import type { Msg } from '../../lib/iso/flat';

// the back office at the back; RAG along the front-left edge and the building sites along the front-right one, so
// nothing tall stands in front of a plot
export const HERO_BOARD: Board = [0, 0, 340, 330];
const RAG_Y = 294, RAG_X = [44, 112, 180];
const PLOT_X = 306, PLOT_Y = [184, 246, 306];

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

export interface HeroPlot { name: string }
/** live: the two live modules' plot names; planned: one plot per planned module; ride: the envelope on the belt */
export const heroScene = ({ live, planned, ride }: { live: [string, string]; planned: HeroPlot[]; ride: Msg[] }) => (ctx: SceneCtx) => {
  const { top } = ctx, scale = 1.15;
  let s = mat(18, 270, 206, 318, PALS.mint.l) + mat(100, 0, 290, 256, PALS.cobalt.l)
    + PLOT_Y.slice(0, planned.length).map(y => mat(278, y - 28, 336, y + 28, PALS.mustard.l)).join('');
  // RAG: three blocks down the plot, joined by a lit wire
  s += RAG_X.map((x, i) => blockShadow((['docs', 'retriever', 'llm'] as const)[i], x, RAG_Y, top)).join('');
  const d = pd([[RAG_X[0], RAG_Y, BH + .3], [RAG_X[2], RAG_Y, BH + .3]], false);
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round"/>`;
  s += byDepth((['docs', 'retriever', 'llm'] as const).map((t, i) => ({ at: [RAG_X[i], RAG_Y, 0], svg: renderers[t]({ x: RAG_X[i], y: RAG_Y, lit: true, state: 'ok' }) })));
  // tool calling: the back office, its stations unnamed (the plot's pill names the module)
  s += officeScene({ msgs: ride, tools: 2, schema: true, names: false })(ctx);
  // planned modules: building plots
  const plots = planned.map((_, i) => {
    const y = PLOT_Y[i];
    return castShadow(boxCorners(PLOT_X - 17, y - 9, BH, PLOT_X + 1, y + 9, BH + 15), BH, top)
      + byDepth([
        { at: [PLOT_X - 8, y, 0], svg: crate(PLOT_X - 8, y) },
        { at: [PLOT_X + 12, y - 15, 0], svg: cone(PLOT_X + 12, y - 15) },
        { at: [PLOT_X + 12, y + 15, 0], svg: cone(PLOT_X + 12, y + 15) },
        { at: [PLOT_X + 24, y, 0], svg: barrier(PLOT_X + 24, y) },
      ]);
  }).join('');
  s += plots;
  const pill = (p: number[], text: string, onn: boolean, dy = -20) => `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text.toUpperCase()), onn, scale)}</g>`;
  return s + pill([RAG_X[1], RAG_Y, BH + 34], live[0], true, -18) + pill([142, 134, BH + 34], live[1], true, -22)
    + planned.map((m, i) => pill([PLOT_X - 8, PLOT_Y[i], BH + 15], `Soon: ${m.name}`, false, -14)).join('');
};

const LIVE = MODULES.filter(m => m.status === 'live'), PLANNED = MODULES.filter(m => m.status === 'planned');
/** the home page's picture (and its share image), from the registry: the model's call riding to the host */
export const HOME_HERO = heroScene({ live: [`Module 1 · ${LIVE[0].title}`, `Module 2 · ${LIVE[1].title}`], planned: PLANNED.map(m => ({ name: m.title })), ride: SEQ_MSGS.slice(0, 3) });
export const HOME_HERO_LABEL = `Tinker as one workshop with a plot per module: ${LIVE.map(m => m.title).join(' and ')}, live, and building sites for ${PLANNED.map(m => m.title).join(', ')}.`;
