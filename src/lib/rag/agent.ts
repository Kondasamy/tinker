// Agentic RAG as an explicit rule table over engine outputs (KTD7): no model runs. The agent searches, reads
// the answer its context produces, and while the answer is not right and calls remain it either expands the
// neighbours of a chunk that cuts a key fact, or searches one of the question's fixed rewrites.
import type { Config, RagIndex } from './load';
import { chunkOf, goldOf, locate, run, type ContextChunk, type RunParams, type RunRecord } from './engine';
import { signature, type KeyFact } from './signature';
import { lookup, type Lookup } from './answers';

export const MAX_CALLS = 3;
/** 'hop' is a GraphRAG walk step (graph.ts), logged in the same shape */
export type AgentAction = 'search' | 'expand' | 'rewrite' | 'hop';
export interface AgentCall {
  call: number;
  action: AgentAction;
  /** the query text searched, or what was expanded */
  query: string;
  chunksAdded: number;
  /** best similarity among the chunks this call added (null when it added none) */
  topScore: number | null;
  /** the answer the context gives after this call */
  verdict: Lookup['verdict'];
  /** self-check only (selfcheck.ts): the evaluator's grade of this call's context */
  grade?: { score: number | null; pass: boolean };
}
export type AgentStop = 'answered' | 'max-calls' | 'nothing-left';
export interface AgentRun { record: RunRecord; calls: AgentCall[]; stop: AgentStop }

type AgentQuestion = RunParams['question'] & { keyFacts: KeyFact[] };

/** Chunks of the same document whose word range touches `c` (the chunk before and after it). */
function neighbours(index: RagIndex, cfg: Config, c: ContextChunk) {
  const out: number[] = [];
  for (let id = 0; id < cfg.N; id++)
    if (id !== c.id && index.corpus[cfg.ranges[id * 3]].id === c.doc && cfg.ranges[id * 3 + 1] <= c.end && cfg.ranges[id * 3 + 2] >= c.start) out.push(id);
  return out;
}

/** Context chunks that hold part, but not all, of a key fact the signature reports as split. */
function splitChunks(index: RagIndex, q: AgentQuestion, sig: string, context: ContextChunk[]) {
  const split = q.keyFacts.filter((f) => sig.includes(`${f.id}:split`));
  return context.filter((c) => split.some((f) => locate(index, f.sentence).some(([di, gs, ge]) =>
    index.corpus[di].id === c.doc && c.end > gs && c.start < ge && !(c.start <= gs && c.end >= ge))));
}

export function runAgent(index: RagIndex, cfg: Config, p: RunParams & { question: AgentQuestion }, maxCalls: number): AgentRun {
  const q = p.question;
  const first = run(index, cfg, p);
  const context = [...first.context];
  const have = new Set(context.map((c) => c.id));
  const scoreOf = new Map(first.stages.hybrid.ids.map((id, i) => [id, first.stages.hybrid.scores[i]]));
  const used = new Set([p.rewrite ?? -1]);
  const judge = () => { const sig = signature(index, q, context); return { sig, verdict: lookup(q.id, sig).verdict }; };
  const add = (chunks: ContextChunk[]) => {
    const fresh = chunks.filter((c) => !have.has(c.id));
    for (const c of fresh) { have.add(c.id); context.push(c); }
    return fresh;
  };
  const top = (cs: ContextChunk[]) => (cs.length ? Math.max(...cs.map((c) => c.score)) : null);

  let now = judge();
  const calls: AgentCall[] = [{ call: 1, action: 'search', query: first.queryText, chunksAdded: context.length, topScore: top(context), verdict: now.verdict }];
  const cap = Math.max(1, Math.min(MAX_CALLS, Math.round(maxCalls)));
  let stop: AgentStop = 'answered';
  while (now.verdict !== 'correct') {
    if (calls.length >= cap) { stop = 'max-calls'; break; }
    // rule 1: a key fact is cut across chunks -> fetch the chunks either side of the cut and read them stitched
    const cut = splitChunks(index, q, now.sig, context);
    const near = cut.flatMap((c) => neighbours(index, cfg, c)).filter((id) => !have.has(id));
    if (near.length) {
      const fresh = add([...new Set(near)].map((id) => chunkOf(index, cfg, id, scoreOf.get(id) ?? 0)));
      now = judge();
      calls.push({ call: calls.length + 1, action: 'expand', query: `neighbours of ${cut.map((c) => `#${c.id}`).join(', ')}`, chunksAdded: fresh.length, topScore: top(fresh), verdict: now.verdict });
      continue;
    }
    // rule 2: search the unused rewrite that brings the most new chunks (ties: the earlier rewrite)
    const options = q.rewrites.map((_, i) => i).filter((i) => !used.has(i))
      .map((i) => { const r = run(index, cfg, { ...p, rewrite: i }); return { i, r, fresh: r.context.filter((c) => !have.has(c.id)).length }; })
      .filter((o) => o.fresh > 0)
      .sort((a, b) => b.fresh - a.fresh || a.i - b.i);
    if (!options.length) { stop = 'nothing-left'; break; }
    const { i, r } = options[0];
    used.add(i);
    const fresh = add(r.context);
    now = judge();
    calls.push({ call: calls.length + 1, action: 'rewrite', query: r.queryText, chunksAdded: fresh.length, topScore: top(fresh), verdict: now.verdict });
  }
  const ids = context.map((c) => c.id);
  return { record: { ...first, context, recall: goldOf(index, cfg, q, ids) }, calls, stop };
}
