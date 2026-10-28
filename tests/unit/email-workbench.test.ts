// How email arrives, chapter 7's workbench (U8): solving every setting again must give the pinned WINNERS (KTD10;
// WRITE_PINNED=1 rewrites the pin), and each half of the rule bites.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENCHES,
  FAKES,
  REAL,
  START,
  WINNERS,
  benchOf,
  fatesOf,
  meets,
  scoreOf,
  solve,
  wins,
} from '../../src/lib/email/workbench';

const PINNED = 'data/email/pinned.json';

describe('the mail records workbench', () => {
  it('solving every setting again gives the pinned WINNERS', () => {
    const winners = solve();
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...file, workbench: winners }, null, 2)}\n`);
      return;
    }
    expect(winners).toEqual(WINNERS);
    expect(BENCHES).toHaveLength(30);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(wins(w) && meets(w)).toBe(true);
  });

  it('every winner rejects, signs, and lists Sendwell', () => {
    for (const w of WINNERS) {
      expect(w.dmarc).toBe('reject');
      expect(w.dkim).toBe(true);
      expect(w.spf).toMatch(/^vendor/);
    }
  });

  it('each piece missing costs something the rule names', () => {
    const w = WINNERS[0];
    expect(scoreOf({ ...w, dkim: false }).realIn).toBe(REAL - 4); // the forward: only its seal survives
    expect(fatesOf({ ...w, spf: 'own' }).newsletter).toBe('bounced'); // Sendwell isn't on the list
    expect(scoreOf({ ...w, spf: 'open' }).fakesSeen).toBeGreaterThan(0); // +all lets the spoof pass
    expect(scoreOf({ ...w, dmarc: 'quarantine' }).fakesSeen).toBe(FAKES); // junk is still in front of them
    expect(scoreOf({ ...w, dmarc: 'none' }).fakesSeen).toBe(FAKES);
  });

  it('the start is no winner, and a saved run with junk falls back to it', () => {
    expect(wins(START)).toBe(false);
    expect(benchOf({ spf: 'x', dmarc: 'drop' as never, dkim: 1 as never })).toEqual(START);
  });
});
