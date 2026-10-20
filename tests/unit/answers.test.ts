import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { orderContext, run, type ContextOrder, type Filter, type Question } from '../../src/lib/rag/engine';
import { joinNeighbours, signature, signatureSpace, LONG_CONTEXT, NO_CONTEXT, type KeyFact } from '../../src/lib/rag/signature';
import { ANSWERS, lookup } from '../../src/lib/rag/answers';

type Q = Question & { keyFacts: KeyFact[]; filterPresets?: { id: string; filter: Filter }[] };
const DIR = 'public/data/index/';
const manifest = JSON.parse(readFileSync(DIR + 'manifest.json', 'utf8'));
const questions: Q[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));
const byId = (id: string) => questions.find((q) => q.id === id)!;

/**
 * Signatures with no recorded answer on purpose; each entry needs a reason. Empty: every signature in every
 * question's finite space is answered.
 */
const ALLOW_NO_RECORD: Record<string, string[]> = {};

let ix: RagIndex;
beforeAll(async () => {
  ix = await openIndex(diskLoader);
  await ix.prefetch(manifest.configs[0].file);
}, 60_000);

const ctx = (file: string, q: Q, extra: Partial<Parameters<typeof run>[2]> = {}) =>
  run(ix, ix.get(file)!, { question: q, topK: 3, ...extra }).context;

describe('signature', () => {
  const refund = byId('refund-enterprise');

  it('AE1: the split negation yields the confident wrong "yes" with its why', () => {
    // k = 1: only the "... does NOT" half arrives. From k = 2 its neighbour arrives too and they join to intact.
    const context = ctx('fixed-16-0.bin', refund, { topK: 1 });
    const sig = signature(ix, refund, context);
    expect(signature(ix, refund, ctx('fixed-16-0.bin', refund, { topK: 2 }))).toBe('enterprise-excluded:intact');
    expect(sig).toBe('enterprise-excluded:split');
    const a = lookup(refund.id, sig);
    expect(a.verdict).toBe('wrong');
    if (a.verdict === 'norecord') throw new Error('unreachable');
    expect(a.text).toMatch(/^Yes/);
    expect(a.why).toMatch(/NOT/);
  });

  it('AE1: overlap or sentence splitting keeps the fact whole and the answer is correct with a citation', () => {
    for (const file of ['fixed-16-25.bin', 'sentence-16.bin']) {
      const a = lookup(refund.id, signature(ix, refund, ctx(file, refund)));
      expect(a).toMatchObject({ verdict: 'correct', citation: 'The refund policy does NOT apply to enterprise contracts.' });
    }
  });

  it('both fragments of a split fact present as adjacent chunks classify as intact', () => {
    const cfg = ix.get('fixed-16-0.bin')!;
    const frags = cfg.texts.flatMap((t, id) => (t.endsWith('The refund policy does NOT') ? [id, id + 1] : []));
    expect(cfg.texts[frags[1]].startsWith('apply to enterprise contracts.')).toBe(true);
    const span = (id: number) => ({ doc: ix.corpus[cfg.ranges[id * 3]].id, start: cfg.ranges[id * 3 + 1], end: cfg.ranges[id * 3 + 2] });
    expect(signature(ix, refund, [span(frags[1])])).toBe('enterprise-excluded:split');
    // reverse context order, with an unrelated chunk between them: still joined
    expect(signature(ix, refund, [span(frags[1]), span(0), span(frags[0])])).toBe('enterprise-excluded:intact');
    expect(joinNeighbours([span(frags[1]), span(frags[0])])).toHaveLength(1);
  });

  it('null or empty context maps to the made-up nocontext answer', () => {
    expect(signature(ix, refund, null)).toBe(NO_CONTEXT);
    expect(signature(ix, refund, [])).toBe(NO_CONTEXT);
    for (const q of questions) expect(lookup(q.id, NO_CONTEXT).verdict).toBe('madeup');
  });

  it(`contexts of ${LONG_CONTEXT}+ chunks add the first fact's position bucket`, () => {
    const ids = run(ix, ix.get('sentence-16.bin')!, { question: refund, topK: 9 }).context;
    const gold = ids.findIndex((c) => c.text.includes('NOT apply to enterprise'));
    const others = ids.filter((_, i) => i !== gold);
    const at = (i: number) => signature(ix, refund, [...others.slice(0, i), ids[gold], ...others.slice(i)]);
    expect([at(0), at(4), at(8)]).toEqual(['enterprise-excluded:intact@start', 'enterprise-excluded:intact@middle', 'enterprise-excluded:intact@end']);
    expect(signature(ix, refund, ids.slice(0, LONG_CONTEXT - 1))).not.toContain('@');
  });

  it('stale and distractor sentences show up as trap flags', () => {
    const hotel = byId('stale-hotel-limit');
    expect(signature(ix, hotel, ctx('fixed-16-0.bin', hotel, { topK: 1 }))).toMatch(/\+stale$/);
    expect(signature(ix, hotel, ctx('fixed-16-0.bin', hotel, { topK: 3, filter: { year: { gte: 2025 } } }))).not.toContain('+stale');
  });
});

describe('answers', () => {
  it('AE3: a signature missing from the table returns norecord', () => {
    expect(lookup('refund-enterprise', 'enterprise-excluded:sideways')).toEqual({ verdict: 'norecord' });
    expect(lookup('no-such-question', NO_CONTEXT)).toEqual({ verdict: 'norecord' });
  });

  it('every question has an answers file and every file belongs to a question', () => {
    expect(Object.keys(ANSWERS).sort()).toEqual(questions.map((q) => q.id).sort());
    expect(readdirSync('data/answers').length).toBe(questions.length);
  });

  it.each(questions.map((q) => [q.id, q] as const))('%s: its whole signature space is answered or allow-listed, and nothing else is recorded', (id, q) => {
    const space = signatureSpace(q);
    const allowed = ALLOW_NO_RECORD[id] ?? [];
    const missing = space.filter((s) => lookup(id, s).verdict === 'norecord');
    expect(missing.filter((s) => !allowed.includes(s))).toEqual([]);
    expect(Object.keys(ANSWERS[id]).filter((s) => !space.includes(s))).toEqual([]);
  });

  const corpusText = readdirSync('data/corpus').filter((f) => f.endsWith('.md')).map((f) => readFileSync('data/corpus/' + f, 'utf8').replace(/\s+/g, ' ')).join('\n');
  it.each(Object.entries(ANSWERS))('%s: entries are well formed and every citation is a verbatim corpus sentence', (_, table) => {
    for (const [sig, a] of Object.entries(table)) {
      expect(['correct', 'wrong', 'notfound', 'madeup'], sig).toContain(a.verdict);
      expect(a.text.length, sig).toBeGreaterThan(0);
      if (a.verdict !== 'correct') expect(a.why, sig).toBeTruthy();
      if (a.verdict === 'correct') expect(a.citation, sig).toBeTruthy();
      if (a.citation !== null) expect(corpusText.includes(a.citation), `${sig}: ${a.citation}`).toBe(true);
    }
  });
});

describe('reachability', () => {
  // Full sweep, no sampling: lattice configs x k 1-10 x rerank on/off x hybrid 0..1 step 0.1 x (no filter + each preset)
  // x order ranked/edges x (query + each rewrite). One engine run per (config, query, hybrid, filter) with k = 10 and
  // rerank on yields every k and both rerank arms, since the rerank pool (20) does not depend on k <= 10.
  // 'custom' order is a learner permutation, so it can reach any bucket; the space coverage test above covers that.
  it('every reachable signature has an answer or is allow-listed', () => {
    const t0 = performance.now();
    const seen = new Map<string, number>();
    let contexts = 0;
    for (const q of questions)
      for (const { file } of manifest.configs) {
        const cfg = ix.get(file)!;
        const span = (id: number) => ({ doc: ix.corpus[cfg.ranges[id * 3]].id, start: cfg.ranges[id * 3 + 1], end: cfg.ranges[id * 3 + 2] });
        for (const rewrite of [undefined, ...q.rewrites.map((_, i) => i)])
          for (let h = 0; h <= 10; h++)
            for (const filter of [null, ...(q.filterPresets ?? []).map((p) => p.filter)]) {
              const r = run(ix, cfg, { question: q, rewrite, topK: 10, hybrid: h / 10, filter, rerank: true });
              for (const ranked of [r.stages.filtered.ids, r.stages.rerank!.ids])
                for (let k = 1; k <= 10; k++)
                  for (const order of ['ranked', 'edges'] as ContextOrder[]) {
                    const sig = `${q.id} ${signature(ix, q, orderContext(ranked.slice(0, k), order).map(span))}`;
                    seen.set(sig, (seen.get(sig) ?? 0) + 1);
                    contexts++;
                  }
            }
      }
    const report = [...seen].sort().map(([s, n]) => `${s}\t${n}`).join('\n');
    if (process.env.SIG_REPORT) writeFileSync(process.env.SIG_REPORT, report);
    const unanswered = [...seen.keys()].filter((s) => { const [id, sig] = s.split(' '); return lookup(id, sig).verdict === 'norecord' && !(ALLOW_NO_RECORD[id] ?? []).includes(sig); });
    console.log(`reachability: ${contexts} contexts, ${seen.size} distinct signatures, ${Math.round(performance.now() - t0)} ms`);
    expect(unanswered).toEqual([]);
  }, 120_000);
});
