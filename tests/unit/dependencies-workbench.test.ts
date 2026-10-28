// Dependencies chapter 7's workbench (KTD10, KTD11): WINNERS is pinned, and solving the bench from scratch must give
// the pin. WRITE_PINNED=1 rewrites data/dependencies/pinned.json's workbench. The bench reads any saved state back.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BEST,
  POLICIES,
  START,
  WINNERS,
  benchOf,
  policyKey,
  runPolicy,
  solve,
  wins,
} from '../../src/lib/dependencies/workbench';

describe('the workbench', () => {
  it('solving every policy gives the pinned WINNERS', () => {
    const s = solve();
    const file = 'data/dependencies/pinned.json';
    if (process.env.WRITE_PINNED) {
      const pinned = JSON.parse(readFileSync(file, 'utf8'));
      writeFileSync(file, `${JSON.stringify({ ...pinned, workbench: s }, null, 2)}\n`);
    } else {
      expect(s.best).toBe(BEST);
      expect(s.winners).toEqual(WINNERS.map(policyKey));
    }
    expect(POLICIES).toHaveLength(3 * 2 * 4 * 2);
    expect(WINNERS.length).toBeGreaterThan(0);
  });

  it('every winner keeps the rule; the start does not', () => {
    for (const w of WINNERS) {
      expect(runPolicy(w)).toMatchObject({ broken: 0, shipped: 0, scriptRuns: 0, late: BEST, meets: true });
      expect(wins(w)).toBe(true);
    }
    expect(wins(START)).toBe(false);
    expect(runPolicy(START).broken).toBeGreaterThan(0);
  });

  it('each control matters', () => {
    const w = WINNERS[0];
    // no lockfile: the bad patch breaks a build and the hijacked release ships
    expect(runPolicy({ ...w, lock: false })).toMatchObject({ meets: false });
    expect(runPolicy({ ...w, lock: false }).shipped).toBeGreaterThan(0);
    // scripts off stops the install script, never the payload
    const off = runPolicy({ ...w, lock: false, scripts: false });
    expect(off.scriptRuns).toBe(0);
    expect(off.shipped).toBeGreaterThan(0);
    // updating every day takes the hijacked release in; never updating leaves the security fix out all month
    expect(runPolicy({ ...w, cadence: 'daily' }).shipped).toBeGreaterThan(0);
    expect(runPolicy({ ...w, cadence: 'never' }).late).toBeGreaterThan(BEST);
    // exact pins keep the hijacked release out of nothing, and the security fix out of everything
    expect(runPolicy({ ...w, range: 'exact', lock: false }).shipped).toBeGreaterThan(0);
    expect(runPolicy({ ...w, range: 'exact' }).late).toBeGreaterThan(BEST);
  });

  it('a daily tested update rejects the bad patch on its morning', () => {
    const r = runPolicy({ ...WINNERS[0], cadence: 'daily' });
    expect(r.broken).toBe(0);
    expect(r.days.some(d => d.update === 'rejected')).toBe(true);
  });

  it('a saved state with unknown values falls back to the start', () => {
    expect(benchOf({ range: 'tilde', lock: 'x' as never, cadence: 'hourly' as never })).toEqual({
      ...START,
      range: 'tilde',
    });
  });
});
