// Finding the way's town (KTD2): data/routes/town.json, a hand-made graph of 30 junctions and the roads between them,
// each road's minutes hand-set. Edits (closures and jams) never change the town: they give a road new minutes, or
// take it away, for one search. Every search reads costs through `costOf`, so live traffic is only ever a change of
// road weights (R7g).
import town from '../../../data/routes/town.json' with { type: 'json' };

export interface Junction {
  id: string;
  name: string;
  /** grid position: x east, y south, one block apart */
  x: number;
  y: number;
}
export interface Road {
  /** `a-b`, stable: saved progress keys closures by it */
  id: string;
  a: string;
  b: string;
  min: number;
  bridge?: boolean;
}
/** What a search runs over besides the town: closed roads, and jammed roads' new minutes. */
export interface Edits {
  closed?: readonly string[];
  jams?: Readonly<Record<string, number>>;
}

export const NOTE = town.note;
export const JUNCTIONS: Junction[] = town.junctions;
export const ROADS: Road[] = town.roads.map(r => ({ ...r, id: `${r.a}-${r.b}` }));
export const DEPOT = town.depot;
export const CUSTOMER = town.customer;
export const BRIDGES = ROADS.filter(r => r.bridge).map(r => r.id);

const BY_ID = new Map(JUNCTIONS.map(j => [j.id, j]));
const ROAD_BY_ID = new Map(ROADS.map(r => [r.id, r]));
const ORDER = new Map(JUNCTIONS.map((j, i) => [j.id, i]));
export const junction = (id: string) => BY_ID.get(id)!;
export const road = (id: string) => ROAD_BY_ID.get(id)!;
export const indexOf = (id: string) => ORDER.get(id)!;
export const isRoad = (id: unknown): id is string => typeof id === 'string' && ROAD_BY_ID.has(id);
export const nameOf = (id: string) => junction(id).name;

/** A road's minutes under the edits; Infinity when it is closed. */
export function costOf(id: string, e: Edits = {}) {
  if (e.closed?.includes(id)) return Infinity;
  return e.jams?.[id] ?? road(id).min;
}
/** "Bell to Quay, 3 min": a road as the listbox and the read-outs name it. */
export const roadName = (id: string, e: Edits = {}) => {
  const r = road(id);
  return `${nameOf(r.a)} to ${nameOf(r.b)}, ${e.jams?.[id] ?? r.min} min`;
};

/** Each junction's roads, neighbours in junction order, so every search breaks ties the same way. */
const NEXT = new Map<string, { to: string; road: string }[]>(JUNCTIONS.map(j => [j.id, []]));
for (const r of ROADS) {
  NEXT.get(r.a)!.push({ to: r.b, road: r.id });
  NEXT.get(r.b)!.push({ to: r.a, road: r.id });
}
for (const l of NEXT.values()) l.sort((p, q) => indexOf(p.to) - indexOf(q.to));
/** The open roads out of a junction. */
export const neighbours = (id: string, e: Edits = {}) => NEXT.get(id)!.filter(n => costOf(n.road, e) < Infinity);

/** The fewest minutes any road takes for its block. */
export const MIN_PER_BLOCK = Math.min(...ROADS.map(r => r.min));
/** A*'s guess: straight-line blocks to the goal at the fastest road's pace. Jams only add minutes, so it never
 * overestimates. */
export function guess(id: string, goal: string) {
  const a = junction(id),
    b = junction(goal);
  return Math.hypot(a.x - b.x, a.y - b.y) * MIN_PER_BLOCK;
}

/** Closed road ids from a saved state; anything unknown is dropped. */
export const closedOf = (xs: unknown): string[] => (Array.isArray(xs) ? [...new Set(xs.filter(isRoad))] : []);
