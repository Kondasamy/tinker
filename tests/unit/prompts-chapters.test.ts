// Writing a prompt's chapters against the recordings, the simulator and the pins (KTD9): every prediction's outcome
// and every count the copy states is read off the replies' live grades, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/prompts/pinned.json' with { type: 'json' };
import { START } from '../../src/lib/prompts/assemble';
import type { Docket } from '../../src/lib/prompts/cards';
import { MINI_PROMPTS } from '../../src/lib/prompts/story';
import { START as BENCH_START, WINNERS, resultOf, wins } from '../../src/lib/prompts/workbench';
import { boardOf } from '../../src/content/prompts/kit';
import * as ch1 from '../../src/content/prompts/01-it-only-continues';
import * as ch2 from '../../src/content/prompts/02-say-what-you-want';
import * as ch3 from '../../src/content/prompts/03-show-dont-tell';
import * as ch4 from '../../src/content/prompts/04-put-it-in-a-shape';
import * as ch5 from '../../src/content/prompts/05-order-and-emphasis';
import * as ch6 from '../../src/content/prompts/06-test-it-like-code';
import * as ch7 from '../../src/content/prompts/07-workbench';

const step = <S>(steps: { id: string; predicate: (s: S) => boolean; solution?: (s: S) => S }[], id: string) =>
  steps.find(s => s.id === id)!;
const run = (chapter: string, d: Partial<Docket>) => boardOf(chapter, { ...START[chapter], ...d }).run!;

describe('the chapters’ reveals match the recordings and the pins', () => {
  it('chapter 1: the pinned continuations are the two instructions, and neither is a reply', () => {
    expect(pinned.continuations.map(c => c.prompt)).toEqual(MINI_PROMPTS);
    for (const c of pinned.continuations) expect(c.text).not.toMatch(/dear|thank|sorry|hi\b/i);
    expect(ch1.OUTCOME).toBe(1);
  });
  it('chapter 2: vague replies miss the key fact and invent a hotline; the clear task alone gets it in', () => {
    const ID = '02-say-what-you-want';
    for (const d of [ch2.VAGUE, ch2.ROLE]) {
      const r = run(ID, d);
      expect(r.grade.facts).toBe(false);
      expect(r.reply.text).toMatch(/800\W555/);
    }
    expect(run(ID, { ...ch2.VAGUE, task: 'clear' }).grade.facts).toBe(true);
    expect(run(ID, { ...ch2.ROLE, task: 'clear' }).grade.facts).toBe(true);
    expect(ch2.OUTCOME).toBe(1);
    const clear = step(ch2.STEPS, 'clear');
    const blank = { d: START[ID], view: 'scene' as const, p1: 0, quiz: null };
    expect(clear.predicate(blank)).toBe(false);
    expect(clear.predicate(clear.solution!(blank))).toBe(true);
  });
  it('chapter 3: one example brings the sign-off; the quirky pair’s quirk turns up', () => {
    const ID = '03-show-dont-tell';
    expect(run(ID, {}).grade.signed).toBe(false);
    expect(run(ID, { examples: 1 }).grade.signed).toBe(true);
    expect(run(ID, { examples: 2 }).grade.quirk).toBe(false);
    expect(run(ID, { examples: '2q' }).grade.quirk).toBe(true);
    expect(ch3.OUTCOME).toBe(0);
  });
  it('chapter 4: the list holds, and the JSON parses with the right team', () => {
    const ID = '04-put-it-in-a-shape';
    expect(run(ID, { format: 'list' }).grade.format).toBe(true);
    const json = run(ID, { format: 'json' }).grade;
    expect(json.format).toBe(true);
    expect(json.routed).toBe(true);
    expect(ch4.OUTCOME).toBe(0);
  });
  it('chapter 5: simulated, the rule on top is missed and kept last; the one recording kept it in both', () => {
    const ID = '05-order-and-emphasis';
    const top = run(ID, {}),
      last = run(ID, { rules: 'last' });
    expect(top.reply.source).toBe('simulated');
    expect(top.grade.rule).toBe(false);
    expect(last.grade.rule).toBe(true);
    expect(ch5.OUTCOME).toBe(0);
    expect(ch5.RECORDED_KEPT).toBe(true);
  });
  it('chapter 6: the clear task passes more than the vague one, and the smaller model fewer', () => {
    expect(ch6.COUNTS).toEqual({ vague: 3, clear: 6, small: 4 });
    expect(ch6.COUNTS.clear).toBe(ch6.ALL.length);
    expect(ch6.OUTCOME).toBe(0);
    expect(ch6.COUNTS.small).toBeLessThan(ch6.COUNTS.clear);
    expect(ch6.COUNTS.small).toBeGreaterThan(0);
    expect(ch6.OUTCOME2).toBe(1);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = step(ch7.STEPS, 'bench');
  const blank = { d: BENCH_START, view: 'scene' as const, quiz: null };
  it('Show me lands on a prompt in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(shown.d);
  });
  it('the start and a longer prompt that passes every ticket are not accepted', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(BENCH_START)).toBe(false);
    const longer: Docket = { ...WINNERS[0], examples: 2 };
    expect(resultOf(longer).passed).toBe(resultOf(WINNERS[0]).passed);
    expect(bench.predicate({ ...blank, d: longer })).toBe(false);
  });
});
