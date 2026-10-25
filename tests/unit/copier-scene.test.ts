// The copier room (U26): read off runs.json, its rare marks proportional to the measured rare next-word accuracy,
// capped; the flip only with motion; every callout part drawn.
import { describe, expect, it } from 'vitest';
import {
  COPIER_PARTS,
  MAX_MARKS,
  copierAt,
  copierCard,
  copierLabel,
  copierScene,
  copierState,
  marksFor,
} from '../../src/components/scenes/copierScene';
import { LAST, genOf } from '../../src/lib/synthetic-data/runs';

const ctx = { top: [] } as never;
const draw = (o: Parameters<typeof copierScene>[0]) => copierScene(o)(ctx);

describe('the copier room', () => {
  it('at generation 5 under replace, the lit marks are the run’s rare accuracy against generation 0’s', () => {
    const o = copierAt('replace', LAST),
      st = copierState(o),
      ratio = genOf('replace', LAST).rareTop5 / genOf('replace', 0).rareTop5;
    expect(st.lit!.marks).toBe(Math.round(MAX_MARKS * ratio));
    expect(st.stacks).toHaveLength(LAST + 1);
    expect(st.stacks[0].marks).toBe(MAX_MARKS);
    const svg = draw(o);
    // without the flip, a stack's group holds no inner group: it ends at the first </g>
    const lit = svg.match(new RegExp(`<g class="copy" data-gen="${LAST}"[^>]*>([\\s\\S]*?)</g>`))![1];
    expect(lit.match(/class="mark" data-lit="1"/g)?.length ?? 0).toBe(st.lit!.marks);
    expect(lit.match(/class="mark"/g)).toHaveLength(MAX_MARKS);
  });
  it('accumulate keeps more marks than replace at generation 5, and feeds the real stack back', () => {
    const a = copierState(copierAt('accumulate', LAST)),
      r = copierState(copierAt('replace', LAST));
    expect(a.lit!.marks).toBeGreaterThan(r.lit!.marks);
    expect(a.feedsBack).toBe(true);
    expect(draw(copierAt('accumulate', LAST))).toContain('class="feed" data-lit="1"');
    expect(draw(copierAt('replace', LAST))).toContain('class="feed" data-lit="0"');
  });
  it('caps the marks and the stacks', () => {
    expect(marksFor(2, 1)).toBe(MAX_MARKS);
    expect(marksFor(-1, 1)).toBe(0);
    expect(copierState({ ...copierAt('replace', LAST), gens: Array(9).fill(0.2) }).stacks).toHaveLength(6);
  });
  it('flips the lit sheet only with motion on (reduced motion shows no flip)', () => {
    expect(draw({ ...copierAt('replace', 3), flip: true })).toContain('sd-flip');
    expect(draw({ ...copierAt('replace', 3), flip: false })).not.toContain('sd-flip');
  });
  it('draws a callout over every part it exports, and escapes pill text', () => {
    for (const block of COPIER_PARTS)
      expect(draw({ ...copierAt('replace', 2), say: { block, text: 'Here <b>' } })).toContain('Here &lt;b&gt;');
  });
  it('says what it shows in its label, and the card shows the last generation', () => {
    expect(copierLabel(copierAt('replace', 2))).toMatch(/generation 2 is shown/);
    expect(copierCard().gen).toBe(LAST);
    expect(copierLabel({ ...copierAt('replace', 0), gens: [], gen: null })).toMatch(/shelf is empty/);
  });
});
