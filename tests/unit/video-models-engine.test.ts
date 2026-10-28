// The world models at work (U28): the pinned dream frame by frame, the step it loses the robot and the step the crate
// vanishes, re-sync restoring the real frame, k1 and k2 parting at the bounce, chapter 1's bytes and the multiplies a
// pass costs. Every number the chapters quote comes from pinned.json, rerun here.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/video-models/pinned.json' with { type: 'json' };
import meta from '../../public/data/video-models/meta.json' with { type: 'json' };
import { sizeOf } from '../../src/lib/compression/coders';
import { multiplies, units } from '../../src/lib/video-models/compute';
import { diskNet } from '../../src/lib/video-models/diskModel';
import { TRAIN_ROLLOUTS } from '../../src/lib/video-models/training';
import {
  changed,
  crateCells,
  crateGoneAt,
  dream,
  keptFor,
  oneStep,
  realOf,
  robotCell,
} from '../../src/lib/video-models/rollout';
import { type Action, frame, frameText, ROBOT, rollout, start, step } from '../../src/lib/video-models/world';
import { frameRight } from '../../src/lib/video-models/workbench';
import { mulberry32 } from '../../src/lib/transformers/sample';

const k1 = diskNet('k1'),
  k2 = diskNet('k2');
const real = rollout(pinned.seed, pinned.steps);

describe('the pinned dream (chapter 5)', () => {
  const d = dream(k2, real);
  it('matches pinned.json frame for frame', () => {
    expect(d.frames.map(frameText)).toEqual(pinned.dream);
    expect(d.passes).toBe(pinned.steps - 1);
  });
  it('keeps the robot for the pinned steps, then loses it', () => {
    expect(keptFor(d)).toBe(pinned.kept);
    expect(robotCell(d.frames[pinned.kept + 2])).toBe(-1);
  });
  it('smears the robot: the pinned robot counts when it is lost and at the end', () => {
    const robots = (t: number) => [...d.frames[t]].filter(k => k === ROBOT).length;
    expect(robots(pinned.kept + 2)).toBe(pinned.robotsWhenLost);
    expect(robots(pinned.steps)).toBe(pinned.robotsAtEnd);
  });
  it('re-synced every pinned N steps, keeps the crate and gets the pinned frames right', () => {
    const r = dream(k2, real, { every: pinned.resync.every });
    expect(crateGoneAt(r)).toBe(pinned.resync.crateGone);
    expect(r.frames.slice(2).filter((f, i) => frameRight(real.frames[i + 2], f))).toHaveLength(pinned.resync.right);
  });
  it('loses the crate at the pinned step, while the real one is still on the belt', () => {
    expect(crateGoneAt(d)).toBe(pinned.crateGone);
    expect(crateCells(d.frames[pinned.crateGone - 1]).length).toBeGreaterThan(0);
    expect(crateCells(real.frames[pinned.crateGone])).toHaveLength(1);
  });
});

describe('re-sync', () => {
  it('restores the real frame at each multiple of N, and runs no pass there', () => {
    for (const every of [2, 4, 8, 16]) {
      const d = dream(k2, real, { every });
      for (let t = 2; t < d.frames.length; t++) {
        expect(d.synced[t]).toBe(t % every === 0);
        if (t % every === 0) expect(d.frames[t]).toEqual(real.frames[t]);
      }
      expect(d.passes).toBe(d.synced.slice(2).filter(s => !s).length);
    }
  });
  it('restores it at a step the reader picks, and the guesses after it start from the real frame', () => {
    const d = dream(k2, real, { syncs: [pinned.kept + 2] });
    expect(d.frames[pinned.kept + 2]).toEqual(real.frames[pinned.kept + 2]);
    expect(robotCell(d.frames[pinned.kept + 2])).toBeGreaterThanOrEqual(0);
  });
  it('gives the same frames with the cache keyed as without', () => {
    const a = dream(k2, real, { every: 4, key: 'test' }),
      b = dream(k2, real, { every: 4, key: 'test' });
    expect(a.frames.map(frameText)).toEqual(dream(k2, real, { every: 4 }).frames.map(frameText));
    expect(b.frames.map(frameText)).toEqual(a.frames.map(frameText));
  });
});

describe('one step (chapters 2 and 3)', () => {
  it('changes a few cells a step on the real floor', () => {
    const counts = real.frames.slice(1).map((f, i) => changed(real.frames[i], f).length);
    expect(Math.max(...counts)).toBe(pinned.changes.max);
    expect(Math.min(...counts)).toBe(pinned.changes.min);
  });
  it('k2 gets every changed cell right at the pinned step', () => {
    const { t } = pinned.oneStep,
      g = oneStep(k2, real, t),
      cells = changed(real.frames[t], real.frames[t + 1]);
    expect(cells).toHaveLength(pinned.oneStep.changed);
    expect(cells.filter(c => g[c] === real.frames[t + 1][c])).toHaveLength(pinned.oneStep.right);
  });
  it('k1 and k2 disagree on the crate’s next cell at the pinned bounce frame; k2 is right', () => {
    const { t } = pinned.bounce;
    expect(crateCells(real.frames[t + 1])).toEqual([pinned.bounce.real]);
    expect(crateCells(oneStep(k1, real, t))).toEqual(pinned.bounce.k1);
    expect(crateCells(oneStep(k2, real, t))).toEqual(pinned.bounce.k2);
    expect(pinned.bounce.k2).toEqual([pinned.bounce.real]);
    expect(pinned.bounce.k1).not.toEqual(pinned.bounce.k2);
    // the crate turned at the belt's end two frames before: one frame shows where it is, not which way it goes
    expect(crateCells(real.frames[t - 2])).toEqual([0]);
  });
});

describe('the reader’s drive', () => {
  it('starts on the seed’s first two real frames and steps through world.ts', () => {
    const moves: Action[] = [4, 4, 1, 3];
    const r = realOf(pinned.seed, moves);
    expect(r.frames.slice(0, 2)).toEqual(rollout(pinned.seed, 1).frames);
    let w = start(mulberry32(pinned.seed));
    r.actions.forEach((a, i) => {
      w = step(w, a).world;
      expect(r.frames[i + 1]).toEqual(frame(w));
    });
    expect(r.actions.slice(1)).toEqual(moves);
  });
});

describe('training', () => {
  it('the registry’s rollout count is the one meta.json recorded', () => {
    expect(TRAIN_ROLLOUTS).toBe(meta.training.rollouts);
  });
});

describe('cost', () => {
  it('counts each pass’s multiplies from the weights’ shapes', () => {
    const per = (k: number) => 256 * (16 * (4 * k + 5) * 9 + 2 * 16 * 16 * 9 + 4 * 16);
    expect(multiplies(meta.models.k1)).toBe(per(1));
    expect(multiplies(meta.models.k2)).toBe(per(2));
    expect(units(multiplies(meta.models.k2))).toBe(pinned.units.k2);
    expect(units(multiplies(meta.models.k1))).toBe(pinned.units.k1);
  });
  it('chapter 1: the pinned rollout’s frames, raw and packed by Compression’s pair coder', () => {
    const bytes = Uint8Array.from(real.frames.flatMap(f => [...f]));
    expect(real.frames).toHaveLength(pinned.bytes.frames);
    expect(bytes.length).toBe(pinned.bytes.raw);
    expect(sizeOf('pair', bytes)).toBe(pinned.bytes.packed);
  });
});
