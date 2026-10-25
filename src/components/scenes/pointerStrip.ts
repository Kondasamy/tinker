// The Compression module's precise view for pointers: the text as a strip of cells, a row at a time. A literal keeps
// its character; the bytes a pointer copies sit in tomato cells, and an arc runs from the pointer's first cell back to
// where its copy starts. Pure layout and words; the kit draws it as React SVG, so it has no markup to escape.
import { isPointer, tokensOf, type Token } from '../../lib/compression/lz77';
import { byteName } from '../../lib/compression/files';

export interface Cell {
  i: number;
  x: number;
  y: number;
  ch: string;
  /** a literal, or a byte a pointer copied */
  kind: 'lit' | 'copy';
}
export interface Arc {
  /** the pointer's first cell, and where its copy starts */
  from: number;
  to: number;
  dist: number;
  len: number;
}

/** The strip for some text: cells in rows of `perRow`, and an arc per pointer (none when `pointers` is off). */
export function pointerStrip(bytes: Uint8Array, { perRow = 28, size = 18, pointers = true } = {}) {
  const tokens: Token[] = pointers ? tokensOf(bytes) : [...bytes].map(lit => ({ lit }));
  const gap = 2,
    rowH = size + 30,
    pad = 6,
    top = 28;
  const cells: Cell[] = [],
    arcs: Arc[] = [];
  let i = 0;
  for (const t of tokens) {
    const n = isPointer(t) ? t.len : 1;
    if (isPointer(t)) arcs.push({ from: i, to: i - t.dist, dist: t.dist, len: t.len });
    for (let k = 0; k < n; k++, i++)
      cells.push({
        i,
        x: pad + (i % perRow) * (size + gap),
        y: top + Math.floor(i / perRow) * rowH,
        ch: byteName(bytes[i]),
        kind: isPointer(t) ? 'copy' : 'lit',
      });
  }
  const rows = Math.max(1, Math.ceil(bytes.length / perRow));
  return {
    cells,
    arcs,
    tokens: tokens.length,
    size,
    w: pad * 2 + perRow * (size + gap) - gap,
    h: top + rows * rowH - 24,
  };
}

/** The strip in words, for its label. */
export function stripLabel(s: ReturnType<typeof pointerStrip>): string {
  const lits = s.tokens - s.arcs.length;
  return (
    `The text as ${s.cells.length} cells: ${lits} literal${lits === 1 ? '' : 's'} and ${s.arcs.length} pointer${s.arcs.length === 1 ? '' : 's'}` +
    (s.arcs.length ? `, ${s.arcs.map(a => `back ${a.dist}, copy ${a.len}`).join('; ')}.` : '.')
  );
}
