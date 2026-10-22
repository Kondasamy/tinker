// A still picture of the RAG track with the given blocks placed and wired (no engine, no interaction).
// Used where a page needs the pipeline as an image: the home page and the share (OG) images.
import type { SceneCtx } from '../../lib/iso/IsoStage';
import { BH, ACC, renderers, blockShadow, blockTag, type BlockType } from '../../lib/iso/blocks';
import { INK, pd, byDepth } from '../../lib/iso/core.js';
import { trackLayout, BAYS } from '../canvas/track';

export const staticTrack =
  (unlocked: BlockType[], { pills = true, scale = 1 } = {}) =>
  ({ top }: SceneCtx) => {
    const { nodes, edges } = trackLayout(unlocked);
    const at = Object.fromEntries(nodes.map(n => [n.id, n]));
    let s = nodes.map(n => blockShadow(n.id, n.x, n.y, top)).join('');
    for (const [a, b] of edges) {
      const p = at[a],
        q = at[b];
      // L-shaped run along the board, x first then y, like the live canvas
      const d = pd(
        [
          [p.x, p.y, BH + 0.3],
          [q.x, p.y, BH + 0.3],
          [q.x, q.y, BH + 0.3],
        ],
        false,
      );
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    s += byDepth(
      nodes.map(n => ({ at: [n.x, n.y, 0], svg: renderers[n.id]({ x: n.x, y: n.y, lit: true, state: 'ok' }) })),
    );
    if (pills) s += nodes.map(n => blockTag(n.id, { x: n.x, y: n.y }, scale, !BAYS[n.id])).join('');
    return s;
  };
