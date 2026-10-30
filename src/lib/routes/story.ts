// What the chapters show, read off live searches over the town; data/routes/pinned.json holds the same effects and
// tests/unit/routes-engine.test.ts checks the two agree (KTD7), so the copy can never drift from the engine.
import pinned from '../../../data/routes/pinned.json' with { type: 'json' };
import { astar } from './astar';
import { bfs } from './bfs';
import { dijkstra } from './dijkstra';
import { BRIDGES, DEPOT, JUNCTIONS, ROADS } from './graph';

/** chapter 1: the van's fastest route, the bridge on it, the detour once it closes, and the cut when both close */
export const FASTEST = dijkstra();
export const ROUTE_BRIDGE = BRIDGES.find(b => FASTEST.roads.includes(b))!;
export const OTHER_BRIDGE = BRIDGES.find(b => b !== ROUTE_BRIDGE)!;
export const DETOUR = dijkstra({ closed: [ROUTE_BRIDGE] });
export const CUT = dijkstra({ closed: BRIDGES });

/** chapter 2: fewest roads against fewest minutes */
export const FEWEST_ROADS = bfs();

/** chapter 4: A* at weight 1 against Dijkstra */
export const LEANING = astar(1);

/** Chapter 6's shortcuts, for the picture only: each joins two busy junctions and stores the minutes of the fastest
 * way between them, worked out once ahead of time. Contraction hierarchies are cited, not run (Scope Boundaries). */
export const SHORTCUT_PAIRS: [string, string][] = [
  [DEPOT, 'lock'],
  ['lock', 'orchard'],
  [DEPOT, 'bell'],
];
export const SHORTCUTS = SHORTCUT_PAIRS.map(([a, b]) => ({ a, b, minutes: dijkstra({}, a, b).minutes }));

/** Every junction and road count the copy quotes. */
export const COUNTS = { junctions: JUNCTIONS.length, roads: ROADS.length };
