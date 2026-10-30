// Rate limits' chapters against the simulator (KTD7): every reveal says what the runs show, the moments the e2e flow
// walks to hold, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import { START, WINNERS, benchOf, wins } from '../../src/lib/rate-limits/workbench';
import { isDown, tally, traceOf } from '../../src/lib/rate-limits/sim';
import { delayOf } from '../../src/lib/rate-limits/backoff';
import { REASONS } from '../../src/lib/rate-limits/workbench';
import { RATE_LIMITS_MODULE } from '../../src/content/rate-limits/module';
import * as ch1 from '../../src/content/rate-limits/01-too-many-at-once';
import * as ch2 from '../../src/content/rate-limits/02-count-per-minute';
import * as ch3 from '../../src/content/rate-limits/03-the-token-bucket';
import * as ch4 from '../../src/content/rate-limits/04-the-429-reply';
import * as ch5 from '../../src/content/rate-limits/05-back-off-with-jitter';
import * as ch6 from '../../src/content/rate-limits/06-who-gets-turned-away';
import * as ch7 from '../../src/content/rate-limits/07-set-the-limits';
import { NO_LIVE, liveCounts } from '../../src/content/rate-limits/kit';

describe('the chapters’ reveals match the runs', () => {
  it('chapter 1: the server is down at the look, and Oakmoor lost requests', () => {
    expect(ch1.P1.options[ch1.outcomeOf()]).toMatch(/^Some fail too/);
    expect(isDown(ch1.RUN, ch1.LOOK)).toBe(true);
    expect(ch1.OAK.down).toBeGreaterThan(0);
  });
  it('chapter 2: twice the limit gets through around the edge', () => {
    expect(ch2.P1.options[ch2.outcomeOf()]).toMatch(/^All 80/);
    expect(ch2.THROUGH).toBe(2 * ch2.LIMIT);
  });
  it('chapter 3: ten sends then ten more meet an empty barrel', () => {
    const t0 = 1_000_000;
    const ten = { ...NO_LIVE, t0, sent: Array.from({ length: 10 }, () => 0) };
    expect(liveCounts(ten, t0 + 100)).toMatchObject({ ok: 10, limited: 0 });
    const twenty = { ...ten, sent: [...ten.sent, ...Array.from({ length: 10 }, () => 300)] };
    expect(liveCounts(twenty, t0 + 400).limited).toBeGreaterThan(5);
    expect(ch3.P1.options[ch3.OUTCOME]).toMatch(/^Most get a 429/);
  });
  it('chapter 4: ignoring Retry-After earns more 429s for the same served', () => {
    expect(ch4.P1.options[ch4.outcomeOf()]).toMatch(/^Mostly more 429s/);
    expect(ch4.WAIT).toBe(2);
    expect(ch4.IGN.ok).toBe(ch4.LIS.ok);
    expect(tally(ch4.IGNORE, 0, ch4.AFTER).limited).toBe(ch4.SENT - 10);
  });
  it('chapter 5: the fixed wait stampedes; jitter lowers the peak', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toMatch(/^Another stampede/);
    expect(ch5.PEAK.fixed).toBe(ch5.TABLETS - ch5.SIZE);
    expect(ch5.PEAK.jitter).toBeLessThan(ch5.PEAK.backoff);
  });
  it('chapter 6: about a third shared, all with a barrel per key', () => {
    expect(ch6.P1.options[ch6.outcomeOf()]).toBe('About a third');
    expect(ch6.SHARE.shared).toBeGreaterThan(0.25);
    expect(ch6.SHARE.shared).toBeLessThan(0.42);
    expect(ch6.SHARE.perKey).toBe(1);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, t: 25_000, view: 'scene' as const, quiz: null };
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

// copy that names a hand-set number by hand (intro stories, terms, labels, the bench's reasons) holds only while the
// hand-made data stays this way
describe('hand-typed numbers match the hand-set data', () => {
  const intro = (id: string) => RATE_LIMITS_MODULE.chapters.find(c => c.id === id)!.intro!;
  it('chapter 2’s story: 40 a minute', () => {
    expect(ch2.LIMIT).toBe(40);
    expect(intro('02-count-per-minute').story).toMatch(/40 requests a minute/);
  });
  it('chapter 5’s story and labels: 30 tablets, a barrel of 10, waits of 1, 2, 4 seconds', () => {
    expect([ch5.TABLETS, ch5.SIZE]).toEqual([30, 10]);
    expect(intro('05-back-off-with-jitter').story).toMatch(/30 shop tablets.*holds 10, so 20/);
    const r = { backoff: true, jitter: false };
    expect([1, 2, 3].map(n => delayOf(r, 'x', n))).toEqual([1000, 2000, 4000]);
    expect(delayOf({ backoff: false, jitter: false }, 'x', 3)).toBe(1000);
  });
  it('chapter 7’s reasons: Birchfield’s bursts of 15, the rush doubles the web shop, Quickfix runs 35 s', () => {
    const sale = traceOf('sale');
    const birch = sale.filter(r => r.key === 'birch' && r.at < 6000).length;
    expect(REASONS.size).toMatch(new RegExp(`bursts of ${birch}\\b`));
    const web = (from: number) => sale.filter(r => r.key === 'web' && r.at >= from && r.at < from + 5000).length;
    expect(web(21_000)).toBe(2 * web(1000));
    const qf = sale.filter(r => r.key === 'quickfix');
    expect(REASONS.perKey).toMatch(new RegExp(`${Math.round((qf.at(-1)!.at - qf[0].at) / 1000)} seconds`));
  });
});
