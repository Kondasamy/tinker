// Every answer, judge verdict and label a chapter control can reach is recorded (R3, KTD2–KTD5).
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import {
  DOMAINS,
  fileOf,
  PAIRS,
  QUESTIONS,
  runSuite,
  VERSION_IDS,
  type Row,
  type VersionId,
} from '../../src/lib/evals/suite';
import { judged, judgedRun, pairwise, REFERENCES, RUN_CASES, runCase, SAMPLES } from '../../src/lib/evals/graders';
import candidates from '../../data/evals/candidates.json';

let index: RagIndex;
const rows = {} as Record<VersionId, Row[]>;
beforeAll(async () => {
  index = await openIndex(diskLoader);
  for (const v of VERSION_IDS) {
    const f = fileOf(v);
    if (f) await index.load(f);
    rows[v] = runSuite(index, v);
  }
}, 60_000);

describe('evals coverage', () => {
  it('every version × question reaches a recorded answer', () => {
    for (const v of VERSION_IDS)
      expect(
        rows[v].map(r => r.question),
        v,
      ).toEqual(QUESTIONS.map(q => q.id));
  });

  it('every question has a reference answer and phrases for each key fact', () => {
    for (const q of QUESTIONS) {
      expect(REFERENCES[q.id]?.answer, q.id).toBeTruthy();
      expect(Object.keys(REFERENCES[q.id].facts).sort(), q.id).toEqual(q.keyFacts.map(f => f.id).sort());
    }
  });

  it.each(Object.keys(DOMAINS))('%s: every reachable (question, signature, rubric) has a judge verdict', ch => {
    const d = DOMAINS[ch],
      missing: string[] = [];
    for (const v of d.versions)
      for (const r of rows[v])
        for (const rb of d.rubrics)
          if (!judged(r.question, r.signature, rb)?.why) missing.push(`${r.question}|${r.signature}|${rb}`);
    if (d.pairs)
      for (const p of PAIRS) {
        const a = rows[p.a].find(r => r.question === p.question)!,
          b = rows[p.b].find(r => r.question === p.question)!;
        for (const rb of d.rubrics)
          for (const o of ['ab', 'ba'] as const)
            if (!pairwise(p.question, a.signature, b.signature, rb, o)?.why)
              missing.push(`${p.question}|${a.signature}|${b.signature}|${rb}|${o}`);
      }
    expect(missing, ch).toEqual([]);
  });

  it('every graded Tool calling run has a judge verdict under both rubrics', () => {
    for (const id of Object.keys(RUN_CASES))
      for (const rb of ['r1', 'r2'] as const)
        expect(judgedRun(id, runCase(id), rb)?.why, `${id} ${runCase(id).signatures.at(-1)} ${rb}`).toBeTruthy();
  });

  it('samples: a few cases, five recorded answers each, every question real', () => {
    expect(SAMPLES.length).toBeGreaterThanOrEqual(3);
    for (const c of SAMPLES) {
      expect(c.samples, c.id).toHaveLength(5);
      expect(
        QUESTIONS.some(q => q.id === c.question),
        c.id,
      ).toBe(true);
    }
  });

  it('candidates: every kept case with a reference names a corpus sentence', () => {
    const corpus = index.corpus.map(d => d.words.join(' ')).join('\n');
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) if (c.keep && c.reference) expect(corpus.includes(c.reference), c.id).toBe(true);
    for (const k of ['real question', 'known failure', 'not in the documents'])
      expect(
        candidates.some(c => c.kind === k && c.keep),
        k,
      ).toBe(true);
  });
});
