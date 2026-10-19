// The GraphRAG walk drawn on its own iso board: entities as coloured pegs in columns by hop distance from the
// question's entities, relations as wires on the floor. Walked relations light up in their hop's colour; the
// next ring (what one more hop would reach) stays as grey pegs and dashed wires.
import { PALS, CERAMIC, INK, P, pd, cyl, toneI, byDepth } from '../../lib/iso/core.js';
import { BH } from '../../lib/iso/blocks';
import type { Board } from '../../lib/iso/IsoStage';
import { GRAPH, entity, type Entity, type Traversal } from '../../lib/rag/graph';

export const HOP_COLOURS = ['#ffb627', '#4fae84', '#5a82c6'];
const TYPE_PAL: Record<Entity['type'], { l: string; m: string; d: string }> = {
  product: PALS.mustard, company: PALS.tomato, team: PALS.mint, person: PALS.blush, place: PALS.cobalt,
};
const COL = 80, ROW = 30, X0 = 16, Y0 = 16;

/** Columns of entity ids by hop distance (0 = seeds), plus the unwalked ring and its relation indices. */
export function graphLayout(t: Traversal) {
  const cols = [t.seeds, ...t.hops.map((h) => h.reached)];
  const seen = new Set(cols.flat()), walked = new Set(t.hops.flatMap((h) => h.edges));
  const last = new Set(cols[cols.length - 1]);
  const ghostEdges: number[] = [], ghost: string[] = [];
  GRAPH.relations.forEach((r, i) => {
    if (walked.has(i) || !(last.has(r.from) || last.has(r.to))) return;
    ghostEdges.push(i);
    for (const id of [r.from, r.to]) if (!seen.has(id)) { seen.add(id); ghost.push(id); }
  });
  if (ghost.length) cols.push(ghost);
  // order each column by its first neighbour in the column before, so wires cross less
  const rank = new Map<string, number>();
  cols.forEach((c, ci) => {
    const parent = (id: string) => Math.min(...GRAPH.relations.flatMap((r) => (r.from === id ? [r.to] : r.to === id ? [r.from] : []))
      .filter((n) => cols[ci - 1]?.includes(n)).map((n) => rank.get(n)!), Infinity);
    if (ci) c.sort((a, b) => parent(a) - parent(b));
    c.forEach((id, i) => rank.set(id, i));
  });
  const tall = Math.max(...cols.map((c) => c.length));
  const at = new Map<string, [number, number]>();
  cols.forEach((c, ci) => c.forEach((id, i) => at.set(id, [X0 + ci * COL, Y0 + (i + (tall - c.length) / 2) * ROW])));
  const board: Board = [0, 0, X0 * 2 + (cols.length - 1) * COL, Y0 * 2 + (tall - 1) * ROW];
  return { cols, at, ghost: new Set(ghost), ghostEdges, board };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The answer path: the seeds plus both ends of every walked relation whose source sentence is evidence for the question. */
export function pathOf(t: Traversal, evidence: string[]) {
  const path = new Set(t.seeds);
  for (const h of t.hops) for (const i of h.edges) {
    const r = GRAPH.relations[i];
    if (evidence.includes(r.sourceSentence)) { path.add(r.from); path.add(r.to); }
  }
  return path;
}

/**
 * SVG scene for an IsoStage over graphLayout(t).board. Only `path` entities carry a standing label; every other
 * peg shows its name on hover (and all names show while the figure has focus), so the labels never crowd.
 */
export function graphScene(t: Traversal, layout = graphLayout(t), path: Set<string> = new Set(t.seeds)) {
  const { at, ghost, ghostEdges } = layout;
  const Z = BH + .3;
  let floor = '';
  const wire = (i: number, colour: string | null) => {
    const r = GRAPH.relations[i], a = at.get(r.from)!, b = at.get(r.to)!;
    const d = pd([[a[0], a[1], Z], [b[0], b[1], Z]], false);
    return colour
      ? `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${colour}" stroke-width="2.4" stroke-linecap="round" class="glow"/>`
      : `<path d="${d}" fill="none" stroke="#a49c8c" stroke-width="1.1" stroke-dasharray="3 3" stroke-linecap="round"/>`;
  };
  for (const i of ghostEdges) floor += wire(i, null);
  t.hops.forEach((h, hi) => { for (const i of h.edges) floor += wire(i, HOP_COLOURS[hi]); });
  const pegs = [...at].map(([id, [x, y]]) => {
    const e = entity(id), dim = ghost.has(id), seed = t.seeds.includes(id), h = seed ? 14 : dim ? 4 : 8;
    const top = P(x, y, BH + h + 4);
    const label = `<text class="peg-label${path.has(id) ? ' on-path' : ''}" x="${top[0].toFixed(1)}" y="${top[1].toFixed(1)}" font-size="${seed ? 12 : 10.5}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="${seed ? 800 : 650}" fill="${INK}" paint-order="stroke" stroke="#f7f1e3" stroke-width="3" stroke-linejoin="round">${esc(e.name)}</text>`;
    return { at: [x, y, 0], svg: `<g class="peg"><title>${esc(e.name)}</title>${cyl(x, y, BH, BH + h, seed ? 7 : 5.5, dim ? CERAMIC : TYPE_PAL[e.type], toneI, dim ? .7 : 1.1, 18)}${label}</g>` };
  });
  return floor + byDepth(pegs);
}

/** One-line text alternative for the figure. */
export function graphSummary(t: Traversal) {
  if (!t.seeds.length) return 'Graph walk: the question names no entity in the graph, so there is nothing to walk from.';
  const edges = t.hops.reduce((n, h) => n + h.edges.length, 0), reached = t.hops.reduce((n, h) => n + h.reached.length, 0);
  return `Graph walk from ${t.seeds.map((s) => entity(s).name).join(', ')}: ${t.hops.length} hop${t.hops.length === 1 ? '' : 's'}, ${edges} relations followed, ${reached} entities reached.`;
}
