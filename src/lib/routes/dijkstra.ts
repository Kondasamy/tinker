// Dijkstra's algorithm (1959): settle the open junction nearest the depot in minutes, cheapest first. It is A* with
// no guess at all (weight 0).
import { astar } from './astar';
import type { Edits } from './graph';

export const dijkstra = (e: Edits = {}, from?: string, to?: string) => astar(0, e, from, to);
