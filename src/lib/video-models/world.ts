// The warehouse world (KTD5): the shared truth the world models learned from. scripts/train/train_world.py mirrors it
// line for line; tests/unit/video-models-world.test.ts replays its recorded rollouts here and requires identical frames.
import { mulberry32 } from '../transformers/sample';

export const SIZE = 16;
export const KINDS = ['floor', 'shelf', 'robot', 'crate'] as const;
export const FLOOR = 0,
  SHELF = 1,
  ROBOT = 2,
  CRATE = 3;
export const ACTIONS = ['stay', 'up', 'down', 'left', 'right'] as const;
export type Action = 0 | 1 | 2 | 3 | 4;
const MOVES: [number, number][] = [
  [0, 0],
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
/** The belt's row: the crate rides it and never leaves it. */
export const BELT = 8;

export interface World {
  /** SHELF or FLOOR per cell, row-major (y * SIZE + x) */
  shelves: Uint8Array;
  robot: { x: number; y: number };
  crate: { x: number; dir: 1 | -1 };
}
/** What happened in one tick, for the chapters and the tests. */
export interface Events {
  bounce: 'end' | 'robot' | null;
  blocked: 'edge' | 'shelf' | 'crate' | null;
}

const inside = (v: number) => v >= 0 && v < SIZE;

/** A seeded start: a few racks of shelves off the belt, the robot on a free cell, the crate somewhere on the belt. */
export function start(rand: () => number): World {
  const int = (n: number) => Math.floor(rand() * n);
  const shelves = new Uint8Array(SIZE * SIZE);
  const racks = 4 + int(4);
  for (let r = 0; r < racks; r++) {
    const across = rand() < 0.5,
      len = 2 + int(4),
      x0 = int(SIZE),
      y0 = int(SIZE);
    for (let i = 0; i < len; i++) {
      const x = across ? x0 + i : x0,
        y = across ? y0 : y0 + i;
      if (inside(x) && inside(y) && y !== BELT) shelves[y * SIZE + x] = SHELF;
    }
  }
  let x: number, y: number;
  do {
    x = int(SIZE);
    y = int(SIZE);
  } while (shelves[y * SIZE + x] === SHELF);
  let cx: number;
  do cx = int(SIZE);
  while (y === BELT && cx === x);
  return { shelves, robot: { x, y }, crate: { x: cx, dir: rand() < 0.5 ? -1 : 1 } };
}

/** One tick. The crate moves first and bounces off a belt end or the robot; then the robot moves unless an edge, a shelf
 * or the crate is in the way. */
export function step(w: World, action: Action): { world: World; events: Events } {
  const { robot } = w,
    events: Events = { bounce: null, blocked: null };
  const free = (x: number) => inside(x) && !(robot.y === BELT && robot.x === x);
  let { x: cx, dir } = w.crate;
  if (!free(cx + dir)) {
    events.bounce = inside(cx + dir) ? 'robot' : 'end';
    dir = -dir as 1 | -1;
  }
  if (free(cx + dir)) cx += dir;
  const [dx, dy] = MOVES[action];
  let { x, y } = robot;
  const nx = x + dx,
    ny = y + dy;
  if (!inside(nx) || !inside(ny)) events.blocked = 'edge';
  else if (w.shelves[ny * SIZE + nx] === SHELF) events.blocked = 'shelf';
  else if (ny === BELT && nx === cx) events.blocked = 'crate';
  else {
    x = nx;
    y = ny;
  }
  return { world: { shelves: w.shelves, robot: { x, y }, crate: { x: cx, dir } }, events };
}

/** The picture: one kind per cell. */
export function frame(w: World): Uint8Array {
  const f = w.shelves.slice();
  f[w.robot.y * SIZE + w.robot.x] = ROBOT;
  f[BELT * SIZE + w.crate.x] = CRATE;
  return f;
}

/** A seeded rollout: the start, then `steps` sticky random actions (each repeats the last with probability 0.75). */
export function rollout(seed: number, steps: number): { frames: Uint8Array[]; actions: Action[] } {
  const rand = mulberry32(seed);
  let w = start(rand),
    a: Action = 0;
  const frames = [frame(w)],
    actions: Action[] = [];
  for (let t = 0; t < steps; t++) {
    if (rand() >= 0.75) a = Math.floor(rand() * ACTIONS.length) as Action;
    actions.push(a);
    w = step(w, a).world;
    frames.push(frame(w));
  }
  return { frames, actions };
}

/** A frame as 256 digits, as rollouts.json and meta.json store them. */
export const frameText = (f: Uint8Array) => f.join('');
export const parseFrame = (s: string) => Uint8Array.from(s, Number);
