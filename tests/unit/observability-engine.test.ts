import { describe, expect, it } from 'vitest';
import {
  DAY2,
  FAILED,
  MODE_IDS,
  TRACES,
  ordered,
  problems,
  replyOf,
  type Trace,
} from '../../src/lib/observability/traces';
import {
  DAY1_COUNTS,
  GROUPS,
  MAX_NOTE,
  REFERENCE_GROUPING,
  SUGGESTIONS,
  TOP,
  clampNote,
  counts,
  fixFirst,
  groupingMatches,
  mostFrequent,
  notedIds,
  ranked,
  suggestionsFor,
} from '../../src/lib/observability/coding';
import { gradeCase } from '../../src/lib/observability/cases';
import { EMPTY, WINNERS, scoreOf, solution, solved } from '../../src/lib/observability/workbench';
import { fact, FACTS } from '../../src/lib/observability/facts';

describe('the traces (KTD8)', () => {
  it('about forty on day 1, every one a well-formed span tree', () => {
    expect(TRACES.length).toBeGreaterThanOrEqual(35);
    for (const t of [...TRACES, ...DAY2]) expect(problems(t), t.id).toEqual([]);
  });
  it('trace ids are unique across both days', () => {
    const ids = [...TRACES, ...DAY2].map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('the validator catches a broken tree and a missing reference span', () => {
    const t = TRACES[0],
      bad: Trace = { ...t, spans: t.spans.map(s => (s.id === 's1' ? { ...s, parent: 'nope' } : s)) };
    expect(problems(bad).join()).toMatch(/no parent nope/);
    expect(problems({ ...FAILED[0], first: 's99' }).join()).toMatch(/reference first span s99 is missing/);
    expect(problems({ ...t, mode: 'stale-doc' }).join()).toMatch(/ok trace with a failure/);
  });
  it('reads in tree order with the root first', () => {
    const o = ordered(TRACES[0]);
    expect(o[0].depth).toBe(0);
    expect(o.slice(1).every(r => r.depth === 1)).toBe(true);
    expect(o.at(-1)!.span.kind).toBe('reply');
  });
  it('every failure mode appears on day 1, and every day 2 trace has failed', () => {
    expect(new Set(FAILED.map(t => t.mode))).toEqual(new Set(MODE_IDS));
    expect(DAY2.every(t => !t.ok)).toBe(true);
  });
});

describe('open coding', () => {
  it('caps notes and counts only non-blank ones', () => {
    expect(clampNote('x'.repeat(500))).toHaveLength(MAX_NOTE);
    expect(notedIds({ a: 'stale price', b: '   ', c: '' })).toEqual(['a']);
  });
  it('offers three distinct chips per trace, its own note among them', () => {
    for (const t of FAILED) {
      const s = suggestionsFor(t);
      expect(s).toHaveLength(3);
      expect(new Set(s).size).toBe(3);
      expect(s).toContain(t.note);
      expect(s.every(x => SUGGESTIONS.includes(x))).toBe(true);
    }
  });
});

describe('axial coding (grouping against the reference)', () => {
  it('the reference grouping passes, and so does any renaming of its groups', () => {
    expect(groupingMatches(REFERENCE_GROUPING)).toBe(true);
    const shifted = Object.fromEntries(Object.entries(REFERENCE_GROUPING).map(([id, g]) => [id, (g + 2) % GROUPS]));
    expect(groupingMatches(shifted)).toBe(true);
  });
  it('moving one trace to another mode’s group fails, and so does an unsorted trace', () => {
    const [a] = FAILED,
      other = FAILED.find(t => t.mode !== a.mode)!;
    expect(groupingMatches({ ...REFERENCE_GROUPING, [a.id]: REFERENCE_GROUPING[other.id] })).toBe(false);
    const { [a.id]: _, ...rest } = REFERENCE_GROUPING;
    expect(groupingMatches(rest)).toBe(false);
  });
  it('merging two modes into one group fails', () => {
    const merged = Object.fromEntries(Object.entries(REFERENCE_GROUPING).map(([id, g]) => [id, g === 1 ? 0 : g]));
    expect(groupingMatches(merged)).toBe(false);
  });
  it('counts per mode sum to the failed traces', () => {
    expect(Object.values(DAY1_COUNTS).reduce((a, b) => a + b, 0)).toBe(FAILED.length);
  });
});

describe('which ones matter', () => {
  it('the most frequent mode is not the one to fix first on day 1 (the chapter’s lesson)', () => {
    expect(TOP).toEqual(['stale-doc']);
    expect(mostFrequent(DAY1_COUNTS)).not.toBe(TOP[0]);
  });
  it('ranks by count × harm, highest first', () => {
    const r = ranked(DAY1_COUNTS);
    expect(r.map(x => x.score)).toEqual([...r.map(x => x.score)].sort((a, b) => b - a));
    expect(fixFirst(counts([]))).toHaveLength(MODE_IDS.length); // nothing counted: every mode ties at zero
  });
});

describe('from trace to test', () => {
  it('every failed trace fails on the current version; the stale-passage ones pass on the fixed version, the rest still fail', () => {
    for (const t of FAILED) {
      expect(gradeCase(t.id, 'current').pass, t.id).toBe(false);
      expect(gradeCase(t.id, 'fixed').pass, t.id).toBe(t.mode === 'stale-doc');
    }
  });
  it('a stale answer carries a citation, so only the key-fact grader catches it', () => {
    const stale = FAILED.find(t => t.mode === 'stale-doc')!;
    expect(gradeCase(stale.id, 'current')).toEqual({ fact: false, citation: true, pass: false });
    expect(replyOf(stale)).not.toBe('');
  });
});

describe('the workbench', () => {
  it('WINNERS over day 2 is non-empty, and the solution works', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(solved(solution())).toBe(true);
    expect(scoreOf(solution())).toMatchObject({ sorted: DAY2.length, removed: scoreOf(solution()).best });
  });
  it('one wrong label or a fix outside WINNERS fails; nothing chosen scores zero', () => {
    const s = solution(),
      t = DAY2[0],
      wrong = MODE_IDS.find(m => m !== t.mode)!;
    expect(solved({ ...s, labels: { ...s.labels, [t.id]: wrong } })).toBe(false);
    expect(solved({ ...s, fix: MODE_IDS.find(m => !WINNERS.includes(m))! })).toBe(false);
    expect(scoreOf(EMPTY)).toMatchObject({ sorted: 0, removed: 0 });
  });
});

describe('facts (R5)', () => {
  it('every fact has a claim and an https source', () => {
    for (const f of FACTS) {
      expect(f.claim.trim(), f.id).not.toBe('');
      expect(f.source, f.id).toMatch(/^https:\/\//);
    }
    expect(fact('first-failure').accessed).toBe('2026-10-21');
  });
});
