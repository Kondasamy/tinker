// Drive the dream (KTD13): the reader's moves and re-syncs, kept in chapter state, replayed through world.ts (the real
// floor) and the model (the dream). Each move adds one frame to both; a re-sync swaps the latest dream frame for the
// real one. The read-out names what each action did and the milestones (robot lost, crate gone, re-synced).
import type { Net } from './net';
import { crateCells, type Dream, dream, type Real, realOf, robotCell } from './rollout';
import { type Action, ACTIONS, SIZE } from './world';

export interface Drive {
  moves: Action[];
  /** frame steps the reader re-synced */
  syncs: number[];
}
export const NO_DRIVE: Drive = { moves: [], syncs: [] };
/** Moves per drive: a test route's length. */
export const MAX_MOVES = 30;

export interface Driven {
  real: Real;
  dream: Dream;
  /** the latest frame's step */
  at: number;
}
export function driven(net: Net, seed: number, d: Drive): Driven {
  const real = realOf(seed, d.moves);
  return { real, dream: dream(net, real, { syncs: d.syncs, key: `drive${seed}` }), at: real.frames.length - 1 };
}

export const move = (d: Drive, a: Action): Drive =>
  d.moves.length >= MAX_MOVES ? d : { ...d, moves: [...d.moves, a] };
/** Re-sync the latest frame (frames 0 and 1 are real already). */
export function resync(d: Drive): Drive {
  const at = d.moves.length + 1;
  return at < 2 || d.syncs.includes(at) ? d : { ...d, syncs: [...d.syncs, at] };
}

const place = (c: number) => `column ${(c % SIZE) + 1}, row ${Math.floor(c / SIZE) + 1}`;
/** One line for the read-out: what the action did, then any milestone it crossed. */
export function readout(before: Driven, after: Driven, act: Action | 'sync'): string {
  const real = after.real.frames[after.at],
    dreamed = after.dream.frames[after.at];
  const r = robotCell(real),
    g = robotCell(dreamed);
  const said: string[] = [];
  if (act === 'sync') said.push('Re-synced: the dream is the real frame again.');
  else {
    const moved = robotCell(before.real.frames[before.at]) !== r;
    said.push(
      act === 0
        ? 'Stayed.'
        : moved
          ? `Moved ${ACTIONS[act]}: the robot is at ${place(r)}.`
          : `Tried ${ACTIONS[act]}: blocked, the robot stays at ${place(r)}.`,
    );
    said.push(
      g === r ? 'The dream agrees.' : g < 0 ? 'The dream has no single robot.' : `The dream has it at ${place(g)}.`,
    );
  }
  const lostRobot = robotCell(before.dream.frames[before.at]) >= 0 && g < 0,
    lostCrate = crateCells(before.dream.frames[before.at]).length > 0 && !crateCells(dreamed).length;
  if (lostRobot) said.push('The dream lost the robot.');
  if (lostCrate) said.push('The crate vanished from the dream.');
  if (after.at - 1 >= MAX_MOVES && act !== 'sync') said.push('End of the route.');
  return said.join(' ');
}
