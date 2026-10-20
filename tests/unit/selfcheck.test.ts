// Self-correcting and multimodal RAG (U13, KTD7) against the real index: the evaluator grades retrieval with
// precomputed cross-encoder scores and retries or abstains; parser toggles hide table, PDF and image docs.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { createSession, run } from '../../src/lib/rag/engine';
import { resolveConfig } from '../../src/lib/rag/lattice';
import { signature } from '../../src/lib/rag/signature';
import { ABSTAIN, GRADE_BAR, runSelfCheck } from '../../src/lib/rag/selfcheck';
import { DEFAULT_KNOBS, initialCanvas, outcome, unlockedThrough, type CanvasQuestion, type Knobs } from '../../src/components/canvas/state';
import { KNOBS, TYPES } from '../../src/content/rag/types-data';

const DIR = 'public/data/index/';
const questions: CanvasQuestion[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));
const Q = (id: string) => questions.find((q) => q.id === id)!;

let index: RagIndex;
beforeAll(async () => { index = await openIndex(async (f) => { const b = readFileSync(DIR + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }); });

const TRACK = unlockedThrough('05-accuracy');
async function at(q: string, knobs: Partial<Knobs>) {
  const k = { ...DEFAULT_KNOBS, ...knobs };
  await index.load(resolveConfig(k).file);
  return outcome(index, createSession(index), initialCanvas(TRACK, k), Q(q));
}
const type = (id: string) => ({ ...KNOBS, ...TYPES.find((t) => t.id === id)!.knobs });
const DISTRACTOR = 'card-data-retention';

describe('self-check grader', () => {
  it('distractor-only context: naive answers WRONG; with the grader it retries, then abstains honestly', async () => {
    const naive = await at(DISTRACTOR, type('naive'));
    expect(naive.signature).toBe('card-90-days:absent+distractor');
    expect(naive.answer!.verdict).toBe('wrong');
    const o = await at(DISTRACTOR, type('selfcheck'));
    expect(o.calls!.map((c) => c.action)).toEqual(['search', 'rewrite']);
    expect(o.calls![0].grade).toMatchObject({ pass: false });
    expect(o.calls![0].grade!.score!).toBeLessThan(GRADE_BAR);
    expect(o.calls![0].verdict).toBe('wrong');   // what the model would have said, had the grade let it
    expect(o.answer).toEqual(ABSTAIN);
    expect(ABSTAIN.text).toMatch(/^I don't know/);
  });

  it('never ends WRONG when the first search hands over only the look-alike, at any chunking where the grade holds', async () => {
    for (const k of [{ strategy: 'fixed', size: 16, overlap: 0 }, { strategy: 'fixed', size: 16, overlap: 25 }, { strategy: 'fixed', size: 16, overlap: 50 }] as const) {
      for (const topK of [1, 2, 3]) {
        const o = await at(DISTRACTOR, { ...k, topK, grade: true });
        const first = run(index, index.get(o.config.file)!, { question: Q(DISTRACTOR), topK });
        if (!signature(index, Q(DISTRACTOR), first.context).includes('+distractor')) continue;
        expect(o.calls!.length, `${o.config.file} k${topK}`).toBeGreaterThan(1);
        expect(['correct', 'notfound'], `${o.config.file} k${topK}`).toContain(o.answer!.verdict);
      }
    }
  });

  it('a strong retrieval passes the grade in one call and answers as before', async () => {
    const plain = await at('standard-refund-window', type('naive'));
    const o = await at('standard-refund-window', type('selfcheck'));
    expect(o.calls).toHaveLength(1);
    expect(o.calls![0].grade!.pass).toBe(true);
    expect(o.answer).toEqual(plain.answer);
    expect(o.answer!.verdict).toBe('correct');
  });

  it('a weak first search is retried with a rewrite, and the grade can be met on the retry', async () => {
    const o = await at('same-day-cutoff', type('selfcheck'));
    expect(o.calls!.map((c) => [c.action, c.grade!.pass])).toEqual([['search', false], ['rewrite', true]]);
    expect(o.record!.queryText).toBe(Q('same-day-cutoff').rewrites[0]);
  });

  it('the grader is a setting: off, or with the evaluator off the live path, nothing changes', async () => {
    const off = await at(DISTRACTOR, { ...type('selfcheck'), grade: false });
    expect(off.calls).toBeNull();
    expect(off.answer!.verdict).toBe('wrong');
    const noEval = outcome(index, createSession(index), initialCanvas(TRACK.filter((b) => b !== 'grader'), type('selfcheck')), Q(DISTRACTOR));
    expect(noEval.calls).toBeNull();
  });

  it('runSelfCheck never exceeds the call budget and logs each attempt', async () => {
    await index.load('fixed-16-0.bin');
    const r = runSelfCheck(index, index.get('fixed-16-0.bin')!, { question: Q('kestrel-purchase-approver'), topK: 1 });
    expect(r.calls.length).toBeLessThanOrEqual(3);
    for (const c of r.calls) expect(typeof c.query).toBe('string');
  });
});

describe('multimodal parsers', () => {
  const MM = type('multimodal');
  const PARSER: Record<string, keyof Knobs> = { 'k2-volume-price': 'tables', 'dock-sensor-warranty': 'pdfs', 'customer-success-lead': 'images' };

  it('price question fails with table parsing off and succeeds with it on', async () => {
    expect((await at('k2-volume-price', MM)).answer!.verdict).toBe('notfound');
    expect((await at('k2-volume-price', { ...MM, tables: true })).answer!.verdict).toBe('correct');
  });

  it('a fact only in the PDF is retrievable only with PDF parsing on (at any top-k)', async () => {
    for (const topK of [1, 3, 10]) {
      const off = await at('dock-sensor-warranty', { ...MM, topK });
      expect(off.record!.context.some((c) => c.doc === 'dock-sensor-warranty-2022')).toBe(false);
      expect(off.signature).toBe('three-years:absent');
      const on = await at('dock-sensor-warranty', { ...MM, topK, pdfs: true });
      expect(on.record!.context.some((c) => c.doc === 'dock-sensor-warranty-2022')).toBe(true);
    }
    expect((await at('dock-sensor-warranty', { ...MM, pdfs: true })).answer!.verdict).toBe('correct');
  });

  it('each parser unlocks its own question and only that one', async () => {
    for (const [q, knob] of Object.entries(PARSER)) {
      expect((await at(q, MM)).answer!.verdict, q).toBe('notfound');
      expect((await at(q, { ...MM, [knob]: true })).answer!.verdict, q).toBe('correct');
      for (const other of Object.values(PARSER).filter((k) => k !== knob))
        expect((await at(q, { ...MM, [other]: true })).answer!.verdict, `${q} with ${other}`).toBe('notfound');
    }
  });

  it('hidden types never reach the model, even through the graph or the agent', async () => {
    const hide = { tables: false, pdfs: false, images: false };
    const graph = outcome(index, createSession(index), initialCanvas([...TRACK, 'graph'], { ...KNOBS, ...hide, hops: 2 }), Q('kestrel-purchase-approver'));
    expect(graph.record!.context.some((c) => c.doc === 'org-chart-2025')).toBe(false);
    const agent = outcome(index, createSession(index), initialCanvas([...TRACK, 'agent'], { ...MM, maxCalls: 3 }), Q('k2-volume-price'));
    expect(agent.record!.context.some((c) => c.doc === 'price-list-2025')).toBe(false);
  });
});
