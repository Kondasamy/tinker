// Module 7's precise view (the Attention tab): one head's attention as a flat heatmap, query tokens down the side and
// the tokens they look at across the top, and the next-token probabilities as a bar. flat.ts ink and palette.
// Every cell and bar is reachable: the heatmap is a grid of named cells ("token 4 looks at token 2: 0.61"), the bar a
// list; one item at a time takes Tab (roving, `active`), the stage moves it with the arrow keys. Cells above the
// diagonal are zero: a token never looks ahead. Phones show token numbers only (the stage lists the pieces), and the
// cells keep a minimum size, so a long prompt scrolls inside its frame rather than shrinking past reading.
import { PALS, INK, f, mix } from '../../lib/iso/core.js';
import { esc } from '../../lib/iso/blocks';
import { flatPill } from '../../lib/iso/flat';

/** A piece as the figures print it: a leading space as ␣, a newline as ↵ (a piece is often just a space). */
export const pieceLabel = (s: string) => (s === '' ? '∅' : s.replace(/ /g, '␣').replace(/\n/g, '↵'));

const PAPER = '#fbf8f0',
  HOT = PALS.cobalt.d;
const DESK = { w: 600, label: 92, head: 70, cell: 26, min: 10, fs: 9 },
  PHONE = { w: 300, label: 28, head: 26, cell: 26, min: 18, fs: 9.5 };
const PAD = 8;
const fit = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
// words drawn here are hidden from screen readers: each cell's and bar's own name says them
const text = (x: number, y: number, s: string, fs: number, anchor = 'start', extra = '') =>
  `<text x="${f(x)}" y="${f(y + fs * 0.36)}" font-size="${f(fs)}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-weight="700" fill="${INK}" aria-hidden="true"${extra}>${esc(s)}</text>`;
const round = (w: number) => (Math.round(w * 100) / 100).toFixed(2);

/** A cell's accessible name. q, k: 0-based; the name counts from 1. */
export const cellName = (q: number, k: number, w: number) =>
  k > q
    ? `token ${q + 1} can't look at token ${k + 1}, it comes later: 0`
    : `token ${q + 1} looks at token ${k + 1}: ${round(w)}`;

export interface MapOpts {
  /** the pieces read, in order */
  tokens: string[];
  /** one head's attention, [query t][key s] (rows sum to 1, zero above the diagonal) */
  weights: number[][];
  phone?: boolean;
  /** the cell that takes Tab and wears the ring, [query, key] */
  active?: [number, number];
}

/** The heatmap as an SVG string with its size: n × n cells. Every string is escaped here. */
export function attentionMap({ tokens, weights, phone = false, active }: MapOpts) {
  const L = phone ? PHONE : DESK,
    n = tokens.length;
  const cell = n ? Math.max(L.min, Math.min(L.cell, (L.w - PAD * 2 - L.label) / n)) : L.cell;
  const x0 = PAD + L.label,
    y0 = PAD + L.head,
    w = Math.max(L.w, x0 + n * cell + PAD),
    h = y0 + n * cell + PAD;
  const [aq, ak] = active ?? [n - 1, 0],
    fs = Math.min(L.fs, cell * 0.8);
  const name = (i: number) => (phone ? `${i + 1}` : `${i + 1} ${fit(pieceLabel(tokens[i]), 9)}`);
  let s = '';
  if (!n) return { svg: flatPill(L.w / 2, PAD + 20, 'NO TOKENS YET', L.fs), w: L.w, h: PAD * 2 + 40 };
  // the tokens looked at, across the top (turned on the wide view so a piece fits over its column)
  tokens.forEach((_, k) => {
    const cx = x0 + cell * (k + 0.5);
    s += phone
      ? text(cx, y0 - 10, name(k), fs, 'middle')
      : text(cx, y0 - 6, name(k), fs, 'start', ` transform="rotate(-60 ${f(cx)} ${f(y0 - 6)})"`);
  });
  for (let q = 0; q < n; q++) {
    const y = y0 + q * cell;
    s += `<g role="row" data-row="${q}">` + text(x0 - 6, y + cell / 2, name(q), fs, 'end');
    for (let k = 0; k < n; k++) {
      const v = k > q ? 0 : (weights[q]?.[k] ?? 0),
        on = q === aq && k === ak;
      s +=
        `<rect role="gridcell" tabindex="${on ? 0 : -1}" aria-label="${esc(cellName(q, k, v))}" data-q="${q}" data-k="${k}" data-w="${round(v)}"${k > q ? ' data-masked="1"' : ''}` +
        ` x="${f(x0 + k * cell + 0.5)}" y="${f(y + 0.5)}" width="${f(cell - 1)}" height="${f(cell - 1)}" rx="2"` +
        ` fill="${k > q ? PAPER : mix(PAPER, HOT, Math.min(1, v))}" fill-opacity="${k > q ? 0.35 : 1}" stroke="${on ? INK : 'none'}" stroke-width="${on ? 2.2 : 0}"/>`;
    }
    s += '</g>';
  }
  // the diagonal: each token's own cell, where its row stops
  s += `<path d="M${f(x0)} ${f(y0)}L${f(x0 + n * cell)} ${f(y0 + n * cell)}" stroke="${INK}" stroke-width=".8" stroke-dasharray="2 3" fill="none" pointer-events="none"/>`;
  return { svg: s, w, h };
}

/** The heatmap in words, for its label. */
export const mapLabel = (n: number, layer: number, head: number) =>
  n
    ? `Attention of layer ${layer + 1}, head ${head + 1}: ${n} by ${n} cells, one row per token, one column per token it can look at. Use the arrow keys to move between cells.`
    : `Attention of layer ${layer + 1}, head ${head + 1}: no tokens yet.`;

export interface Bar {
  text: string;
  p: number;
}
/** A bar's accessible name. */
export const barName = (b: Bar, i: number) => `${i + 1}. ${pieceLabel(b.text)}: ${round(b.p)}`;

/** The next-token probabilities as horizontal bars, most likely first: a list, one item per candidate. */
export function probBar(bars: Bar[], { phone = false, active = 0 }: { phone?: boolean; active?: number } = {}) {
  const W = phone ? 300 : 600,
    row = 24,
    label = phone ? 70 : 120,
    fs = phone ? 10 : 9.5,
    x0 = PAD + label,
    span = W - x0 - PAD - 44;
  if (!bars.length) return { svg: flatPill(W / 2, PAD + 14, 'NOTHING TO PREDICT YET', fs), w: W, h: PAD * 2 + 28 };
  let s = '';
  bars.forEach((b, i) => {
    const y = PAD + i * row,
      mid = y + row / 2,
      len = Math.max(1, span * Math.min(1, b.p));
    s +=
      `<g role="listitem" tabindex="${i === active ? 0 : -1}" aria-label="${esc(barName(b, i))}" data-i="${i}" data-p="${round(b.p)}">` +
      text(x0 - 6, mid, fit(pieceLabel(b.text), phone ? 9 : 16), fs, 'end') +
      `<rect x="${f(x0)}" y="${f(y + 4)}" width="${f(len)}" height="${row - 8}" rx="3" fill="${i ? PALS.cobalt.l : PALS.mustard.l}" stroke="${INK}" stroke-width="${i === active ? 2.2 : 1}"/>` +
      text(x0 + len + 6, mid, round(b.p), fs) +
      '</g>';
  });
  return { svg: s, w: W, h: PAD * 2 + bars.length * row };
}
