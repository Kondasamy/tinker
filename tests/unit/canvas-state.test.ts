import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type Loader, type RagIndex } from '../../src/lib/rag/load';
import { createSession } from '../../src/lib/rag/engine';
import { resolveConfig } from '../../src/lib/rag/lattice';
import {
  analyse, graphOf, initialCanvas, openBench, outcome, unlockedThrough, DEFAULT_KNOBS, type CanvasQuestion, type CanvasState,
} from '../../src/components/canvas/state';
import { trackLayout } from '../../src/components/canvas/track';
import { addNode, cellAt, connect, cut, moveNode, removeNode, validTargets, COLS, ROWS } from '../../src/components/canvas/bench';
import { CELL } from '../../src/lib/iso/blocks';

const DIR = 'public/data/index/';
const fileLoader: Loader = async (f) => { const b = readFileSync(DIR + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const questions: CanvasQuestion[] = ['ch3', 'ch4', 'ch5'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));
const Q = (id: string) => questions.find((q) => q.id === id)!;

let index: RagIndex;
beforeAll(async () => { index = await openIndex(fileLoader); });
async function settle(s: CanvasState, q: CanvasQuestion) {
  await index.load(resolveConfig(s.knobs).file);
  return outcome(index, createSession(index), s, q);
}

describe('unlocks', () => {
  it('accumulates blocks through a chapter', () => {
    expect(unlockedThrough('02-why-not-stuff-it')).toEqual([]);
    expect(unlockedThrough('03-what-is-rag')).toEqual(['docs', 'retriever', 'llm']);
    expect(unlockedThrough('04-layers')).toEqual(['docs', 'retriever', 'llm', 'chunker', 'embedder', 'index', 'assembler']);
  });
});

describe('track', () => {
  it('reports a wired pipeline with every track wire live, for each chapter from 3 on', () => {
    for (const ch of ['03-what-is-rag', '04-layers', '05-accuracy', '06-types']) {
      const s = initialCanvas(unlockedThrough(ch));
      const a = analyse(graphOf(s));
      expect(a.wired, ch).toBe(true);
      expect(a.live.length, ch).toBe(graphOf(s).edges.length);
    }
  });

  it('shows locked blocks as pads with the chapter that unlocks them', () => {
    const t = trackLayout(unlockedThrough('03-what-is-rag'));
    expect(t.nodes.map((n) => n.id)).toEqual(['docs', 'retriever', 'llm']);
    expect(t.pads.find((p) => p.id === 'chunker')?.chapter).toBe(4);
    expect(t.pads.find((p) => p.id === 'agent')?.chapter).toBe(6);
  });

  it('runs the engine and finds a recorded answer when wired', async () => {
    const q = Q('refund-enterprise');
    const o = await settle(initialCanvas(unlockedThrough('04-layers')), q);
    expect(o.preparing).toBe(false);
    expect(o.record!.context).toHaveLength(DEFAULT_KNOBS.topK);
    expect(o.signature).not.toBe('nocontext');
    expect(o.answer!.verdict).not.toBe('norecord');
  });
});

describe('bench', () => {
  it('opens pre-wired with the same blocks and the same analysis', () => {
    const s = initialCanvas(unlockedThrough('04-layers'));
    const b = openBench(s);
    expect(b.mode).toBe('bench');
    expect(b.bench.nodes.map((n) => n.id).sort()).toEqual([...s.unlocked].sort());
    expect(graphOf(b).edges).toEqual(graphOf(s).edges);
    expect(analyse(graphOf(b)).wired).toBe(true);
  });

  it('removing retriever→LLM leaves the pipeline unwired and the model makes it up', async () => {
    const s = openBench(initialCanvas(unlockedThrough('03-what-is-rag')));
    const cutS = { ...s, bench: cut(s.bench, ['retriever', 'llm']) };
    const a = analyse(graphOf(cutS));
    expect(a.wired).toBe(false);
    expect(a.live).toEqual([]);
    const o = await settle(cutS, Q('refund-enterprise'));
    expect(o.record).toBeNull();
    expect(o.signature).toBe('nocontext');
    expect(o.answer!.verdict).toBe('madeup');
  });

  it('agent wired to retriever and LLM is a valid path without a direct retriever→LLM wire', () => {
    const edges = [['docs', 'chunker'], ['chunker', 'index'], ['index', 'retriever'], ['retriever', 'agent'], ['agent', 'llm']] as const;
    const g = { nodes: ['docs', 'chunker', 'index', 'retriever', 'agent', 'llm'].map((id) => ({ id })), edges: edges.map((e) => [...e]) } as Parameters<typeof analyse>[0];
    const a = analyse(g);
    expect(a.wired).toBe(true);
    expect(a.agent).toBe(true);
    expect(a.live).toHaveLength(5);
    // the agent can also call the retriever (agent → retriever) and still count
    const back = { ...g, edges: g.edges.map((e) => (e[0] === 'retriever' && e[1] === 'agent' ? ['agent', 'retriever'] : e)) } as typeof g;
    expect(analyse(back).wired).toBe(true);
    // without agent → LLM nothing reaches the model
    expect(analyse({ ...g, edges: g.edges.filter((e) => e[1] !== 'llm') }).wired).toBe(false);
  });

  it('dropping a block on an occupied cell swaps the two', () => {
    const b = openBench(initialCanvas(unlockedThrough('03-what-is-rag'))).bench;
    const at = (bb: typeof b, id: string) => bb.nodes.find((n) => n.id === id)!;
    const docs = at(b, 'docs'), retr = at(b, 'retriever');
    const m = moveNode(b, 'docs', retr.c, retr.r);
    expect([at(m, 'docs').c, at(m, 'docs').r]).toEqual([retr.c, retr.r]);
    expect([at(m, 'retriever').c, at(m, 'retriever').r]).toEqual([docs.c, docs.r]);
    expect(m.edges).toEqual(b.edges);   // wires follow blocks, not cells
  });

  it('moves into a free cell and clamps at the board edge', () => {
    const b = openBench(initialCanvas(unlockedThrough('03-what-is-rag'))).bench;
    const docs = b.nodes.find((n) => n.id === 'docs')!;
    expect(moveNode(b, 'docs', docs.c, docs.r + 1).nodes.find((n) => n.id === 'docs')!.r).toBe(docs.r + 1);
    const far = moveNode(b, 'docs', -3, 99).nodes.find((n) => n.id === 'docs')!;
    expect([far.c, far.r]).toEqual([0, ROWS - 1]);
  });

  it('a drop point snaps to the nearest cell, inside the board', () => {
    expect(cellAt(CELL * 2 + 3, CELL * 1 + 50)).toEqual({ c: 2, r: 1 });
    expect(cellAt(-40, 1e4)).toEqual({ c: 0, r: ROWS - 1 });
    expect(cellAt(1e4, -5)).toEqual({ c: COLS - 1, r: 0 });
  });

  it('connect rejects self and duplicate wires; Connect to… lists only valid targets', () => {
    const b = openBench(initialCanvas(unlockedThrough('03-what-is-rag'))).bench;
    expect(connect(b, 'docs', 'docs')).toBe(b);
    expect(connect(b, 'docs', 'retriever')).toBe(b);
    expect(validTargets(b, 'docs')).toEqual(['llm']);
    expect(connect(b, 'docs', 'llm').edges).toContainEqual(['docs', 'llm']);
  });

  it('add and remove blocks from the parts bin', () => {
    const b = openBench(initialCanvas(unlockedThrough('03-what-is-rag'))).bench;
    const r = removeNode(b, 'retriever');
    expect(r.nodes.map((n) => n.id)).not.toContain('retriever');
    expect(r.edges.flat()).not.toContain('retriever');
    const back = addNode(r, 'retriever');
    expect(back.nodes.map((n) => n.id)).toContain('retriever');
    expect(addNode(back, 'retriever')).toBe(back);
  });
});

describe('knobs reach the engine', () => {
  it('passes chunk size through the lattice snap', async () => {
    const s = initialCanvas(unlockedThrough('04-layers'), { size: 20, overlap: 0 });
    const o = await settle(s, Q('refund-enterprise'));
    expect(o.config).toMatchObject({ size: 16, snapped: true, file: 'fixed-16-0.bin' });
    expect(o.record!.file).toBe('fixed-16-0.bin');
  });

  it('a lever only counts when its block is wired in', async () => {
    const q = Q('refund-enterprise');
    const off = await settle(initialCanvas(unlockedThrough('04-layers'), { rerank: true }), q);
    expect(off.record!.stages.rerank).toBeNull();          // no reranker block yet
    const on = await settle(initialCanvas(unlockedThrough('05-accuracy'), { rerank: true }), q);
    expect(on.record!.stages.rerank).not.toBeNull();
  });
});

describe('sandbox tip (07): the hotel limit', () => {
  it('needs the graph cut before the current-documents filter fixes it', async () => {
    const q = Q('stale-hotel-limit');
    const s = openBench(initialCanvas(unlockedThrough('06-types'), { hops: 2 }));   // the sandbox's default wiring
    const filtered = (c: CanvasState) => ({ ...c, knobs: { ...c.knobs, filter: 'current' } });
    expect((await settle(filtered(s), q)).answer!.verdict).toBe('madeup');          // graph wins and ignores the filter
    const noGraph = { ...s, bench: cut(s.bench, ['index', 'graph']) };
    expect((await settle(noGraph, q)).answer!.verdict).toBe('wrong');
    const fixed = await settle(filtered(noGraph), q);
    expect(fixed.graph).toBeNull();
    expect(fixed.answer!.verdict).toBe('correct');
  });
});

describe('a failed config load', () => {
  it('gives no answer (so no verdict) and flags failed', async () => {
    const ix = await openIndex(async (f) => { if (f.startsWith('fixed-32-0')) throw new Error('offline'); return fileLoader(f); });
    const session = createSession(ix, () => {});
    const s = initialCanvas(unlockedThrough('04-layers'));
    outcome(ix, session, s, Q('refund-enterprise'));
    await ix.load(resolveConfig(s.knobs).file).catch(() => {});
    await Promise.resolve();
    const o = outcome(ix, session, s, Q('refund-enterprise'));
    expect(o).toMatchObject({ failed: true, preparing: true, answer: null });
  });
});
