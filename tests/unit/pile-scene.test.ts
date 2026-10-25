// Compression's stage (U10): the sorting table's parts and pills, the merge rule (any two of the lowest weights, ties
// included, anything else refused with the rule), the puzzle's and a big file's pile caps, the reader's tree checked by
// its total length, the bench's listbox markup and the precise views.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_PILES,
  PILE_BOARD,
  PILE_PARTS,
  pileAt,
  pileLabel,
  pileScene,
  pileState,
  pilePlot,
  type PileOpts,
} from '../../src/components/scenes/pileScene';
import { pointerStrip, stripLabel } from '../../src/components/scenes/pointerStrip';
import {
  MergeBench,
  StripView,
  TreeView,
  enc,
  finish,
  forestOf,
  forestTable,
  merged,
  mergeCheck,
} from '../../src/content/compression/kit';
import { FILES, PUZZLE, fileOf } from '../../src/lib/compression/files';
import { costOf, countOf, treeOf, type Node } from '../../src/lib/compression/huffman';
import { SCANNERS } from '../../src/lib/compression/story';

const draw = (o: PileOpts) =>
  renderToString(createElement(IsoStage, { board: PILE_BOARD, scene: pileScene(o), label: pileLabel(o) }));
const best = costOf(treeOf(countOf(enc(PUZZLE))));
const leaf = (sym: number, w: number): Node => ({ w, sym, min: sym });

describe('the sorting table', () => {
  it('draws every part a callout may name, and the callout itself', () => {
    const o = { ...forestTable(finish(forestOf(PUZZLE)), true), parcel: { raw: 10, packed: 4 } };
    for (const p of PILE_PARTS) {
      expect(draw(o)).toContain(`data-prop="${p}"`);
      expect(draw({ ...o, say: { block: p, text: 'Here' } })).toContain('Here');
    }
  });

  it('shows a big file as at most eight piles, the eighth “others”', () => {
    for (const f of FILES) {
      const o = pileAt(f.bytes),
        st = pileState(o);
      expect(st.shown.length).toBeLessThanOrEqual(MAX_PILES);
      if (countOf(f.bytes).size > MAX_PILES) expect(st.shown.at(-1)).toMatchObject({ label: 'others', kind: 'others' });
      expect(st.shown.reduce((a, p) => a + p.w, 0)).toBe(f.bytes.length);
    }
  });

  it('the puzzle’s text has at most eight symbols and no “others” pile', () => {
    const f = forestOf(PUZZLE);
    expect(f.length).toBeLessThanOrEqual(MAX_PILES);
    expect(forestTable(f, false).piles.some(p => p.kind === 'others')).toBe(false);
  });

  it('a parcel that grew says so, and every pill is escaped', () => {
    const r = fileOf('random').bytes;
    expect(pileLabel(pileAt(r, r.length + 10))).toContain('bigger than it started');
    const svg = draw({ piles: [{ label: '<script>x</script>', w: 1 }] });
    expect(svg).not.toContain('<script>x');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('draws the hero plot', () => {
    const plot = createElement(IsoStage, { board: PILE_BOARD, scene: ctx => pilePlot(40, 40, ctx.top), label: '' });
    expect(renderToString(plot)).toContain('<path');
  });
});

describe('the merge rule (KTD15)', () => {
  it('accepts the two lightest piles, and either pile of a tie', () => {
    const f = [leaf(97, 1), leaf(98, 1), leaf(99, 1), leaf(100, 4)];
    expect(mergeCheck(f, 0, 1).ok).toBe(true);
    expect(mergeCheck(f, 0, 2).ok).toBe(true);
    expect(mergeCheck(f, 2, 1).ok).toBe(true);
  });

  it('refuses any other pair, with the rule as the reason', () => {
    const f = [leaf(97, 1), leaf(98, 2), leaf(99, 3), leaf(100, 4)];
    const r = mergeCheck(f, 0, 3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/d weighs 4, but b weighs only 2: merge the two lightest piles\./);
    const s = mergeCheck(f, 1, 2);
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.why).toMatch(/weighs only 1/);
  });

  it('every tree a reader can build by the rule has the engine’s total length', () => {
    // walk every accepted choice at every merge
    const totals = new Set<number>();
    const walk = (f: Node[]) => {
      if (f.length === 1) return void totals.add(costOf(f[0]));
      for (let i = 0; i < f.length; i++)
        for (let j = i + 1; j < f.length; j++) if (mergeCheck(f, i, j).ok) walk(merged(f, i, j));
    };
    walk(forestOf(PUZZLE));
    expect([...totals]).toEqual([best]);
    expect(costOf(finish(forestOf(PUZZLE))[0])).toBe(best);
  });
});

describe('the bench and the precise views', () => {
  it('the bench is one listbox, focusable, pointing at its active option', () => {
    const html = renderToString(
      createElement(MergeBench, { forest: forestOf(PUZZLE), onMerge: () => {}, onMiss: () => {} }),
    );
    expect(html).toContain('role="listbox"');
    expect(html).toContain('aria-multiselectable="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-activedescendant="cz-piles-0"');
    expect(html.split('role="option"').length - 1).toBe(forestOf(PUZZLE).length);
  });

  it('the strip has two pointers over the scanner names, and says so', () => {
    const s = pointerStrip(enc(SCANNERS));
    expect(s.arcs).toHaveLength(2);
    for (const a of s.arcs) expect(SCANNERS.slice(a.to, a.to + a.len)).toBe(SCANNERS.slice(a.from, a.from + a.len));
    expect(stripLabel(s)).toMatch(/2 pointers/);
    expect(renderToString(createElement(StripView, { text: SCANNERS, pointers: true }))).toContain('data-dist');
  });

  it('the code tree labels every letter with its code', () => {
    const html = renderToString(createElement(TreeView, { root: finish(forestOf(PUZZLE))[0] }));
    expect(html.split('data-leaf=').length - 1).toBe(forestOf(PUZZLE).length);
  });
});
