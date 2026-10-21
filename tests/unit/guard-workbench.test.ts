import { describe, expect, it } from 'vitest';
import { FEWEST, SINGLES, SMALLEST, WINNERS, score, solved } from '../../src/content/guardrails/05-defence-in-depth';
import { COST, R } from '../../src/content/guardrails/06-when-the-user-is-the-attacker';
import { SOLUTION, START, bench, clean, verdict } from '../../src/content/guardrails/07-red-team';
import { CASES, DOMAINS, INJECTION_SUITE, attackMet, combos, run, stepsOf } from '../../src/lib/guardrails/loop';
import { RECORDING } from '../../src/lib/guardrails/turns';

describe('chapter 5: defence in depth', () => {
  it('each matrix cell is the engine’s goal check for that case under that defence alone', () => {
    for (const { d } of SINGLES)
      for (const r of score(d).runs) {
        const fresh = run(RECORDING, { ...d, case: r.case });
        expect(r.attackMet, `${JSON.stringify(d)} ${r.case}`).toBe(attackMet(fresh));
        expect(r.caseDone).toBe(fresh.caseDone);
      }
    expect(score(SINGLES[0].d).runs.map(r => r.case)).toEqual(INJECTION_SUITE);
  });

  it('no single defence stops every attack with the fewest false blocks', () => {
    expect(SINGLES.some(x => solved(x.d))).toBe(false);
  });

  it('the puzzle accepts every winning set with the fewest false blocks, and nothing else', () => {
    const { case: _, ...domain } = DOMAINS['05-defence-in-depth'];
    let accepted = 0;
    for (const d of combos(domain)) {
      const m = score(d as never), ok = m.succeeded === 0 && m.blocked === FEWEST;
      expect(solved(d as never), JSON.stringify(d)).toBe(ok);
      if (ok) accepted++;
    }
    expect(accepted).toBe(WINNERS.length);
    expect(FEWEST).toBe(0);
    // more than one way in: the two smallest sets are different defences
    expect(SMALLEST.length).toBeGreaterThan(1);
    expect(SMALLEST).toContainEqual({ rule: true, threshold: null, taint: true, allow: false, filter: false });
    expect(SMALLEST).toContainEqual({ rule: true, threshold: null, taint: false, allow: true, filter: false });
  });
});

describe('chapter 6: when the user is the attacker', () => {
  it('the output check stops the discount, the input check refuses the off-topic email (in the signature)', () => {
    expect(R('discount', false, 'off').attackMet).toBe(true);
    expect(R('discount', false, 'on').attackMet).toBe(false);
    expect(R('offtopic', false, 'on').attackMet).toBe(true);
    const refused = R('offtopic', true, 'on');
    expect(refused.attackMet).toBe(false);
    expect(refused.signatures[0]).toContain('mail=offtopic:refused');
  });

  it('strict refuses the fair refund, and the cost table counts it as a false block', () => {
    expect(R('refund', true, 'on').caseDone).toBe(true);
    const strict = R('refund', true, 'strict');
    expect(strict.caseDone).toBe(false);
    expect(stepsOf(strict, 'blocked')[0].by).toBe('output-policy');
    expect(COST.map(c => [c.policy, c.m.blocked])).toEqual([['off', 0], ['on', 0], ['strict', 1]]);
    expect(COST.find(c => c.policy === 'on')!.m.succeeded).toBe(0);
  });
});

describe('chapter 7: the red-team workbench', () => {
  // every combination is replayed by guard-coverage.test.ts; here, one bench runs both suites in case order
  it('a bench runs both suites, in case order', () => {
    expect(bench(START).runs.map(r => r.case)).toEqual(CASES);
  });

  it('a blocked and an allowed contrast: the invoice’s send with and without the allow-list; the refund under on and strict', () => {
    const open = bench(START), listed = bench({ ...START, allow: true });
    expect(open.runs.find(r => r.case === 'invoice')!.attackMet).toBe(true);
    const inv = listed.runs.find(r => r.case === 'invoice')!;
    expect(inv.attackMet).toBe(false);
    expect(stepsOf(inv, 'blocked')[0].by).toBe('allow-list');
    expect(bench({ ...START, outputPolicy: 'on' }).blocked).toBe(0);
    expect(bench({ ...START, outputPolicy: 'strict' }).blocked).toBe(1);
  });

  it('Show me’s set is clean, the start is not, and the verdict says which', () => {
    expect(clean(bench(SOLUTION))).toBe(true);
    expect(verdict(bench(SOLUTION))).toMatch(/^No attack got through and every customer was served/);
    expect(verdict(bench(START))).toMatch(/^5 of 5 attacks got through\. Not safe/);
    expect(verdict(bench({ ...SOLUTION, outputPolicy: 'strict' }))).toMatch(/^No attack got through, but 1 of 2 customers were blocked/);
  });
});
