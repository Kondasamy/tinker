// A fixed window counter (R7d ch. 2): at most `limit` requests per window of `ms`, the count starting again at each
// window's edge. Two full windows back to back let twice the limit through around the edge.

export interface Counter {
  /** the window's start, ms */
  start: number;
  count: number;
}

/** One request at `now`: count it if the window has room, else refuse until the window ends. */
export function windowTake(c: Counter, now: number, limit: number, ms: number) {
  const start = Math.floor(now / ms) * ms,
    count = start === c.start ? c.count : 0;
  if (count < limit) return { ok: true as const, counter: { start, count: count + 1 }, waitMs: 0 };
  return { ok: false as const, counter: { start, count }, waitMs: start + ms - now };
}

/** How many the window still allows at `now`. */
export const roomOf = (c: Counter, now: number, limit: number, ms: number) =>
  Math.floor(now / ms) * ms === c.start ? limit - c.count : limit;
