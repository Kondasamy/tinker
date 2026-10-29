// Many chips, one model's engine (U22): memory per layout, the ring all-reduce over real numbers, the GPipe schedule,
// tensor parallel inside and between boxes, and checkpoint intervals against a seeded failure stream. Every number a
// chapter quotes is rebuilt by effects() and must equal data/parallel-training/pinned.json (WRITE_PINNED=1 rewrites).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/parallel-training/pinned.json' with { type: 'json' };
import { mulberry32 } from '../../src/lib/transformers/sample';
import { CHIP, FACTS, FAILS_PER_CHIP_DAY, LINK, MODEL, PER_BOX } from '../../src/lib/parallel-training/facts';
import {
  bestInterval,
  failuresOf,
  mtbfOf,
  RESTART,
  runWith,
  SAVE,
  wasteOf,
  youngOf,
} from '../../src/lib/parallel-training/failures';
import { BYTES_PER_PARAM, type Layout, memoryOf, stateOf, type Zero } from '../../src/lib/parallel-training/memory';
import { bubble, bubbleOf, gpipe, idleAt } from '../../src/lib/parallel-training/pipeline';
import { fillsAfter, meanOf, ringAllReduce } from '../../src/lib/parallel-training/ring';
import { GRADIENTS, SEED } from '../../src/lib/parallel-training/story';
import { stepOf, tensorHopSeconds } from '../../src/lib/parallel-training/timing';
import { CHIPS } from '../../src/lib/parallel-training/workbench';

const PINNED = 'data/parallel-training/pinned.json';
const round = (x: number, d = 6) => Number(x.toPrecision(d));
const plain = (l: Layout) => ({ ...l });
const mem = (l: Layout) => Object.fromEntries(Object.entries(memoryOf(l)).map(([k, v]) => [k, Math.round(v)]));

/** Every chapter's numbers, from the engine. */
function effects() {
  const ring = ringAllReduce(GRADIENTS);
  const copies: Layout = { tp: 1, pp: 1, dp: 8, zero: 0 };
  const inBox: Layout = { tp: 8, pp: 4, dp: CHIPS / 32, zero: 1 },
    acrossBoxes: Layout = { tp: 16, pp: 2, dp: CHIPS / 32, zero: 1 };
  const mtbf = mtbfOf(CHIPS),
    best = bestInterval(mtbf, 10),
    month = 30 * 24 * 60,
    fails = failuresOf(SEED, CHIPS, 2 * month);
  return {
    fit: { state: stateOf(), chipMemory: CHIP.memory, chipsAtLeast: Math.ceil(stateOf() / CHIP.memory) },
    ring: {
      mean: [...ring.result[0]].map(x => round(x)),
      sent: ring.sent,
      vectorBytes: GRADIENTS[0].length * 8,
      hops: ring.hops.length,
    },
    zero: ([0, 1, 2, 3] as Zero[]).map(zero => ({ ...plain({ ...copies, zero }), ...mem({ ...copies, zero }) })),
    bubble: [1, 4, 16].map(m => ({ p: 4, m, idle: gpipe(4, m).idle, bubble: round(bubble(4, m)) })),
    tensor: {
      hopInside: round(tensorHopSeconds(8, LINK.inside)),
      hopBetween: round(tensorHopSeconds(16, LINK.between)),
      inBox: { ...plain(inBox), step: round(stepOf(inBox).total), tensor: round(stepOf(inBox).tensor) },
      acrossBoxes: {
        ...plain(acrossBoxes),
        step: round(stepOf(acrossBoxes).total),
        tensor: round(stepOf(acrossBoxes).tensor),
      },
    },
    failures: {
      chips: CHIPS,
      mtbf: round(mtbf),
      young: round(youngOf(mtbf)),
      grid: 10,
      best,
      waste: round(wasteOf(best, mtbf)),
      failsInTwoMonths: fails.length,
      runs: [30, best, 480].map(interval => {
        const r = runWith(fails, month, interval);
        return { interval, hits: r.hits, saves: r.saves, lost: round(r.lost), wall: round(r.wall) };
      }),
    },
  };
}

describe('pinned effects', () => {
  it('every chapter number equals pinned.json', () => {
    const now = effects();
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...now, workbench: file.workbench }, null, 2)}\n`);
      return;
    }
    const { workbench: _, ...rest } = pinned;
    expect(now).toEqual(rest);
  });
});

describe('facts', () => {
  it('every fact has a source and the access date', () => {
    for (const f of FACTS) {
      expect(f.source).toMatch(/^https:\/\//);
      expect(f.claim.length).toBeGreaterThan(20);
    }
    expect(FAILS_PER_CHIP_DAY).toBeCloseTo(419 / (16384 * 54), 12);
    expect(PER_BOX).toBe(8);
    expect(LINK.inside).toBeGreaterThan(LINK.between);
  });
});

describe('memory', () => {
  it('is 16 bytes a parameter before any split', () => {
    expect(BYTES_PER_PARAM).toBe(16);
    const m = memoryOf({ tp: 1, pp: 1, dp: 1, zero: 0 });
    expect(m.weights + m.grads + m.optimiser).toBe(16 * MODEL.params);
    expect(stateOf()).toBeGreaterThan(CHIP.memory);
  });
  it('ZeRO stages 1–3 divide the optimiser state, then the gradients, then the weights by the copies', () => {
    const at = (zero: Zero) => memoryOf({ tp: 1, pp: 1, dp: 8, zero });
    const [z0, z1, z2, z3] = ([0, 1, 2, 3] as Zero[]).map(at);
    expect(z1.optimiser).toBe(z0.optimiser / 8);
    expect([z1.grads, z1.weights]).toEqual([z0.grads, z0.weights]);
    expect(z2.grads).toBe(z0.grads / 8);
    expect(z2.weights).toBe(z0.weights);
    expect(z3.weights).toBe(z0.weights / 8);
    expect(z3.activations).toBe(z0.activations);
  });
  it('tensor and pipeline splits divide everything they hold', () => {
    const a = memoryOf({ tp: 1, pp: 1, dp: 1, zero: 0 }),
      b = memoryOf({ tp: 4, pp: 2, dp: 1, zero: 0 });
    expect(b.weights).toBe(a.weights / 8);
    expect(b.activations).toBe(a.activations / 8);
  });
});

describe('the ring all-reduce', () => {
  for (const n of [2, 4, 8])
    it(`over ${n} workers equals the plain mean and sends 2(N−1)/N of the vector each`, () => {
      const rnd = mulberry32(n),
        len = n * 3,
        vs = Array.from({ length: n }, () => Array.from({ length: len }, () => rnd() * 4 - 2));
      const r = ringAllReduce(vs),
        mean = meanOf(vs);
      for (const out of r.result) out.forEach((x, j) => expect(x).toBeCloseTo(mean[j], 12));
      for (const s of r.sent) expect(s).toBe(((2 * (n - 1)) / n) * len * 8);
      expect(r.hops).toHaveLength(2 * (n - 1));
    });
  it('bucket fills climb to full in the reduce hops, and all are full after the gather', () => {
    const r = ringAllReduce(GRADIENTS),
      n = r.n;
    expect(
      fillsAfter(r, 0)
        .flat()
        .every(f => f === 1 / n),
    ).toBe(true);
    // after reduce-scatter each worker owns exactly one full bucket
    for (const row of fillsAfter(r, n - 1)) expect(row.filter(f => f === 1)).toHaveLength(1);
    expect(
      fillsAfter(r, 2 * (n - 1))
        .flat()
        .every(f => f === 1),
    ).toBe(true);
  });
  it('an uneven vector still averages', () => {
    const vs = [
      [1, 2, 3, 4, 5],
      [5, 4, 3, 2, 1],
      [0, 0, 0, 0, 3],
    ];
    const r = ringAllReduce(vs);
    expect([...r.result[2]]).toEqual([...meanOf(vs)]);
  });
});

describe('the pipeline', () => {
  for (const [p, m] of [
    [4, 1],
    [4, 4],
    [4, 16],
    [8, 32],
  ])
    it(`p=${p}, m=${m}: idle slots give (p−1)/(m+p−1)`, () => {
      const s = gpipe(p, m);
      expect(bubbleOf(s)).toBeCloseTo(bubble(p, m), 12);
      expect(s.idle).toBe(2 * p * (p - 1));
      // every stage runs each micro-batch forward then backward, once each
      for (const row of s.grid) expect(row.filter(Boolean)).toHaveLength(2 * m);
      // the first slot has only stage 0 busy
      expect(idleAt(s, 0)).toEqual(Array.from({ length: p - 1 }, (_, i) => i + 1));
    });
  it('a backward never runs before its forward reached the last stage', () => {
    const s = gpipe(4, 6);
    for (const row of s.grid)
      row.forEach((x, t) => {
        if (x?.kind === 'B') expect(t).toBeGreaterThanOrEqual(6 + 4 - 1);
      });
  });
});

describe('tensor parallel', () => {
  it('across boxes is slower than inside one box for the pinned sizes', () => {
    expect(tensorHopSeconds(16, LINK.between)).toBeGreaterThan(tensorHopSeconds(8, LINK.inside));
    const { inBox, acrossBoxes } = pinned.tensor;
    expect(acrossBoxes.tensor).toBeGreaterThan(inBox.tensor);
    expect(acrossBoxes.step).toBeGreaterThan(inBox.step);
  });
});

describe('failures and checkpoints', () => {
  it('more chips fail more often', () => {
    expect(mtbfOf(2 * CHIPS)).toBeCloseTo(mtbfOf(CHIPS) / 2, 9);
  });
  it('the searched best interval is within one grid step of Young/Daly', () => {
    for (const chips of [256, CHIPS, 16384])
      for (const step of [1, 5, 10]) {
        const m = mtbfOf(chips);
        expect(Math.abs(bestInterval(m, step) - youngOf(m))).toBeLessThanOrEqual(step);
      }
  });
  it('the failure stream is seeded and runs at the cited rate', () => {
    const minutes = 365 * 24 * 60;
    expect(failuresOf(SEED, CHIPS, minutes)).toEqual(failuresOf(SEED, CHIPS, minutes));
    const n = failuresOf(SEED, CHIPS, minutes).length,
      expected = minutes / mtbfOf(CHIPS);
    expect(Math.abs(n - expected)).toBeLessThan(4 * Math.sqrt(expected));
  });
  it('lost work per failure averages half an interval plus the restart', () => {
    const minutes = 10 * 365 * 24 * 60,
      interval = 120,
      fails = failuresOf(SEED, CHIPS, 4 * minutes);
    const r = runWith(fails, minutes, interval, 0);
    expect(r.lost / r.hits).toBeGreaterThan(0.85 * (interval / 2 + RESTART));
    expect(r.lost / r.hits).toBeLessThan(1.15 * (interval / 2 + RESTART));
  });
  it('the run ends with all its work done and saves between chunks', () => {
    const r = runWith([], 600, 120);
    expect(r).toEqual({ work: 600, wall: 600 + 4 * SAVE, saves: 4, hits: 0, lost: 0 });
  });
  it('the pinned best interval loses less than saving too often or too rarely', () => {
    const [often, best, rarely] = pinned.failures.runs;
    expect(best.wall).toBeLessThan(often.wall);
    expect(best.wall).toBeLessThan(rarely.wall);
  });
});
