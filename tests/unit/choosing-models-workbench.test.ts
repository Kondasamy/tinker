// Choosing a model's workbench (KTD7): each team has exactly one machine that meets every need; solving every poise
// setting again must give the pinned WINNERS (WRITE_PINNED=1 rewrites the pin); the start doesn't win, Show me does.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/choosing-models/pinned.json' with { type: 'json' };
import {
  ALL_WEIGHTS,
  SOLVED,
  START,
  TEAMS,
  WINNERS,
  benchOf,
  fitOf,
  fitsOf,
  solve,
  teamWins,
  tipsTo,
  wins,
} from '../../src/lib/choosing-models/workbench';

const PINNED = 'data/choosing-models/pinned.json';

describe('the teams’ workbench', () => {
  it('each team has exactly one machine that meets every need, and the three differ', () => {
    for (const t of TEAMS) expect(fitsOf(t), t.id).toHaveLength(1);
    expect(new Set(TEAMS.map(fitOf)).size).toBe(TEAMS.length);
  });

  it('solving every poise setting again gives the pinned WINNERS', () => {
    const winners = solve(),
      fits = Object.fromEntries(TEAMS.map(t => [t.id, fitOf(t)]));
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...file, workbench: { fits, winners } }, null, 2)}\n`);
      return;
    }
    expect(pinned.workbench.fits).toEqual(fits);
    expect(winners).toEqual(WINNERS);
    expect(ALL_WEIGHTS).toHaveLength(125);
    for (const t of TEAMS) {
      expect(WINNERS[t.id].length, t.id).toBeGreaterThan(0);
      for (const w of ALL_WEIGHTS) if (!teamWins(t, w)) expect(tipsTo(t, w)).not.toBe(fitOf(t));
    }
  });

  it('the start (quality only, the leaderboard habit) doesn’t win; Show me does', () => {
    expect(wins(START)).toBe(false);
    expect(TEAMS.filter(t => teamWins(t, START[t.id])).length).toBeLessThan(TEAMS.length);
    expect(wins(SOLVED)).toBe(true);
  });

  it('a saved bench with unknown values falls back to the start', () => {
    expect(benchOf({ support: { quality: 9 as never } })).toEqual(START);
    expect(benchOf(undefined)).toEqual(START);
  });
});
