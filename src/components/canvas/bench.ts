// Free workbench: blocks on a grid of cells, wires between them. Pure; every op returns a new Bench
// (or the same one when the op is a no-op).
import { CELL, type BlockType } from '../../lib/iso/blocks';
import type { Board } from '../../lib/iso/IsoStage';
import { BAYS, TRACK, trackLayout, type Edge } from './track';

export interface BenchNode {
  id: BlockType;
  c: number;
  r: number;
}
export interface Bench {
  nodes: BenchNode[];
  edges: Edge[];
}

export const COLS = 10,
  ROWS = 5;
export const BENCH_BOARD: Board = [0, 0, COLS * CELL, ROWS * CELL];
const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
export const cellXY = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
/** The cell under a floor point, clamped to the board. */
export const cellAt = (x: number, y: number) => ({
  c: clamp(Math.floor(x / CELL), COLS - 1),
  r: clamp(Math.floor(y / CELL), ROWS - 1),
});

/** Same blocks and wires as the track: main line zig-zags between rows 0 and 2
 * (one cell apart, a neighbour hides the block's labels), side bays in row 4. */
export function benchFromTrack(unlocked: BlockType[]): Bench {
  const line = TRACK.filter(t => unlocked.includes(t));
  const nodes: BenchNode[] = line.map((id, i) => ({ id, c: i, r: i % 2 ? 2 : 0 }));
  for (const [bay, anchor] of Object.entries(BAYS) as [BlockType, BlockType][]) {
    if (!unlocked.includes(bay)) continue;
    const a = nodes.find(n => n.id === anchor);
    nodes.push(a ? { id: bay, c: a.c, r: 4 } : { id: bay, ...free(nodes)! });
  }
  return { nodes, edges: trackLayout(unlocked).edges };
}

function free(nodes: BenchNode[]) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (!nodes.some(n => n.c === c && n.r === r)) return { c, r };
  return null;
}

/** Moves a block to a cell (clamped); a block already there swaps into the mover's old cell. */
export function moveNode(b: Bench, id: BlockType, c: number, r: number): Bench {
  const n = b.nodes.find(m => m.id === id);
  if (!n) return b;
  const to = { c: clamp(c, COLS - 1), r: clamp(r, ROWS - 1) };
  if (to.c === n.c && to.r === n.r) return b;
  return {
    ...b,
    nodes: b.nodes.map(m => (m === n ? { ...m, ...to } : m.c === to.c && m.r === to.r ? { ...m, c: n.c, r: n.r } : m)),
  };
}

const hasEdge = (b: Bench, from: BlockType, to: BlockType) => b.edges.some(e => e[0] === from && e[1] === to);
export const validTargets = (b: Bench, from: BlockType) =>
  b.nodes.map(n => n.id).filter(id => id !== from && !hasEdge(b, from, id));
export const connect = (b: Bench, from: BlockType, to: BlockType): Bench =>
  validTargets(b, from).includes(to) && b.nodes.some(n => n.id === from)
    ? { ...b, edges: [...b.edges, [from, to]] }
    : b;
export const cut = (b: Bench, [from, to]: Edge): Bench => ({
  ...b,
  edges: b.edges.filter(e => !(e[0] === from && e[1] === to)),
});

export function addNode(b: Bench, id: BlockType): Bench {
  const cell = free(b.nodes);
  return b.nodes.some(n => n.id === id) || !cell ? b : { ...b, nodes: [...b.nodes, { id, ...cell }] };
}
export const removeNode = (b: Bench, id: BlockType): Bench => ({
  nodes: b.nodes.filter(n => n.id !== id),
  edges: b.edges.filter(e => !e.includes(id)),
});
