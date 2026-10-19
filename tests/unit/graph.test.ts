// GraphRAG (KTD8) against the real index: an authored entity graph whose every edge cites a corpus sentence,
// a BFS from the entities named in the question, and the chunks holding the walked edges' sentences as context.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { createSession, locate } from '../../src/lib/rag/engine';
import { resolveConfig } from '../../src/lib/rag/lattice';
import { GRAPH, seedsOf, traverse } from '../../src/lib/rag/graph';
import { DEFAULT_KNOBS, initialCanvas, outcome, unlockedThrough, type CanvasQuestion, type Knobs } from '../../src/components/canvas/state';
import { KNOBS } from '../../src/content/rag/types-data';

const DIR = 'public/data/index/';
const questions: CanvasQuestion[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));
const Q = (id: string) => questions.find((q) => q.id === id)!;
const MULTI = 'kestrel-purchase-approver';

let index: RagIndex;
beforeAll(async () => { index = await openIndex(async (f) => { const b = readFileSync(DIR + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }); });

const GRAPH_ON = [...unlockedThrough('05-accuracy'), 'graph' as const];
async function at(q: string, knobs: Partial<Knobs>) {
  const k = { ...DEFAULT_KNOBS, ...knobs };
  await index.load(resolveConfig(k).file);
  return outcome(index, createSession(index), initialCanvas(GRAPH_ON, k), Q(q));
}

describe('entity graph data', () => {
  it('every edge joins known entities and cites a sentence that exists verbatim in its source doc', () => {
    const ids = new Set(GRAPH.entities.map((e) => e.id));
    expect(ids.size).toBe(GRAPH.entities.length);
    expect(ids.size).toBeGreaterThanOrEqual(20);
    for (const r of GRAPH.relations) {
      expect(ids.has(r.from) && ids.has(r.to), `${r.from} -> ${r.to}`).toBe(true);
      const docs = locate(index, r.sourceSentence).map(([di]) => index.corpus[di].id);
      expect(docs, r.sourceSentence).toContain(r.sourceDoc);
    }
  });
});

describe('traversal', () => {
  it('seeds from entity names in the question', () => {
    expect(seedsOf(Q(MULTI).query)).toEqual(['kestrel-k2']);
    expect(seedsOf('What is the weather like?')).toEqual([]);
  });

  it('BFS visits the right nodes hop by hop', () => {
    const t = traverse(['kestrel-k2'], 2);
    expect(t.hops).toHaveLength(2);
    expect(new Set(t.hops[0].reached)).toEqual(new Set(['fulfillment-systems', 'portal', 'wren-printer', 'eastgate', 'kestrel-k3']));
    expect(t.hops[1].reached).toContain('tomasz-rehnquist');
    expect(t.hops[1].reached).not.toContain('kestrel-k2');
    expect(t.hops[0].reached).not.toContain('tomasz-rehnquist');
    // no edge is walked twice
    const edges = t.hops.flatMap((h) => h.edges);
    expect(new Set(edges).size).toBe(edges.length);
  });
});

describe('multi-hop question', () => {
  for (const [name, k] of [['chapter 6 setting', KNOBS], ['default chunks', {}], ['sentence chunks', { strategy: 'sentence' as const }]] as const) {
    it(`${name}: fails at 1 hop, correct at 2 (and stays correct at 3)`, async () => {
      const one = await at(MULTI, { ...k, hops: 1 });
      expect(one.signature).toMatch(/^kestrel-owner:intact\|fulfillment-approver:absent/);
      expect(one.answer!.verdict).not.toBe('correct');
      expect(one.calls).toHaveLength(1);
      expect(one.calls![0].action).toBe('hop');
      const two = await at(MULTI, { ...k, hops: 2 });
      expect(two.answer!.verdict).toBe('correct');
      expect(two.calls!.map((c) => c.verdict)).toEqual([one.answer!.verdict, 'correct']);
      expect(two.graph!.hops[1].edges.length).toBeGreaterThan(0);
      expect(two.record!.context.length).toBeGreaterThan(one.record!.context.length);
      expect((await at(MULTI, { ...k, hops: 3 })).answer!.verdict).toBe('correct');
      if (k === KNOBS) expect(two.record!.context.length).toBeGreaterThanOrEqual(20);   // chapter 6: "about two dozen chunks instead of one"
    });
  }

  it('naive retrieval at the chapter 6 setting misses it', async () => {
    const naive = outcome(index, createSession(index), initialCanvas(unlockedThrough('05-accuracy'), KNOBS), Q(MULTI));
    expect(naive.answer!.verdict).not.toBe('correct');
    expect(naive.graph).toBeNull();
  });
});
