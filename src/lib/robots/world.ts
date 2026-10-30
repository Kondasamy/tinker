// Robots that act: the simulated parts bay (KTD5, KTD9). A seeded grid world, not physics: an 8 × 6 bin of cells,
// crates that block the claw, one part, and the goal tray just past the bin's right wall at one row. The claw moves
// one cell a press, grips and drops. What the camera gives (`observe`) is the policy's whole state: whether the claw
// holds the part, which way and how far the target is (clamped), and which of its four neighbours are blocked. A slip
// (the gantry's rail skidding) carries a move one cell further; poor light hides the part from the camera. Every rule
// here is stated in code and true by construction, and the copy says "simulated" wherever it shows.
import bins from '../../../data/robots/bins.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';

export const [W, H] = bins.size;
export const CAP = bins.cap;
export const START = bins.start as Cell;
export type Cell = [x: number, y: number];
export const MOVES = ['up', 'down', 'left', 'right'] as const;
export type Move = (typeof MOVES)[number];
export type Action = Move | 'grip' | 'drop';
export const ACTIONS: Action[] = [...MOVES, 'grip', 'drop'];
const DIR: Record<Move, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export interface Layout {
  seed: number;
  /** the tray's row: its cell is (W, tray), just past the bin's right wall */
  tray: number;
  part: Cell;
  crates: Cell[];
  /** the bay's light, 1 = the lights demos were driven under */
  light: number;
}
export type End = 'done' | 'off-grid' | 'stuck';
export interface State {
  claw: Cell;
  /** where the part lies, while it isn't held */
  part: Cell;
  holding: boolean;
  steps: number;
  end?: End;
}
/** What the camera gives the policy: which way the target is (the part, or the tray once held), each of dx and dy
 * as -1, 0 or 1; whether the part was seen; and the four neighbours blocked (crate or wall) in MOVES order. */
export interface Obs {
  holding: boolean;
  dx: number;
  dy: number;
  seen: boolean;
  blocked: boolean[];
}

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];
export const trayCell = (l: Layout): Cell => [W, l.tray];
export const isCrate = (l: Layout, c: Cell) => l.crates.some(k => same(k, c));
const inBin = (c: Cell) => c[0] >= 0 && c[0] < W && c[1] >= 0 && c[1] < H;
/** A cell the claw may be over: inside the bin and not a crate, or the tray. */
export const free = (l: Layout, c: Cell) => (inBin(c) && !isCrate(l, c)) || same(c, trayCell(l));
const offGrid = (l: Layout, c: Cell) => !inBin(c) && !same(c, trayCell(l));

/** A bin from its seed: the tray's row, the part, `crates` crates, redrawn until the expert clears it within the
 * cap; `real` draws the bay's light from bins.json's real range with its own stream, so the layout never depends on
 * it. */
export function layoutOf(seed: number, { real = false, crates: k = bins.crates } = {}): Layout {
  const r = mulberry32(seed);
  const pick = (x0: number): Cell => [x0 + Math.floor(r() * (W - x0)), Math.floor(r() * H)];
  for (;;) {
    const tray = Math.floor(r() * H),
      part = pick(2),
      crates: Cell[] = [];
    while (crates.length < k) {
      const c = pick(0);
      if (same(c, START) || same(c, part) || same(c, [W - 1, tray]) || crates.some(k => same(k, c))) continue;
      crates.push(c);
    }
    const [lo, hi] = bins.real.light;
    const l: Layout = { seed, tray, part, crates, light: real ? lo + mulberry32(seed + 7777)() * (hi - lo) : 1 };
    if (rollout(l, s => expert(l, s)).end === 'done') return l;
  }
}
export const startOf = (l: Layout): State => ({ claw: START, part: l.part, holding: false, steps: 0 });

/** One action. A move into a crate or a wall stays put (a bump); a move past the bin's edge, other than into the
 * tray, ends the run off the grid. With `slip`, a move carries one cell further when that cell is free. Gripping over
 * the part lifts it; dropping over the tray ends the run done, anywhere else sets the part down there. */
export function step(l: Layout, s: State, a: Action, slip = false): State {
  if (s.end) return s;
  const t = { ...s, steps: s.steps + 1 };
  if (a === 'grip') return !s.holding && same(s.claw, s.part) ? { ...t, holding: true } : t;
  if (a === 'drop') {
    if (!s.holding) return t;
    return { ...t, holding: false, part: s.claw, end: same(s.claw, trayCell(l)) ? 'done' : undefined };
  }
  const d = DIR[a],
    to: Cell = [s.claw[0] + d[0], s.claw[1] + d[1]];
  if (offGrid(l, to)) return { ...t, end: 'off-grid' };
  if (!free(l, to)) return t;
  const on: Cell = [to[0] + d[0], to[1] + d[1]];
  const claw = slip && free(l, on) ? on : to;
  return { ...t, claw, part: s.holding ? claw : s.part };
}

/** What the camera gives at a state. The part is seen when held, or when the bay's light falls inside the
 * detector's range (the light levels it has seen); unseen, the target reads as under the claw. */
export function observe(l: Layout, s: State, detector: readonly number[] = bins.detector): Obs {
  const seen = s.holding || (l.light >= detector[0] && l.light <= detector[1]);
  const target = s.holding ? trayCell(l) : s.part;
  return {
    holding: s.holding,
    dx: seen ? Math.sign(target[0] - s.claw[0]) : 0,
    dy: seen ? Math.sign(target[1] - s.claw[1]) : 0,
    seen,
    blocked: MOVES.map(m => !free(l, [s.claw[0] + DIR[m][0], s.claw[1] + DIR[m][1]])),
  };
}

/** The expert, a careful driver who reads only the camera (under good light): over the target, grip or drop;
 * else across towards it if that cell is free, else up or down towards it, else step round the crate. */
export function expertOf(o: Obs): Action {
  if (!o.dx && !o.dy) return o.holding ? 'drop' : 'grip';
  const free4 = (m: Move) => !o.blocked[MOVES.indexOf(m)];
  const want: Move[] = [];
  if (o.dx) want.push(o.dx > 0 ? 'right' : 'left');
  if (o.dy) want.push(o.dy > 0 ? 'down' : 'up');
  const round: Move[] = o.dx ? ['down', 'up'] : ['right', 'left'];
  return [...want, ...round].find(free4) ?? 'grip';
}
export const expert = (l: Layout, s: State) => expertOf(observe(l, s, [0, Number.POSITIVE_INFINITY]));

export interface Run {
  states: State[];
  actions: Action[];
  end: End;
  steps: number;
}
export interface RunOpts {
  /** the chance each move slips, drawn from a stream seeded by `seed` */
  slip?: number;
  seed?: number;
  /** step numbers (1-based) whose move slips whatever the chance: chapter 5's forced off-by-one */
  forced?: number[];
  cap?: number;
}
/** Runs a chooser from the start until the part is in the tray, the claw leaves the grid, or the step cap: stuck. */
export function rollout(l: Layout, choose: (s: State) => Action, o: RunOpts = {}): Run {
  const r = mulberry32((o.seed ?? l.seed) * 31 + 1),
    cap = o.cap ?? CAP;
  let s = startOf(l);
  const states = [s],
    actions: Action[] = [];
  while (!s.end && s.steps < cap) {
    const a = choose(s),
      roll = r();
    const slip = (o.forced ?? []).includes(s.steps + 1) || roll < (o.slip ?? 0);
    s = step(l, s, a, slip && MOVES.includes(a as Move));
    states.push(s);
    actions.push(a);
  }
  return { states, actions, end: s.end ?? 'stuck', steps: s.steps };
}
/** Plays a list of actions from the start (a demo, a script), stopping when the run ends. */
export function play(l: Layout, actions: Action[]): State[] {
  const out = [startOf(l)];
  for (const a of actions) {
    if (out.at(-1)!.end) break;
    out.push(step(l, out.at(-1)!, a));
  }
  return out;
}

export const TRAIN = bins.train.map(seed => layoutOf(seed));
export const HELD_OUT = bins.heldOut.map(seed => layoutOf(seed));
export const REAL = bins.heldOut.map(seed => layoutOf(seed, { real: true }));
export const FRESH = layoutOf(bins.fresh);
export const BINS = bins;
