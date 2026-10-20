// The smallest RAG pipeline (chapter 3): documents → retriever → model, wired and lit. Used on the home and RAG intro.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, ACC, renderers, blockShadow, blockTag, type BlockType } from '../../lib/iso/blocks';
import { INK, pd, byDepth } from '../../lib/iso/core.js';

const ROW: [BlockType, number, string][] = [['docs', 30, ''], ['retriever', 120, 'TOP 3'], ['llm', 210, '']];
const Y = 34;
export const MINI_BOARD: Board = [0, 0, 240, 68];
export const MINI_LABEL = 'A minimal RAG pipeline: documents, a retriever and a language model joined by a lit wire';

/** scale: pill size (default enlarged, for this picture shown small); evalScene composes it at its own scale */
export const miniPipeline = ({ top }: SceneCtx, scale = 1.7) => {
  let s = ROW.map(([t, x]) => blockShadow(t, x, Y, top)).join('');
  const d = pd([[30, Y, BH + .3], [210, Y, BH + .3]], false);
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round"/>`;
  s += byDepth(ROW.map(([t, x, stat]) => ({ at: [x, Y, 0], svg: renderers[t]({ x, y: Y, stat, lit: true, state: 'ok' }) })));
  return s + ROW.map(([t, x, stat]) => blockTag(t, { x, y: Y, stat }, scale)).join('');
};
