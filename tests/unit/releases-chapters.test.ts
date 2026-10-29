// Releases' chapters against the simulator (KTD10): every reveal says what the runs show, the moments the e2e flow
// walks to hold, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { START, WINNERS, benchOf, wins } from '../../src/lib/releases/workbench';
import * as ch1 from '../../src/content/releases/01-straight-to-everyone';
import * as ch2 from '../../src/content/releases/02-tests-on-every-change';
import * as ch3 from '../../src/content/releases/03-a-few-first';
import * as ch4 from '../../src/content/releases/04-deploy-now-switch-on-later';
import * as ch5 from '../../src/content/releases/05-back-it-out';
import * as ch6 from '../../src/content/releases/06-step-by-step';
import * as ch7 from '../../src/content/releases/07-release-plan';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: a rollback takes its minutes, whenever it is pulled', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^In about/);
    for (const t of [ch1.LOOK, ch1.LOOK + 3]) expect(ch1.outcomeOf([{ t, kind: 'back' }])).toBe(1);
  });
  it('chapter 2: the untested bug passes every gate', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^Lets it through/);
  });
  it('chapter 3: a false alarm on the short bake, a pass on the long one, a miss for the small bug', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^It can ring/);
    expect(ch3.runFor(ch3.GOOD.id, ch3.SHORT).alarmAt).toBe(ch3.checkAt(ch3.SHORT));
    expect(ch3.runFor(ch3.GOOD.id, ch3.LONG).alarmAt).toBeNull();
    expect(ch3.runFor(ch3.SMALL.id, ch3.LONG).alarmAt).toBeNull();
    expect(ch3.runFor(ch3.SMALL.id, ch3.LONG).hurt).toBeGreaterThan(0);
    expect(ch3.ALARM.canary![1]).toBeLessThan(20);
  });
  it('chapter 4: the flag goes back within a minute, and Show me turns the dial', () => {
    const events = [
      { t: 1, kind: 'dial' as const, share: 0.1 },
      { t: 1 + ch4.WATCH, kind: 'back' as const },
    ];
    expect(ch4.P1.options[ch4.outcomeOf(events)]).toMatch(/^Within a minute/);
    const dark = ch4.STEPS[0];
    expect(dark.predicate(dark.solution!({ t: 1, events: [], p1: null, view: 'scene', quiz: null }))).toBe(true);
  });
  it('chapter 5: the lever is refused, then works once expanded', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^No: the old/);
    const pull = [{ t: ch5.OPEN, kind: 'back' as const }];
    expect(ch5.runFor(pull, false).safeAt).toBeNull();
    expect(ch5.runFor(pull, true).safeAt).not.toBeNull();
  });
  it('chapter 6: the rollout stops at its first stage over the threshold', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toBe(`At ${ch6.HALTED * 100}%`);
    expect(ch6.RUN.hurt).toBeLessThan(ch6.ALL.hurt);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, t: 0, shown: 'button', view: 'scene' as const, quiz: null };
  it('Show me lands on a plan in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(benchOf(shown));
    expect(wins(benchOf(shown))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
  });
});
