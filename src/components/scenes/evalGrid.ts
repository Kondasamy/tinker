// Module 4's precise view (the Results tab): questions × versions as a flat grid of PASS / FAIL stamps (flat.ts ink and
// palette). A cell whose verdict differs from the version before or after it is flipped: tinted, ringed and marked ⇄.
// Each cell is an image with its own name ("Q3, v2: failed, was passing"). Phones show question numbers only; the
// stage lists the full questions under the grid.
import { PALS, INK, f } from '../../lib/iso/core.js';
import { esc } from '../../lib/iso/blocks';
import { flatPill, stamp } from '../../lib/iso/flat';

export interface GridCol { id: string; label: string; results: boolean[] }
export interface GridOpts { questions: string[]; cols: GridCol[]; phone?: boolean }

const word = (ok: boolean) => (ok ? 'passed' : 'failed');
/** flipped[c][q]: column c's verdict on question q differs from the column before or after it. */
export const flips = (cols: GridCol[]) => cols.map((c, i) => c.results.map((ok, q) =>
  (i > 0 && cols[i - 1].results[q] !== ok) || (i < cols.length - 1 && cols[i + 1].results[q] !== ok)));
/** The questions (0-based, sorted, once each) whose verdict flips anywhere in the grid. */
export const flippedQuestions = (cols: GridCol[]) =>
  [...new Set(flips(cols).flatMap(c => c.flatMap((x, q) => (x ? [q] : []))))].sort((a, b) => a - b);

/** A cell's accessible name: the verdict, then what changed against the version before it (or after it, for the first). */
export function cellName(cols: GridCol[], c: number, q: number): string {
  const ok = cols[c].results[q], prev = cols[c - 1]?.results[q], next = cols[c + 1]?.results[q];
  const change = prev !== undefined && prev !== ok ? `, was ${prev ? 'passing' : 'failing'}`
    : next !== undefined && next !== ok ? `, ${next ? 'passes' : 'fails'} in ${cols[c + 1].label}` : '';
  return `Q${q + 1}, ${cols[c].label}: ${word(ok)}${change}`;
}

const DESK = { w: 600, label: 300, head: 34, row: 30, fs: 9 }, PHONE = { w: 300, label: 40, head: 38, row: 32, fs: 10 };
const PAD = 8;
const fit = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const text = (x: number, y: number, s: string, fs: number, anchor = 'start', weight = 700) =>
  `<text x="${f(x)}" y="${f(y + fs * .36)}" font-size="${f(fs)}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" fill="${INK}">${esc(s)}</text>`;

/** The grid as an SVG string with its size. Every string is escaped here. */
export function evalGrid({ questions, cols, phone = false }: GridOpts) {
  const L = phone ? PHONE : DESK, n = questions.length, cw = cols.length ? (L.w - PAD * 2 - L.label) / cols.length : 0;
  const h = PAD * 2 + L.head + n * L.row, flipped = flips(cols), cx = (c: number) => PAD + L.label + cw * (c + .5);
  const chars = Math.floor((L.label - 12) / (L.fs * .62)) - 4;
  let s = '';
  cols.forEach((c, i) => {
    const p = c.results.filter(Boolean).length;
    s += `<g class="col-head" data-col="${esc(c.id)}">${flatPill(cx(i), PAD + L.head / 2, `${c.label} ${p}/${c.results.length}`, L.fs)}</g>`;
  });
  questions.forEach((q, r) => {
    const y = PAD + L.head + r * L.row, mid = y + L.row / 2;
    if (r % 2 === 0) s += `<rect x="${PAD}" y="${f(y)}" width="${L.w - PAD * 2}" height="${L.row}" rx="4" fill="${PALS.mustard.l}" fill-opacity=".12"/>`;
    s += text(PAD + 4, mid, phone ? `Q${r + 1}` : `Q${r + 1}  ${fit(q, chars)}`, L.fs, 'start', phone ? 800 : 700);
    cols.forEach((c, i) => {
      const ok = c.results[r], flip = flipped[i][r], x = cx(i) - cw / 2 + 3, w = cw - 6;
      s += `<g class="cell" role="img" aria-label="${esc(cellName(cols, i, r))}" data-pass="${ok ? 1 : 0}"${flip ? ' data-flip="1"' : ''}>`
        + `<rect x="${f(x)}" y="${f(y + 3)}" width="${f(w)}" height="${L.row - 6}" rx="5" fill="${flip ? PALS.mustard.l : '#fbf8f0'}" fill-opacity="${flip ? .55 : 1}" stroke="${INK}" stroke-width="${flip ? 2 : .8}"/>`
        + stamp(ok ? 'PASS' : 'FAIL', cx(i) - (flip ? L.fs * .7 : 0), mid, L.fs * .9)
        + (flip ? text(x + w - 4, mid, '⇄', L.fs * 1.2, 'end', 800) : '') + '</g>';
    });
  });
  return { svg: s, w: L.w, h };
}

/** The grid in words, for its label: each version's score and the flipped questions. */
export function gridLabel(cols: GridCol[]): string {
  if (!cols.length) return 'Results: no versions run yet.';
  const qs = flippedQuestions(cols).map(q => q + 1);
  return `Results: ${cols[0].results.length} questions × ${cols.length} versions. ${cols.map(c => `${c.label} passed ${c.results.filter(Boolean).length}`).join(', ')}.`
    + (qs.length ? ` Flipped: ${qs.map(q => `Q${q}`).join(', ')}.` : ' Nothing flipped.');
}
