// Diffusion LMs' precise view (KTD15): the fill strip, the reply after every pass in flat ink. A row per pass, a cell
// per reply slot: blank (dashed), stamped this pass (mint), set before (cobalt). A mustard dot in each cell is as wide as
// the model's confidence in it. Pure: the kit lays a focusable marker over each cell (arrow keys across slots and down
// passes) and reads its piece and probability out under the strip. Every string is escaped by flatPill.
import { CERAMIC, INK, PALS, f } from '../../lib/iso/core.js';
import { flatPill } from '../../lib/iso/flat';
import type { Pass } from '../../lib/diffusion-llms/decode';

export interface StripCell {
  pass: number;
  slot: number;
  x: number;
  y: number;
  size: number;
  state: 'mask' | 'new' | 'set';
  tok: number;
  p: number;
}

/** Each pass's slots as cells: what was stamped that pass, what was already set, and the guesses still blank. */
export function cellsOf(passes: Pass[], length: number) {
  const stampedAt: number[] = Array(length).fill(-1),
    tok: number[] = Array(length).fill(-1),
    prob: number[] = Array(length).fill(0);
  return passes.map((pass, n) => {
    for (const i of pass.stamped) {
      stampedAt[i] = n;
      tok[i] = pass.guesses[i]!.tok;
      prob[i] = pass.guesses[i]!.p;
    }
    return Array.from({ length }, (_, i) => {
      const g = pass.guesses[i];
      return stampedAt[i] === -1
        ? { state: 'mask' as const, tok: g?.tok ?? -1, p: g?.p ?? 0 }
        : { state: stampedAt[i] === n ? ('new' as const) : ('set' as const), tok: tok[i], p: prob[i] };
    });
  });
}

/** The strip as an SVG string, its size, and where each cell sits. */
export function fillStrip(passes: Pass[], length: number, phone = false) {
  const size = phone ? 17 : 24,
    gap = phone ? 2 : 4,
    pad = 8,
    labelW = phone ? 44 : 64,
    fs = phone ? 8.5 : 9.5,
    rowH = size + gap + 2,
    w = pad * 2 + labelW + length * (size + gap) - gap,
    h = pad * 2 + passes.length * rowH;
  const rows = cellsOf(passes, length);
  let svg = '';
  const cells: StripCell[] = [];
  rows.forEach((row, n) => {
    const y = pad + n * rowH;
    svg += flatPill(pad + labelW / 2 - 2, y + size / 2, phone ? `${n + 1}` : `PASS ${n + 1}`, fs);
    row.forEach((c, i) => {
      const x = pad + labelW + i * (size + gap);
      const fill = c.state === 'new' ? PALS.mint.l : c.state === 'set' ? PALS.cobalt.l : CERAMIC.l;
      svg += `<rect x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" rx="3" fill="${fill}" stroke="${INK}" stroke-width="${c.state === 'mask' ? 1 : 1.4}"${c.state === 'mask' ? ' stroke-dasharray="3 2"' : ''}/>`;
      if (c.p > 0) {
        const r = 1.2 + (size / 2 - 3) * c.p;
        svg += `<circle cx="${f(x + size / 2)}" cy="${f(y + size / 2)}" r="${f(r)}" fill="${PALS.mustard.l}" stroke="${INK}" stroke-width="${c.state === 'mask' ? 0.5 : 0.9}" data-p="${c.p.toFixed(3)}"/>`;
      }
      cells.push({ pass: n, slot: i, x, y, size, ...c });
    });
  });
  return { svg, w, h, cells, rows: rows.length };
}
