// Before GenAI's chapters against the bots (KTD7, KTD8): every prediction's outcome is computed from the same engines
// the picture reads, chapter 1's keyword puzzle accepts every word in WINNERS and nothing else, and every callout names
// a part its picture draws.
import { describe, expect, it } from 'vitest';
import { CANDIDATES, MISSED, matchRule, messageOf, run, stolen, WINNERS } from '../../src/lib/before-genai/bots';
import { moduleOf } from '../../src/lib/modules';
import * as ch1 from '../../src/content/before-genai/01-scripted';
import * as ch2 from '../../src/content/before-genai/02-intents';
import * as ch3 from '../../src/content/before-genai/03-predictive-ai';

const M = moduleOf('before-genai');

describe('the registry entry', () => {
  it('has the eight chapters in order', () => {
    expect(M.chapters.map(c => c.id)).toEqual([
      '01-scripted',
      '02-intents',
      '03-predictive-ai',
      '04-next-word',
      '05-scale',
      '06-chat',
      '07-what-changed',
      '08-what-stayed',
    ]);
  });
  it('defines GenAI in module-level copy, and intent and language model as chapter terms', () => {
    expect(M.description).toMatch(/generative AI \(GenAI\)/);
    const terms = M.chapters.flatMap(c => c.intro.terms.map(([t]) => t));
    expect(terms).toContain('Intent');
    expect(terms).toContain('Language model');
  });
});

describe('chapter 1: the script', () => {
  const fix = ch1.STEPS.find(s => s.id === 'fix')!;
  const at = (word: string) => ({ ...ch1.INITIAL, word });
  it('the script falls back on the rephrased message, as the reveal says', () => {
    expect(run(messageOf(MISSED)).scripted.answered).toBe(false);
    expect(ch1.P1.options[ch1.OUTCOME]).toMatch(/falls back/i);
  });
  it('the keyword puzzle accepts every winner and rejects every other word', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of CANDIDATES) expect(fix.predicate(at(w)), w).toBe(WINNERS.includes(w));
    expect(fix.predicate(at(''))).toBe(false);
  });
  it('every losing word steals a message another rule answered', () => {
    for (const w of CANDIDATES.filter(w => !WINNERS.includes(w))) expect(stolen(w), w).toBeTruthy();
  });
  it('the quiz’s message matches no rule', () => {
    expect(matchRule(ch1.QUIZ_MSG)).toBeUndefined();
  });
  it('Show me lands on a winner', () => {
    expect(fix.predicate(fix.solution!(at('')))).toBe(true);
  });
});

describe('chapter 2: the sorter', () => {
  it('each sort step wants the bin the sorter picks', () => {
    for (const id of ch2.SORTED) {
      const r = run(messageOf(id)).intent;
      expect(r.answered, id).toBe(true);
      const step = ch2.STEPS.find(s => s.id === `sort-${id}`)!;
      expect(step.predicate({ ...ch2.INITIAL, bins: { [id]: r.intent } })).toBe(true);
    }
  });
  it('the off-list message falls back, as the reveal says', () => {
    expect(run(messageOf(ch2.OFF)).intent.answered).toBe(false);
    expect(ch2.P1.options[ch2.OUTCOME]).toMatch(/falls back/i);
  });
});

describe('chapter 3: picks from a list', () => {
  it('the spam reveal and the shelf reveal read the engines', () => {
    expect(ch3.SPAM >= 0.5 ? 'Junk' : 'Inbox').toBe(ch3.P1.options[ch3.OUTCOME1]);
    expect(ch3.P2.options[ch3.OUTCOME2]).toBe(ch3.TOP);
    expect(new Set(ch3.P2.options).size).toBe(ch3.P2.options.length);
  });
});

describe('callouts', () => {
  it('every say names a part its chapter draws', () => {
    for (const ch of [ch1, ch2, ch3])
      for (const s of ch.STEPS) if (s.say) expect(ch.PARTS, s.id).toContain(s.say.block);
  });
});
