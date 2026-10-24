// Interpretability's picture: the fuse box (KTD15). Transformers' engine room (engineScene, composed, never edited) with
// a fuse panel at its right-hand end, beside the second floor: one fuse per head and one per MLP, a row per layer
// (layer 2 on top) and a column per part (head 1, head 2, MLP). A fuse that is in is lit mustard; a pulled one is drawn
// out of its slot and dark, and its head's desk stays unlit, with no threads. Words go only in label pills, escaped.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { DARK, METAL, PALS, box, byDepth, castShadow, hullInk, tag, toneI } from '../../lib/iso/core.js';
import { FUSES, fuseName, isHead, layerOf, type Fuse } from '../../lib/interpretability/probe';
import { ENGINE_PARTS, engineLabel, engineScene, enginePlot, type EngineOpts } from './engineScene';

export const FUSE_BOARD: Board = [0, 0, 292, 210];
/** The parts a callout may name: the engine room's, the fuse panel and the first pulled fuse. */
export const FUSE_PARTS = [...ENGINE_PARTS, 'fuses', 'pulled'] as const;

export interface FuseOpts extends EngineOpts {
  /** fuses pulled out */
  pulled?: readonly Fuse[];
  /** draw the lit head's attention threads (chapter 1); otherwise the room shows no threads */
  threads?: boolean;
}

const PX0 = 262,
  PX1 = 272,
  PY0 = 2,
  PY1 = 70,
  PZ1 = BH + 40;
/** a fuse's slot on the panel's front (+x) face: a row per layer (layer 2 on top), a column per part (head 1, head 2,
 * MLP); the panel stands beside the second floor, clear of the first */
const slot = (f: Fuse) => {
  const col = isHead(f) ? Number(f[3]) : 2;
  return { y: PY1 - 12 - col * 22, z: PZ1 - 10 - (layerOf(f) === 1 ? 0 : 16) };
};

/** Pure: which desk is lit and which fuses are pulled, so the tests can check the picture without drawing it. */
export function fuseState(o: FuseOpts) {
  const pulled = FUSES.filter(f => o.pulled?.includes(f)),
    shown = `h${o.layer ?? 0}-${o.head ?? 0}` as Fuse;
  return { pulled, shownPulled: pulled.includes(shown) };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

export const fuseScene = (o: FuseOpts) => (ctx: SceneCtx) => {
  const st = fuseState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1;
  // a pulled head's desk is unlit: light no desk (layer -1); the room draws threads only when asked
  const room = engineScene({
    ...o,
    layer: st.shownPulled ? -1 : (o.layer ?? 0),
    attention: o.threads && !st.shownPulled ? o.attention : undefined,
    say: o.say,
  })(ctx);
  const corners = boxCorners(PX0, PY0, BH, PX1, PY1, PZ1);
  let s = castShadow(corners, BH, ctx.top);
  const fuses = FUSES.map(f => {
    const { y, z } = slot(f),
      out = st.pulled.includes(f);
    const x0 = out ? PX1 + 9 : PX1,
      x1 = x0 + 5;
    return {
      at: [x1, y, z],
      svg: `<g data-fuse="${f}"${out ? ' data-pulled="1"' : ''}>${box(x0, y - 7, z - 3, x1, y + 7, z + 3, out ? DARK : PALS.mustard, toneI, 0.9)}</g>`,
    };
  });
  s += `<g data-panel="1">${box(PX0, PY0, BH, PX1, PY1, PZ1, METAL, toneI, 1) + hullInk(corners, 2)}${byDepth(fuses)}</g>`;
  const pills: string[] = [],
    top = [(PX0 + PX1) / 2, (PY0 + PY1) / 2, PZ1]; // a row above the room's LAYER 2 pill
  pills.push(pill(top, 0, -42, narrow ? 'FUSES' : `FUSES · ${FUSES.length - st.pulled.length} IN`, false, scale));
  const callouts = [sayAt(o.say, 'fuses', top, -42, scale)];
  const first = st.pulled[0];
  if (first) {
    const { y, z } = slot(first),
      at = [PX1 + 14, y, z];
    if (!narrow) pills.push(pill(at, -14, 40, `OUT: ${fuseName(first).toUpperCase()}`, true, scale));
    callouts.push(sayAt(o.say, 'pulled', at, 40, scale));
  }
  return room + s + pills.join('') + callouts.join('');
};

/** The picture in words, for its aria-label. */
export function fuseLabel(o: FuseOpts): string {
  const st = fuseState(o);
  const base = engineLabel({ ...o, attention: o.threads && !st.shownPulled ? o.attention : undefined });
  const panel = st.pulled.length
    ? `A fuse panel stands at the end: ${st.pulled.map(fuseName).join(', ')} ${st.pulled.length === 1 ? 'is' : 'are'} pulled out and dark; the other ${FUSES.length - st.pulled.length} are in.`
    : `A fuse panel stands at the end, one fuse per head and per MLP, all ${FUSES.length} in.`;
  return `${st.shownPulled ? base.replace(/ The desk of layer \d+, head \d+ is lit\./, ' Its head is silenced, so no desk is lit.') : base} ${panel}`;
}

/** The home hero's plot: Transformers' small engine room with a fuse box beside it, one fuse pulled and dark. */
export function fusePlot(x: number, y: number, top: SceneCtx['top']): string {
  const px = x + 20,
    corners = boxCorners(px, y - 18, BH, px + 6, y + 2, BH + 22);
  const fuse = (z: number, out: boolean) =>
    box(
      px + 6 + (out ? 3 : 0),
      y - 11,
      z - 2,
      px + 9 + (out ? 3 : 0),
      y - 5,
      z + 2,
      out ? DARK : PALS.mustard,
      toneI,
      0.8,
    );
  return (
    enginePlot(x - 4, y, top) +
    castShadow(corners, BH, top) +
    box(px, y - 18, BH, px + 6, y + 2, BH + 22, METAL, toneI, 1) +
    hullInk(corners, 1.6) +
    fuse(BH + 16, false) +
    fuse(BH + 8, true)
  );
}
