// Small models' recordings (KTD12), after context-coverage: every answer a chapter control or the workbench can reach
// is recorded, none twice, none unreachable, each with a one-line note, the small tier's with a confidence in [0, 1];
// at most 30 answers in all.
import { describe, expect, it } from 'vitest';
import { DOMAINS, QUESTION_IDS, route, TIERS } from '../../src/lib/small-models/router';
import { cell, KINDS, WORKBENCH_DOMAINS } from '../../src/lib/small-models/workbench';
import answers from '../../data/small-models/answers.json' with { type: 'json' };

const REC = answers as Record<string, Record<string, { text: string; note: string; confidence?: number }>>;
const recorded = Object.entries(REC).flatMap(([tier, qs]) => Object.keys(qs).map(q => `${tier}|${q}`));

describe('small-models recordings coverage (R3, KTD12)', () => {
  it.each(Object.keys(DOMAINS))('%s: every policy × question reaches a recorded answer', (id) => {
    for (const p of DOMAINS[id].policies) for (const q of DOMAINS[id].questions) expect(() => route(q, p), `${id} ${JSON.stringify(p)} ${q}`).not.toThrow();
  });

  it('the workbench: every choice × threshold × kind', () => {
    for (const k of WORKBENCH_DOMAINS.kinds) for (const c of WORKBENCH_DOMAINS.choices) for (const t of WORKBENCH_DOMAINS.thresholds)
      expect(() => cell(k, c, t), `${k} ${c} ${t}`).not.toThrow();
  });

  it('every kind holds Evals’ questions, each in one kind only', () => {
    const all = KINDS.flatMap(k => k.questions);
    expect([...all].sort()).toEqual([...QUESTION_IDS].sort());
  });

  it('no answer is recorded twice, and every recorded answer is reachable', () => {
    expect(new Set(recorded).size).toBe(recorded.length);
    const reached = new Set<string>();
    for (const d of Object.values(DOMAINS)) for (const p of d.policies) for (const q of d.questions) {
      const r = route(q, p);
      reached.add(`${r.tier}|${q}`);
      // a routed answer read the small tier's confidence first
      if (!('tier' in p)) reached.add(`small|${q}`);
    }
    expect(recorded.filter(k => !reached.has(k))).toEqual([]);
    expect(Object.keys(REC).sort()).toEqual([...TIERS].sort());
  });

  it('every answer carries a one-line note; every small answer a confidence in [0, 1]', () => {
    for (const [tier, qs] of Object.entries(REC)) for (const [q, a] of Object.entries(qs)) {
      expect(a.note.trim(), `${tier} ${q}`).not.toBe('');
      expect(a.note.includes('\n'), `${tier} ${q}`).toBe(false);
      if (tier === 'small') { expect(a.confidence, q).toBeGreaterThanOrEqual(0); expect(a.confidence, q).toBeLessThan(1); }
    }
  });

  it('stays within the budget of 30 answers', () => {
    expect(recorded.length).toBeLessThanOrEqual(30);
  });
});
