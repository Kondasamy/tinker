// The world models at work (KTD5, U28): one-step guesses from real frames, open-loop dreams fed their own guesses, and
// re-sync (a real frame swapped in every N steps). The reader's drive is the same replay over their own actions, so
// every picture is a pure function of (model, seed, actions, re-syncs). Nothing runs at import.
import { mulberry32 } from '../transformers/sample';
import { guess, logits, type Net } from './net';
import { type Action, BELT, CRATE, frame, ROBOT, rollout, SIZE, start, step, type World } from './world';

export type ModelId = 'k1' | 'k2';
const N = SIZE * SIZE;
export const kOf = (m: ModelId) => (m === 'k1' ? 1 : 2);

/** The cell holding the one robot, or -1 when a frame holds none or several. */
export function robotCell(f: Uint8Array): number {
  let at = -1;
  for (let c = 0; c < N; c++)
    if (f[c] === ROBOT) {
      if (at >= 0) return -1;
      at = c;
    }
  return at;
}
/** The belt's crate cells (x) in a frame: one in a real frame, none or several in a drifted guess. */
export const crateCells = (f: Uint8Array) =>
  [...f.slice(BELT * SIZE, (BELT + 1) * SIZE)].flatMap((k, x) => (k === CRATE ? [x] : []));
/** Cells that differ between two frames. */
export function changed(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = [];
  for (let c = 0; c < N; c++) if (a[c] !== b[c]) out.push(c);
  return out;
}
/** The guess has exactly one robot, on the real robot's cell. */
export const robotRight = (real: Uint8Array, guessed: Uint8Array) => {
  const g = robotCell(guessed);
  return g >= 0 && g === robotCell(real);
};

/** How sure the model is per cell: the softmax's top share over the four kinds. */
export function confidence(net: Net, frames: Uint8Array[], action: Action): Float64Array {
  const z = logits(net, frames, action),
    out = new Float64Array(N);
  for (let c = 0; c < N; c++) {
    let max = -Infinity;
    for (let j = 0; j < 4; j++) max = Math.max(max, z[j * N + c]);
    let sum = 0;
    for (let j = 0; j < 4; j++) sum += Math.exp(z[j * N + c] - max);
    out[c] = 1 / sum;
  }
  return out;
}

/** A recorded run: real frames 0..T and the action taken after each (actions[t] leads from frame t to t + 1). */
export interface Real {
  frames: Uint8Array[];
  actions: Action[];
}

/** The reader's drive: the seed's start and its first recorded action, then the reader's actions, through world.ts. */
export function realOf(seed: number, actions: Action[]): Real {
  const first = rollout(seed, 1);
  let w: World = start(mulberry32(seed));
  const all = [first.actions[0], ...actions],
    frames = [frame(w)];
  for (const a of all) {
    w = step(w, a).world;
    frames.push(frame(w));
  }
  return { frames, actions: all };
}

/** One step from real frames: the model's guess of frame t + 1 from the real frames up to t. */
export const oneStep = (net: Net, r: Real, t: number) =>
  guess(net, r.frames.slice(Math.max(0, t + 1 - net.k), t + 1), r.actions[t]);

export interface Dream {
  /** dream[t] beside real.frames[t]; frames 0 and 1 are real, the rest guessed or re-synced */
  frames: Uint8Array[];
  /** whether frame t is a real frame swapped in (0 and 1 always) */
  synced: boolean[];
  /** model passes run */
  passes: number;
}

const cache = new Map<string, Uint8Array>();
/**
 * The dream: frames 0 and 1 are real, then each frame is guessed from the dream's own last k frames and the real
 * action. A frame at a step in `syncs`, or at every multiple of `every`, is the real one instead (no pass runs).
 * Guesses are remembered by their history, so a drive one key longer runs one pass.
 */
export function dream(net: Net, r: Real, opts: { every?: number; syncs?: number[]; key?: string } = {}): Dream {
  const { every = 0, syncs = [] } = opts;
  const frames = r.frames.slice(0, 2),
    synced = [true, true];
  let passes = 0,
    sig = `${opts.key ?? ''}|k${net.k}`;
  for (let t = 1; t < r.frames.length - 1; t++) {
    const to = t + 1;
    const real = syncs.includes(to) || (every > 0 && to % every === 0);
    sig += real ? `|s${to}` : `|${r.actions[t]}`;
    if (real) {
      frames.push(r.frames[to]);
      synced.push(true);
      continue;
    }
    passes++;
    let g = opts.key === undefined ? undefined : cache.get(sig);
    if (!g) {
      g = guess(net, frames.slice(-net.k), r.actions[t]);
      if (opts.key !== undefined) cache.set(sig, g);
    }
    frames.push(g);
    synced.push(false);
  }
  return { frames, synced, passes };
}

/** Steps the dream keeps exactly one robot, counted from frame 2 (the first guess). */
export function keptFor(d: Dream): number {
  let n = 0;
  for (let t = 2; t < d.frames.length; t++) {
    if (robotCell(d.frames[t]) < 0) return n;
    n++;
  }
  return n;
}
/** The first frame (from 2) where the dream's belt holds no crate, or -1. */
export function crateGoneAt(d: Dream): number {
  for (let t = 2; t < d.frames.length; t++) if (!crateCells(d.frames[t]).length) return t;
  return -1;
}
/** Of the dream's frames from 2 on, how many have the robot right. */
export const robotHits = (r: Real, d: Dream) =>
  d.frames.slice(2).filter((f, i) => robotRight(r.frames[i + 2], f)).length;
