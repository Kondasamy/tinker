// Coverage (KTD12, after context-coverage): every trace a chapter control can reach exists and is well formed, every
// eval case chapter 6 can make has a reference and a recorded fixed answer, nothing is recorded twice or unreachable,
// every recorded case has a one-line note, and the recording stays within its budget.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DAY2, DOMAINS, FAILED, problems, traceOf } from '../../src/lib/observability/traces';
import { CASE_IDS, evalCase, gradeCase } from '../../src/lib/observability/cases';
import { WORKBENCH_DOMAINS } from '../../src/lib/observability/workbench';

const BUDGET = 40;

describe('observability coverage (R3, KTD12)', () => {
  it.each(Object.entries(DOMAINS).filter(([, d]) => 'traces' in d))(
    '%s: every trace it offers exists and is well formed',
    (_, d) => {
      for (const id of (d as { traces: string[] }).traces) expect(problems(traceOf(id)), id).toEqual([]);
    },
  );

  it('chapter 2 offers failed traces only', () => {
    expect(DOMAINS['02-first-failure'].traces.every(id => !traceOf(id).ok)).toBe(true);
  });

  it('chapter 6: every case it can make, on every version, has a reference and an answer and grades', () => {
    for (const id of DOMAINS['06-trace-to-test'].traces)
      for (const v of DOMAINS['06-trace-to-test'].versions) {
        const c = evalCase(id);
        expect(Object.keys(c.reference.facts).length, id).toBeGreaterThan(0);
        expect(c.answers[v].text.trim(), `${id} ${v}`).not.toBe('');
        expect(typeof gradeCase(id, v).pass).toBe('boolean');
      }
  });

  it('no case is recorded twice, and every recorded case is reachable', () => {
    const raw = readFileSync('data/observability/fixed.json', 'utf8');
    for (const id of CASE_IDS) expect(raw.split(`"${id}": {`).length - 1, id).toBe(1);
    expect(CASE_IDS.filter(id => !DOMAINS['06-trace-to-test'].traces.includes(id))).toEqual([]);
    expect(CASE_IDS.sort()).toEqual(FAILED.map(t => t.id).sort());
  });

  it('every recorded case carries a one-line note', () => {
    for (const id of CASE_IDS) {
      const n = evalCase(id).note;
      expect(n.trim(), id).not.toBe('');
      expect(n.includes('\n'), id).toBe(false);
    }
  });

  it('the workbench: every trace it offers is a failed day-2 trace with a reference mode', () => {
    expect(WORKBENCH_DOMAINS.traces).toEqual(DAY2.map(t => t.id));
    for (const t of DAY2) expect(WORKBENCH_DOMAINS.labels).toContain(t.mode);
  });

  it(`stays within the budget of ${BUDGET} recorded cases`, () => {
    expect(CASE_IDS.length).toBeLessThanOrEqual(BUDGET);
  });
});
