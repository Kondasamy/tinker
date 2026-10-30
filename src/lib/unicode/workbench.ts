// Chapter 7's name field: what the form counts (bytes, code points or graphemes), its limit, and whether it normalises
// to NFC first, against Larkspur's customers and a name column of fixed bytes (data/unicode/workbench.json, planning
// numbers). A setting works when every name is accepted, every typed name matches its record, and nothing the form
// accepts can overflow the column. WINNERS is pinned in data/unicode/pinned.json and solved again by
// tests/unit/unicode-workbench.test.ts.
import bench from '../../../data/unicode/workbench.json' with { type: 'json' };
import pinned from '../../../data/unicode/pinned.json' with { type: 'json' };
import { lengthsOf, type Lengths } from './graphemes';
import { nfc } from './normalise';
import { NAMES } from './story';

export type Count = 'bytes' | 'codePoints' | 'graphemes';
export const COUNTS: { id: Count; name: string }[] = [
  { id: 'bytes', name: 'Bytes' },
  { id: 'codePoints', name: 'Code points' },
  { id: 'graphemes', name: 'Graphemes (what people see)' },
];
export const COLUMN = bench.column;
export const LIMITS = bench.limits;
export interface Setting {
  count: Count;
  limit: number;
  nfc: boolean;
}
export const START = bench.start as Setting;
export const SETTINGS: Setting[] = COUNTS.flatMap(c =>
  LIMITS.flatMap(limit => [false, true].map(n => ({ count: c.id, limit, nfc: n }))),
);

/** The most UTF-8 bytes anything the form accepts can take: a code point is at most 4 bytes, and one grapheme can
 * carry any number of combining marks. */
export const worstBytes = (count: Count, limit: number) =>
  count === 'bytes' ? limit : count === 'codePoints' ? 4 * limit : Number.POSITIVE_INFINITY;

export interface NameRow {
  record: string;
  typed: string;
  /** the name as the form keeps it (normalised when the setting says so) */
  kept: string;
  lengths: Lengths;
  accepted: boolean;
  matches: boolean;
}
export interface Result {
  rows: NameRow[];
  accepted: number;
  matched: number;
  worst: number;
  fits: boolean;
}
export function resultOf(s: Setting): Result {
  const rows = NAMES.map(n => {
    const kept = s.nfc ? nfc(n.typed) : n.typed,
      lengths = lengthsOf(kept);
    return { ...n, kept, lengths, accepted: lengths[s.count] <= s.limit, matches: kept === n.record };
  });
  const accepted = rows.filter(r => r.accepted).length,
    matched = rows.filter(r => r.matches).length,
    worst = worstBytes(s.count, s.limit);
  return {
    rows,
    accepted,
    matched,
    worst,
    fits: accepted === rows.length && matched === rows.length && worst <= COLUMN,
  };
}
/** Every setting that works, over the whole domain (the test checks the pin). */
export const solve = () => SETTINGS.filter(s => resultOf(s).fits);

export const keyOf = (s: Setting) => `${s.count}|${s.limit}|${s.nfc ? 'nfc' : 'raw'}`;
export const WINNERS: Setting[] = pinned.winners.map(k => {
  const [count, limit, n] = k.split('|');
  return { count: count as Count, limit: Number(limit), nfc: n === 'nfc' };
});
const WIN = new Set(pinned.winners);
export const wins = (s: Setting) => WIN.has(keyOf(s));

/** The setting in a saved run's state; anything unknown falls back to START's. */
export const settingOf = (s: Partial<Setting>): Setting => ({
  count: COUNTS.some(c => c.id === s.count) ? s.count! : START.count,
  limit: LIMITS.includes(s.limit as number) ? s.limit! : START.limit,
  nfc: typeof s.nfc === 'boolean' ? s.nfc : START.nfc,
});
