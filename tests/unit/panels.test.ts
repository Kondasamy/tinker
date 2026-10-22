import { describe, expect, it } from 'vitest';
import {
  LOAD_FAILED,
  cosineParts,
  cutsIn,
  fit,
  fragment,
  isNegation,
  screenDistance,
  summary,
} from '../../src/components/panels/logic';
import type { Outcome } from '../../src/components/canvas/state';

const words = 'Standard customers may ask . The refund policy does NOT apply to enterprise contracts .'.split(' ');

describe('cutsIn', () => {
  it('marks a hard cut right after NOT as a negation cut', () => {
    const cuts = cutsIn(
      [
        [0, 10],
        [10, 15],
      ],
      words,
      0,
      words.length,
    );
    expect(cuts).toEqual([{ at: 10, hard: true, negation: true }]);
  });

  it('with overlap every boundary is spanned by a neighbour, so nothing is hard', () => {
    const cuts = cutsIn(
      [
        [0, 10],
        [7, 15],
      ],
      words,
      0,
      words.length,
    );
    expect(cuts.map(c => c.at)).toEqual([7, 10]);
    expect(cuts.every(c => !c.hard && !c.negation)).toBe(true);
  });

  it('ignores boundaries outside the window and plain hard cuts are not negations', () => {
    expect(
      cutsIn(
        [
          [0, 5],
          [5, 15],
        ],
        words,
        0,
        words.length,
      ),
    ).toEqual([{ at: 5, hard: true, negation: false }]);
    expect(
      cutsIn(
        [
          [0, 5],
          [5, 15],
        ],
        words,
        6,
        15,
      ),
    ).toEqual([]);
  });
});

describe('fragment and negation', () => {
  it('flags mid-sentence starts and unfinished ends', () => {
    expect(fragment('apply to enterprise contracts.')).toEqual({ head: true, tail: false });
    expect(fragment('The refund policy does NOT')).toEqual({ head: false, tail: true });
  });
  it('matches NOT / NEVER with punctuation, not "note"', () => {
    expect(['NOT', 'NEVER,', 'note', 'not'].map(isNegation)).toEqual([true, true, false, false]);
  });
});

describe('map geometry', () => {
  it('fits points with one scale on both axes, inside the padding', () => {
    const to = fit(
      [
        [0, 0],
        [10, 0],
        [0, 5],
      ],
      100,
      10,
    );
    expect(to([0, 0])).toEqual([10, 70]);
    expect(to([10, 0])).toEqual([90, 70]);
    expect(to([0, 5])).toEqual([10, 30]); // y is flipped and uses the x scale (8 per unit)
  });
  it('screen distance scales viewBox units to pixels', () => {
    expect(screenDistance([0, 0], [3, 4], 2)).toBe(10);
  });
});

describe('cosineParts', () => {
  it('returns the dot product, both norms and the cosine', () => {
    const m = cosineParts([3, 4], [4, 3]);
    expect(m).toEqual({ dot: 24, qn: 5, cn: 5, cos: 24 / 25 });
    expect(cosineParts([0, 0], [1, 1]).cos).toBe(0);
  });
});

describe('summary (aria-live text)', () => {
  const base = { analysis: { wired: true }, preparing: false } as unknown as Outcome;
  it('states the verdict and retrieval', () => {
    const o = { ...base, answer: { verdict: 'wrong' }, record: { context: [{ score: 0.633 }] } } as unknown as Outcome;
    expect(summary(o)).toBe('Answer: WRONG. 1 chunk retrieved, best similarity 0.633.');
  });
  it('covers nothing-wired, preparing and loading', () => {
    expect(summary({ ...base, answer: { verdict: 'madeup' }, record: null } as unknown as Outcome)).toBe(
      'Answer: MADE UP. Nothing reached the model.',
    );
    expect(summary({ ...base, preparing: true } as unknown as Outcome)).toBe('Preparing these chunks…');
    expect(summary(null)).toBe('Loading the retrieval index…');
  });
  it('an empty context (graph seeded nothing) says nothing reached the model, not -Infinity', () => {
    expect(summary({ ...base, answer: { verdict: 'madeup' }, record: { context: [] } } as unknown as Outcome)).toBe(
      'Answer: MADE UP. Nothing reached the model.',
    );
  });
  it('a failed config load says so instead of preparing forever', () => {
    expect(summary({ ...base, preparing: true, failed: true, answer: null } as unknown as Outcome)).toBe(LOAD_FAILED);
  });
});
