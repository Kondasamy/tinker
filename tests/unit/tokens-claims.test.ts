// Claims in Tokens' copy that depend on the data: each is checked against it, so re-recording the tokenizers or
// retraining the site's BPE fails here instead of leaving the copy wrong. Also: resumed runs whose saved picks no
// longer exist fall back instead of crashing.
import { describe, expect, it } from 'vitest';
import { BYTES_PER_TOKEN } from '../../src/lib/scale';
import { corpusMeter } from '../../src/lib/tokens/counts';
import { BUDGETS, REQUIRED, fullPrompts } from '../../src/lib/tokens/workbench';
import { TOKENIZERS } from '../../src/lib/tokens/encodings';
import { TRACE } from '../../src/lib/tokens/merges';
import { RECALL } from '../../src/content/tokens/recall';
import { STEPS as CH3 } from '../../src/content/tokens/03-tokens-are-the-meter';
import { STEPS as CH7 } from '../../src/content/tokens/07-workbench';
import { mergesShown } from '../../src/content/tokens/02-how-the-vocabulary-is-learned';
import { picked } from '../../src/content/tokens/04-every-tokenizer-splits-differently';

const M = corpusMeter();
const narration = (steps: { id: string; narration: string }[], id: string) => steps.find(s => s.id === id)!.narration;

describe('chapter 3 and its recall', () => {
  it('“The rule was N% over” each real tokenizer: the rule over-counts every real tokenizer', () => {
    for (const r of M.real) {
      expect(narration(CH3, 'compare')).toContain(`over ${r.name}`);
      expect(r.bytesPerToken, r.id).toBeGreaterThan(BYTES_PER_TOKEN);
    }
  });

  it('“this site’s small tokenizer counted more than the real ones even in-sample”', () => {
    expect(RECALL.find(r => r.id === 'in-sample')!.why![3]).toContain('counted more than the real ones even in-sample');
    for (const r of M.real) expect(M.site, r.id).toBeGreaterThan(r.tokens);
  });

  it('the rule-of-thumb recall says which way the rule was off, as the data does', () => {
    const why = RECALL.find(r => r.id === 'rule-of-thumb')!.why!;
    const over = M.real.every(r => M.rule > r.tokens),
      under = M.real.every(r => M.rule < r.tokens);
    expect(why[1]).toContain(
      over ? 'more tokens than both' : under ? 'fewer tokens than both' : 'different directions',
    );
    expect(M.real).toHaveLength(2); // “both”
    // “within about a quarter of the real counts”
    expect(why[2]).toContain('within about a quarter');
    for (const r of M.real) expect(Math.round(Math.abs(M.rule / r.tokens - 1) * 100), r.id).toBeLessThanOrEqual(25);
  });
});

describe('chapter 7', () => {
  it('only the needed parts fit in the lowest budget, so “the needed parts stay” and the budget is raised', () => {
    expect(narration(CH7, 'trim')).toContain('The needed parts stay');
    expect(narration(CH7, 'raise')).toContain(`The budget is now ${BUDGETS[BUDGETS.length - 1]}`);
    expect(fullPrompts(BUDGETS[0])).toEqual([REQUIRED]);
  });
});

describe('resumed runs whose saved picks no longer exist', () => {
  it('chapter 2 shows at most every merge the trace has', () => {
    const n = TRACE.steps.length;
    expect(mergesShown(n + 5)).toBe(n);
    expect(mergesShown(3)).toBe(3);
  });

  it('chapter 4 falls back to the first sentence and tokenizer', () => {
    const s = { p1: 0, ran: true, sentence: 'gone', tok: 'gone', quiz: null };
    expect(picked(s)).toMatchObject({ sentence: 'order-en', tok: TOKENIZERS[0].id });
    const ok = { ...s, sentence: 'spaces', tok: 'site' };
    expect(picked(ok)).toEqual(ok);
  });
});
