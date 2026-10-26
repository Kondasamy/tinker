// Coding agents' chapters against the engine (KTD12): every reveal says what the runs show, and chapter 7's Show me is
// one of WINNERS.
import { describe, expect, it } from 'vitest';
import { isWinner } from '../../src/lib/coding-agents/workbench';
import { allPass } from '../../src/lib/coding-agents/tests';
import * as ch1 from '../../src/content/coding-agents/01-read-edit-run';
import * as ch2 from '../../src/content/coding-agents/02-finding-the-file';
import * as ch3 from '../../src/content/coding-agents/03-a-patch-not-a-rewrite';
import * as ch4 from '../../src/content/coding-agents/04-red-to-green';
import * as ch5 from '../../src/content/coding-agents/05-green-by-cheating';
import * as ch6 from '../../src/content/coding-agents/06-what-it-may-run';
import * as ch7 from '../../src/content/coding-agents/07-workbench';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: the agent searches first', () => expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^Search/));
  it('chapter 2: search about halves the reading', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^About half/);
    expect(ch2.FAST_TOKENS).toBeLessThan(ch2.SLOW_TOKENS);
  });
  it('chapter 3: without hunk 1 the 50-item check fails; hunks 1 and 2 pass', () => {
    expect(ch3.resultOf(ch3.ALL & ~1).find(t => t.id === 'at-50')!.pass).toBe(false);
    expect(allPass(ch3.resultOf(ch3.CLEAN))).toBe(true);
  });
  it('chapter 4: the whole patch breaks one test; alone the agent gets to green', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^No: the drive-by/);
    expect(ch4.BROKE.map(t => t.id)).toEqual(['line']);
    expect(ch4.ALONE.right).toBe(true);
  });
  it('chapter 5: the agent loosens the test; the original checks still fail', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^It loosens/);
    expect(allPass(ch5.ORIGINAL)).toBe(false);
  });
  it('chapter 6: with no rules the force push runs', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^The host runs it/);
    expect(ch6.FORCE).toMatch(/--force/);
  });
  it('chapter 7: Show me lands on a winner', () => {
    const bench = ch7.STEPS.find(s => s.id === 'policy')!;
    const shown = bench.solution!({ policy: ch7.START, tab: 'scene', quiz: null });
    expect(isWinner(shown.policy)).toBe(true);
    expect(bench.predicate(shown)).toBe(true);
    expect(bench.predicate({ policy: ch7.START, tab: 'scene', quiz: null })).toBe(false);
  });
});
