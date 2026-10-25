// Mixture of experts' chapters against the engine and the pins (KTD12): every reveal says what the toy shows, Show me
// lands where it should, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { ROOMS } from '../../src/lib/mixture-of-experts/routes';
import { START, WINNERS, wins } from '../../src/lib/mixture-of-experts/workbench';
import * as ch3 from '../../src/content/mixture-of-experts/03-what-the-experts-learned';
import * as ch4 from '../../src/content/mixture-of-experts/04-send-it-elsewhere';
import * as ch5 from '../../src/content/mixture-of-experts/05-the-busy-room';
import * as ch6 from '../../src/content/mixture-of-experts/06-total-versus-active';
import * as ch7 from '../../src/content/mixture-of-experts/07-workbench';

describe('the chapters’ reveals match the toy', () => {
  it('chapter 3: some room takes full stops and “ the”, another word endings', () => {
    const floor = ROOMS.tops[0];
    expect(floor.some(t => t.includes('.') && t.includes(' the'))).toBe(true);
    expect(floor.some(t => t.filter(x => ['s', 'e', 'd', 'es', 'ed', 'ing'].includes(x)).length >= 3)).toBe(true);
    expect(ch3.P1.options[0]).toMatch(/^Kinds of token/);
  });
  it('chapter 4: Show me sends the last token to the pinned rooms and passes', () => {
    const step = ch4.STEPS.find(s => s.id === 'override')!;
    const blank = { sel: null, p1: 0, override: {}, guess: null, quiz: null };
    expect(step.predicate(blank)).toBe(false);
    const shown = step.solution!(blank);
    expect(shown.override[ch4.LAST]).toEqual(ch4.PINNED_ROOMS);
    expect(step.predicate(shown)).toBe(true);
    expect(ch4.AFTER).not.toBe(ch4.BEFORE);
  });
  it('chapter 5: tokens drop at factor 1 and none at 2 or with no limit', () => {
    expect(ch5.droppedAt(1)).toBeGreaterThan(0);
    expect(ch5.droppedAt(2)).toBe(0);
    expect(ch5.droppedAt(null)).toBe(0);
    expect(ch5.guessAt(1)).not.toBe(ch5.guessAt(null));
  });
  it('chapter 6: the experts toy beat the active-matched dense toy, as the copy says', () => {
    expect(ch6.OUTCOME).toBe(0);
    expect(Math.abs(ROOMS.active / ROOMS.dense.params - 1)).toBeLessThan(0.05);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a plan in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ card: shown.card, bits: shown.bits });
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
});
