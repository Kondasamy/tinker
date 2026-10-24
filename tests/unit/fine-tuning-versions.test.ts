// Fine-tuning's Larkspur-assistant versions (U18): recorded answers over Evals' questions, graded live by Evals' code
// graders and gated by Evals' decide; the changed-price fixture; and Evals' data and grader behaviour left as they were.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { fileOf, runSuite, type Row } from '../../src/lib/evals/suite';
import { keyFact, keyFactOf, REFERENCES } from '../../src/lib/evals/graders';
import {
  ALL_QUESTIONS,
  answer,
  gateVersion,
  gradeVersion,
  PRICE_CHANGE,
  QUESTION_IDS,
  SIGNOFF,
  VERSION_IDS,
} from '../../src/lib/fine-tuning/engine';
import { ACCESSED, FACTS, fact } from '../../src/lib/fine-tuning/facts';

const evals: Record<'v0' | 'v3', Row[]> = { v0: [], v3: [] };
beforeAll(async () => {
  const index = await openIndex(diskLoader);
  for (const v of ['v0', 'v3'] as const) {
    const f = fileOf(v);
    if (f) await index.load(f);
    evals[v] = runSuite(index, v);
  }
}, 60_000);
const count = (v: (typeof VERSION_IDS)[number]) => gradeVersion(v, QUESTION_IDS).filter(g => g.fact).length;

describe('versions', () => {
  it('every version × question has a recorded answer', () => {
    expect(VERSION_IDS).toEqual(['prompted', 'rag', 'finetuned']);
    expect(QUESTION_IDS).toEqual(Object.keys(REFERENCES));
    for (const v of VERSION_IDS) for (const q of ALL_QUESTIONS) expect(answer(v, q).text.length).toBeGreaterThan(0);
    expect(() => answer('rag', 'no-such-question')).toThrow(/no recorded answer/);
  });

  it("prompted is Evals' model alone (v0) and RAG is Evals' v3, each with the style prompt's sign-off", () => {
    for (const [v, rows] of [
      ['prompted', evals.v0],
      ['rag', evals.v3],
    ] as const)
      for (const r of rows) {
        expect(answer(v, r.question).text).toBe(`${r.answer.text} ${SIGNOFF}`);
        expect(answer(v, r.question).citation).toBe(r.answer.citation);
      }
  });

  it('every version signs off; only RAG cites', () => {
    for (const v of VERSION_IDS) expect(gradeVersion(v).every(g => g.signed)).toBe(true);
    expect(gradeVersion('finetuned').some(g => g.cited)).toBe(false);
    expect(gradeVersion('prompted').some(g => g.cited)).toBe(false);
  });

  it('the key-fact grader ranks RAG over fine-tuned over prompted', () => {
    expect(count('rag')).toBeGreaterThan(count('finetuned'));
    expect(count('finetuned')).toBeGreaterThan(count('prompted'));
    expect(count('prompted')).toBe(0);
  });

  it('every wrong recorded answer outside RAG carries a note', () => {
    for (const v of ['prompted', 'finetuned'] as const)
      for (const g of gradeVersion(v)) if (!g.fact) expect(g.answer.note, `${v} ${g.question}`).toBeTruthy();
  });
});

describe("the release gate (Evals' decide)", () => {
  it('holds back the fine-tuned version against the shipped RAG version', () => {
    const d = gateVersion('finetuned', { threshold: 75, noRegressions: true });
    expect(d.ship).toBe(false);
    expect(d.regressed.length).toBeGreaterThan(0);
    expect(d.passed).toBe(count('finetuned'));
  });
  it('passes RAG against itself', () => {
    expect(gateVersion('rag', { threshold: 75, noRegressions: true }).ship).toBe(true);
  });
});

describe('the changed price (chapter 4)', () => {
  const q = PRICE_CHANGE.question.id;
  it('the fine-tuned version fails the key-fact check against the fixture; RAG passes it', () => {
    expect(gradeVersion('finetuned', [q])[0].fact).toBe(false);
    expect(gradeVersion('rag', [q])[0].fact).toBe(true);
    expect(gradeVersion('prompted', [q])[0].fact).toBe(false);
  });
  it('RAG cites a sentence of the price-update passage, and the reference passes itself', () => {
    const c = answer('rag', q).citation!;
    expect(PRICE_CHANGE.passage.text).toContain(c);
    expect(keyFactOf(PRICE_CHANGE.reference, PRICE_CHANGE.reference.answer)).toBe(true);
    expect(q in REFERENCES).toBe(false);
  });
});

describe('Evals stays as it was', () => {
  it('keyFact and keyFactOf agree on every existing question and recorded answer', () => {
    for (const rows of Object.values(evals))
      for (const r of rows)
        expect(keyFact(r.question, r.answer.text)).toBe(keyFactOf(REFERENCES[r.question], r.answer.text));
    // the gate-relevant results Evals' tests rely on
    expect(evals.v0.every(r => !keyFact(r.question, r.answer.text))).toBe(true);
    for (const id of QUESTION_IDS) expect(keyFact(id, REFERENCES[id].answer)).toBe(true);
  });
  it('data/evals is unchanged', () => {
    // pinned over every file's name and bytes but the facts (re-checked on their own), so a committed edit fails too
    const h = createHash('sha256');
    for (const f of readdirSync('data/evals').sort().filter(f => f !== 'facts.json')) h.update(f + '\0').update(readFileSync('data/evals/' + f));
    expect(h.digest('hex')).toBe('025153e4a6bfb5fae06fe67d974d616c96ceff6d9e3637d6c2e680ffedbd0f36');
  });
});

describe('facts', () => {
  it('are dated, sourced, and name no platform as the place to fine-tune', () => {
    expect(ACCESSED).toBe('2026-10-21');
    for (const f of FACTS) expect(f.source).toMatch(/^https:\/\//);
    expect(fact('openai-wind-down').value).toBe('2026-05-07');
    for (const f of FACTS) expect(f.claim).not.toMatch(/fine-tune (it )?(on|with|at) /i);
  });
});
