// Chapter 7's name field: WINNERS is pinned in data/unicode/pinned.json and solved again here over every setting.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/unicode/pinned.json' with { type: 'json' };
import {
  COLUMN,
  SETTINGS,
  START,
  WINNERS,
  keyOf,
  resultOf,
  settingOf,
  solve,
  wins,
  worstBytes,
} from '../../src/lib/unicode/workbench';

describe('the name-field workbench', () => {
  it('WINNERS recomputes to its pin', () => {
    expect(solve().map(keyOf)).toEqual(pinned.winners);
    expect(WINNERS.map(keyOf)).toEqual(pinned.winners);
  });
  it('the start fails, and every winner accepts, matches and fits', () => {
    expect(wins(START)).toBe(false);
    for (const w of WINNERS) {
      const r = resultOf(w);
      expect(r.accepted).toBe(r.rows.length);
      expect(r.matched).toBe(r.rows.length);
      expect(r.worst).toBeLessThanOrEqual(COLUMN);
    }
  });
  it('a grapheme limit can never protect the column; a code point limit costs up to 4 bytes each', () => {
    expect(worstBytes('graphemes', 1)).toBe(Number.POSITIVE_INFINITY);
    expect(worstBytes('codePoints', 12)).toBe(48);
    expect(worstBytes('bytes', 40)).toBe(40);
  });
  it('without normalising, the decomposed names never match their records', () => {
    const r = resultOf({ count: 'bytes', limit: 48, nfc: false });
    expect(r.accepted).toBe(r.rows.length);
    expect(r.matched).toBeLessThan(r.rows.length);
  });
  it('a saved state with unknown values falls back to the start', () => {
    expect(settingOf({ count: 'letters' as never, limit: 7, nfc: 'yes' as never })).toEqual(START);
    expect(SETTINGS.length).toBe(3 * 7 * 2);
  });
});
