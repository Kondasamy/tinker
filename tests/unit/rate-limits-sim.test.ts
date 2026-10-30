// Rate limits' simulator (U3): the plan's scenarios over the hand-made traces, every request ending once, and each
// effect the chapters teach pinned in data/rate-limits/pinned.json (KTD7; WRITE_PINNED=1 rewrites the scenes).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAPACITY,
  LIVE,
  SCENES,
  allServedAt,
  busiestSecond,
  clock,
  crowdOf,
  isDown,
  levelAt,
  liveOf,
  peakRetries,
  simulate,
  successOf,
  tally,
  traceOf,
  type Scene,
} from '../../src/lib/rate-limits/sim';
import pinned from '../../data/rate-limits/pinned.json' with { type: 'json' };

const EDGE = [59_000, 61_000] as const;
const POLICIES = {
  fixed: { backoff: false, jitter: false },
  fixedJitter: { backoff: false, jitter: true },
  backoff: { backoff: true, jitter: false },
  backoffJitter: { backoff: true, jitter: true },
};
/** Every effect the chapters read, from scratch. */
function effects() {
  const flood = simulate(SCENES.flood),
    edge = simulate(SCENES.edge),
    ignore = simulate(SCENES.ignore),
    listen = simulate(SCENES.listen),
    shared = simulate(SCENES.shared),
    perKey = simulate(SCENES.perKey);
  return {
    flood: {
      downs: flood.downs.length,
      firstDown: flood.downs[0][0],
      oakmoor: tally(flood, 0, flood.ms + 1, 'oakmoor'),
    },
    edge: { aroundEdge: tally(edge, ...EDGE).ok, busiest: busiestSecond(edge) },
    ignore: tally(ignore, 0, ignore.ms + 1),
    listen: tally(listen, 0, listen.ms + 1),
    crowd: Object.fromEntries(
      Object.entries(POLICIES).map(([k, p]) => {
        const r = simulate(crowdOf(p));
        return [k, { peak: peakRetries(r), limited: tally(r).limited, allServedAt: allServedAt(r) }];
      }),
    ),
    shared: { oakmoor: successOf(shared, 'oakmoor'), web: successOf(shared, 'web') },
    perKey: { oakmoor: successOf(perKey, 'oakmoor'), web: successOf(perKey, 'web') },
  };
}

describe('the traces', () => {
  it('are in time order with an id each', () => {
    const t = traceOf('sale');
    expect(new Set(t.map(r => r.id)).size).toBe(t.length);
    for (let i = 1; i < t.length; i++) expect(t[i].at).toBeGreaterThanOrEqual(t[i - 1].at);
  });
  it('every request ends once, under every scene', () => {
    const all: Scene[] = [...Object.values(SCENES), ...Object.values(POLICIES).map(crowdOf)];
    for (const s of all) {
      const r = simulate(s);
      expect(new Set(r.hits.map(h => h.id)).size).toBe(r.hits.length);
    }
  });
  it('reads clock times', () => {
    expect([clock(0), clock(5000), clock(59_500), clock(60_000)]).toEqual(['0:00', '0:05', '0:59.5', '1:00']);
  });
});

describe('the plan’s scenarios', () => {
  it('with no limit the flood takes the server down, and the quiet partner loses requests too', () => {
    const r = simulate(SCENES.flood);
    expect(r.downs.length).toBeGreaterThan(0);
    expect(isDown(r, r.downs[0][0])).toBe(true);
    expect(tally(r, 0, r.ms + 1, 'oakmoor').down).toBeGreaterThan(0);
  });
  it('a fixed window lets through twice its limit across a boundary', () => {
    const r = simulate(SCENES.edge);
    expect(tally(r, ...EDGE).ok).toBe(2 * 40);
    expect(levelAt(r, 'all', 59_999)).toBe(0);
    expect(levelAt(r, 'all', 30_000)).toBe(40);
  });
  it('a bucket serves its size at once, then its refill; a 429 carries the wait to the next token', () => {
    const r = simulate(
      liveOf(
        Array.from({ length: 20 }, () => 0),
        2,
        1000,
      ),
    );
    expect(tally(r, 0, 1).ok).toBe(LIVE.size);
    expect(r.hits.find(h => h.verdict === 'limited')!.waitMs).toBe(500);
    expect(levelAt(r, 'all', 1000)).toBe(2);
  });
  it('a client that listens to Retry-After sends far fewer refused requests and is served as fast', () => {
    const a = tally(simulate(SCENES.ignore)),
      b = tally(simulate(SCENES.listen));
    expect(b.limited * 5).toBeLessThan(a.limited);
    expect(b.ok).toBe(a.ok);
  });
  it('synchronised retries stampede; jittered retries peak lower', () => {
    const peak = (p: (typeof POLICIES)['fixed']) => peakRetries(simulate(crowdOf(p)));
    expect(peak(POLICIES.backoffJitter)).toBeLessThan(peak(POLICIES.backoff) / 2);
    expect(peak(POLICIES.fixedJitter)).toBeLessThan(peak(POLICIES.fixed));
  });
  it('per-key buckets keep the quiet partners whole while the runaway one is limited', () => {
    const s = simulate(SCENES.shared),
      k = simulate(SCENES.perKey);
    expect(successOf(s, 'oakmoor')).toBeLessThan(0.5);
    expect(successOf(k, 'oakmoor')).toBe(1);
    expect(successOf(k, 'web')).toBe(1);
    expect(successOf(k, 'quickfix')).toBeLessThan(0.5);
    expect(busiestSecond(k)).toBeLessThanOrEqual(CAPACITY);
  });
});

describe('pinned effects', () => {
  it('match data/rate-limits/pinned.json', () => {
    const now = JSON.parse(JSON.stringify(effects()));
    if (process.env.WRITE_PINNED) {
      const file = 'data/rate-limits/pinned.json';
      const p = JSON.parse(readFileSync(file, 'utf8'));
      writeFileSync(file, `${JSON.stringify({ ...p, scenes: now }, null, 2)}\n`);
    } else expect(now).toEqual(pinned.scenes);
  });
});
