// Dependencies' chapters against the engine (KTD10): every reveal says what the installs show, and chapter 7's Show me
// is in WINNERS.
import { describe, expect, it } from 'vitest';
import { START, WINNERS, benchOf, runPolicy, wins } from '../../src/lib/dependencies/workbench';
import { fact } from '../../src/lib/dependencies/facts';
import { auditOf, brokenOf, install } from '../../src/lib/dependencies/resolve';
import { BAD_DAY } from '../../src/lib/dependencies/story';
import * as ch1 from '../../src/content/dependencies/01-code-you-did-not-write';
import * as ch2 from '../../src/content/dependencies/02-what-the-numbers-mean';
import * as ch3 from '../../src/content/dependencies/03-packages-need-packages';
import * as ch4 from '../../src/content/dependencies/04-the-same-install-every-time';
import * as ch5 from '../../src/content/dependencies/05-one-bad-patch';
import * as ch6 from '../../src/content/dependencies/06-who-published-this';
import * as ch7 from '../../src/content/dependencies/07-update-policy';

describe('the chapters’ reveals match the installs', () => {
  it('chapter 1: the install brings more than the app names', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/what they need$/);
  });
  it('chapter 1: real packages bring far more than the toy install (Zimmermann et al.)', () => {
    expect(ch1.INSTALLED * 4).toBeLessThan(Number(fact('trusted-packages').value));
  });
  it('chapter 2: the caret takes the new minor, not the major; the major breaks both crates', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/and any newer/);
    expect([...brokenOf(install({ day: 0, overrides: { pricebook: ch2.MAJOR } }))].sort()).toEqual(['', 'cartwheel']);
    expect([...brokenOf(install({ day: 0, overrides: { pricebook: ch2.MINOR } }))]).toEqual([]);
  });
  it('chapter 3: two copies; pulling the nested one breaks only its owner and the app', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/^Two/);
    expect(ch3.FALLS).toEqual(['cartwheel', 'larkspur-shop']);
  });
  it('chapter 4: installs drift; with the lockfile they do not', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^No/);
    expect(ch4.DRIFT.length).toBeGreaterThan(0);
    expect(ch4.changesOf(true)).toEqual([]);
  });
  it('chapter 5: the bad patch breaks the build; the tested update is rejected', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/patch came in/);
    expect(ch5.UPDATE.rejected).toBe(true);
    expect(brokenOf(install({ day: BAD_DAY })).has('')).toBe(true);
  });
  it('chapter 6: the pin lets it in, scripts off keeps the payload, the lockfile keeps it out', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/hijacked one$/);
    const s = { pin: true, installed: true, lock: false, scripts: false };
    expect(ch6.auditFor(s)).toMatchObject({ scriptRan: [], payload: ['inkdrop'] });
    expect(ch6.auditFor({ ...s, lock: true }).payload).toEqual([]);
    expect(auditOf(ch6.treeOf({ ...s, installed: false })).hijacked).toEqual([]);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, day: 18, view: 'scene' as const, quiz: null };
  it('Show me lands on a policy in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(benchOf(shown));
    expect(wins(benchOf(shown))).toBe(true);
  });
  it('daily takes the hijacked release while it stays up UP days', () => {
    expect(ch7.UP).toBeGreaterThan(0);
    for (const range of ['caret', 'tilde'] as const)
      expect(runPolicy(benchOf({ ...blank, range, lock: true, cadence: 'daily' })).shipped).toBeGreaterThan(0);
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
  });
});
