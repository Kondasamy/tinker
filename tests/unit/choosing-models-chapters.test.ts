// Choosing a model's chapters against the engine and the pins (KTD7): every prediction's outcome is computed, every
// slide step accepts what the steelyard says and its Show me passes, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/choosing-models/pinned.json' with { type: 'json' };
import { BAR, REPLY, machineOf, passesOf } from '../../src/lib/choosing-models/machines';
import { per1000, wholeReply } from '../../src/lib/choosing-models/price';
import { rowsOf, weigh } from '../../src/lib/choosing-models/score';
import { START, TEAMS, WINNERS, wins } from '../../src/lib/choosing-models/workbench';
import { inPlay } from '../../src/content/choosing-models/kit';
import * as ch1 from '../../src/content/choosing-models/01-the-leaderboard';
import * as ch2 from '../../src/content/choosing-models/02-your-own-questions';
import * as ch3 from '../../src/content/choosing-models/03-price-per-answer';
import * as ch4 from '../../src/content/choosing-models/04-the-wait';
import * as ch5 from '../../src/content/choosing-models/05-good-enough';
import * as ch6 from '../../src/content/choosing-models/06-models-change';
import * as ch7 from '../../src/content/choosing-models/07-workbench';

const step = <S>(steps: { id: string; predicate: (s: S) => boolean; solution?: (s: S) => S }[], id: string) =>
  steps.find(s => s.id === id)!;

describe('the chapters’ reveals match the engine and the pins', () => {
  it('chapter 1: quality alone tips to the public leader; Show me tips it', () => {
    expect(ch1.P1.options[ch1.OUTCOME]).toBe(`Machine ${pinned.publicOrder[0]}`);
    const slide = step(ch1.STEPS, 'slide'),
      blank = { w: { quality: 0, cost: 0, wait: 0 }, p1: 0, quiz: null };
    expect(slide.predicate(blank)).toBe(false);
    expect(slide.predicate(slide.solution!(blank))).toBe(true);
  });
  it('chapter 2: the public second lands last on Larkspur’s 20', () => {
    expect(ch2.PUBLIC).toEqual(pinned.publicOrder);
    expect(ch2.OWN).toEqual(pinned.larkspurOrder);
    expect(ch2.P1.options[ch2.OUTCOME]).toBe('Last');
  });
  it('chapter 3: A costs about the stated times C; one cost notch tips the beam away from A', () => {
    // from the unrounded prices: the pins round to the cent
    expect(ch3.TIMES).toBe(Math.round(per1000(machineOf('A'), REPLY) / per1000(machineOf('C'), REPLY)));
    expect(ch3.P1.options[ch3.OUTCOME]).toBe(`About ${ch3.TIMES} times`);
    expect(ch4.P1.options[ch4.OUTCOME]).toBe(`After about ${ch4.WHOLE_A} s`);
    const slide = step(ch3.STEPS, 'slide'),
      blank = { w: ch3.START, p1: 0, quiz: null };
    expect(slide.predicate(blank)).toBe(false);
    expect(slide.predicate(slide.solution!(blank))).toBe(true);
    expect(weigh(rowsOf('larkspur'), slide.solution!(blank).w).winner).toBe('C');
  });
  it('chapter 4: A’s whole reply is the stated seconds; the wait poise tips the beam away from A', () => {
    expect(ch4.WHOLE_A).toBe(Math.round(wholeReply(machineOf('A'), REPLY)));
    expect(ch4.WHOLE_A).toBe(Math.round(pinned.whole.A));
    const slide = step(ch4.STEPS, 'slide'),
      blank = { w: ch4.START, p1: 0, quiz: null };
    expect(slide.predicate(blank)).toBe(false);
    expect(slide.predicate(slide.solution!(blank))).toBe(true);
  });
  it('chapter 5: the bar ropes off the pinned machines, and the cheapest left wins', () => {
    expect(ch5.UNDER).toEqual(['B']);
    expect(ch5.CHEAPEST).toBe(pinned.cheapest);
    const live = inPlay(rowsOf('larkspur'), ch5.UNDER);
    expect(weigh(live, ch5.AFTER).winner).toBe(ch5.CHEAPEST);
    expect(weigh(rowsOf('larkspur'), ch5.BEFORE).winner).toBe('A');
    expect(passesOf(ch5.CHEAPEST)).toBeGreaterThanOrEqual(BAR);
    expect(per1000(machineOf(ch5.CHEAPEST), REPLY)).toBeLessThan(per1000(machineOf('A'), REPLY));
  });
  it('chapter 6: the new version changes the pinned answers and falls under the bar', () => {
    expect(ch6.CHANGED.map(c => ({ id: c.id, now: c.now }))).toEqual(pinned.changed);
    expect(ch6.AFTER).toBe(pinned.passes.next);
    expect(ch6.AFTER).toBeLessThan(BAR);
    expect(ch6.P1.options[ch6.OUTCOME]).toBe('Drop under the bar');
  });
});

describe('chapter 7’s workbench', () => {
  const bench = step(ch7.STEPS, 'bench');
  const blank = { team: 'support' as const, bench: START, view: 'scene' as const, quiz: null };
  it('Show me lands on a bench in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    for (const t of TEAMS) expect(WINNERS[t.id]).toContainEqual(shown.bench[t.id]);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
});
