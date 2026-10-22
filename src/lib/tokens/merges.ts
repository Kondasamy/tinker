// Chapter 2's merge replay (R7.2): a Larkspur paragraph run through the site tokenizer's merges one at a time, and the
// question of which pair merges first. Every answer is computed from the trace, never typed.
import { mergeTrace, pieceBytes, pieceText } from '../lm/bpe';
import { SPLIT } from '../lm/bpe-train.ts';
import { CORPUS } from './counts';
import type { Encoding } from './encodings';

/** The first paragraph of Larkspur's company overview, read from the corpus. */
export const PARAGRAPH = CORPUS.find(d => d.file === 'company-overview-2025.md')!.text.split(/\n\n+/)[0];
export const TRACE = mergeTrace(PARAGRAPH);

/** The paragraph's tokens after `k` merges (0: single bytes). */
export const idsAt = (k: number) => (k === 0 ? TRACE.start : TRACE.steps[k - 1].ids);
export const encodingOfIds = (ids: number[]): Encoding => ({
  ids,
  pieces: ids.map(id => pieceText(id) ?? [...pieceBytes(id)]),
});

/** A token as the reader sees it: a space drawn as ␣. */
export const shownPiece = (id: number) => (pieceText(id) ?? '?').replace(/ /g, '␣');
export const pairLabel = ([a, b]: readonly [number, number]) => `“${shownPiece(a)}” + “${shownPiece(b)}”`;

/** How often each side-by-side pair of bytes appears in the paragraph, inside a word only: the tokenizer never merges
 * across the word splits (SPLIT). Most frequent first; ties by byte order, so the list is stable. */
export function pairCounts(text = PARAGRAPH): { pair: [number, number]; count: number }[] {
  const n = new Map<string, number>(),
    enc = new TextEncoder();
  for (const w of text.match(SPLIT) ?? []) {
    const b = enc.encode(w);
    for (let i = 0; i < b.length - 1; i++) n.set(`${b[i]},${b[i + 1]}`, (n.get(`${b[i]},${b[i + 1]}`) ?? 0) + 1);
  }
  return [...n]
    .map(([k, count]) => ({ pair: k.split(',').map(Number) as [number, number], count }))
    .sort((x, y) => y.count - x.count || x.pair[0] - y.pair[0] || x.pair[1] - y.pair[1]);
}

const same = (p: readonly number[], q: readonly number[]) => p[0] === q[0] && p[1] === q[1];

/** Which pair merges first: the trace's first merge, among the paragraph's most frequent pairs, most frequent first. */
export const FIRST = (() => {
  const first = TRACE.steps[0].pair,
    counts = pairCounts();
  const options = [
    first,
    ...counts
      .filter(c => !same(c.pair, first))
      .slice(0, 3)
      .map(c => c.pair),
  ]
    .map(pair => ({ pair, count: counts.find(c => same(c.pair, pair))!.count }))
    .sort((x, y) => y.count - x.count);
  return { options, correct: options.findIndex(o => same(o.pair, first)), commonest: counts[0] };
})();

/** The merge step (1-based) at which the paragraph's commonest pair finally merged, or null if it never did. */
export const commonestAt = (() => {
  const i = TRACE.steps.findIndex(s => same(s.pair, FIRST.commonest.pair));
  return i < 0 ? null : i + 1;
})();
