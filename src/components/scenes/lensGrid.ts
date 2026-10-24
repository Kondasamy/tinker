// Interpretability's precise view (the Lens tab): the logit lens for one position as a flat grid, one row per stage
// (after the embedding, after block 1, the output) and one column per guess, likeliest first. flat.ts ink and palette.
// Every cell is a named grid cell ("After block 1, guess 2: days, 0.21"); one takes Tab at a time (roving, `active`)
// and the stage moves it with the arrow keys. A watched token's cells are mint, so the reader sees where it appears.
import { INK, PALS, f, mix } from '../../lib/iso/core.js';
import { esc } from '../../lib/iso/blocks';
import { flatPill } from '../../lib/iso/flat';
import { pieceLabel } from './attentionMap';

export interface Guess {
  text: string;
  p: number;
}
export interface LensOpts {
  /** the stages' names, bottom of the model first */
  stages: readonly string[];
  /** [stage] the top guesses at the probed position */
  guesses: Guess[][];
  /** a token to mark wherever it appears */
  watch?: string;
  phone?: boolean;
  /** the cell that takes Tab and wears the ring, [stage, rank] */
  active?: [number, number];
}

const PAPER = '#fbf8f0';
const round = (p: number) => (Math.round(p * 100) / 100).toFixed(2);
const fit = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const text = (x: number, y: number, s: string, fs: number, anchor = 'middle') =>
  `<text x="${f(x)}" y="${f(y + fs * 0.36)}" font-size="${f(fs)}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-weight="700" fill="${INK}" aria-hidden="true">${esc(s)}</text>`;

/** A cell's accessible name. */
export const lensCellName = (stage: string, rank: number, g: Guess) =>
  `${stage}, guess ${rank + 1}: ${pieceLabel(g.text)}, ${round(g.p)}`;

/** The grid as an SVG string with its size. Every string is escaped here. */
export function lensGrid({ stages, guesses, watch, phone = false, active = [stages.length - 1, 0] }: LensOpts) {
  const W = phone ? 300 : 600,
    label = phone ? 64 : 120,
    pad = 8,
    rowH = phone ? 40 : 34,
    fs = phone ? 9.5 : 10,
    k = Math.max(0, ...guesses.map(g => g.length));
  if (!k) return { svg: flatPill(W / 2, pad + 20, 'NOTHING TO READ YET', fs), w: W, h: pad * 2 + 40 };
  const cw = (W - pad * 2 - label) / k;
  let s = '';
  // the output on top, as the model stacks its blocks; rows are drawn top-down from the last stage
  const order = stages.map((_, i) => stages.length - 1 - i);
  order.forEach((st, row) => {
    const y = pad + row * rowH;
    s += `<g role="row" data-stage="${st}">${text(pad + label - 6, y + rowH / 2, phone ? fit(stages[st], 9) : stages[st], fs, 'end')}`;
    (guesses[st] ?? []).forEach((g, r) => {
      const on = active[0] === st && active[1] === r,
        hit = watch !== undefined && g.text === watch;
      const x = pad + label + r * cw;
      s +=
        `<g role="gridcell" tabindex="${on ? 0 : -1}" aria-label="${esc(lensCellName(stages[st], r, g))}" data-stage="${st}" data-rank="${r}"${hit ? ' data-watch="1"' : ''}>` +
        `<rect x="${f(x + 2)}" y="${f(y + 3)}" width="${f(cw - 4)}" height="${f(rowH - 6)}" rx="4" fill="${hit ? PALS.mint.l : mix(PAPER, PALS.cobalt.l, Math.min(1, g.p * 2))}" stroke="${INK}" stroke-width="${on ? 2.4 : 1}"/>` +
        text(x + cw / 2, y + rowH / 2 - (phone ? 6 : 0), fit(pieceLabel(g.text), phone ? 6 : 10), fs) +
        (phone ? text(x + cw / 2, y + rowH / 2 + 8, round(g.p), fs - 1) : '') +
        '</g>';
    });
    s += '</g>';
  });
  return { svg: s, w: W, h: pad * 2 + stages.length * rowH };
}

export const lensLabel = (pos: number, piece: string) =>
  `The logit lens at token ${pos + 1} (${pieceLabel(piece)}): one row per stage, the output on top, its likeliest guesses left to right. Use the arrow keys to move between them.`;
