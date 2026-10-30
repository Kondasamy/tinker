// Live traffic (chapter 5): a jam only changes one road's minutes; the search is the same. JAM_ROAD lies on the van's
// fastest route; the reader drags its minutes up and the route flips once another way is quicker.
import { dijkstra } from './dijkstra';
import { road, type Edits } from './graph';

/** the road chapter 5 jams: the first road of the fastest route's that sits on the ring (Lock to Dock) */
export const JAM_ROAD = 'lock-dock';
export const FREE = road(JAM_ROAD).min;
/** the minutes the range offers, free-flowing to gridlocked */
export const JAM_MINUTES = Array.from({ length: 9 }, (_, i) => FREE + i);
export const jamOf = (minutes: number): Edits => ({ jams: { [JAM_ROAD]: minutes } });
/** The fewest minutes on JAM_ROAD that send the van another way. */
export const flipAt = () => JAM_MINUTES.find(m => !dijkstra(jamOf(m)).roads.includes(JAM_ROAD))!;
/** A saved jam's minutes, or the free-flowing ones. */
export const jamMinutesOf = (m: unknown) => (JAM_MINUTES.includes(m as number) ? (m as number) : FREE);
