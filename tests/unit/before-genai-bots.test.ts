// Before GenAI (U2): the three bots on the fixed message set. The scripted bot's rules, the intent bot's margin floor
// and chapter 1's keyword WINNERS are rerun here, so each chapter's outcome holds for every message it shows.
import { describe, expect, it } from 'vitest';
import replies from '../../data/before-genai/replies.json' with { type: 'json' };
import {
  CANDIDATES,
  MARGIN_FLOOR,
  MESSAGES,
  MISSED,
  MISSED_RULE,
  matchRule,
  messageOf,
  RULES,
  run,
  WINNERS,
  wins,
} from '../../src/lib/before-genai/bots';
import { FACTS, fact } from '../../src/lib/before-genai/facts';

const answered = (id: string) => run(messageOf(id));

describe('scripted bot', () => {
  it('answers "where is my order" and falls back on the rephrased parcel message', () => {
    expect(answered('where-order').scripted).toMatchObject({ answered: true, rule: 'track' });
    expect(answered(MISSED).scripted.answered).toBe(false);
  });

  it('first match wins: a refund message never reaches a later rule', () => {
    expect(matchRule(messageOf('refund-drill').text)?.id).toBe('refund');
  });
});

describe('intent bot', () => {
  it('routes "where is my order" to delivery', () => {
    expect(answered('where-order').intent).toMatchObject({ answered: true, intent: 'delivery' });
  });

  it('routes the rephrased parcel message to delivery, above the floor', () => {
    const r = answered(MISSED).intent;
    expect(r).toMatchObject({ answered: true, intent: 'delivery' });
    expect(r.margin).toBeGreaterThanOrEqual(MARGIN_FLOOR);
  });

  it('falls back below the floor on the off-list message', () => {
    const r = answered('off-list').intent;
    expect(r.answered).toBe(false);
    expect(r.margin).toBeLessThan(MARGIN_FLOOR);
  });
});

describe('chapter 7: which bots answer', () => {
  it.each([
    ['c7-refund', [true, true]],
    ['c7-late', [false, true]],
    ['c7-poem', [false, false]],
    ['c7-spanish', [false, false]],
  ] as const)('%s', (id, [scripted, intent]) => {
    const r = answered(id);
    expect([r.scripted.answered, r.intent.answered]).toEqual([scripted, intent]);
  });
});

describe('chapter 1 WINNERS', () => {
  const before = MESSAGES.map(m => matchRule(m.text)?.id);
  const breaksNone = (w: string) => {
    const rules = RULES.map(r => (r.id === MISSED_RULE ? { ...r, keywords: [...r.keywords, w] } : r));
    return MESSAGES.every((m, k) => before[k] === undefined || matchRule(m.text, rules)?.id === before[k]);
  };
  const fixes = (w: string) => {
    const rules = RULES.map(r => (r.id === MISSED_RULE ? { ...r, keywords: [...r.keywords, w] } : r));
    return matchRule(messageOf(MISSED).text, rules)?.id === MISSED_RULE;
  };

  it('has winners and losers to choose between', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(WINNERS.length).toBeLessThan(CANDIDATES.length);
  });

  it('every winner makes the missed message match and breaks no earlier match', () => {
    for (const w of WINNERS) expect(fixes(w) && breaksNone(w), w).toBe(true);
  });

  it('every non-winner fails one of those', () => {
    for (const w of CANDIDATES.filter(w => !WINNERS.includes(w))) {
      expect(wins(w)).toBe(false);
      expect(fixes(w) && breaksNone(w), w).toBe(false);
    }
  });
});

describe('messages', () => {
  it('each serves at least one chapter and has a unique id', () => {
    expect(new Set(MESSAGES.map(m => m.id)).size).toBe(MESSAGES.length);
    for (const m of MESSAGES) expect(m.chapters.length, m.id).toBeGreaterThan(0);
  });

  it('chapters 7 and 8 have four messages each', () => {
    expect(MESSAGES.filter(m => m.chapters.includes('what-changed'))).toHaveLength(4);
    expect(MESSAGES.filter(m => m.chapters.includes('what-stayed'))).toHaveLength(4);
  });

  it('an unrecorded reply carries no text', () => {
    for (const m of MESSAGES) {
      const g = run(m).genai;
      if (!g.recorded) expect(g).toEqual({ recorded: false });
    }
  });

  // Turns on once scripts/record/before-genai.mjs has been run and replies.json committed with a model id and date.
  it.skipIf(!replies.model)('every message has a recorded reply with model id and date', () => {
    expect(replies.model).toBeTruthy();
    expect(replies.recorded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const m of MESSAGES) {
      expect(run(m).genai, m.id).toMatchObject({ recorded: true });
      expect((replies.replies as Record<string, string>)[m.id], m.id).toBeTruthy();
    }
  });
});

describe('facts', () => {
  it('every fact has a source, a url and an access date', () => {
    for (const f of FACTS) {
      expect(f.source, f.id).toMatch(/^https:\/\//);
      expect(fact(f.id).accessed, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
