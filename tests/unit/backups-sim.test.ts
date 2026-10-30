// Backups' tick simulator (U5): the plan's scenarios (lost work is the gap since the newest surviving copy; a chain with
// a missing link restores only up to the break; fire takes on-site copies, ransomware every reachable one, and only the
// offline lockbox survives both; a bad copy is caught only by a test restore and downtime equals restore time), and
// each effect the chapters teach pinned in data/backups/pinned.json (KTD7; WRITE_PINNED=1 rewrites the scenes).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALL_ORDERS,
  ASSUMPTIONS,
  SCENES,
  STRIKES,
  TICKS,
  WRITES,
  chainOf,
  clock,
  copiesAt,
  ordersIn,
  policyOf,
  restore,
  restoreHours,
  simulate,
} from '../../src/lib/backups/sim';
import pinned from '../../data/backups/pinned.json' with { type: 'json' };

describe('the week', () => {
  it('runs Monday 00:00 to Sunday 23:00 an hour at a time over the hand-made log', () => {
    expect(TICKS).toBe(168);
    expect(clock(0)).toBe('Mon 00:00');
    expect(clock(89)).toBe('Thu 17:00');
    expect(ALL_ORDERS).toBe(WRITES.reduce((a, b) => a + b, 0));
    expect(WRITES.every(n => Number.isInteger(n) && n >= 0)).toBe(true);
  });
  it('copies start at 01:00 and repeat on the schedule; nightly is one a day', () => {
    const w = simulate(policyOf({ every: 24 }));
    expect(w.copies.map(c => c.t)).toEqual([1, 25, 49, 73, 97, 121, 145]);
    expect(
      simulate(policyOf({ every: 6 }))
        .copies.filter(c => c.t < 24)
        .map(c => c.t),
    ).toEqual([1, 7, 13, 19]);
    expect(simulate(policyOf()).copies).toEqual([]);
  });
});

describe('the plan’s scenarios', () => {
  it('lost work equals the orders since the newest surviving copy, for every disaster', () => {
    for (const p of Object.values(SCENES))
      for (const s of Object.values(STRIKES)) {
        const w = simulate(p),
          r = restore(w, s);
        if (r.point === null) expect(r.lost).toBe(ordersIn(0, s.hour));
        else {
          expect(r.lost).toBe(ordersIn(r.point, s.hour));
          // nothing newer that survived and reads was skipped
          const newer = w.copies.filter(c => c.t > r.point! && c.t <= s.hour && !r.hit.includes(c.place));
          for (const c of newer) expect(chainOf(w, c)).toBeNull();
        }
      }
  });
  it('an incremental chain with one missing link restores only up to the break', () => {
    const whole = restore(simulate(SCENES.chain), STRIKES.tue),
      broken = restore(simulate(SCENES.broken), STRIKES.tue);
    expect(whole.point).toBe(43);
    expect(whole.links).toBe(4);
    expect(broken.point).toBe(SCENES.broken.broken! - 6);
    expect(broken.lost).toBeGreaterThan(whole.lost);
  });
  it('fire takes the on-site copies; ransomware every reachable one; only the locked lockbox survives both', () => {
    const all = policyOf({ every: 6, warehouse: true, lockbox: true }),
      w = simulate(all);
    const fire = restore(w, STRIKES.fire),
      ransom = restore(w, STRIKES.ransom);
    expect(fire.hit).toEqual(['cabinet']);
    expect(fire.from).toBe('warehouse');
    expect(ransom.hit).toEqual(['cabinet', 'warehouse']);
    expect(ransom.from).toBe('lockbox');
    expect(restore(simulate(SCENES.six), STRIKES.fire).from).toBeNull();
    expect(restore(simulate(SCENES.offsite), STRIKES.ransom).from).toBeNull();
  });
  it('a bad copy job is caught only by a test restore; downtime equals restore time', () => {
    const silent = simulate(SCENES.silent),
      tested = simulate(SCENES.tested);
    expect(silent.caught).toBeNull();
    expect(tested.caught).toBe(ASSUMPTIONS.testHour);
    const a = restore(silent, STRIKES.fri),
      b = restore(tested, STRIKES.fri);
    expect(a.point!).toBeLessThan(SCENES.silent.corruptFrom!);
    expect(b.point!).toBeGreaterThan(a.point!);
    for (const r of [a, b]) expect(r.down).toBe(restoreHours(r.from!, r.links));
    // after the catch every new tape reads
    expect(copiesAt(tested, TICKS - 1).filter(c => c.t > tested.caught! && c.bad)).toEqual([]);
  });
  it('the lockbox restore is slower than the server room’s, by the courier’s fetch', () => {
    expect(restoreHours('lockbox', 1) - restoreHours('cabinet', 1)).toBe(ASSUMPTIONS.fetchHours.lockbox);
  });
});

describe('the chapters’ effects, pinned', () => {
  const now = Object.fromEntries(
    (
      [
        ['none-wed', 'none', 'wed'],
        ['nightly-wed', 'nightly', 'wed'],
        ['nightly-thu', 'nightly', 'thu'],
        ['six-thu', 'six', 'thu'],
        ['hourly-thu', 'hourly', 'thu'],
        ['chain-tue', 'chain', 'tue'],
        ['broken-tue', 'broken', 'tue'],
        ['six-fire', 'six', 'fire'],
        ['offsite-fire', 'offsite', 'fire'],
        ['offsite-ransom', 'offsite', 'ransom'],
        ['lockbox-ransom', 'lockbox', 'ransom'],
        ['silent-fri', 'silent', 'fri'],
        ['tested-fri', 'tested', 'fri'],
      ] as const
    ).map(([k, p, s]) => {
      const r = restore(simulate(SCENES[p]), STRIKES[s]);
      return [k, { from: r.from, point: r.point, links: r.links, lost: r.lost, down: r.down }];
    }),
  );
  it('match data/backups/pinned.json', () => {
    const file = 'data/backups/pinned.json';
    if (process.env.WRITE_PINNED)
      writeFileSync(file, `${JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), scenes: now }, null, 2)}\n`);
    else expect(now).toEqual(pinned.scenes);
  });
});
