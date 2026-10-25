// Card payments' chapters against the simulator (KTD12): every reveal says what the runs show, the e2e flow's moments
// match the chapters', and chapter 7's Show me lands on a policy in WINNERS.
import { describe, expect, it } from 'vitest';
import { WINNERS, benchPolicy, wins, START } from '../../src/lib/payments/workbench';
import * as ch1 from '../../src/content/payments/01-four-parties';
import * as ch2 from '../../src/content/payments/02-a-hold';
import * as ch3 from '../../src/content/payments/03-overnight';
import * as ch4 from '../../src/content/payments/04-pressed-pay-twice';
import * as ch5 from '../../src/content/payments/05-prove-its-you';
import * as ch6 from '../../src/content/payments/06-the-money-comes-back';
import * as ch7 from '../../src/content/payments/07-checkout-policy';
import { HOLD_DAYS } from '../../src/lib/payments/sim';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: the issuer says yes, after the request reaches it', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/issuer/);
    // the e2e flow's walk (tests/e2e/payments-flow.ts) assumes these
    expect(ch1.HOPS).toHaveLength(7);
    expect(ch1.AT_ISSUER).toBe(3);
  });
  it('chapter 2: only what shipped is charged; the vice ships on day 5 and Finn’s hold lapses after it', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/only what shipped/);
    expect(ch2.LAPSE).toBe(HOLD_DAYS * 2);
    expect(ch2.SECOND).toBeLessThan(ch2.LAPSE);
  });
  it('chapter 3: a few cents of Ana’s payment go in fees', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/a few cents less/);
    expect(ch3.ANA.net.merchant).toBeLessThan(ch3.ANA.order.cents);
  });
  it('chapter 4: two charges without the key, one with it', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^Twice/);
    expect(ch4.chargesOf(ch4.runFor(false), 1)).toHaveLength(2);
    expect(ch4.chargesOf(ch4.runFor(true), 1)).toHaveLength(1);
  });
  it('chapter 5: a challenge stops the thief; always loses two honest buyers, on risk only one', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^Stop the thief/);
    expect(ch5.finalOf('never', 'E5')).toBe('charged-back');
    expect(ch5.finalOf('always', 'C3')).toBe('abandoned');
    expect(ch5.finalOf('always', 'G7')).toBe('abandoned');
    expect(ch5.finalOf('risk', 'E5')).toBe('declined');
    expect(ch5.finalOf('risk', 'G7')).toBe('settled');
  });
  it('chapter 6: Noor’s chargeback hits Larkspur; Kai’s authenticated fraud falls on the issuer', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/the issuer$/);
    expect(ch6.lossOf('E5').merchant).toBeGreaterThan(0);
    expect(ch6.lossOf('L12')).toMatchObject({ merchant: 0 });
    expect(ch6.NOOR_T).toBeLessThan(ch6.KAI_T);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...structuredClone(START), view: 'scene' as const, quiz: null };
  it('Show me lands on a policy in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS.some(w => JSON.stringify(benchPolicy(w)) === JSON.stringify(benchPolicy(shown)))).toBe(true);
    expect(wins(benchPolicy(shown))).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
  });
});
