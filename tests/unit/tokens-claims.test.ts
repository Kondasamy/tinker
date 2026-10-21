// Claims in Tokens' copy that depend on the data: each is checked against it, so re-recording the tokenizers or
// retraining the site's BPE fails here instead of leaving the copy wrong.
import { describe, expect, it } from 'vitest';
import { BYTES_PER_TOKEN } from '../../src/lib/scale';
import { corpusMeter } from '../../src/lib/tokens/counts';
import { BUDGETS, REQUIRED, fullPrompts } from '../../src/lib/tokens/workbench';
import { RECALL } from '../../src/content/tokens/recall';
import { STEPS as CH3 } from '../../src/content/tokens/03-tokens-are-the-meter';
import { STEPS as CH7 } from '../../src/content/tokens/07-workbench';

const M = corpusMeter();
const narration = (steps: { id: string; narration: string }[], id: string) => steps.find(s => s.id === id)!.narration;

describe('chapter 3 and its recall', () => {
  it('“each real token held more than 4 bytes”: the rule over-counts every real tokenizer', () => {
    expect(narration(CH3, 'compare')).toContain(`each real token held more than ${BYTES_PER_TOKEN} bytes`);
    for (const r of M.real) expect(r.bytesPerToken, r.id).toBeGreaterThan(BYTES_PER_TOKEN);
  });

  it('“the site tokenizer counted more than any of them”', () => {
    expect(narration(CH3, 'compare')).toContain('more than any of them');
    for (const r of M.real) expect(M.site, r.id).toBeGreaterThan(r.tokens);
  });

  it('the rule-of-thumb recall says which way the rule was off, as the data does', () => {
    const why = RECALL.find(r => r.id === 'rule-of-thumb')!.why!;
    const over = M.real.every(r => M.rule > r.tokens), under = M.real.every(r => M.rule < r.tokens);
    expect(why[1]).toContain(over ? 'more tokens than both' : under ? 'fewer tokens than both' : 'different directions');
    expect(M.real).toHaveLength(2);   // “both”
    // “within about a quarter of the real counts”
    expect(why[2]).toContain('within about a quarter');
    for (const r of M.real) expect(Math.round(Math.abs(M.rule / r.tokens - 1) * 100), r.id).toBeLessThanOrEqual(25);
  });
});

describe('chapter 7', () => {
  it('“Only the needed parts fit in” the lowest budget', () => {
    expect(narration(CH7, 'raise')).toContain(`Only the needed parts fit in ${BUDGETS[0]}`);
    expect(fullPrompts(BUDGETS[0])).toEqual([REQUIRED]);
  });
});

