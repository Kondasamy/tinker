// Who labels the data's chapters against the engine and the pins (KTD9): every prediction's outcome is computed from
// the frozen labels, the reveals quote pinned numbers, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/labelling/pinned.json' with { type: 'json' };
import { MODELS, nameOf } from '../../src/lib/labelling/story';
import { START, WINNERS, passes, resultOf, wins } from '../../src/lib/labelling/workbench';
import * as ch1 from '../../src/content/labelling/01-someone-has-to-decide';
import * as ch2 from '../../src/content/labelling/02-how-often-do-they-agree';
import * as ch3 from '../../src/content/labelling/03-write-the-rule-down';
import * as ch4 from '../../src/content/labelling/04-check-the-checkers';
import * as ch5 from '../../src/content/labelling/05-many-votes';
import * as ch6 from '../../src/content/labelling/06-label-the-hard-ones-first';
import * as ch7 from '../../src/content/labelling/07-workbench';

describe('the chapters’ reveals match the frozen labels and the pins', () => {
  it('chapter 1: before the guideline, the three pick three different holes', () => {
    expect(ch1.HOLES).toBe(3);
    expect(ch1.P1.options[ch1.OUTCOME]).toMatch(/^Three/);
  });
  it('chapter 2: luck is about one in five, and kappa is the pinned 0.68 and 0.39', () => {
    expect(ch2.RM.luck).toBeCloseTo(0.2, 2);
    expect(ch2.P1.options[ch2.OUTCOME]).toBe('About 1 ticket in 5');
    expect(ch2.KAPPA.rm).toBeCloseTo(pinned.kappa.before['rosa-mira'], 10);
    expect(ch2.KAPPA.rt).toBeCloseTo(pinned.kappa.before['rosa-tom'], 10);
  });
  it('chapter 3: the guideline moves Mira’s slip on its ticket, and one or two splits are left', () => {
    expect(ch3.P1.options[ch3.OUTCOME]).toBe('Only one or two');
    expect(ch3.T.intent).toBe('refund');
  });
  it('chapter 4: the gold check flags Tom alone', () => {
    expect(ch4.FLAGGED).toEqual(['tom']);
    expect(ch4.SCORES).toEqual(pinned.gold.scores);
    expect(ch4.P1.options[ch4.OUTCOME]).toBe('Tom');
  });
  it('chapter 5: on the pinned ticket the vote is wrong and the outvoted one was right', () => {
    expect(ch5.VOTE).not.toBe(ch5.T.intent);
    expect(Object.values(ch5.PICKS)).toContain(ch5.T.intent);
    expect(ch5.P1.options[ch5.OUTCOME]).toMatch(/^Yes/);
    expect(nameOf(ch5.T.intent)).toBe('Delivery');
  });
  it('chapter 6: least sure first wins, and the model’s slip on the split ticket is right', () => {
    expect(ch6.P1.options[ch6.OUTCOME]).toBe('Least sure first');
    expect(MODELS.main.labels[ch6.SPLIT.id]).toBe(ch6.SPLIT.intent);
    expect(pinned.models.main).toBe(1);
    expect(pinned.models.check).toBe(1);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a setup in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ votes: shown.votes, gold: shown.gold, hard: shown.hard });
  });
  it('the start is not a winner and misses the bar', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(passes(resultOf(START))).toBe(false);
  });
  it('the quiz’s vote of three clears the bar too, with the same labels right, for more', () => {
    const v = resultOf(ch7.VOTED),
      best = resultOf(WINNERS[0]);
    expect(passes(v)).toBe(true);
    expect(wins(ch7.VOTED)).toBe(false);
    expect(v.right).toBe(best.right);
    expect(v.cost).toBeGreaterThan(best.cost);
  });
});
