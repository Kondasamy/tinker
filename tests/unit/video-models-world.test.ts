// The warehouse simulator (KTD5) is the shared truth: train_world.py's recorded rollouts replay here frame for frame,
// shelves block the robot, the crate bounces at both belt ends and off the robot, and the robot is blocked by the crate.
import { describe, expect, it } from 'vitest';
import recorded from '../../data/video-models/rollouts.json' with { type: 'json' };
import {
  type Action,
  BELT,
  CRATE,
  type Events,
  FLOOR,
  frame,
  frameText,
  ROBOT,
  rollout,
  SHELF,
  SIZE,
  start,
  step,
  type World,
} from '../../src/lib/video-models/world';
import { mulberry32 } from '../../src/lib/transformers/sample';

const empty = (): Uint8Array => new Uint8Array(SIZE * SIZE);
const world = (robot: World['robot'], crate: World['crate'], shelves = empty()): World => ({ shelves, robot, crate });

describe('warehouse simulator', () => {
  it('replays every recorded Python rollout frame for frame', () => {
    expect(recorded.rollouts.length).toBeGreaterThanOrEqual(4);
    for (const r of recorded.rollouts) {
      let w = start(mulberry32(r.seed));
      const frames = [frameText(frame(w))];
      const events: Events[] = [];
      for (const a of r.actions as Action[]) {
        const next = step(w, a);
        w = next.world;
        frames.push(frameText(frame(w)));
        events.push(next.events);
      }
      expect(frames).toEqual(r.frames);
      expect(events).toEqual(r.events);
      const again = rollout(r.seed, r.actions.length);
      expect(again.actions).toEqual(r.actions);
      expect(again.frames.map(frameText)).toEqual(r.frames);
    }
  });

  it('records a robot–crate meeting both ways in Python, and TS agrees', () => {
    const all = recorded.rollouts.flatMap(r => r.events);
    expect(all.some(e => e.bounce === 'robot')).toBe(true);
    expect(all.some(e => e.blocked === 'crate')).toBe(true);
  });

  it('keeps one robot and one crate on the belt in every frame', () => {
    for (let seed = 1; seed <= 50; seed++)
      for (const f of rollout(seed, 32).frames) {
        expect(f.filter(k => k === ROBOT)).toHaveLength(1);
        expect(f.filter(k => k === CRATE)).toHaveLength(1);
        expect(f.slice(BELT * SIZE, BELT * SIZE + SIZE)).toContain(CRATE);
      }
  });

  it('blocks the robot at a shelf and at the edge', () => {
    const shelves = empty();
    shelves[2 * SIZE + 3] = SHELF;
    const w = world({ x: 3, y: 3 }, { x: 10, dir: 1 }, shelves);
    expect(step(w, 1)).toMatchObject({ world: { robot: { x: 3, y: 3 } }, events: { blocked: 'shelf' } });
    expect(step(w, 2)).toMatchObject({ world: { robot: { x: 3, y: 4 } }, events: { blocked: null } });
    const corner = world({ x: 0, y: 0 }, { x: 10, dir: 1 });
    expect(step(corner, 3)).toMatchObject({ world: { robot: { x: 0, y: 0 } }, events: { blocked: 'edge' } });
  });

  it('bounces the crate at both belt ends', () => {
    expect(step(world({ x: 0, y: 0 }, { x: 15, dir: 1 }), 0)).toMatchObject({
      world: { crate: { x: 14, dir: -1 } },
      events: { bounce: 'end' },
    });
    expect(step(world({ x: 0, y: 0 }, { x: 0, dir: -1 }), 0)).toMatchObject({
      world: { crate: { x: 1, dir: 1 } },
      events: { bounce: 'end' },
    });
  });

  it('moves the crate first: it bounces off the robot, which is then blocked by it', () => {
    // crate at 5 heading right, robot at 6 on the belt pushing left: the crate turns back to 4, the robot steps to 5
    const met = step(world({ x: 6, y: BELT }, { x: 5, dir: 1 }), 3);
    expect(met).toMatchObject({
      world: { crate: { x: 4, dir: -1 }, robot: { x: 5, y: BELT } },
      events: { bounce: 'robot' },
    });
    // robot above the belt stepping down onto the cell the crate has just moved into: blocked
    const blocked = step(world({ x: 6, y: BELT - 1 }, { x: 5, dir: 1 }), 2);
    expect(blocked).toMatchObject({
      world: { crate: { x: 6 }, robot: { x: 6, y: BELT - 1 } },
      events: { blocked: 'crate' },
    });
    // pinned between the robot and the end, the crate turns and stays
    const pinned = step(world({ x: 14, y: BELT }, { x: 15, dir: -1 }), 0);
    expect(pinned.world.crate).toEqual({ x: 15, dir: 1 });
    expect(frame(pinned.world)[BELT * SIZE + 15]).toBe(CRATE);
    expect(frame(pinned.world)[BELT * SIZE + 13]).toBe(FLOOR);
  });
});
