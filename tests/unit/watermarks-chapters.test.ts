// Watermarks' chapters against the engine and the pins: every reveal says what the pins show, the predictions'
// outcomes are computed, chapter 5's Show me washes the mark out, and chapter 7's Show me is in WINNERS. Fast: no
// model runs here (the replies are pinned and re-derived by the engine test).
import { describe, expect, it } from 'vitest';
import { check, LINE } from '../../src/lib/watermarks/detect';
import { checkLabel } from '../../src/lib/watermarks/label';
import { MACHINE, MARK } from '../../src/lib/watermarks/story';
import { START, WINNERS, wins } from '../../src/lib/watermarks/workbench';
import pinned from '../../data/watermarks/pinned.json' with { type: 'json' };
import * as ch1 from '../../src/content/watermarks/01-can-you-tell';
import * as ch2 from '../../src/content/watermarks/02-a-hidden-pattern';
import * as ch3 from '../../src/content/watermarks/03-leaning-green';
import * as ch4 from '../../src/content/watermarks/04-counting-green';
import * as ch5 from '../../src/content/watermarks/05-rewording';
import * as ch6 from '../../src/content/watermarks/06-pictures-and-labels';
import * as ch7 from '../../src/content/watermarks/07-workbench';

describe('the chapters’ reveals match the pins', () => {
  it('chapter 1: Reply A is the recorded model’s', () => {
    expect(MACHINE.map(m => m.reply)).toContain(ch1.REPLIES[0].text);
    expect(MACHINE.map(m => m.reply)).not.toContain(ch1.REPLIES[1].text);
  });
  it('chapter 2: well over chance is green, but not every pair', () => {
    expect(ch2.OUTCOME).toBe(1);
    expect(pinned.reply.green / pinned.reply.pairs).toBeGreaterThan(MARK.gamma);
  });
  it('chapter 3: the green share climbs with the nudge, and δ 2 costs the measured drop', () => {
    const share = pinned.leaning.map(l => l.green / l.pairs);
    for (let i = 1; i < share.length; i++) expect(share[i]).toBeGreaterThan(share[i - 1]);
    expect(ch3.OUTCOME).toBe(0);
    expect(ch3.dropAt(MARK.delta)).toBe(0.2261);
  });
  it('chapter 4: the call needs 48 tokens; hand-written replies stay under 2; the email is unsure', () => {
    expect(ch4.FIRST_MARKED).toBe(48);
    expect(ch4.P1.options[ch4.OUTCOME]).toBe('48 or more');
    expect(ch4.HUMAN_MAX).toBeLessThan(2);
    expect(pinned.counting.forwarded.verdict).toBe('unsure');
  });
  it('chapter 5: Show me’s swaps pull the reply under the line, as pinned', () => {
    const c = check(ch5.WASHED, MARK.gamma);
    expect(c.z!).toBeLessThan(LINE);
    expect(c.z!).toBeCloseTo(pinned.rewording.washed.z, 3);
    const wash = ch5.STEPS.find(s => s.id === 'wash')!;
    const blank = { ids: pinned.reply.ids, p1: 0, quiz: null };
    expect(wash.predicate(blank)).toBe(false);
    expect(wash.predicate(wash.solution!(blank))).toBe(true);
  });
  it('chapter 6: a screenshot keeps the mark and drops the label; a crop and a blur lose the mark', async () => {
    const shot = ch6.arrived('screenshot');
    expect(shot.mark.verdict).toBe('marked');
    expect(shot.label).toBeNull();
    expect(ch6.P1.options[ch6.OUTCOME]).toBe('The pixel mark only');
    for (const t of ['crop', 'blur'] as const) expect(ch6.arrived(t).mark.verdict).toBe('unsure');
    const sent = ch6.arrived('as sent'),
      pixel = ch6.arrived('one pixel');
    expect((await checkLabel(sent.pic, sent.label)).verdict).toBe('made by AI, signed');
    expect((await checkLabel(pixel.pic, pixel.label)).verdict).toBe('label does not match');
    expect(pixel.mark.verdict).toBe('marked');
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a setting in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ gamma: shown.gamma, delta: shown.delta });
  });
  it('the start is not a winner, and the chapters’ own γ catches fewer reworded replies', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
    expect(ch7.OURS.caughtEdited).toBeLessThan(pinned.workbench.results.find(r => wins(r))!.caughtEdited);
  });
});
