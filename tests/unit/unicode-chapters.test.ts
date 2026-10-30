// Text and Unicode's chapters against the engine and the pins: every prediction's outcome is what the punch and reader
// really do, each step's goal is reachable, and chapter 7's Show me lands in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/unicode/pinned.json' with { type: 'json' };
import { START, WINNERS, keyOf, wins, worstBytes } from '../../src/lib/unicode/workbench';
import { lengthsOf } from '../../src/lib/unicode/graphemes';
import { ACCENT, CUSTOMER, FAMILY, FIRST, LOOKALIKES, MOJI, PLAIN, THUMBS } from '../../src/lib/unicode/story';
import * as ch1 from '../../src/content/unicode/01-letters-are-numbers';
import * as ch2 from '../../src/content/unicode/02-one-number-for-every-character';
import * as ch3 from '../../src/content/unicode/03-utf-8';
import * as ch4 from '../../src/content/unicode/04-the-wrong-table';
import * as ch5 from '../../src/content/unicode/05-one-emoji-many-numbers';
import * as ch6 from '../../src/content/unicode/06-same-look-different-bytes';
import * as ch7 from '../../src/content/unicode/07-workbench';

const step = <S>(steps: { id: string; predicate: (s: S) => boolean; solution?: (s: S) => S }[], id: string) =>
  steps.find(s => s.id === id)!;
const blank = { text: '', p1: 0, quiz: null };

describe('the chapters’ reveals match the engine', () => {
  it('chapter 1: one row per letter, and the plain name passes', () => {
    expect(ch1.outcomeOf()).toBe(0);
    expect(ch1.P1.options[0]).toContain(String(FIRST.length));
    expect(step(ch1.STEPS, 'type').predicate({ ...blank, text: FIRST.toLowerCase() })).toBe(true);
    expect(step(ch1.STEPS, 'plain').predicate({ ...blank, text: PLAIN })).toBe(true);
  });
  it('chapter 2: ë has one code point past 127; 中 and 🙂 pass, Ж alone does not', () => {
    expect(ch2.outcomeOf()).toBe(0);
    const far = step(ch2.STEPS, 'far');
    expect(far.predicate({ ...blank, text: '中' })).toBe(true);
    expect(far.predicate({ ...blank, text: 'Ж' })).toBe(false);
  });
  it('chapter 3: Zoë is the pinned 4 bytes, typed composed or decomposed', () => {
    expect(ch3.P1.options[ch3.outcomeOf()]).toMatch(new RegExp(`^${pinned.zoe.bytes.length}:`));
    const type = step(ch3.STEPS, 'type');
    expect(type.predicate({ ...blank, text: CUSTOMER })).toBe(true);
    expect(type.predicate({ ...blank, text: CUSTOMER.normalize('NFD') })).toBe(true);
    expect(step(ch3.STEPS, 'wide').predicate({ ...blank, text: `${CUSTOMER}中🙂` })).toBe(true);
    expect(step(ch3.STEPS, 'wide').predicate({ ...blank, text: `${CUSTOMER}中` })).toBe(false);
  });
  it('chapter 4: Latin-1 prints the pinned mojibake; the own-word step needs Latin-1 and an accent', () => {
    expect(MOJI).toBe(pinned.zoe.latin1);
    expect(ch4.P1.options[ch4.outcomeOf()]).toContain(MOJI);
    const own = step(ch4.STEPS, 'own');
    const s = { ...blank, table: 'windows-1252' as const };
    expect(own.predicate({ ...s, text: 'café' })).toBe(true);
    expect(own.predicate({ ...s, text: 'cafe' })).toBe(false);
    expect(own.predicate({ ...s, text: 'café', table: 'utf-8' })).toBe(false);
  });
  it('chapter 5: .length is the pinned code units, an option the reader can pick', () => {
    expect(ch5.P1.options[ch5.outcomeOf()]).toBe(String(pinned.family.units));
    expect(new Set(ch5.P1.options).size).toBe(3);
    expect(step(ch5.STEPS, 'punch').predicate({ ...blank, text: FAMILY })).toBe(true);
    expect(step(ch5.STEPS, 'thumbs').predicate({ ...blank, text: THUMBS })).toBe(true);
  });
  it('chapter 6: the two é differ; normalising passes; the lookalike passes', () => {
    expect(ch6.outcomeOf()).toBe(0);
    expect(step(ch6.STEPS, 'nfc').predicate({ ...blank, text: ACCENT.decomposed.normalize('NFC') })).toBe(true);
    expect(step(ch6.STEPS, 'nfc').predicate({ ...blank, text: ACCENT.decomposed })).toBe(false);
    expect(step(ch6.STEPS, 'lookalike').predicate({ ...blank, text: LOOKALIKES[0].fake })).toBe(true);
    expect(step(ch6.STEPS, 'lookalike').predicate({ ...blank, text: LOOKALIKES[0].real })).toBe(false);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = step(ch7.STEPS, 'bench');
  const start = { ...START, quiz: null };
  it('Show me lands on a setting in WINNERS, and the step passes', () => {
    const shown = bench.solution!(start);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS.map(keyOf)).toContain(keyOf(shown));
  });
  it('the start, and a byte limit without normalising, are not accepted', () => {
    expect(bench.predicate(start)).toBe(false);
    expect(wins({ ...WINNERS[0], nfc: false })).toBe(false);
  });
  it('the stage shows the first name the form turns away', () => {
    // Siobhán's 18 graphemes are the first over the start's limit of 16
    expect(ch7.shownName(START)).toBe('Siobhán Ní Bhriain');
  });
});

describe('numbers the quizzes and recall state in words', () => {
  it('a flag is 2 code points and 4 code units, so 20 flags count as 80', () => {
    const flag = lengthsOf('🇬🇧');
    expect([flag.codePoints, flag.units, flag.graphemes]).toEqual([2, 4, 1]);
    expect(lengthsOf('🇬🇧'.repeat(20)).units).toBe(80);
  });
  it('one 16-bit code unit is at most 3 bytes of UTF-8; 25 code points at most 100', () => {
    expect(lengthsOf('\uffff').bytes).toBe(3);
    expect(worstBytes('codePoints', 25)).toBe(100);
  });
});
