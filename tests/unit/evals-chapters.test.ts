// The data lookups each Evals chapter relies on resolve against the real suite, and DOMAINS names real chapters.
import { beforeAll, describe, expect, it } from 'vitest';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { DOMAINS, QUESTIONS } from '../../src/lib/evals/suite';
import { label, judged } from '../../src/lib/evals/graders';
import { loadSuite, type Suite } from '../../src/content/evals/kit';
import { casesOf } from '../../src/content/evals/03-graders';
import { disagreements, judgeWrong, pairOf } from '../../src/content/evals/04-judge-the-judge';
import { FLIP } from '../../src/content/evals/06-run-it-twice';
import { EVALS_MODULE as evals } from '../../src/content/evals/module';

let suite: Suite;
beforeAll(async () => { suite = await loadSuite(diskLoader); }, 60_000);

describe('evals chapter lookups', () => {
  it('every DOMAINS key is a chapter id', () => {
    const ids = evals.chapters.map(c => c.id);
    for (const k of Object.keys(DOMAINS)) expect(ids, k).toContain(k);
  });

  it('chapter 3: three cases, each found, with an r1 verdict and a label', () => {
    const cases = casesOf(suite);
    expect(cases).toHaveLength(3);
    for (const c of cases) {
      expect(c.q).toBeGreaterThanOrEqual(0);
      expect(judged(c.row.question, c.row.signature, 'r1')).not.toBeNull();
      expect(label(c.row.question, c.row.signature)).not.toBeNull();
    }
  });

  it('chapter 4: under r2 a disagreement where the judge is wrong exists, and so does the shown pair', () => {
    expect(disagreements(suite, 'r2').find(judgeWrong)).toBeDefined();
    expect(pairOf(suite)).toBeDefined();
  });

  it('chapter 6: the flipped case exists and is a test-set question', () => {
    expect(FLIP).toBeDefined();
    expect(QUESTIONS.some(q => q.id === FLIP.question)).toBe(true);
  });
});
