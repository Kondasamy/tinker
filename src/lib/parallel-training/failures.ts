// Chips fail, so the run saves checkpoints (KTD8, KTD13). Failures arrive at Llama 3's published rate per chip-day
// (facts.ts), so a cluster's mean time between failures shrinks with every chip added. Each failure loses the work
// since the last save, on average half an interval, plus the restart. Saving more often loses less per failure but
// spends more time writing. Expected waste for interval τ (minutes): δ/τ + (τ/2 + R)/M. Its minimum is Young's
// √(2δM); the best interval here is found by search, and Young's value is the optional maths.
import bench from '../../../data/parallel-training/workbench.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';
import { FAILS_PER_CHIP_DAY } from './facts';

/** planning numbers: minutes to write a checkpoint (δ) and to come back after a failure (R) */
export const SAVE = bench.saveMinutes;
export const RESTART = bench.restartMinutes;

/** Mean minutes between failures for a cluster of `chips`. */
export const mtbfOf = (chips: number) => (24 * 60) / (FAILS_PER_CHIP_DAY * chips);
/** Expected share of wall-clock lost to saving, lost work and restarts. */
export const wasteOf = (interval: number, mtbf: number, save = SAVE, restart = RESTART) =>
  save / interval + (interval / 2 + restart) / mtbf;
/** Young's interval, √(2δM). */
export const youngOf = (mtbf: number, save = SAVE) => Math.sqrt(2 * save * mtbf);

/** The interval with the least expected waste, searched on a grid of `step` minutes up to the mean time between failures. */
export function bestInterval(mtbf: number, step: number, save = SAVE, restart = RESTART) {
  let best = step;
  for (let t = step; t <= mtbf; t += step)
    if (wasteOf(t, mtbf, save, restart) < wasteOf(best, mtbf, save, restart)) best = t;
  return best;
}

export interface Failure {
  /** minutes from the start */
  at: number;
  /** which chip failed */
  chip: number;
}
/** A seeded failure stream: exponential gaps with the cluster's mean, each on a random chip. */
export function failuresOf(seed: number, chips: number, minutes: number): Failure[] {
  const rnd = mulberry32(seed),
    mean = mtbfOf(chips),
    out: Failure[] = [];
  for (let at = -mean * Math.log(1 - rnd()); at < minutes; at += -mean * Math.log(1 - rnd()))
    out.push({ at, chip: Math.floor(rnd() * chips) });
  return out;
}

export interface RunLog {
  /** minutes of training done */
  work: number;
  /** wall-clock minutes it took */
  wall: number;
  saves: number;
  /** failures that hit the run */
  hits: number;
  /** minutes of work redone, plus restarts */
  lost: number;
}
/**
 * Play `work` minutes of training against a failure stream, saving every `interval` minutes of work. A failure throws
 * away the work since the last save (and a save in progress), then the run restarts.
 */
export function runWith(fails: Failure[], work: number, interval: number, save = SAVE, restart = RESTART): RunLog {
  const log: RunLog = { work, wall: 0, saves: 0, hits: 0, lost: 0 };
  let done = 0,
    f = 0;
  while (done < work) {
    const chunk = Math.min(interval, work - done),
      end = log.wall + chunk + (done + chunk < work ? save : 0);
    while (f < fails.length && fails[f].at < log.wall) f++;
    if (f < fails.length && fails[f].at < end) {
      log.hits++;
      log.lost += fails[f].at - log.wall + restart;
      log.wall = fails[f].at + restart;
      f++;
      continue;
    }
    log.wall = end;
    done += chunk;
    if (done < work) log.saves++;
  }
  return log;
}
