// GraphRAG over an authored entity graph (KTD8): no model runs. Seed the entities the question names, walk
// relations breadth-first for 1–3 hops, and hand the model every chunk (in the current config) that holds a
// walked relation's source sentence. Each hop is one logged lookup, judged by signature + recorded answer.
import data from '../../../data/graph/entities.json';
import type { Config, RagIndex } from './load';
import { chunkOf, goldOf, locate, run, type ContextChunk, type RunParams, type RunRecord } from './engine';
import { signature, type KeyFact } from './signature';
import { lookup } from './answers';
import type { AgentCall } from './agent';

export interface Entity { id: string; name: string; type: 'product' | 'company' | 'team' | 'person' | 'place' }
export interface Relation { from: string; to: string; label: string; sourceDoc: string; sourceSentence: string }
export const GRAPH = data as { entities: Entity[]; relations: Relation[] };
export const MAX_HOPS = 3;
export const entity = (id: string) => GRAPH.entities.find((e) => e.id === id)!;

/** Entities whose name appears in the question (case-insensitive, whole words). */
export const seedsOf = (query: string) =>
  GRAPH.entities.filter((e) => new RegExp(`\\b${e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'i').test(query)).map((e) => e.id);

export interface Hop { hop: number; /** relation indices walked on this hop */ edges: number[]; /** entities first reached on this hop */ reached: string[] }
export interface Traversal { seeds: string[]; hops: Hop[] }

/** Breadth-first over relations in either direction; each relation is walked once, on the hop it is first touched. */
export function traverse(seeds: string[], hops: number): Traversal {
  const seen = new Set(seeds), walked = new Set<number>();
  let frontier = new Set(seeds);
  const out: Hop[] = [];
  for (let hop = 1; hop <= Math.max(1, Math.min(MAX_HOPS, Math.round(hops))); hop++) {
    const edges: number[] = [], reached: string[] = [];
    GRAPH.relations.forEach((r, i) => {
      if (walked.has(i) || !(frontier.has(r.from) || frontier.has(r.to))) return;
      walked.add(i); edges.push(i);
      for (const id of [r.from, r.to]) if (!seen.has(id)) { seen.add(id); reached.push(id); }
    });
    out.push({ hop, edges, reached });
    frontier = new Set(reached);
  }
  return { seeds, hops: out };
}

export interface GraphRun { record: RunRecord; calls: AgentCall[]; trace: Traversal }
type GraphQuestion = RunParams['question'] & { keyFacts: KeyFact[] };

/** Chunk ids of this config that overlap the sentence's occurrence in its source doc. */
function chunksFor(index: RagIndex, cfg: Config, r: Relation, hidden: string[]) {
  const ids: number[] = [];
  for (const [di, gs, ge] of locate(index, r.sourceSentence)) {
    if (index.corpus[di].id !== r.sourceDoc || hidden.includes(index.corpus[di].type)) continue;
    for (let id = 0; id < cfg.N; id++) if (cfg.ranges[id * 3] === di && cfg.ranges[id * 3 + 1] < ge && cfg.ranges[id * 3 + 2] > gs) ids.push(id);
  }
  return ids;
}

export function runGraph(index: RagIndex, cfg: Config, p: RunParams & { question: GraphQuestion }, hops: number): GraphRun {
  const q = p.question;
  const base = run(index, cfg, p);   // only for the record's shape and the chunks' similarity scores
  const scoreOf = new Map(base.stages.vector.ids.map((id, i) => [id, base.stages.vector.scores[i]]));
  const trace = traverse(seedsOf(base.queryText), hops);
  const context: ContextChunk[] = [], have = new Set<number>();
  const calls: AgentCall[] = trace.hops.map((h) => {
    const fresh = h.edges.flatMap((i) => chunksFor(index, cfg, GRAPH.relations[i], p.hidden ?? [])).filter((id) => !have.has(id) && have.add(id));
    const added = fresh.map((id) => chunkOf(index, cfg, id, scoreOf.get(id) ?? 0));
    context.push(...added);
    const walked = h.edges.map((i) => { const r = GRAPH.relations[i]; return `${entity(r.from).name} → ${r.label} → ${entity(r.to).name}`; });
    return {
      call: h.hop, action: 'hop', query: walked.join('; ') || 'no relations left to follow',
      chunksAdded: added.length, topScore: added.length ? Math.max(...added.map((c) => c.score)) : null,
      verdict: lookup(q.id, signature(index, q, context)).verdict,
    };
  });
  return { record: { ...base, context, recall: goldOf(index, cfg, q, context.map((c) => c.id)) }, calls, trace };
}
