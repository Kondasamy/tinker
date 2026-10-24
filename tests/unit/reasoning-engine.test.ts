// Reasoning's engine (U7, KTD5): recorded thinking and answers per question × effort, graded live by Evals' key-fact
// check (Evals' references for Evals' questions, keyFactOf for Reasoning's own), tokens counted live with the site BPE,
// cost and wait computed. The copy's claims about the curves hold, and Evals' data is untouched.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import {
  ASSUMPTIONS,
  EFFORTS,
  GATE,
  KINDS,
  QUESTIONS,
  answer,
  gateKind,
  lowestPassing,
  ofKind,
  question,
  run,
  sweep,
} from '../../src/lib/reasoning/engine';
import { ACCESSED, FACTS } from '../../src/lib/reasoning/facts';

const ids = (k: string) => ofKind(k as never).map(q => q.id);

describe('questions and answers', () => {
  it('every question has a query, a passage and a reference; Evals’ lookups read Evals’ words', () => {
    expect(KINDS.map(k => k.id)).toEqual(['lookup', 'multistep', 'distractor']);
    for (const q of QUESTIONS) {
      expect(q.query.length, q.id).toBeGreaterThan(0);
      expect(q.given.length, q.id).toBeGreaterThan(0);
    }
    expect(question('same-day-cutoff').query).toMatch(/same-day/i);
    expect(() => answer('nope', 'low')).toThrow(/no recorded answer/);
  });

  it('none thinks zero tokens; cost counts thinking as output; the wait follows from the assumed rate', () => {
    for (const q of QUESTIONS) {
      const r = run(q.id, 'none');
      expect(r.thinkingTokens, q.id).toBe(0);
      const m = run(q.id, 'medium');
      expect(m.thinkingTokens).toBe(encode(m.thinking).length);
      expect(m.answerTokens).toBe(encode(m.answer).length);
      expect(m.cost).toBe(m.thinkingTokens + m.answerTokens);
      expect(m.wait).toBeCloseTo(ASSUMPTIONS.firstTokenSeconds + m.cost / ASSUMPTIONS.tokensPerSecond);
    }
  });

  it('thinking grows with effort on every question (more effort, more tokens)', () => {
    for (const q of QUESTIONS) {
      const t = EFFORTS.map(e => run(q.id, e).thinkingTokens);
      for (let i = 1; i < t.length; i++) expect(t[i], `${q.id} ${EFFORTS[i]}`).toBeGreaterThan(t[i - 1]);
    }
  });
});

describe('the copy’s claims', () => {
  it('chapter 3: accuracy over the multi-step set rises from none to medium and does not fall from medium to high', () => {
    const acc = sweep(ids('multistep')).map(s => s.right);
    expect(acc[0]).toBeLessThan(acc[1]);
    expect(acc[1]).toBeLessThan(acc[2]);
    expect(acc[3]).toBeGreaterThanOrEqual(acc[2]);
  });

  it('chapter 4: every distraction question is right at some lower effort and wrong at high', () => {
    for (const id of ids('distractor')) {
      expect(run(id, 'high').right, id).toBe(false);
      expect(
        ['none', 'low', 'medium'].some(e => run(id, e as never).right),
        id,
      ).toBe(true);
    }
  });

  it('chapter 5: at the same effort, a lookup thinks far less than a multi-step question (effort is a hint)', () => {
    for (const l of ids('lookup'))
      for (const m of ids('multistep'))
        expect(run(l, 'high').thinkingTokens, `${l} vs ${m}`).toBeLessThan(run(m, 'high').thinkingTokens);
  });

  it('chapter 6: the gate picks none for lookups, medium for multi-step, low for distractions', () => {
    expect(lowestPassing('lookup')).toBe('none');
    expect(lowestPassing('multistep')).toBe('medium');
    expect(lowestPassing('distractor')).toBe('low');
    // high on distractions breaks questions none got right: the no-regressions rule holds it back
    expect(gateKind('distractor', 'high').regressed.length).toBeGreaterThan(0);
    expect(GATE.noRegressions).toBe(true);
  });
});

describe('Evals and facts', () => {
  it('Evals’ recordings and references are unchanged', () => {
    const h = createHash('sha256');
    for (const f of readdirSync('data/evals')
      .sort()
      .filter(f => f !== 'facts.json'))
      h.update(f + '\0').update(readFileSync('data/evals/' + f));
    expect(h.digest('hex')).toBe('025153e4a6bfb5fae06fe67d974d616c96ceff6d9e3637d6c2e680ffedbd0f36');
  });

  it('facts are dated and sourced', () => {
    expect(ACCESSED).toBe('2026-10-21');
    for (const f of FACTS) expect(f.source).toMatch(/^https:\/\//);
  });
});
