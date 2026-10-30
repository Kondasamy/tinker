// How long a refused client waits before its next try (R7d ch. 5): a fixed second, or a second doubling with each
// refusal (backoff); jitter draws the wait at random between nothing and that (Brooker's "full jitter"), seeded per
// client and try so a run replays exactly.
import { rollOf } from '../queues/sim';

export const BASE_MS = 1000;
const SEED = 54;

export interface Retry {
  backoff: boolean;
  jitter: boolean;
}

/** The wait (ms) after the client's n-th refusal. */
export function delayOf(r: Retry, id: string, n: number) {
  const d = r.backoff ? BASE_MS * 2 ** (n - 1) : BASE_MS;
  return r.jitter ? Math.floor(rollOf(SEED, id, `jitter${n}`) * d) : d;
}
