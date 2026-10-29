// Releases' simulator (U16): seeded replays with the reader's dial and lever inserted, the pipeline's gates, chapter 3's
// false alarm and miss, flag-off against rollback, the migration that refuses to roll back until it is expanded, the
// staged rollout that halts at the first stage over the threshold, and every scene's counts pinned in
// data/releases/pinned.json (KTD10; WRITE_PINNED=1 rewrites the scenes).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BASE,
  CHANGES,
  FLAG_OFF,
  PER_MINUTE,
  ROLLBACK,
  SCENES,
  TICKS,
  clock,
  milestoneAt,
  nextEventAfter,
  policyOf,
  simulate,
  type Run,
} from '../../src/lib/releases/sim';
import { GATES, pipelineOf } from '../../src/lib/releases/pipeline';

const summary = (r: Run) => ({
  hurt: r.hurt,
  fullAt: r.fullAt,
  alarmAt: r.alarmAt,
  backAt: r.backAt,
  safeAt: r.safeAt,
  refusedAt: r.refusedAt,
});
const PINNED = 'data/releases/pinned.json';
/** the runs the chapters teach from, by name */
const NAMED: Record<string, Run> = {
  all: simulate(SCENES.all),
  allBack: simulate({ ...SCENES.all, events: [{ t: 4, kind: 'back' }] }),
  falseAlarm: simulate(SCENES.canary('button', 2)),
  longBake: simulate(SCENES.canary('button', 10)),
  miss: simulate(SCENES.canary('tax', 10)),
  caught: simulate(SCENES.canary('new-checkout', 10)),
  flag: simulate({
    ...SCENES.flag,
    events: [
      { t: 2, kind: 'dial', share: 0.1 },
      { t: 5, kind: 'back' },
    ],
  }),
  refused: simulate({ ...SCENES.migration, events: [{ t: 4, kind: 'back' }] }),
  expanded: simulate({ ...SCENES.migration, expand: true, events: [{ t: 4, kind: 'back' }] }),
  staged: simulate(SCENES.staged),
};

describe('the morning', () => {
  it('reads every change and the clock from data', () => {
    expect(new Set(CHANGES.map(c => c.id)).size).toBe(CHANGES.length);
    expect(clock(0)).toBe('10:00');
    expect(clock(TICKS - 1)).toBe('10:39');
    const r = NAMED.all;
    expect(r.ticks).toHaveLength(TICKS);
    for (const k of r.ticks) expect(k.newN + k.oldN).toBe(PER_MINUTE);
  });

  it('a seeded run is identical on replay, dial and lever events included', () => {
    const p = policyOf({
      ...SCENES.flag,
      events: [
        { t: 1, kind: 'dial', share: 0.25 },
        { t: 3, kind: 'dial', share: 0.5 },
        { t: 6, kind: 'back' },
      ],
    });
    expect(simulate(p)).toEqual(simulate(p));
    expect(simulate({ ...p, seed: p.seed + 1 }).ticks.map(k => k.newErr)).not.toEqual(
      simulate(p).ticks.map(k => k.newErr),
    );
  });

  it('a bigger share only adds checkouts to the new track; a good change hurts no one', () => {
    const at = (share: number) =>
      simulate(policyOf({ change: 'button', stages: [], events: [{ t: 0, kind: 'dial', share }] }));
    const small = at(0.1),
      big = at(0.5);
    for (let t = 0; t < TICKS; t++) expect(big.ticks[t].newN).toBeGreaterThanOrEqual(small.ticks[t].newN);
    expect(big.hurt).toBe(0);
    expect(big.ticks.reduce((a, k) => a + k.newErr, 0)).toBeGreaterThan(0); // the base rate still fails some
  });
});

describe('the pipeline', () => {
  it('stops the tested bug at its gate and passes the untested one', () => {
    const coupon = pipelineOf('coupon'),
      address = pipelineOf('address');
    expect(coupon.ships).toBe(false);
    expect(coupon.stoppedAt).toBe('checkout');
    expect(coupon.gates.at(-1)).toMatchObject({ id: 'checkout', pass: false });
    expect(address.ships).toBe(true);
    expect(address.gates).toHaveLength(GATES.length);
    expect(address.gates.every(g => g.pass)).toBe(true);
  });
});

describe('the plan’s scenarios', () => {
  it('straight to everyone: every checkout meets the change, and the hurt piles up', () => {
    const r = NAMED.all;
    expect(r.fullAt).toBe(SCENES.all.start);
    expect(r.ticks[SCENES.all.start].newN).toBe(PER_MINUTE);
    expect(r.hurt).toBeGreaterThan(200);
  });

  it('rollback takes the pinned minutes; the new track runs until then', () => {
    const r = NAMED.allBack;
    expect(r.backAt).toBe(4);
    expect(r.safeAt).toBe(4 + ROLLBACK);
    for (let t = 4; t < 4 + ROLLBACK; t++) expect(r.ticks[t]).toMatchObject({ share: 1, backing: true });
    expect(r.ticks[4 + ROLLBACK]).toMatchObject({ share: 0, newN: 0, hurt: 0 });
  });

  it('flag-off cuts errors within one minute', () => {
    const r = NAMED.flag;
    expect(r.safeAt).toBe(5 + FLAG_OFF);
    expect(FLAG_OFF).toBe(1);
    expect(r.ticks[6]).toMatchObject({ share: 0, newN: 0, newErr: 0 });
    expect(r.ticks.slice(0, 2).every(k => k.newN === 0)).toBe(true); // deployed dark: nobody sees it before the dial
  });

  it('the migration refuses the lever until the expand step exists', () => {
    expect(NAMED.refused.refusedAt).toBe(4);
    expect(NAMED.refused.safeAt).toBeNull();
    expect(NAMED.refused.ticks.at(-1)!.share).toBe(0.25);
    expect(NAMED.expanded.refusedAt).toBeNull();
    expect(NAMED.expanded.safeAt).toBe(4 + ROLLBACK);
  });

  it('chapter 3: a good change rings a false alarm on a short bake; a longer bake passes it; a small bug is missed', () => {
    expect(NAMED.falseAlarm.change.rate).toBe(BASE);
    expect(NAMED.falseAlarm.alarmAt).not.toBeNull();
    expect(NAMED.falseAlarm.hurt).toBe(0);
    expect(NAMED.longBake.alarmAt).toBeNull();
    expect(NAMED.longBake.fullAt).not.toBeNull();
    expect(NAMED.miss.change.rate).toBeGreaterThan(BASE);
    expect(NAMED.miss.alarmAt).toBeNull();
    expect(NAMED.miss.fullAt).not.toBeNull();
    expect(NAMED.miss.hurt).toBeGreaterThan(0);
    expect(NAMED.caught.alarmAt).not.toBeNull();
  });

  it('a staged rollout halts at the first stage over the threshold', () => {
    const r = NAMED.staged,
      p = SCENES.staged;
    const checks = r.milestones.filter(m => m.kind === 'pass' || m.kind === 'alarm');
    expect(checks.at(-1)!.kind).toBe('alarm');
    for (const m of checks) {
      const [ce, cn] = m.canary!,
        [re, rn] = m.rest!;
      expect(ce / cn - re / rn > p.threshold).toBe(m.kind === 'alarm');
    }
    const stages = r.milestones.filter(m => m.kind === 'stage').map(m => m.share);
    expect(stages).toEqual(p.stages.slice(0, stages.length));
    expect(stages.length).toBeLessThan(p.stages.length);
    expect(r.fullAt).toBeNull();
    expect(r.safeAt).toBe(r.alarmAt! + ROLLBACK);
    expect(r.hurt).toBeLessThan(NAMED.all.hurt / 10);
  });

  it('milestones read out, and the next event follows the current minute', () => {
    const r = NAMED.staged;
    expect(milestoneAt(r, 0)).toBeUndefined();
    expect(milestoneAt(r, r.alarmAt!)!.kind).toBe('back');
    expect(nextEventAfter(r, 0)).toBe(p0(r));
    expect(nextEventAfter(r, TICKS)).toBe(TICKS - 1);
  });
});
const p0 = (r: Run) => r.milestones[0].t;

describe('pinned scenes', () => {
  it('every chapter’s run matches data/releases/pinned.json', () => {
    const got = Object.fromEntries(Object.entries(NAMED).map(([k, r]) => [k, summary(r)]));
    const file = JSON.parse(readFileSync(PINNED, 'utf8'));
    if (process.env.WRITE_PINNED) writeFileSync(PINNED, `${JSON.stringify({ ...file, scenes: got }, null, 2)}\n`);
    else expect(got).toEqual(file.scenes);
  });
});
