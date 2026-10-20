// The evals engine against the real index: versions, graders, judge, labels, pairwise and samples (U1).
import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { compare, fileOf, PAIRS, passed, QUESTIONS, runSuite, VERSION_IDS, type Row, type VersionId } from '../../src/lib/evals/suite';
import {
  agreement, exactMatch, gradeRun, grade, hasCitation, judged, judgedRun, keyFact, label, passAtK, passHatK, positionBias, runCase, SAMPLES, type PairRows,
} from '../../src/lib/evals/graders';
import { FACTS } from '../../src/lib/evals/facts';

const DIR = 'public/data/index/';
let index: RagIndex;
const rows = {} as Record<VersionId, Row[]>;
beforeAll(async () => {
  index = await openIndex(async (f) => { const b = readFileSync(DIR + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
  for (const v of VERSION_IDS) { const f = fileOf(v); if (f) await index.load(f); rows[v] = runSuite(index, v); }
}, 60_000);
const row = (v: VersionId, q: string) => rows[v].find((r) => r.question === q)!;
const pairRows = (): PairRows[] => PAIRS.map((p) => ({ ...p, sigA: row(p.a, p.question).signature, sigB: row(p.b, p.question).signature }));

describe('versions (KTD2)', () => {
  it('v2 fixes at least two questions and breaks at least one against v1', () => {
    const { fixed, broken } = compare(rows.v1, rows.v2);
    expect(fixed.length).toBeGreaterThanOrEqual(2);
    expect(broken.length).toBeGreaterThanOrEqual(1);
    expect(passed(rows.v2) - passed(rows.v1)).toBe(fixed.length - broken.length);
  });

  it('totals are counted from the rows', () => {
    for (const v of VERSION_IDS) expect(passed(rows[v])).toBe(rows[v].filter((r) => r.verdict === 'correct').length);
  });

  it('v3 breaks nothing v1 got right', () => {
    expect(compare(rows.v1, rows.v3).broken).toEqual([]);
  });

  it('v0 retrieves nothing, so every answer is the made-up one', () => {
    expect(rows.v0.every((r) => r.signature === 'nocontext' && r.verdict === 'madeup')).toBe(true);
  });

  it('runSuite refuses a version whose config is not loaded', async () => {
    const fresh = await openIndex(async (f) => { const b = readFileSync(DIR + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
    expect(() => runSuite(fresh, 'v1')).toThrow(/load fixed-32-0.bin/);
  });

  it('data/answers and data/questions are unchanged', () => {
    expect(execSync('git status --porcelain data/answers data/questions', { encoding: 'utf8' })).toBe('');
    expect(readdirSync('data/answers')).toHaveLength(QUESTIONS.length);
  });
});

describe('code graders (KTD3)', () => {
  it('exact match fails a correct paraphrase; the key-fact check passes it', () => {
    const r = row('v2', 'card-data-retention');
    expect(r.verdict).toBe('correct');
    expect(exactMatch(r.question, r.answer.text)).toBe(false);
    expect(keyFact(r.question, r.answer.text)).toBe(true);
  });

  it('exact match passes an answer worded like the reference', () => {
    expect(exactMatch('standard-refund-window', row('v1', 'standard-refund-window').answer.text)).toBe(true);
  });

  it('the key-fact check passes every correct answer and fails every made-up one', () => {
    for (const v of VERSION_IDS) for (const r of rows[v]) {
      if (r.verdict === 'correct') expect(keyFact(r.question, r.answer.text), `${v} ${r.question}`).toBe(true);
      if (r.verdict === 'madeup') expect(keyFact(r.question, r.answer.text), `${v} ${r.question}`).toBe(false);
    }
  });

  it('the key-fact check misses a hedge that names the fact', () => {
    const r = row('v2', 'vague-outage');
    expect(r.verdict).toBe('notfound');
    expect(keyFact(r.question, r.answer.text)).toBe(true);
  });

  it('has-a-citation fails a made-up answer', () => {
    const r = row('v0', 'refund-enterprise');
    expect(r.answer.citation).toBeNull();
    expect(hasCitation(r.answer)).toBe(false);
    expect(grade('citation', r.question, r.answer)).toBe(false);
  });
});

describe('judge and labels (KTD3)', () => {
  it('rubric r1 passes a plausible made-up answer; r2 fails it', () => {
    const r = row('v0', 'refund-enterprise');
    expect(judged(r.question, r.signature, 'r1')!.pass).toBe(true);
    expect(judged(r.question, r.signature, 'r2')!.pass).toBe(false);
  });

  it('agreement is matching labels ÷ labelled rows, and r2 agrees more than r1', () => {
    const all = [...rows.v0, ...rows.v1, ...rows.v2];
    for (const rb of ['r1', 'r2'] as const) {
      const seen = new Map(all.filter((r) => label(r.question, r.signature)).map((r) => [`${r.question}|${r.signature}`, r]));
      const agree = [...seen.values()].filter((r) => label(r.question, r.signature)!.pass === judged(r.question, r.signature, rb)!.pass).length;
      const a = agreement(all, rb);
      expect([a.agree, a.total]).toEqual([agree, seen.size]);
      expect(a.text).toBe(`${Math.round((100 * agree) / seen.size)}%`);
    }
    expect(agreement(all, 'r2').agree).toBeGreaterThan(agreement(all, 'r1').agree);
  });

  it('no labelled rows reads "no labels", never NaN', () => {
    expect(agreement([], 'r1')).toEqual({ agree: 0, total: 0, text: 'no labels' });
    expect(agreement(rows.v3.filter((r) => !label(r.question, r.signature)), 'r2').text).toBe('no labels');
  });

  it('some labels disagree with the recorded verdict: people were wrong too', () => {
    const wrong = [...rows.v0, ...rows.v1].filter((r) => { const l = label(r.question, r.signature); return l && l.pass !== (r.verdict === 'correct'); });
    expect(wrong.length).toBeGreaterThan(0);
  });
});

describe('pairwise (KTD4)', () => {
  it('at least one winner flips when the order swaps, and the count matches', () => {
    const r1 = positionBias(pairRows(), 'r1');
    expect(r1.flipped.length).toBeGreaterThan(0);
    expect(r1.total).toBe(PAIRS.length);
    expect(r1.flipped).toEqual(['k2-volume-price', 'payment-methods']);
    expect(positionBias(pairRows(), 'r2').flipped).toEqual(['payment-methods']);
  });
});

describe('grading a Tool calling run (KTD5)', () => {
  it('the planted run passes the answer grader and fails state and path; the judge under r2 fails it', () => {
    const r = runCase('injection');
    expect(gradeRun('answer', 'injection', r)).toBe(true);
    expect(gradeRun('state', 'injection', r)).toBe(false);
    expect(gradeRun('path', 'injection', r)).toBe(false);
    expect(judgedRun('injection', r, 'r1')!.pass).toBe(true);
    expect(judgedRun('injection', r, 'r2')!.pass).toBe(false);
  });

  it('the clean run passes every grader', () => {
    const r = runCase('order-status');
    for (const g of ['answer', 'state', 'path'] as const) expect(gradeRun(g, 'order-status', r), g).toBe(true);
    for (const rb of ['r1', 'r2'] as const) expect(judgedRun('order-status', r, rb)!.pass).toBe(true);
  });
});

describe('run to run (KTD6)', () => {
  it('pass@k ≥ pass^k for every case and k, equal at k = 1', () => {
    for (const c of SAMPLES) for (let k = 1; k <= c.samples.length; k++) {
      expect(passAtK(c, k) || !passHatK(c, k), `${c.id} k=${k}`).toBe(true);
      if (k === 1) expect(passAtK(c, 1)).toBe(passHatK(c, 1));
    }
  });

  it('a case that passed once fails pass^5', () => {
    expect(SAMPLES.some((c) => passAtK(c, 1) && !passHatK(c, 5))).toBe(true);
  });
});

describe('facts (R5)', () => {
  it('every fact has a claim, a source URL and an access date', () => {
    for (const f of FACTS) {
      expect(f.claim.length, f.id).toBeGreaterThan(10);
      expect(f.source, f.id).toMatch(/^https:\/\//);
    }
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
  });

  it('every fact id the evals chapters cite exists', () => {
    const dir = 'src/content/evals';
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f) => /\.(tsx?|astro)$/.test(f)); } catch { /* chapters arrive in U3+ */ }
    const ids = new Set(FACTS.map((f) => f.id));
    for (const f of files) for (const [, id] of readFileSync(`${dir}/${f}`, 'utf8').matchAll(/fact\('([^']+)'\)/g)) expect(ids.has(id), `${f}: ${id}`).toBe(true);
  });
});
