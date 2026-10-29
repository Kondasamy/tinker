// When the buyer is an agent's chapters against the engine, the recordings and the pins: every reveal shows what the
// recorded run or the live check does, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { mandateOf, sign } from '../../src/lib/agent-commerce/mandate';
import { checkOrder, orderOf } from '../../src/lib/agent-commerce/shop';
import { SLIPS, sellerOf } from '../../src/lib/agent-commerce/story';
import { redeem } from '../../src/lib/agent-commerce/token';
import { BEST, scoreOf, START, WINNERS, wins } from '../../src/lib/agent-commerce/workbench';
import { raised } from '../../src/content/agent-commerce/kit';
import * as ch1 from '../../src/content/agent-commerce/01-a-page-for-people';
import * as ch2 from '../../src/content/agent-commerce/02-a-menu-for-agents';
import * as ch3 from '../../src/content/agent-commerce/03-agent-to-agent';
import * as ch4 from '../../src/content/agent-commerce/04-who-said-it-could-buy';
import * as ch5 from '../../src/content/agent-commerce/05-a-seller-that-talks-back';
import * as ch6 from '../../src/content/agent-commerce/06-paying-without-the-card';
import * as ch7 from '../../src/content/agent-commerce/07-workbench';

const failed = (v: Awaited<ReturnType<typeof checkOrder>>) => v.checks.filter(c => !c.pass).map(c => c.field);

describe('the chapters’ reveals match the recordings and the live checks', () => {
  it('chapter 1: the recorded agent read every order right, and the screws at the catalogue total', () => {
    expect(new Set(ch1.P1.options).size).toBe(ch1.P1.options.length);
    expect(ch1.OUTCOME).toBe(1);
    expect(ch1.READS.every(r => r.right)).toBe(true);
  });
  it('chapter 2: a row without its price is named, not guessed', () => {
    expect(ch2.BROKEN).toEqual({ ok: false, missing: ['row 2 price'] });
    expect(ch2.OUTCOME).toBe(0);
  });
  it('chapter 3: the vague order asks back, the clear one does not', () => {
    expect(ch3.OUTCOME).toBe(0);
    expect(ch3.RUNS.vague.states).toContain('input-required');
    expect(ch3.RUNS.clear.states).not.toContain('input-required');
    const blank = { p1: 0, sent: 'vague' as const, answered: false, view: 'scene' as const, quiz: null };
    expect(ch3.statesOf(blank)?.at(-1)).toBe('input-required');
    expect(ch3.statesOf({ ...blank, answered: true })?.at(-1)).toBe('completed');
  });
  it('chapter 4: a cap changed after signing fails the signature, live', async () => {
    const s = await sign(mandateOf(SLIPS.larkspur, 'ch4'));
    const order = orderOf(sellerOf('larkspur'));
    expect(failed(await checkOrder(s, order, []))).toEqual([]);
    const tampered = { ...s, mandate: { ...s.mandate, cap: raised(s.mandate.cap) } };
    expect(failed(await checkOrder(tampered, order, []))).toEqual(['signature']);
    expect(ch4.OUTCOME).toBe(1);
    const tamper = ch4.STEPS.find(x => x.id === 'tamper')!;
    expect(tamper.predicate({ slip: s, failed: ['signature'], p1: 1, quiz: null })).toBe(true);
    expect(tamper.predicate({ slip: s, failed: [], p1: 1, quiz: null })).toBe(false);
  });
  it('chapter 5: the agent refused the limit-raise but took the lookalike; the shop refuses both', async () => {
    expect(ch5.TURNS.quarry.accept).toBe(false);
    expect(ch5.TURNS.look.accept).toBe(true);
    expect(ch5.OUTCOME).toBe(0);
    const any = await sign(mandateOf(SLIPS['shop-around'], 'ch5a'));
    expect(failed(await checkOrder(any, orderOf(sellerOf('quarrylane')), []))).toEqual(['cap']);
    const home = await sign(mandateOf(SLIPS.larkspur, 'ch5b'));
    expect(failed(await checkOrder(home, orderOf(sellerOf('lookalike')), []))).toEqual(['merchant']);
  });
  it('chapter 6: the token refuses every charge it was not issued for, then pays once', () => {
    expect(ch6.OUTCOME).toBe(0);
    const why = (k: keyof typeof ch6.CHARGES, spent: string[] = []) => {
      const r = redeem(ch6.TOKEN, ch6.CHARGES[k].charge, spent);
      return r.ok ? 'paid' : r.why;
    };
    expect([why('more'), why('other'), why('shop'), why('this')]).toEqual(['amount', 'order', 'merchant', 'paid']);
    expect(why('this', [ch6.TOKEN.id])).toBe('spent');
    // one more box stays under the slip's cap, so only the token refuses it
    expect(ch6.CHARGES.more.charge.amount).toBeLessThanOrEqual(SLIPS.larkspur.cap);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a setup in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(wins(shown)).toBe(true);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
  });
  it('asking Dana every time is right as often, but asks her', () => {
    const always = scoreOf(ch7.ALWAYS);
    expect(always.right).toBe(BEST.right);
    expect(always.asked).toBeGreaterThan(BEST.asked);
    expect(wins(ch7.ALWAYS)).toBe(false);
    expect(WINNERS.length).toBe(6);
  });
});
