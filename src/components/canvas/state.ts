// One state model for the canvas (track and bench), path analysis, and the map from state to an engine run
// and a pre-recorded answer. Pure: the Canvas island renders it, StepRunner steps read and write it.
import type { BlockType } from '../../lib/iso/blocks';
import { CHAPTERS } from '../../lib/chapters';
import type { RagIndex } from '../../lib/rag/load';
import type { createSession, Filter, Question, RunParams, RunRecord } from '../../lib/rag/engine';
import { resolveConfig, type ChunkParams, type Strategy, type ResolvedConfig } from '../../lib/rag/lattice';
import { signature, NO_CONTEXT, type KeyFact } from '../../lib/rag/signature';
import { lookup, type Lookup } from '../../lib/rag/answers';
import { trackLayout, type Edge, type Placed } from './track';
import { benchFromTrack, cellXY, type Bench } from './bench';

export type { Edge } from './track';
export type Mode = 'track' | 'bench';
export type CanvasQuestion = Question & { keyFacts: KeyFact[]; filterPresets?: { id: string; label: string; filter: Filter }[] };

export interface Knobs {
  strategy: Strategy;
  size: number;
  overlap: number;
  topK: number;
  /** 0 = pure vector, 1 = pure keyword */
  hybrid: number;
  /** id of one of the question's filterPresets */
  filter: string | null;
  rerank: boolean;
  order: 'ranked' | 'edges';
  /** index into question.rewrites; null = the learner's own wording */
  rewrite: number | null;
  /** shortcut: stored and shown only; the agent rule table (U11) will read it */
  maxCalls: number;
}
export type KnobName = keyof Knobs;

export interface CanvasState {
  unlocked: BlockType[];
  knobs: Knobs;
  bench: Bench;
  selected: BlockType | null;
  mode: Mode;
}

export const DEFAULT_KNOBS: Knobs = {
  strategy: 'fixed', size: 32, overlap: 0, topK: 3, hybrid: 0, filter: null, rerank: false, order: 'ranked', rewrite: null, maxCalls: 2,
};

/** Every block unlocked by the given chapter and the ones before it (AE4: jumping ahead shows the canvas as of that chapter). */
export const unlockedThrough = (chapterId: string): BlockType[] =>
  CHAPTERS.slice(0, CHAPTERS.findIndex((c) => c.id === chapterId) + 1).flatMap((c) => c.unlocks);

export const initialCanvas = (unlocked: BlockType[], knobs: Partial<Knobs> = {}): CanvasState =>
  ({ unlocked, knobs: { ...DEFAULT_KNOBS, ...knobs }, bench: benchFromTrack(unlocked), selected: null, mode: 'track' });

/** Opens the workbench with the track's blocks and wires (R28). */
export const openBench = (s: CanvasState): CanvasState => ({ ...s, mode: 'bench', bench: benchFromTrack(s.unlocked) });

export interface Graph { nodes: Placed[]; edges: Edge[] }
export function graphOf(s: CanvasState): Graph {
  if (s.mode === 'track') { const t = trackLayout(s.unlocked); return { nodes: t.nodes, edges: t.edges }; }
  return { nodes: s.bench.nodes.map((n) => ({ id: n.id, ...cellXY(n.c, n.r) })), edges: s.bench.edges };
}

export interface Analysis {
  /** a path docs ⇒ retriever ⇒ llm exists */
  wired: boolean;
  /** that path runs through the agent */
  agent: boolean;
  /** wires that carry data */
  live: Edge[];
  /** blocks on a live wire: only their knobs reach the engine */
  used: BlockType[];
}

/** Port of the prototype's analyse(), generalised from a fixed chain to any path docs ⇒ retriever ⇒ llm (plus what hangs after the LLM). */
export function analyse(g: { nodes: { id: BlockType }[]; edges: Edge[] }): Analysis {
  const E = [...g.edges];
  // the agent calls the retriever and reads its results: a wire either way counts as both
  if (E.some(([a, b]) => (a === 'retriever' && b === 'agent') || (a === 'agent' && b === 'retriever'))) E.push(['retriever', 'agent'], ['agent', 'retriever']);
  const walk = (start: BlockType, dir: 0 | 1) => {
    const seen = new Set<BlockType>(g.nodes.some((n) => n.id === start) ? [start] : []);
    for (let grew = seen.size > 0; grew;) {
      grew = false;
      for (const e of E) if (seen.has(e[dir]) && !seen.has(e[1 - dir])) { seen.add(e[1 - dir]); grew = true; }
    }
    return seen;
  };
  const fromDocs = walk('docs', 0), toRetr = walk('retriever', 1), fromRetr = walk('retriever', 0), toLlm = walk('llm', 1), fromLlm = walk('llm', 0);
  const wired = fromDocs.has('retriever') && fromRetr.has('llm');
  const live = !wired ? [] : g.edges.filter(([a, b]) =>
    (fromDocs.has(a) && toRetr.has(b) && toRetr.has(a)) || (fromRetr.has(a) && toLlm.has(b) && toLlm.has(a)) || fromLlm.has(a));
  const used = [...new Set(live.flat())];
  return { wired, agent: used.includes('agent'), live, used };
}

/** Engine params for the current state, or null when nothing reaches the model. */
export function runParams(s: CanvasState, q: CanvasQuestion, a: Analysis): (RunParams & ChunkParams) | null {
  if (!a.wired) return null;
  const k = s.knobs, on = (t: BlockType) => a.used.includes(t);
  return {
    question: q, strategy: k.strategy, size: k.size, overlap: k.overlap, topK: k.topK, hybrid: k.hybrid,
    filter: q.filterPresets?.find((p) => p.id === k.filter)?.filter ?? null,
    rerank: on('reranker') && k.rerank,
    order: on('assembler') ? k.order : 'ranked',
    rewrite: on('rewrite') && k.rewrite !== null && q.rewrites[k.rewrite] !== undefined ? k.rewrite : undefined,
  };
}

export interface Outcome {
  analysis: Analysis;
  config: ResolvedConfig;
  /** chunks in the active config, once loaded */
  chunks: number | null;
  record: RunRecord | null;
  /** the active config is still loading; record (if any) is from the previous one */
  preparing: boolean;
  signature: string | null;
  answer: Lookup | null;
}

export function outcome(index: RagIndex, session: ReturnType<typeof createSession>, s: CanvasState, q: CanvasQuestion): Outcome {
  const analysis = analyse(graphOf(s));
  const p = runParams(s, q, analysis);
  const config = resolveConfig(s.knobs);
  const chunks = index.get(config.file)?.N ?? null;
  if (!p) return { analysis, config, chunks, record: null, preparing: false, signature: NO_CONTEXT, answer: lookup(q.id, NO_CONTEXT) };
  const r = session(p);
  const record = r.record?.questionId === q.id ? r.record : null;
  const sig = record ? signature(index, q, record.context) : null;
  return { analysis, config: r.config, chunks, record, preparing: r.preparing, signature: sig, answer: sig ? lookup(q.id, sig) : null };
}
