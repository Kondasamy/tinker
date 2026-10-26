// Queues chapter 7's workbench: workers (1–4), the most tries (2, 3, 5, 8) and the lease (3, 6, 20 minutes), 48
// policies, each run over the whole sale morning: the courier's outage, Moe's unreadable order, a worker knocked over
// (day.json `crash`), backoff with jitter and idempotent jobs. A policy meets the owner's rule
// (data/queues/workbench.json) when no good order is dead-lettered and none waits past the limit; it scores its workers,
// fewer is better. The puzzle accepts every policy that meets the rule with the fewest workers (WINNERS), read from
// data/queues/pinned.json; tests/unit/queues-workbench.test.ts solves the bench again and must get the pin (KTD12).
import data from '../../../data/queues/workbench.json' with { type: 'json' };
import pinned from '../../../data/queues/pinned.json' with { type: 'json' };
import { DAY_CRASH, MAX_WORKERS, POISON, policyOf, runOf } from './sim';

export const WAIT_LIMIT = data.waitLimit;
export const RULE = data.rule;
export const REASONS = data.reasons;
export const WORKERS = Array.from({ length: MAX_WORKERS }, (_, i) => i + 1);
export const TRIES = [2, 3, 5, 8];
export const LEASES = [3, 6, 20];

/** What the bench's controls set. */
export interface Bench {
  workers: number;
  maxTries: number;
  lease: number;
}
/** The sale morning the bench runs: everything that goes wrong, and the fixes from chapters 4 and 5. */
export const benchRun = (b: Bench) =>
  runOf(
    policyOf({
      ...b,
      backoff: 'exp',
      jitter: true,
      idempotent: true,
      outage: true,
      poison: true,
      crashes: [DAY_CRASH],
    }),
  );
/** Good orders on the dead-letter shelf. */
export const lostOf = (b: Bench) => benchRun(b).dead.filter(id => id !== POISON.id);
export const meets = (b: Bench) => lostOf(b).length === 0 && benchRun(b).waitedMax <= WAIT_LIMIT;

/** Every policy the controls can make. */
export const BENCHES: Bench[] = WORKERS.flatMap(workers =>
  TRIES.flatMap(maxTries => LEASES.map(lease => ({ workers, maxTries, lease }))),
);
/** Solves the bench from scratch: every policy that meets the rule with the fewest workers. */
export function solve() {
  const passing = BENCHES.filter(meets);
  const best = Math.min(...passing.map(b => b.workers));
  return { best, winners: passing.filter(b => b.workers === best) };
}

/** the pinned solution (KTD12): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
export const wins = (b: Bench) => meets(b) && b.workers === BEST;

/** where the bench starts: one worker, three tries, the shortest lease */
export const START: Bench = { workers: 1, maxTries: 3, lease: 3 };
const pick = (xs: number[], v: unknown, d: number) => (xs.includes(v as number) ? (v as number) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  workers: pick(WORKERS, s.workers, START.workers),
  maxTries: pick(TRIES, s.maxTries, START.maxTries),
  lease: pick(LEASES, s.lease, START.lease),
});
