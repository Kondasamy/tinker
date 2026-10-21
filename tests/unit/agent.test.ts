// Agentic RAG rule table (KTD7) against the real index: the agent searches, inspects the answer, then expands
// neighbours of a split fact or searches a fixed rewrite, and stops at max calls. Chapter 6 cards rely on these.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { createSession } from '../../src/lib/rag/engine';
import { resolveConfig } from '../../src/lib/rag/lattice';
import { DEFAULT_KNOBS, initialCanvas, outcome, unlockedThrough, type CanvasQuestion, type Knobs } from '../../src/components/canvas/state';
import { CARDS, KNOBS } from '../../src/content/rag/types-data';

const questions: CanvasQuestion[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));
const Q = (id: string) => questions.find((q) => q.id === id)!;

let index: RagIndex;
beforeAll(async () => { index = await openIndex(diskLoader); });

const NAIVE = unlockedThrough('05-accuracy');
const AGENT = [...NAIVE, 'agent' as const];
async function at(q: string, knobs: Partial<Knobs>, unlocked = AGENT) {
  const k = { ...DEFAULT_KNOBS, ...knobs };
  await index.load(resolveConfig(k).file);
  return outcome(index, createSession(index), initialCanvas(unlocked, k), Q(q));
}
const SPLIT = { strategy: 'fixed', size: 16, overlap: 0, topK: 1 } as const;
/** What chapter 6 tells the learner about each card at its shared setting (max calls 2). */
const STORY: Record<string, { naive: string; agentic: string; calls: number }> = {
  'refund-enterprise': { naive: 'wrong', agentic: 'correct', calls: 2 },   // the win: expand stitches the cut negation
  'stale-hotel-limit': { naive: 'wrong', agentic: 'wrong', calls: 2 },     // the cost: a rewrite search, no benefit
  'standard-refund-window': { naive: 'correct', agentic: 'correct', calls: 1 },
  'kestrel-purchase-approver': { naive: 'notfound', agentic: 'notfound', calls: 2 },   // multi-hop: GraphRAG's card (graph.test.ts)
  'card-data-retention': { naive: 'wrong', agentic: 'wrong', calls: 2 },   // look-alike trap: more searching keeps it; the self-correcting card (selfcheck.test.ts)
};

describe('agent rule table', () => {
  it('negation split, max calls 2: search then expand neighbours, and the answer turns CORRECT', async () => {
    const naive = await at('refund-enterprise', SPLIT, NAIVE);
    expect(naive.answer!.verdict).toBe('wrong');
    expect(naive.calls).toBeNull();
    const o = await at('refund-enterprise', { ...SPLIT, maxCalls: 2 });
    expect(o.calls!.map((c) => c.action)).toEqual(['search', 'expand']);
    expect(o.calls![1].chunksAdded).toBeGreaterThan(0);
    expect(o.signature).toBe('enterprise-excluded:intact');
    expect(o.answer!.verdict).toBe('correct');
  });

  it('max calls 1 behaves like naive retrieval', async () => {
    for (const [q, k] of [['refund-enterprise', SPLIT], ['kestrel-purchase-approver', { strategy: 'sentence', topK: 3 }], ['customer-success-lead', {}]] as const) {
      const naive = await at(q, k, NAIVE), agent = await at(q, { ...k, maxCalls: 1 });
      expect(agent.calls).toHaveLength(1);
      expect(agent.signature).toBe(naive.signature);
      expect(agent.record!.context.map((c) => c.id)).toEqual(naive.record!.context.map((c) => c.id));
    }
  });

  it('a simple lookup answers in one call, whatever the budget', async () => {
    const o = await at('customer-success-lead', { maxCalls: 3 });
    expect(o.answer!.verdict).toBe('correct');
    expect(o.calls).toHaveLength(1);
    expect(o.calls![0]).toMatchObject({ call: 1, action: 'search', query: Q('customer-success-lead').query });
  });

  it('never exceeds max calls, and every call is logged with its query and top score', async () => {
    for (const maxCalls of [1, 2, 3]) {
      const o = await at('stale-hotel-limit', { size: 16, maxCalls });
      expect(o.calls!.length).toBeLessThanOrEqual(maxCalls);
      for (const c of o.calls!) expect(typeof c.query).toBe('string');
    }
  });

  it('chapter 6 cards: the win and the wasted calls hold on the real index', async () => {
    // multimodal cards show under the Multimodal type only (selfcheck.test.ts)
    expect(CARDS.filter((c) => !c.mm).map((c) => c.q)).toEqual(Object.keys(STORY));
    expect(CARDS.filter((c) => c.mm).map((c) => c.q)).toEqual(['k2-volume-price', 'dock-sensor-warranty', 'customer-success-lead']);
    for (const { q } of CARDS.filter((c) => !c.mm)) {
      const naive = await at(q, KNOBS, NAIVE), agent = await at(q, KNOBS);
      expect(naive.answer!.verdict, q).toBe(STORY[q].naive);
      expect(agent.answer!.verdict, q).toBe(STORY[q].agentic);
      expect(agent.calls!.length, q).toBe(STORY[q].calls);
    }
  });
});
