// Chapter 7's workbench: every control combination grades from recorded data, and the gate blocks a regression.
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import {
  BASELINE,
  fileOf,
  runSuite,
  VERSION_IDS,
  WORKBENCH_DOMAINS,
  type Row,
  type VersionId,
} from '../../src/lib/evals/suite';
import { decide, gradeRows } from '../../src/lib/evals/graders';
import { release, solved, STEPS } from '../../src/content/evals/07-release-day';

const suite = {} as Record<VersionId, Row[]>;
beforeAll(async () => {
  const index = await openIndex(diskLoader);
  for (const v of VERSION_IDS) {
    const f = fileOf(v);
    if (f) await index.load(f);
    suite[v] = runSuite(index, v);
  }
}, 60_000);

const { versions, graders, thresholds, noRegressions } = WORKBENCH_DOMAINS;

describe('evals workbench (chapter 7)', () => {
  it('every combination grades every question, with no missing answer or judge verdict', () => {
    for (const v of versions)
      for (const g of graders)
        for (const threshold of thresholds)
          for (const nr of noRegressions) {
            const d = release(suite, v, g, { threshold, noRegressions: nr });
            expect(d.reason, `${v} ${g} ${threshold} ${nr}`).toBeTruthy();
            expect(gradeRows(suite[v], g)).toHaveLength(12);
          }
  });

  it('the model alone (v0) judged under r1 ships at every threshold, with or without the no-regressions rule', () => {
    for (const threshold of thresholds)
      for (const nr of noRegressions)
        expect(release(suite, 'v0', 'r1', { threshold, noRegressions: nr }).ship, `${threshold} ${nr}`).toBe(true);
  });

  it('v2 clears a 50% bar but breaks a question v1 passed: the no-regressions rule blocks it, and it ships with the rule off', () => {
    const off = release(suite, 'v2', 'verdict', { threshold: 50, noRegressions: false });
    const on = release(suite, 'v2', 'verdict', { threshold: 50, noRegressions: true });
    expect(off.rate).toBeGreaterThanOrEqual(50);
    expect(off.ship).toBe(true);
    expect(on.ship).toBe(false);
    expect(on.regressed.map(i => suite.v2[i].question)).toEqual(['k2-volume-price']);
    expect(on.reason).toBe('1 question regressed');
  });

  it('v3 breaks nothing v1 passed, so the puzzle has an answer; the starting gate is not one', () => {
    expect(release(suite, 'v3', 'verdict', { threshold: 50, noRegressions: true }).ship).toBe(true);
    expect(solved(suite, { grader: 'verdict', threshold: 50, noRegressions: false })).toBe(false);
    const fix = STEPS[0].solution!({
      version: 'v2',
      grader: 'verdict',
      threshold: 90,
      noRegressions: false,
      view: 'grid',
      quiz: null,
    });
    expect(solved(suite, fix)).toBe(true);
  });

  it('decide: the bar, the regressions and the words', () => {
    expect(decide([true, false], [false, true], { threshold: 50, noRegressions: true })).toMatchObject({
      ship: false,
      rate: 50,
      regressed: [0],
      reason: '1 question regressed',
    });
    expect(decide([true, true], [false, false], { threshold: 50, noRegressions: true }).reason).toBe(
      '0% passed, under the 50% bar, and 2 questions regressed',
    );
    expect(decide([false], [true], { threshold: 90, noRegressions: true })).toMatchObject({
      ship: true,
      reason: '100% passed, at or over the 90% bar, and nothing regressed',
    });
  });

  it('the baseline is v1 and is not a candidate', () => {
    expect(BASELINE).toBe('v1');
    expect(versions).not.toContain(BASELINE);
  });
});
