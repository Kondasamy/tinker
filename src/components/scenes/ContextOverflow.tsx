// Chapter 2 scene: the corpus (a paper stack, one slab per ×10 in size) pours into a glass context-window
// container sized to the largest cited window. Past the limit the container turns red and paper spills out.
import IsoStage, { type SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, streaks } from '../../lib/iso/blocks';
import { PALS, CLEAR, CERAMIC, INK, box, tx, pd, on, PX, PY, PZ, rectUV, fill, ink, castShadow, byDepth, toneI } from '../../lib/iso/core.js';
import { STOPS, WINDOW, LARGEST, tokensFor, formatBytes, formatTokens } from '../../lib/scale';

const CX = 130, CY = 40, CH = 16, CZ = 44;   // container centre, half-footprint, height
const PX0 = 40, PY0 = 40, SLAB = 3.6;        // corpus pile
const glass = (pts: number[][], c: string) => fill(pd(pts), c, 'fill-opacity=".35"') + ink(pd(pts), 1);

export default function ContextOverflow({ stop }: { stop: number }) {
  const bytes = STOPS[stop], tokens = tokensFor(bytes), ratio = tokens / WINDOW, over = ratio > 1;

  const scene = ({ top }: SceneCtx) => {
    const x0 = CX - CH, x1 = CX + CH, y0 = CY - CH, y1 = CY + CH, z0 = BH, z1 = BH + CZ;
    const wall = over ? PALS.tomato.l : CLEAR.l;
    // back walls, then the fill, then the see-through front walls
    let c = fill(pd(on(PX(x0), rectUV(y0, z0, y1, z1))), CLEAR.d) + fill(pd(on(PY(y0), rectUV(x0, z0, x1, z1))), CLEAR.m);
    const level = Math.max(0.6, Math.min(1, ratio) * CZ);
    c += box(x0 + 1, y0 + 1, z0, x1 - 1, y1 - 1, z0 + level, over ? PALS.tomato : PALS.mustard, toneI, .6);
    c += glass(on(PX(x1), rectUV(y0, z0, y1, z1)), wall) + glass(on(PY(y1), rectUV(x0, z0, x1, z1)), wall);
    c += streaks(x1, y0, y1, z0, z1) + ink(pd(on(PZ(z1), rectUV(x0, y0, x1, y1))), 1.4);
    c += tx(x1 + .2, CY, z0 + 2.5, `WINDOW ${formatTokens(WINDOW)}`, 4.6, INK);
    // spill: paper over the rim and on the board, more the further past the limit
    const spill = over ? Math.min(6, Math.ceil(Math.log10(ratio)) + 1) : 0;
    for (let k = 0; k < spill; k++) {
      const sx = x0 - 6 - k * 4, sy = y1 + 2 - (k % 2) * 10;
      c += box(sx - 7, sy - 5, z0 + k * .6, sx + 7, sy + 5, z0 + k * .6 + 2.2, CERAMIC, toneI, .6);
    }

    let p = '';
    const n = stop + 1;
    for (let k = 0; k < n; k++) {
      const j = (k % 3) - 1;   // slight shuffle so it reads as a stack of paper, not a block
      p += box(PX0 - 12 + j, PY0 - 15 + j, BH + k * SLAB, PX0 + 12 + j, PY0 + 15 + j, BH + (k + 1) * SLAB, CERAMIC, toneI, .6);
    }
    p += tx(PX0 + 13.2, PY0, BH + 1, `CORPUS ${formatBytes(bytes)}`, 4.6, INK);

    // see-through container: lighter shadow
    const shadow = `<g opacity=".45">${castShadow(boxCorners(x0, y0, BH, x1, y1, z1), BH, top)}</g>`
      + castShadow(boxCorners(PX0 - 12, PY0 - 15, BH, PX0 + 12, PY0 + 15, BH + n * SLAB), BH, top);
    return shadow + byDepth([{ at: [PX0, PY0, 0], svg: p }, { at: [CX, CY, 0], svg: c }]);
  };

  const label = `${formatBytes(bytes)} corpus, about ${formatTokens(tokens)} tokens, against a ${formatTokens(WINDOW)}-token context window: ${over ? `overflows ${formatTokens(Math.ceil(ratio))} times over` : 'fits'}.`;
  return (
    <figure data-overflow={over || undefined}>
      <IsoStage board={[0, 0, 170, 80]} scene={scene} label={label} />
      <figcaption>
        <strong>{formatBytes(bytes)}</strong> ≈ <strong data-tokens={tokens}>{formatTokens(tokens)} tokens</strong>
        {' · '}window {formatTokens(WINDOW)} ({LARGEST.model})
        {' · '}{over ? <span className="over">OVERFLOW: needs {formatTokens(Math.ceil(ratio))} full windows</span> : `fills ${(ratio * 100).toPrecision(2)}%`}
      </figcaption>
    </figure>
  );
}
