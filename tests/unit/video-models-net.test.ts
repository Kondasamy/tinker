// The world models (KTD5): the TS forward pass against train_world.py's goldens, the weights' size and layout, and the
// bar re-measured here on held-out rollouts: k2 knows where the robot and crate go, k1 cannot tell the crate's way, and
// fed its own guesses k2 drifts before step 16.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { guess, logits, type Net, type NetMeta, parseNet } from '../../src/lib/video-models/net';
import {
  ACTIONS,
  BELT,
  CRATE,
  frameText,
  KINDS,
  parseFrame,
  ROBOT,
  rollout,
  SIZE,
} from '../../src/lib/video-models/world';

interface Meta {
  heldOut: { firstSeed: number; rollouts: number; openSteps: number };
  models: Record<'k1' | 'k2', NetMeta>;
}
const meta = JSON.parse(readFileSync('public/data/video-models/meta.json', 'utf8')) as Meta;
const load = (k: 'k1' | 'k2'): Net => {
  const bin = readFileSync(`public/data/video-models/${k}.bin`);
  return parseNet(meta.models[k], bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer);
};
const nets = { k1: load('k1'), k2: load('k2') };
const N = SIZE * SIZE;

// Held-out rollouts re-scored here: a slice of the ones train_world.py scored (its full scores are in meta.json).
const HELD = 40;
const held = Array.from({ length: HELD }, (_, i) => rollout(meta.heldOut.firstSeed + i, 32));
// The pinned start chapters open on: k2 keeps one robot for 9 steps, then loses it.
const PINNED = meta.heldOut.firstSeed + 4;

/** Steps k2 keeps exactly one robot when fed its own guesses, from real frames 0 and 1. */
function kept(net: Net, r: ReturnType<typeof rollout>, steps: number) {
  const window = r.frames.slice(0, 2);
  for (let t = 1; t <= steps; t++) {
    const g = guess(net, window, r.actions[t]);
    if (g.filter(c => c === ROBOT).length !== 1) return t - 1;
    window.push(g);
  }
  return steps;
}

describe('world models', () => {
  it('match the Python goldens within 1e-4, and the guessed frames', () => {
    for (const k of ['k1', 'k2'] as const)
      for (const g of meta.models[k].goldens) {
        const frames = g.frames.map(parseFrame),
          z = logits(nets[k], frames, g.action as 0);
        g.cells.forEach((c, i) => {
          for (let j = 0; j < KINDS.length; j++) expect(Math.abs(z[j * N + c] - g.logits[i][j])).toBeLessThan(1e-4);
        });
        expect(frameText(guess(nets[k], frames, g.action as 0))).toBe(g.guess);
      }
  });

  it('ship each under 30 KB, laid out as the net reads them', () => {
    for (const k of ['k1', 'k2'] as const) {
      const m = meta.models[k],
        { channels: ch } = m;
      expect(readFileSync(`public/data/video-models/${k}.bin`).length).toBe(m.bytes);
      expect(m.bytes).toBeLessThan(30_000);
      expect(m.tensors.map(t => [t.name, t.shape])).toEqual([
        ['c1.weight', [ch, 4 * m.k + ACTIONS.length, 3, 3]],
        ['c1.bias', [ch]],
        ['c2.weight', [ch, ch, 3, 3]],
        ['c2.bias', [ch]],
        ['c3.weight', [ch, ch, 3, 3]],
        ['c3.bias', [ch]],
        ['out.weight', [KINDS.length, ch, 1, 1]],
        ['out.bias', [KINDS.length]],
      ]);
      let at = 0;
      for (const t of m.tensors) {
        expect(t.offset).toBe(at);
        at += t.shape.reduce((a, b) => a * b, 1) * 2;
      }
      expect(at).toBe(m.bytes);
      expect(m.params * 2).toBe(m.bytes);
    }
  });

  it("recorded KTD5's bar in meta.json", () => {
    const { k1, k2 } = meta.models;
    expect(k2.scores.changedAccuracy).toBeGreaterThanOrEqual(0.9);
    expect(k2.scores.robotCell).toBeGreaterThanOrEqual(0.95);
    expect(k2.scores.crateNext).toBeGreaterThanOrEqual(0.9);
    expect(k1.scores.crateNext).toBeLessThanOrEqual(0.65);
    expect(k2.scores.openLoopMedian).toBeGreaterThanOrEqual(6);
    expect(k2.scores.openLoopMedian).toBeLessThan(meta.heldOut.openSteps);
  });

  it('meet the bar again in TS on held-out rollouts', () => {
    const tally = { k1: { crate: 0 }, k2: { changed: 0, changedRight: 0, robot: 0, robotRight: 0, crate: 0 } };
    let crateSteps = 0;
    for (const r of held)
      for (let t = 1; t < r.actions.length; t++) {
        const next = r.frames[t + 1],
          cur = r.frames[t];
        const crateAt = (f: Uint8Array) => f.slice(BELT * SIZE, (BELT + 1) * SIZE).indexOf(CRATE);
        // bounce-free and seen moving: the crate moved one cell both ticks, the same way
        const d0 = crateAt(cur) - crateAt(r.frames[t - 1]),
          d1 = crateAt(next) - crateAt(cur);
        const steady = Math.abs(d0) === 1 && d0 === d1;
        if (steady) crateSteps++;
        for (const k of ['k1', 'k2'] as const) {
          const g = guess(nets[k], r.frames.slice(t + 1 - Number(k[1]), t + 1), r.actions[t]);
          const belt = [...g.slice(BELT * SIZE, (BELT + 1) * SIZE)].flatMap((c, x) => (c === CRATE ? [x] : []));
          if (steady && belt.length === 1 && belt[0] === crateAt(next)) tally[k].crate++;
          if (k === 'k1') continue;
          for (let c = 0; c < N; c++) {
            if (next[c] !== cur[c]) {
              tally.k2.changed++;
              if (g[c] === next[c]) tally.k2.changedRight++;
            }
            if (next[c] === ROBOT) {
              tally.k2.robot++;
              if (g[c] === ROBOT) tally.k2.robotRight++;
            }
          }
        }
      }
    expect(tally.k2.changedRight / tally.k2.changed).toBeGreaterThanOrEqual(0.9);
    expect(tally.k2.robotRight / tally.k2.robot).toBeGreaterThanOrEqual(0.95);
    expect(tally.k2.crate / crateSteps).toBeGreaterThanOrEqual(0.9);
    expect(tally.k1.crate / crateSteps).toBeLessThanOrEqual(0.65);
    const runs = held.map(r => kept(nets.k2, r, meta.heldOut.openSteps)).sort((a, b) => a - b);
    const median = (runs[HELD / 2 - 1] + runs[HELD / 2]) / 2;
    expect(median).toBeGreaterThanOrEqual(6);
    expect(median).toBeLessThan(meta.heldOut.openSteps);
  });

  it('drift before step 16 from the pinned start, fed their own guesses', () => {
    expect(kept(nets.k2, rollout(PINNED, 32), 16)).toBe(9);
  });
});
