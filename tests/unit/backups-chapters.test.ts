// Backups' chapters against the simulator (KTD7): every reveal says what the runs show, the moments the e2e flow walks
// to hold, Show me lands where it should, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { START, WINNERS, benchOf, resultsOf, wins } from '../../src/lib/backups/workbench';
import { STRIKES, restore } from '../../src/lib/backups/sim';
import * as ch1 from '../../src/content/backups/01-one-copy-is-no-copy';
import * as ch2 from '../../src/content/backups/02-how-often';
import * as ch3 from '../../src/content/backups/03-full-and-since-last';
import * as ch4 from '../../src/content/backups/04-not-in-the-same-building';
import * as ch5 from '../../src/content/backups/05-ransomware';
import * as ch6 from '../../src/content/backups/06-test-the-restore';
import * as ch7 from '../../src/content/backups/07-workbench';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: with no copy, a dead disk anywhere past Wednesday leaves nothing; a nightly copy restores', () => {
    for (const h of [ch1.WEDNESDAY, STRIKES.wed.hour, 167])
      expect(ch1.P1.options[ch1.outcomeOf(h)]).toMatch(/^Nothing/);
    expect(restore(ch1.weekFor(true), STRIKES.wed).from).toBe('cabinet');
    const s = ch1.STEPS[0].solution!({} as never);
    expect(ch1.STEPS[0].predicate(s)).toBe(true);
  });
  it('chapter 2: six-hourly copies lose less than half; hourly loses one hour', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^Less than half/);
    expect(ch2.lostAt(1)).toBeLessThan(ch2.lostAt(6));
    const rpo = ch2.STEPS.find(s => s.id === 'rpo')!;
    expect(rpo.predicate(rpo.solution!({ every: 6, struck: true } as never))).toBe(true);
  });
  it('chapter 3: a restore past the bad link stops at the link before it', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(/the link before the break$/);
  });
  it('chapter 4: a server-room fire leaves no copy; the warehouse restores', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^No copy/);
    expect(restore(ch4.weekFor(true), ch4.STRIKE).from).toBe('warehouse');
  });
  it('chapter 5: ransomware reaches the warehouse; the lockbox survives', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^No: the network/);
    expect(restore(ch5.weekFor(true), ch5.STRIKE).from).toBe('lockbox');
  });
  it('chapter 6: untested, Friday restores Monday’s first tape; tested, it restores Friday’s', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toMatch(/^Monday’s first tape/);
    expect(ch6.CAUGHT).toBeGreaterThanOrEqual(ch6.BAD_FROM);
    expect(restore(ch6.weekFor(true), ch6.STRIKE).point).toBeGreaterThan(
      restore(ch6.weekFor(false), ch6.STRIKE).point!,
    );
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, hour: 83, kind: 'fire' as const, struck: true, view: 'scene' as const, quiz: null };
  it('Show me lands on a plan in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual(benchOf(shown));
  });
  it('the start is not a winner; the narration’s claim about the winner holds', () => {
    expect(bench.predicate(blank)).toBe(false);
    for (const w of WINNERS) {
      expect(w.incremental).toBe(true);
      expect(w.places).toBe('both');
      expect(wins(w)).toBe(true);
      expect(resultsOf(w).every(r => r.from !== null)).toBe(true);
    }
  });
});
