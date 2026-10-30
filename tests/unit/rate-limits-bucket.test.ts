// Rate limits' limiters (U3): the token bucket serves a burst of its size, then its refill rate, and its Retry-After is
// the time to the next token; a fixed window lets twice its limit through across a boundary; backoff doubles and jitter
// stays inside the doubled wait.
import { describe, expect, it } from 'vitest';
import { fullBucket, levelOf, retryAfterS, take } from '../../src/lib/rate-limits/bucket';
import { windowTake } from '../../src/lib/rate-limits/window';
import { delayOf } from '../../src/lib/rate-limits/backoff';

describe('the token bucket', () => {
  it('a full bucket of size B serves B at once, then one every 1/r seconds', () => {
    const size = 10,
      refill = 2;
    let b = fullBucket(size, 0);
    let served = 0;
    for (let i = 0; i < 15; i++) {
      const r = take(b, 0, size, refill);
      b = r.bucket;
      if (r.ok) served++;
    }
    expect(served).toBe(size);
    // one second later: two tokens
    let later = 0;
    for (let i = 0; i < 5; i++) {
      const r = take(b, 1000, size, refill);
      b = r.bucket;
      if (r.ok) later++;
    }
    expect(later).toBe(refill);
  });
  it('Retry-After is the time to the next token, rounded up to whole seconds', () => {
    const r = take({ tokens: 0, at: 0 }, 0, 10, 0.5);
    expect(r.ok).toBe(false);
    expect(r.waitMs).toBe(2000);
    expect(retryAfterS(r.waitMs)).toBe(2);
    expect(retryAfterS(take({ tokens: 0.25, at: 0 }, 0, 10, 2).waitMs)).toBe(1);
  });
  it('never fills past its size', () => {
    expect(levelOf({ tokens: 3, at: 0 }, 60_000, 10, 5)).toBe(10);
  });
});

describe('the fixed window', () => {
  it('lets the limit through at the end of one window and again at the start of the next', () => {
    const limit = 40,
      ms = 60_000;
    let c = { start: 0, count: 0 },
      served = 0;
    for (let i = 0; i < 40; i++) {
      const r = windowTake(c, 59_000 + i * 25, limit, ms);
      c = r.counter;
      served += Number(r.ok);
    }
    for (let i = 0; i < 40; i++) {
      const r = windowTake(c, 60_000 + i * 25, limit, ms);
      c = r.counter;
      served += Number(r.ok);
    }
    expect(served).toBe(2 * limit);
  });
  it('refuses past the limit, with Retry-After until the window ends', () => {
    const r = windowTake({ start: 0, count: 40 }, 59_500, 40, 60_000);
    expect(r.ok).toBe(false);
    expect(r.waitMs).toBe(500);
  });
});

describe('backoff', () => {
  it('fixed waits the base; backoff doubles; jitter stays inside the wait and is seeded', () => {
    expect(delayOf({ backoff: false, jitter: false }, 'a', 3)).toBe(1000);
    expect([1, 2, 3].map(n => delayOf({ backoff: true, jitter: false }, 'a', n))).toEqual([1000, 2000, 4000]);
    const j = delayOf({ backoff: true, jitter: true }, 'a', 3);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(j).toBeLessThan(4000);
    expect(delayOf({ backoff: true, jitter: true }, 'a', 3)).toBe(j);
  });
});
