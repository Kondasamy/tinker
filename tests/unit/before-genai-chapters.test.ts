// Before GenAI's chapters against the bots (KTD7, KTD8): every prediction's outcome is computed from the same engines
// the picture reads, chapter 1's keyword puzzle accepts every word in WINNERS and nothing else, and every callout names
// a part its picture draws.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { fact } from '../../src/lib/before-genai/facts';
import { MINI_NOTE } from '../../src/content/before-genai/kit';
import { CANDIDATES, MISSED, matchRule, messageOf, run, stolen, WINNERS } from '../../src/lib/before-genai/bots';
import { moduleOf } from '../../src/lib/modules';
import * as ch1 from '../../src/content/before-genai/01-scripted';
import * as ch2 from '../../src/content/before-genai/02-intents';
import * as ch3 from '../../src/content/before-genai/03-predictive-ai';
import * as ch4 from '../../src/content/before-genai/04-next-word';
import * as ch5 from '../../src/content/before-genai/05-scale';
import * as ch6 from '../../src/content/before-genai/06-chat';

const M = moduleOf('before-genai');
const b = readFileSync('public/data/lm/model.bin');
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const model = parseModel(meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

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

describe('chapter 4: the next word', () => {
  it('the prompt is corpus text, and its expected next word is in Larkspur mini’s top 5 (the lm-kit gate)', () => {
    expect(readFileSync('data/corpus/refund-policy-2025.md', 'utf8')).toContain(ch4.PROMPT.text + ch4.PROMPT.expected);
    expect(ch4.topOf(model).map(c => c.text)).toContain(ch4.PROMPT.expected);
  });
  it('every option is one token, and the reveal’s answer is the model’s top token', () => {
    for (const p of ch4.PIECES) expect(encode(p), p).toHaveLength(1);
    expect(ch4.answerOf(model)).toBeGreaterThanOrEqual(0);
    expect(ch4.PIECES[ch4.answerOf(model)]).toBe(ch4.topOf(model)[0].text);
  });
});

describe('chapter 5: scale', () => {
  it('the size and date reveals read the facts and the model’s own count', () => {
    expect(ch5.MINI).toBe(meta.model.params);
    expect(ch5.GPT3).toBe(Number(fact('few-shot').value) * 1e9);
    expect(ch5.RATIO).toBeGreaterThan(1e6);
    expect(ch5.P1.options[ch5.OUTCOME1]).toMatch(/million/);
    expect(ch5.YEARS).toEqual([2017, 2020]);
    expect(ch5.P2.options[ch5.OUTCOME2]).toBe('A few years');
  });
});

describe('chapter 6: chat', () => {
  it('exactly one reply is the base model’s, both are labelled written for this site', () => {
    expect(ch6.REPLIES.filter(r => r.base)).toHaveLength(1);
    expect(ch6.REPLIES[ch6.OUTCOME].base).toBe(true);
    expect(ch6.WRITTEN).toMatch(/written for this site/);
  });
});

describe('numbers shown', () => {
  it('Larkspur mini’s count is labelled a toy, beside GPT-3’s real one from the facts', () => {
    expect(MINI_NOTE).toMatch(/toy/);
    expect(MINI_NOTE).toContain(meta.model.params.toLocaleString('en-US'));
    expect(MINI_NOTE).toContain(`${fact('few-shot').value} billion`);
  });
  it('every number in chapters 5–6 copy reads a fact value or Larkspur mini’s labelled count', () => {
    const allowed = new Set([
      meta.model.params.toLocaleString('en-US'),
      ...['few-shot', 'transformer-paper', 'gpt3-date', 'instructgpt-small'].map(id => fact(id).value!),
      // the size prediction's options, not claims
      '100',
      '10,000',
    ]);
    for (const ch of [ch5, ch6]) {
      const copy = [
        ...ch.STEPS.flatMap(s => [s.narration, s.act ?? '', s.say?.text ?? '']),
        ch.QUIZ.question,
        ...ch.QUIZ.options,
        ...ch.QUIZ.why,
        ch.QUIZ.explanation,
        ch.P1.question,
      ];
      // a model's name (GPT-3) is no number
      for (const n of copy.join(' ').match(/(?<![\w-])\d[\d,]*/g) ?? []) expect(allowed, n).toContain(n);
    }
  });
});

describe('go deeper', () => {
  it('each link resolves to a live chapter in the registry', () => {
    const to = [...ch4.DEEPER, ...ch5.DEEPER, ...ch6.DEEPER];
    expect(to.map(([m]) => m)).toEqual(['transformers', 'pre-training', 'post-training', 'prompts']);
    for (const [m, i] of to) {
      expect(moduleOf(m).status, m).toBe('live');
      expect(moduleOf(m).chapters[i], `${m} ${i}`).toBeDefined();
    }
  });
});

describe('callouts', () => {
  it('every say names a part its chapter draws', () => {
    for (const ch of [ch1, ch2, ch3, ch4, ch5, ch6])
      for (const s of ch.STEPS) if (s.say) expect(ch.PARTS, s.id).toContain(s.say.block);
  });
});
