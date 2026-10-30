// The token bucket (R7d, the module's core): it holds at most `size` tokens and refills `refill` tokens a second; a
// request spends one; an empty bucket refuses with 429 and says how long until the next token. Pure: a bucket is just
// its tokens at a moment, so the scene and the tests can read its level at any time.

export interface Bucket {
  /** tokens held at `at` (may be fractional between drips) */
  tokens: number;
  /** ms on the trace's clock */
  at: number;
}

/** A bucket that starts full at time `at`. */
export const fullBucket = (size: number, at: number): Bucket => ({ tokens: size, at });

/** The bucket's tokens at `now`: what it held plus the drip since, never past its size. */
export const levelOf = (b: Bucket, now: number, size: number, refill: number) =>
  Math.min(size, b.tokens + (Math.max(0, now - b.at) * refill) / 1000);

/** One request at `now`: spend a token if there is a whole one, else refuse with the wait (ms) to the next. */
export function take(b: Bucket, now: number, size: number, refill: number) {
  const tokens = levelOf(b, now, size, refill);
  if (tokens >= 1) return { ok: true as const, bucket: { tokens: tokens - 1, at: now }, waitMs: 0 };
  return {
    ok: false as const,
    bucket: { tokens, at: now },
    waitMs: refill > 0 ? Math.ceil(((1 - tokens) * 1000) / refill) : Number.POSITIVE_INFINITY,
  };
}

/** The Retry-After header's value: whole seconds (RFC 9110 delay-seconds), rounded up so a client that obeys it finds
 * a token waiting. */
export const retryAfterS = (waitMs: number) => Math.max(1, Math.ceil(waitMs / 1000));
