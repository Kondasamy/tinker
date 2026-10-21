// Module 10's precise view (the Mask tab): Larkspur mini's whole vocabulary as a flat grid of tiles, one per token id,
// lit where the schema allows the token at this step and pale where it blocks it. The token written wears an ink ring,
// and the model's own first choice, when blocked, a red one. flat.ts ink and palette. The grid is a picture
// (role img); the stage lists the likeliest allowed tokens beside it as a focusable list.
import { PALS, INK, f } from '../../lib/iso/core.js';

const PAPER = '#fbf8f0';
const DESK = { w: 600, pad: 6, cols: 48 }, PHONE = { w: 320, pad: 4, cols: 32 };

export interface GridOpts {
  vocab: number;
  allowed: number[];
  /** the token written at this step */
  pick?: number;
  /** the model's own first choice, before the mask */
  free?: number;
  phone?: boolean;
}

/** The grid as an SVG string with its size. Ids only, no strings from tokens, so nothing here needs escaping. */
export function maskGrid({ vocab, allowed, pick, free, phone = false }: GridOpts) {
  const L = phone ? PHONE : DESK, COLS = L.cols, cell = (L.w - L.pad * 2) / COLS, rows = Math.ceil(vocab / COLS);
  const on = new Set(allowed);
  let s = '';
  for (let id = 0; id < vocab; id++) {
    const x = L.pad + (id % COLS) * cell, y = L.pad + Math.floor(id / COLS) * cell, lit = on.has(id);
    s += `<rect data-id="${id}"${lit ? ' data-allowed="1"' : ''} x="${f(x + .6)}" y="${f(y + .6)}" width="${f(cell - 1.2)}" height="${f(cell - 1.2)}" rx="1.5"`
      + ` fill="${lit ? PALS.mint.m : PAPER}" fill-opacity="${lit ? 1 : .55}" stroke="${lit ? INK : '#d8d0bf'}" stroke-width="${lit ? .8 : .5}"/>`;
  }
  const ring = (id: number | undefined, colour: string, w: number, attr: string) => {
    if (id === undefined) return '';
    const x = L.pad + (id % COLS) * cell, y = L.pad + Math.floor(id / COLS) * cell;
    return `<rect ${attr}="${id}" x="${f(x - 1)}" y="${f(y - 1)}" width="${f(cell + 2)}" height="${f(cell + 2)}" rx="2.5" fill="none" stroke="${colour}" stroke-width="${w}"/>`;
  };
  if (free !== undefined && !on.has(free)) s += ring(free, PALS.tomato.d, 2.4, 'data-free');
  s += ring(pick, INK, 2.4, 'data-pick');
  return { svg: s, w: L.w, h: L.pad * 2 + rows * cell };
}

/** The grid in words, for its aria-label. */
export const gridLabel = (vocab: number, allowed: number) =>
  `Larkspur mini's ${vocab} tokens as a grid: ${allowed} allowed by the schema at this step, ${vocab - allowed} blocked.`;
