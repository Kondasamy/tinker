// How email arrives' chapters against the engine (KTD10): every reveal says what the checks give, chapter 4's puzzle
// accepts every record that works, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { FAKES, REAL, START, WINNERS, benchOf, wins } from '../../src/lib/email/workbench';
import { LOOKUP_LIMIT } from '../../src/lib/email/spf';
import { fact } from '../../src/lib/email/facts';
import { verdictOf } from '../../src/lib/email/story';
import * as ch1 from '../../src/content/email/01-envelope-and-letter';
import * as ch2 from '../../src/content/email/02-who-takes-it-next';
import * as ch3 from '../../src/content/email/03-anyone-can-write-from';
import * as ch4 from '../../src/content/email/04-allowed-senders';
import * as ch5 from '../../src/content/email/05-a-seal-on-the-letter';
import * as ch6 from '../../src/content/email/06-what-to-do-with-a-failure';
import * as ch7 from '../../src/content/email/07-mail-records';

describe('the chapters’ reveals match the checks', () => {
  it('chapter 1: the envelope and From differ, and nothing minds', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^No:/);
    expect(ch1.ENVELOPE).not.toBe(ch1.FROM);
  });
  it('chapter 2: the bottom postmark is the first hop; the forward takes more', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^The bottom one/);
    expect(ch2.HOPS.forwarded.length).toBeGreaterThan(ch2.HOPS.order.length);
  });
  it('chapter 3: nothing checked the From line, and the fake reaches the inbox', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^Nothing/);
    expect(ch3.FATE.fate).toBe('inbox');
    expect(ch3.START).not.toContain('larkspur.example (');
  });
  it('chapter 4: the puzzle takes every record that passes the newsletter and fails the spoof; the forger passes', () => {
    expect(ch4.WINNERS).toEqual(['vendor-soft', 'vendor']);
    const vendor = ch4.STEPS.find(s => s.id === 'vendor')!;
    const blank = { spf: 'own', msg: 'order' as const, view: 'scene' as const, p1: null, quiz: null };
    expect(vendor.predicate(blank)).toBe(false);
    expect(vendor.predicate(vendor.solution!(blank))).toBe(true);
    expect(vendor.predicate({ ...blank, spf: 'open' })).toBe(false);
    for (const spf of ch4.WINNERS) expect(ch4.P1.options[ch4.outcomeOf(spf)]).toMatch(/^Pass/);
    expect(verdictOf('spoofed', ch4.recOf('own')).spf).toBe('fail');
  });
  it('chapter 5: one digit fails the seal (pinned), re-spacing doesn’t', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^It fails/);
    const rec = ch5.recOf(true);
    expect(ch5.pinnedDkim('digit', rec).result).toBe('fail');
    expect(ch5.pinnedDkim('spaces', rec).result).toBe('pass');
    expect(ch5.pinnedDkim('sent', ch5.recOf(false)).result).toBe('none');
  });
  it('chapter 6: reject bounces the fake, the forward lands on its seal, the prize is junk on its words', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^Inbox/);
    expect(verdictOf('forged', ch6.recOf('reject')).fate).toBe('bounced');
    expect(verdictOf('forged', ch6.recOf('none')).fate).toBe('inbox');
    expect([ch6.PRIZE.dmarc, ch6.PRIZE.fate, ch6.PRIZE.why]).toEqual(['pass', 'junk', 'spam']);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, shown: 'forwarded' as const, view: 'scene' as const, quiz: null };
  it('Show me lands on a setting in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(benchOf(shown));
    expect(wins(benchOf(shown))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
  });
});

describe('toy numbers against the facts', () => {
  it('SPF’s lookup cap is RFC 7208’s, read from the fact', () => {
    expect(LOOKUP_LIMIT).toBe(10);
    expect(LOOKUP_LIMIT).toBe(Number(fact('spf').value));
  });
  it('chapter 7’s made-up day stays “far under” Gmail’s bulk line', () => {
    expect(ch7.BULK).toBe(5000);
    expect((REAL + FAKES) * 10).toBeLessThan(ch7.BULK);
  });
});
