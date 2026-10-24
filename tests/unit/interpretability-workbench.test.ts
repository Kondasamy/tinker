// Interpretability's chapters against the live model: each prediction's outcome is read off Larkspur mini, as the copy
// says, and chapter 7's Show me is one of WINNERS.
import { describe, expect, it } from 'vitest';
import { diskModel } from '../../src/lib/transformers/diskModel';
import { FUSES } from '../../src/lib/interpretability/probe';
import { WINNERS, isWinner, keeps } from '../../src/lib/interpretability/workbench';
import { STEPS as CH7, FIRST, SECOND } from '../../src/content/interpretability/07-the-smallest-set';
import { outcomeOf as ch2 } from '../../src/content/interpretability/02-pull-a-fuse';
import { firstStage, PREDICT } from '../../src/content/interpretability/03-the-guess-forming';
import { outcomeOf as ch4, SWAP, LAST } from '../../src/content/interpretability/04-patching';
import { outcomeOf as ch5 } from '../../src/content/interpretability/05-steering';
import { MIXED, OUTCOME as ch6, TOTAL } from '../../src/content/interpretability/06-one-neuron-many-meanings';
import { STEPS as CH1 } from '../../src/content/interpretability/01-why-did-it-say-that';

const m = diskModel();

describe('chapter outcomes, read off the model', () => {
  it('chapter 2: the word-start head loses some right guesses, not most', () => expect(ch2(m)).toBe(1));
  it('chapter 3: the expected token first reaches the top 5 after block 1', () =>
    expect(firstStage(m, PREDICT.id)).toBe(1));
  it('chapter 4: before block 1 only the swapped word flips the answer', () => {
    expect(SWAP).toBeGreaterThan(0);
    expect(SWAP).toBeLessThan(LAST);
    expect(ch4(m)).toBe(0);
  });
  it('chapter 5: the steered target rises into the top 5', () => expect(ch5(m)).toBe(0));
  it('chapter 6: most neurons mix kinds', () => {
    expect(MIXED * 2).toBeGreaterThanOrEqual(TOTAL);
    expect(ch6).toBe(1);
  });
  it('chapter 1: no step advances before the model has loaded in the browser', () => {
    // in the test the fine-tuning loader has nothing loaded, so step 1's predicate holds back
    expect(CH1[0].predicate({ seen: true } as never)).toBe(false);
  });
});

describe('chapter 7', () => {
  it('Show me lands on one of WINNERS for each behaviour, and it keeps the answer', () => {
    const [first, second] = CH7;
    const start = { behaviour: FIRST.id, kept: [...FUSES], quiz: null };
    const a = first.solution!(first.setup!(start));
    expect(isWinner(FIRST.id, a.kept)).toBe(true);
    expect(WINNERS[FIRST.id]).toContainEqual(a.kept);
    expect(keeps(m, FIRST.id, a.kept)).toBe(true);
    const b = second.solution!(second.setup!(a));
    expect(WINNERS[SECOND.id]).toContainEqual(b.kept);
    expect(keeps(m, SECOND.id, b.kept)).toBe(true);
  });
  it('the first behaviour has several answers, the second needs five of six', () => {
    expect(WINNERS[FIRST.id].length).toBeGreaterThan(1);
    expect(WINNERS[SECOND.id].every(w => w.length === 5)).toBe(true);
  });
  it('a set is a winner whatever order its fuses are in, and all fuses in is not', () => {
    expect(isWinner(FIRST.id, [...WINNERS[FIRST.id][0]].reverse())).toBe(true);
    expect(isWinner(FIRST.id, [...FUSES])).toBe(false);
  });
});
