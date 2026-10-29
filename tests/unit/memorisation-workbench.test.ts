// What a model remembers' workbench (KTD10): 4 runs × filter on or off, read from runs.json. WINNERS is recomputed
// here; a filter-only policy still leaks, and every winner scrubs.
import { describe, expect, it } from 'vitest';
import { POLICIES, START, WINNERS, beatenBy, runIdOf, scoreOf, solved } from '../../src/lib/memorisation/workbench';
import { RUN_IDS } from '../../src/lib/memorisation/story';

describe('the workbench', () => {
  it('has 8 policies over the 4 runs', () => {
    expect(POLICIES).toHaveLength(8);
    expect(new Set(POLICIES.map(runIdOf))).toEqual(new Set(RUN_IDS));
  });
  it('its pinned WINNERS are exactly the policies no other beats', () => {
    expect(POLICIES.filter(solved)).toEqual(WINNERS);
    for (const p of POLICIES.filter(p => !solved(p))) expect(beatenBy(p)).toBeDefined();
  });
  it('only scrubbing wins: the start leaks, a filter alone still leaks, dedup alone is beaten', () => {
    expect(WINNERS.every(w => w.scrub)).toBe(true);
    expect(scoreOf(START).leaked).toEqual([64, 16]);
    const filterOnly = { ...START, filter: true };
    expect(scoreOf(filterOnly).leaked).toEqual([64, 16]);
    expect(scoreOf(filterOnly).how).toMatch(/one digit at a time/);
    expect(scoreOf({ ...START, dedup: true }).leaked).toEqual([]);
    expect(solved({ ...START, dedup: true })).toBe(false);
  });
});
