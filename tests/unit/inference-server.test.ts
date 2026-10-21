// Inference's server (KTD7): a discrete-time simulator over the fixed trace, with times from counted work. The tests
// hold the lessons the chapters read off it: continuous batching beats static, the batch cap trades each reply's pace
// for throughput, and memory queues requests rather than dropping them.
import { describe, expect, it } from 'vitest';
import { costs } from '../../src/lib/transformers/costs';
import { CAPS, MEMORY, MODES, OPEN, REQUESTS, iterationMs, kvBytes, reserved, serve } from '../../src/lib/inference/server';
import { BEST, POLICIES, WINNERS, verdicts, runOf } from '../../src/lib/inference/workbench';
import { OPEN_MODEL, FACTS, ACCESSED } from '../../src/lib/inference/facts';

const BIG = MEMORY.at(-1)!;

describe('the server simulator', () => {
  it('serves every request exactly once, in order of events', () => {
    for (const mode of MODES) for (const cap of CAPS) {
      const r = serve(OPEN, { mode, cap, kvRoomGB: BIG });
      expect(r.served.map(s => s.id)).toEqual(REQUESTS.map(q => q.id));
      for (const s of r.served) {
        expect(s.admitted).toBeGreaterThanOrEqual(s.at);
        expect(s.first).toBeGreaterThan(s.admitted);
        expect(s.finish).toBeGreaterThanOrEqual(s.first);
      }
    }
  });

  it('continuous batching finishes the trace no later than static batching', () => {
    for (const cap of CAPS) for (const kvRoomGB of MEMORY)
      expect(serve(OPEN, { mode: 'continuous', cap, kvRoomGB }).makespan).toBeLessThanOrEqual(serve(OPEN, { mode: 'static', cap, kvRoomGB }).makespan);
  });

  it('raising the batch cap never lowers throughput, and slows each reply’s tokens at least once (the trade-off holds)', () => {
    for (const mode of MODES) for (const kvRoomGB of MEMORY) {
      const rs = CAPS.map(cap => serve(OPEN, { mode, cap, kvRoomGB }));
      for (let i = 1; i < rs.length; i++) expect(rs[i].throughput).toBeGreaterThanOrEqual(rs[i - 1].throughput - 1e-9);
    }
    const rs = CAPS.map(cap => serve(OPEN, { mode: 'continuous', cap, kvRoomGB: BIG }));
    expect(rs.some((r, i) => i > 0 && r.meanTpot > rs[i - 1].meanTpot)).toBe(true);
  });

  it('KV memory per request is costs() × bytes; in flight, the sum over the requests let in, never past the room', () => {
    expect(kvBytes(OPEN, 1)).toBe(costs({ ...OPEN_MODEL, vocab: 0, ctx: 0, d_mlp: 0, ln_eps: 0 }, 1).kv * 2);
    expect(kvBytes(OPEN, 1)).toBe(819_200);   // the vLLM paper’s “800 KB” for OPT-13B
    for (const kvRoomGB of MEMORY) {
      const r = serve(OPEN, { mode: 'continuous', cap: 16, kvRoomGB });
      for (const it of r.iterations) {
        const inFlight = r.served.filter(s => s.admitted <= it.start && s.finish > it.start || it.prefill.includes(s.id));
        expect(it.kv).toBeCloseTo(inFlight.reduce((n, s) => n + reserved(OPEN, s), 0), 0);
        expect(it.kv).toBeLessThanOrEqual(kvRoomGB * 1e9);
      }
    }
  });

  it('a tight memory limit queues requests rather than dropping them', () => {
    const tight = serve(OPEN, { mode: 'continuous', cap: 16, kvRoomGB: MEMORY[0] }), roomy = serve(OPEN, { mode: 'continuous', cap: 16, kvRoomGB: BIG });
    expect(tight.served).toHaveLength(REQUESTS.length);
    expect(tight.peakKv).toBeLessThan(roomy.peakKv);
    expect(tight.worstTtft).toBeGreaterThan(roomy.worstTtft);
  });

  it('refuses a request bigger than the whole room instead of waiting forever', () => {
    expect(() => serve(OPEN, { mode: 'continuous', cap: 1, kvRoomGB: 0.1 })).toThrow(/more KV room/);
  });

  it('prefill is mostly work, decode mostly reading: a 500-token prompt costs a few decode steps, not 500', () => {
    const step = iterationMs(OPEN, [], [500]), prompt = iterationMs(OPEN, [500], []);
    expect(prompt).toBeGreaterThan(step);
    expect(prompt).toBeLessThan(10 * step);
  });
});

describe('the workbench', () => {
  it('has winners, and every winner serves the most requests on target', () => {
    expect(POLICIES).toHaveLength(MODES.length * CAPS.length * MEMORY.length);
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(WINNERS.length).toBeLessThan(POLICIES.length / 4);
    for (const w of WINNERS) expect(verdicts(runOf(w)).filter(v => v.ok)).toHaveLength(BEST);
    expect(WINNERS.every(w => w.mode === 'continuous')).toBe(true);
  });
});

describe('facts (R5)', () => {
  it('every fact has a source URL and the access date', () => {
    expect(ACCESSED).toBe('2026-10-21');
    for (const f of FACTS) expect(f.source).toMatch(/^https:\/\//);
  });
});
