// Breadth-first search: fewest roads, minutes ignored. Junctions leave a first-in, first-out queue; each is queued
// once, with its hop count. The route it finds has the fewest roads, whatever they take.
import { CUSTOMER, DEPOT, neighbours, type Edits } from './graph';
import { resultOf, type Parents, type Search, type Settle } from './astar';

export function bfs(e: Edits = {}, from = DEPOT, to = CUSTOMER): Search {
  const hops = new Map([[from, 0]]),
    parent: Parents = new Map(),
    settles: Settle[] = [],
    queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (at !== to)
      for (const n of neighbours(at, e))
        if (!hops.has(n.to)) {
          hops.set(n.to, hops.get(at)! + 1);
          parent.set(n.to, { from: at, road: n.road });
          queue.push(n.to);
        }
    const h = hops.get(at)!;
    settles.push({ id: at, g: h, f: h, frontier: queue.map(id => ({ id, g: hops.get(id)!, f: hops.get(id)! })) });
    if (at === to) return resultOf(true, parent, to, e, settles);
  }
  return resultOf(false, parent, to, e, settles);
}
