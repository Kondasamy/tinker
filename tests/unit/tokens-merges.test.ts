// Chapter 2's merge replay: the predicted first merge is the trace's, and the replay ends at the tokenizer's own output.
import { describe, expect, it } from 'vitest';
import { encode, mergeTrace } from '../../src/lib/lm/bpe';
import { FIRST, PARAGRAPH, TRACE, commonestAt, idsAt, pairCounts, pairLabel } from '../../src/lib/tokens/merges';

describe('chapter 2 merge replay', () => {
  it('replays a Larkspur paragraph from bytes to the encoded tokens', () => {
    expect(PARAGRAPH).toMatch(/^Larkspur/);
    expect(idsAt(0)).toEqual([...new TextEncoder().encode(PARAGRAPH)]);
    expect(idsAt(TRACE.steps.length)).toEqual(encode(PARAGRAPH));
  });

  it('the answer to “which pair merges first” is the trace’s first merge', () => {
    const first = mergeTrace(PARAGRAPH).steps[0].pair;
    expect(FIRST.options[FIRST.correct].pair).toEqual(first);
    expect(FIRST.options).toHaveLength(4);
    expect(new Set(FIRST.options.map(o => pairLabel(o.pair))).size).toBe(4);
    // every option is a pair that really occurs in the paragraph
    for (const o of FIRST.options) expect(pairCounts().some(c => c.pair[0] === o.pair[0] && c.pair[1] === o.pair[1])).toBe(true);
  });

  it('the commonest pair in the paragraph is not the first merge: the order comes from the training text', () => {
    expect(FIRST.options[FIRST.correct].count).toBeLessThan(FIRST.commonest.count);
    expect(commonestAt).toBeGreaterThan(1);
  });
});
