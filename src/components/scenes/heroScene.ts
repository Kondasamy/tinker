// The home hero: Tinker as one workshop on a board of fixed size. RAG's pipeline (docs → retriever → model, wired and
// lit), tool calling's back office (an envelope riding a belt), a building site with its builder, open for the next
// module, and a stand where every later live module takes a turn. Each piece opens its module; the stand opens
// whichever module stands on it.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, ACC, renderers, blockShadow, boxCorners, esc } from '../../lib/iso/blocks';
import {
  P,
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
import { SKIN, mini, person, type Look, floor } from '../../lib/iso/figures';
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
import { darkroomPlot } from './darkroomScene';
import { jarPlot } from './jarScene';
import { puppetPlot } from './puppetScene';
import { typeFramePlot } from './typeFrameScene';
import { agentDeskPlot } from './deskScene';
import { copierPlot } from './copierScene';
import { roomsPlot } from './officeRoomsScene';
import { shelfPlot } from './shelfScene';
import { recitalPlot } from './recitalScene';
import { dreamPlot } from './dreamFloorScene';
import { docketPlot } from './docketScene';
import { rackPlot } from './pigeonholeScene';
import { gatePlot } from './gateScene';
import { uvPlot } from './uvScene';
import { phoneCratePlot } from './phoneCrateScene';
import { hatchPlot } from './hatchScene';
import { ringPlot } from './ringScene';
import { steelyardPlot } from './steelyardScene';
import { clawPlot } from './clawScene';
import { carouselPlot } from './carouselScene';
import { tollPlot } from './tollScene';
import { switchPlot } from './switchboardScene';
import { corkPlot } from './corkScene';
import { shadowPlot } from './shadowScene';
import { funiPlot } from './funicularScene';
import { kioskPlot } from './kioskScene';
import { SEQ_MSGS } from './toolSequence';
import { MODULES } from '../../lib/modules';
import type { Msg } from '../../lib/iso/flat';

// the back office at the back, RAG along the front-left edge, the stand front-right and a building site on the left
const RAG_Y = 294,
  RAG_X = [44, 112, 180],
  STAND: [number, number] = [272, 298],
  /** the stand shows its module this much larger than a plot */
  Z = 1.5,
  SITE: [number, number] = [50, 196];
/** the hero's board: one size whatever the registry holds */
export const HERO_BOARD: Board = [0, 0, 346, 348];
/** a plot drawn at (x, y), magnified Z times about its foot; its strokes are thinned to match, so the ink keeps one weight */
const magnify = (x: number, y: number, svg: string) => {
  const [X, Y] = P(x, y, BH);
  return `<g transform="translate(${X} ${Y}) scale(${Z}) translate(${-X} ${-Y})">${svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w / Z).toFixed(3)}"`)}</g>`;
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
/** the site's builder: a hard hat and a hi-vis vest */
const BUILDER: Look = {
  skin: SKIN[2],
  top: '#d8e05a',
  legs: '#5a6f93',
  hair: '#2b231c',
  cut: 'short',
  hat: 'hard',
  hatCol: PALS.mustard.l,
};
/** a sawhorse barrier across the plot's front: two posts and a striped bar */
const barrier = (x: number, y: number) =>
  box(x - 1.5, y - 12, BH, x + 1.5, y - 9, BH + 9, CERAMIC, toneI, 0.8) +
  box(x - 1.5, y + 9, BH, x + 1.5, y + 12, BH + 9, CERAMIC, toneI, 0.8) +
  rod([x, y - 12, BH + 9], [x, y + 12, BH + 9], 1.6, PALS.mustard) +
  rod([x, y - 4, BH + 9], [x, y + 2, BH + 9], 1.65, INK);

// the hero is a picture (role="img"): a piece opens its page on a click (the home page's script); the catalogue below
// is the way in for keyboards and screen readers
const link = (href: string, svg: string, attrs = '') => `<g data-href="${href}"${attrs}>${svg}</g>`;
const pill = (p: number[], text: string, lit: boolean, dy: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text.toUpperCase()), lit)}</g>`;

/** a module's id, and for a module after the second its drawing, centred on (x, y) */
export interface HeroPlot {
  id: string;
  draw?: (x: number, y: number, ctx: SceneCtx) => string;
}
const nameOf = (id: string) => id.replace(/-/g, ' ');
/** live in registry order: RAG's pipeline, tool calling's back office, then every later module takes a turn on the stand,
 * newest first, so the still picture (reduced motion, share image) shows the latest; ride: the envelope on the belt */
export const heroScene =
  ({ live, ride }: { live: HeroPlot[]; ride: Msg[] }) =>
  (ctx: SceneCtx) => {
    const { top } = ctx,
      [sx, sy] = STAND,
      turns = live.slice(2).reverse();
    let s =
      mat(18, 270, 206, 318, PALS.mint.l) +
      mat(100, 0, 290, 256, PALS.cobalt.l) +
      mat(SITE[0] - 22, SITE[1] - 22, SITE[0] + 30, SITE[1] + 22, PALS.mustard.l) +
      `<g class="hero-thud">${mat(sx - 44, sy - 42, sx + 56, sy + 44, PALS.mustard.l)}${mat(sx - 33, sy - 33, sx + 45, sy + 33, PALS.mint.l)}</g>`;
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
    s += link(
      `/${live[0].id}/`,
      byDepth(
        (['docs', 'retriever', 'llm'] as const).map((t, i) => ({
          at: [RAG_X[i], RAG_Y, 0],
          svg: renderers[t]({ x: RAG_X[i], y: RAG_Y, lit: true, state: 'ok' }),
        })),
      ) + pill([RAG_X[1], RAG_Y, BH + 34], nameOf(live[0].id), false, -28),
    );
    // tool calling: the back office, its stations unnamed (its pill names the module)
    s += link(
      `/${live[1].id}/`,
      officeScene({ msgs: ride, tools: 2, schema: true, names: false })(ctx) +
        pill([142, 134, BH + 34], nameOf(live[1].id), false, -22),
    );
    // the building site: room for the next module, a crate, two cones, a barrier and a worker in a hard hat carrying a
    // box in, open to a request
    const [bx, by] = SITE,
      worker = mini(
        person({ x: 0, y: 0, facing: 60, pose: 'carry', look: BUILDER, holding: 'parcel' }),
        [0, 0, BH],
        [bx - 2, by + 14, BH],
        0.8,
      );
    s += link(
      '#request',
      castShadow(boxCorners(bx - 17, by - 9, BH, bx + 1, by + 9, BH + 15), BH, top) +
        floor(worker.shadow, top) +
        byDepth([
          { at: [bx - 8, by, 0], svg: crate(bx - 8, by) },
          { at: [bx + 11, by - 12, 0], svg: cone(bx + 11, by - 12) },
          { at: [bx + 11, by + 12, 0], svg: cone(bx + 11, by + 12) },
          { at: [bx + 24, by, 0], svg: barrier(bx + 24, by) },
          ...worker.items,
        ]) +
        pill([bx + 4, by, BH + 15], 'yours?', false, -24),
    );
    // the stand: one module at a time drops on, lit, and lifts off for the next (the home page's turns); only the
    // first shows in a still picture
    return (
      s +
      turns
        .map((p, i) =>
          link(
            `/${p.id}/`,
            magnify(sx, sy, p.draw?.(sx, sy, ctx) ?? '') + pill([sx + 4 * Z, sy, BH + 15 * Z], nameOf(p.id), true, -34),
            ` class="hero-turn" style="--i:${i}"${i ? ' visibility="hidden"' : ''}`,
          ),
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
 * and a mint ear drum on a short belt; before GenAI the scripted help kiosk, its button panel and a raised reply card */
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
  diffusion: (x, y, { top }) => darkroomPlot(x + 14, y - 2, top),
  calibration: (x, y, { top }) => jarPlot(x + 12, y - 2, top),
  'computer-use': (x, y, { top }) => puppetPlot(x + 14, y - 2, top),
  'diffusion-llms': (x, y, { top }) => typeFramePlot(x + 12, y - 2, top),
  'coding-agents': (x, y, { top }) => agentDeskPlot(x + 14, y - 2, top),
  'synthetic-data': (x, y, { top }) => copierPlot(x + 14, y - 2, top),
  'mixture-of-experts': (x, y, { top }) => roomsPlot(x + 14, y - 4, top),
  recommendations: (x, y, { top }) => shelfPlot(x + 14, y - 2, top),
  memorisation: (x, y, { top }) => recitalPlot(x + 14, y - 2, top),
  'video-models': (x, y, { top }) => dreamPlot(x + 8, y - 2, top),
  prompts: (x, y, { top }) => docketPlot(x + 14, y - 2, top),
  labelling: (x, y, { top }) => rackPlot(x + 14, y - 2, top),
  fairness: (x, y, { top }) => gatePlot(x + 14, y - 2, top),
  watermarks: (x, y, { top }) => uvPlot(x + 14, y - 2, top),
  'agent-commerce': (x, y, { top }) => hatchPlot(x + 14, y - 2, top),
  'parallel-training': (x, y, { top }) => ringPlot(x + 14, y - 2, top),
  'choosing-models': (x, y, { top }) => steelyardPlot(x + 14, y - 2, top),
  'on-device': (x, y, { top }) => phoneCratePlot(x + 14, y - 2, top),
  robots: (x, y, { top }) => clawPlot(x + 14, y - 2, top),
  skills: (x, y, { top }) => carouselPlot(x + 14, y - 2, top),
  'action-approvals': (x, y, { top }) => tollPlot(x + 14, y - 2, top),
  'multi-agent': (x, y, { top }) => switchPlot(x + 14, y - 2, top),
  'agent-memory': (x, y, { top }) => corkPlot(x + 14, y - 2, top),
  'tools-in-production': (x, y, { top }) => shadowPlot(x + 14, y - 2, top),
  'agent-undo': (x, y, { top }) => funiPlot(x + 14, y - 2, top),
  'before-genai': (x, y, { top }) => kioskPlot(x + 14, y - 2, top),
};
// only AI modules take a turn on the stand: classic tech waits in the catalogue. The prequel (registry first) goes last, so
// the stand, newest first, opens on it and the share image shows it; RAG and tool calling keep their own plots
const AI = MODULES.filter(m => m.status === 'live' && !m.track);
/** the AI modules in the hero's order: RAG, tool calling, the later modules, the prequel */
export const HERO_LIVE = [...AI.slice(1), AI[0]];
/** the home page's hero and share image, from the registry: the model's call riding to the host */
export const HOME_HERO = heroScene({
  live: HERO_LIVE.map(m => ({ id: m.id, draw: DRAW[m.id] })),
  ride: SEQ_MSGS.slice(0, 3),
});
/** how many modules take a turn on the stand */
export const HERO_TURNS = HERO_LIVE.length - 2;
/** the hero's accessible label */
export const heroLabel = (live: string[]) =>
  `Tinker's workshop: ${live[0]} and ${live[1]} at work, and a stand where each later module takes a turn: ${live.slice(2).join(', ')}.`;
/** the live modules (in the hero's order) whose plot has no drawing: RAG's and tool calling's are drawn by heroScene itself */
export const undrawn = (live: string[]) => live.slice(2).filter(id => !DRAW[id]);
export const HOME_HERO_LABEL = heroLabel(HERO_LIVE.map(m => m.title));
