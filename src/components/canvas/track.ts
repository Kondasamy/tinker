// Guided track (variant C): fixed slots in pipeline order, side bays for agent and graph.
// Coordinates are board floor units, like the prototype's TRACK_X / TRACK_Y.
import type { BlockType } from '../../lib/iso/blocks';
import type { Board } from '../../lib/iso/IsoStage';
import { CHAPTERS } from '../../lib/chapters';

export type Edge = [BlockType, BlockType];
export interface Placed { id: BlockType; x: number; y: number }

/** Main-line slots, left to right. Rewrite sits just before the retriever because it changes the query it searches with. */
export const TRACK: BlockType[] = ['docs', 'chunker', 'embedder', 'index', 'rewrite', 'retriever', 'reranker', 'assembler', 'llm', 'grader'];
const PITCH = 66, X0 = 17, Y = 30, BAY_Y = 98;
const slotX = (t: BlockType) => X0 + TRACK.indexOf(t) * PITCH;
/** Side bays hang off the track beside the block they work with. */
export const BAYS: Partial<Record<BlockType, BlockType>> = { graph: 'index', agent: 'retriever' };
export const TRACK_BOARD: Board = [-14, 0, X0 + (TRACK.length - 1) * PITCH + 31, BAY_Y + 30];

export const chapterOf = (t: BlockType) => CHAPTERS.findIndex((c) => c.unlocks.includes(t)) + 1;
const at = (t: BlockType): Placed => (BAYS[t] ? { id: t, x: slotX(BAYS[t]!), y: BAY_Y } : { id: t, x: slotX(t), y: Y });

export function trackLayout(unlocked: BlockType[]) {
  const has = (t: BlockType) => unlocked.includes(t);
  const all = [...TRACK, ...(Object.keys(BAYS) as BlockType[])];
  const line = TRACK.filter(has);
  const edges: Edge[] = line.slice(1).map((t, i) => [line[i], t]);
  if (has('graph') && has('index') && has('retriever')) edges.push(['index', 'graph'], ['graph', 'retriever']);
  if (has('agent') && has('retriever') && has('llm')) edges.push(['retriever', 'agent'], ['agent', 'retriever'], ['agent', 'llm']);
  return {
    nodes: all.filter(has).map(at),
    edges,
    pads: all.filter((t) => !has(t)).map((t) => ({ ...at(t), chapter: chapterOf(t) })),
  };
}
