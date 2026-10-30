// A* with a weight (Hart, Nilsson and Raphael, 1968; weighted A* after Pohl): best-first search that settles the open
// junction with the smallest minutes-so-far plus weight × the straight-line guess. Weight 0 is Dijkstra; weight 1 is
// A*, still exact because the guess never overestimates; above 1 it leans harder and may give up a few minutes.
// Ties go to the junction listed first in town.json, so every run is the same.
import { CUSTOMER, DEPOT, costOf, guess, indexOf, neighbours, type Edits } from './graph';

export interface Open {
  id: string;
  /** minutes from the depot so far (hops, for breadth-first) */
  g: number;
  /** the score the search orders by */
  f: number;
}
/** One junction settled, and the frontier left once its roads were looked along. */
export interface Settle extends Open {
  frontier: Open[];
}
export interface Search {
  found: boolean;
  /** junctions from start to goal; empty when there is no route */
  path: string[];
  /** the route's road ids */
  roads: string[];
  /** the route's minutes (0 with no route) */
  minutes: number;
  /** junctions settled up to and including the goal: "junctions looked at" */
  looked: number;
  settles: Settle[];
}
export type Parents = Map<string, { from: string; road: string }>;

export function pathOf(parent: Parents, goal: string) {
  const path = [goal],
    roads: string[] = [];
  for (let at = goal; parent.has(at); ) {
    const p = parent.get(at)!;
    roads.unshift(p.road);
    path.unshift(p.from);
    at = p.from;
  }
  return { path, roads };
}
export const minutesOf = (roads: string[], e: Edits) => roads.reduce((s, r) => s + costOf(r, e), 0);
export const resultOf = (found: boolean, parent: Parents, to: string, e: Edits, settles: Settle[]): Search => {
  if (!found) return { found, path: [], roads: [], minutes: 0, looked: settles.length, settles };
  const { path, roads } = pathOf(parent, to);
  return { found, path, roads, minutes: minutesOf(roads, e), looked: settles.length, settles };
};

export function astar(weight: number, e: Edits = {}, from = DEPOT, to = CUSTOMER): Search {
  const g = new Map([[from, 0]]),
    parent: Parents = new Map(),
    done = new Set<string>(),
    settles: Settle[] = [];
  const f = (id: string) => g.get(id)! + weight * guess(id, to);
  let open = [from];
  while (open.length) {
    // the smallest score; open is kept in town order, so a tie goes to the junction listed first
    const at = open.reduce((b, id) => (f(id) < f(b) - 1e-9 ? id : b));
    open = open.filter(id => id !== at);
    done.add(at);
    if (at !== to)
      for (const n of neighbours(at, e)) {
        if (done.has(n.to)) continue;
        const d = g.get(at)! + costOf(n.road, e);
        if (d < (g.get(n.to) ?? Infinity)) {
          g.set(n.to, d);
          parent.set(n.to, { from: at, road: n.road });
          if (!open.includes(n.to)) open.push(n.to);
        }
      }
    open.sort((p, q) => indexOf(p) - indexOf(q));
    settles.push({ id: at, g: g.get(at)!, f: f(at), frontier: open.map(id => ({ id, g: g.get(id)!, f: f(id) })) });
    if (at === to) return resultOf(true, parent, to, e, settles);
  }
  return resultOf(false, parent, to, e, settles);
}
