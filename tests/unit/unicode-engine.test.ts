// Text and Unicode's engine against its pins (KTD7): bytes, the wrong table, lengths and normalisation, all run with
// the platform's own TextEncoder, TextDecoder, Intl.Segmenter and normalize().
import { describe, expect, it } from 'vitest';
import pinned from '../../data/unicode/pinned.json' with { type: 'json' };
import { bytesOf, glyphsOf, rowsOf, utf8Width, uplus, shown } from '../../src/lib/unicode/bytes';
import { readAs, garbled } from '../../src/lib/unicode/mojibake';
import { lengthsOf, stacked } from '../../src/lib/unicode/graphemes';
import { nfc, same } from '../../src/lib/unicode/normalise';
import { ACCENT, CUSTOMER, FAMILY, LOOKALIKES, MOJI, THUMBS, WIDTHS } from '../../src/lib/unicode/story';

describe('bytes', () => {
  it('Zoë encodes to the pinned 4 bytes and reads as windows-1252 to ZoÃ«', () => {
    expect([...bytesOf(CUSTOMER)]).toEqual(pinned.zoe.bytes);
    expect(readAs(bytesOf(CUSTOMER), 'windows-1252')).toBe(pinned.zoe.latin1);
    expect(readAs(bytesOf(CUSTOMER), 'utf-8')).toBe(CUSTOMER);
    expect(MOJI).toBe(pinned.zoe.latin1);
    expect(readAs(bytesOf('café'), 'windows-1252')).toBe(pinned.cafe);
  });
  it('1-, 2-, 3- and 4-byte characters match UTF-8’s ranges', () => {
    expect(Object.fromEntries(WIDTHS.map(c => [c, bytesOf(c).length]))).toEqual(pinned.widths);
    for (const [cp, n] of [
      [0x41, 1],
      [0x7f, 1],
      [0x80, 2],
      [0x7ff, 2],
      [0x800, 3],
      [0xffff, 3],
      [0x10000, 4],
      [0x10ffff, 4],
    ]) {
      expect(utf8Width(cp), uplus(cp)).toBe(n);
      expect(bytesOf(String.fromCodePoint(cp)).length, uplus(cp)).toBe(n);
    }
  });
  it('glyphs carry their code point and bytes; rows mark each character’s first byte', () => {
    expect(glyphsOf(CUSTOMER).map(g => g.cp)).toEqual([0x5a, 0x6f, 0xeb]);
    const rows = rowsOf(CUSTOMER);
    expect(rows.map(r => r.glyph)).toEqual([0, 1, 2, 2]);
    expect(rows.map(r => r.lead)).toEqual([true, true, true, false]);
    expect(uplus(0xeb)).toBe('U+00EB');
    expect(uplus(0x1f642)).toBe('U+1F642');
  });
  it('shows invisible and combining code points by name, never bare', () => {
    expect(shown('‍')).toBe('ZWJ');
    expect(shown('́')).toBe('◌́');
    expect(shown(' ')).toBe('␣');
    expect(shown('\n')).toBe('U+000A');
    expect(shown('ë')).toBe('ë');
  });
});

describe('the wrong table', () => {
  it('flags the Ã signature only when the table differs from the writer’s', () => {
    expect(garbled(readAs(bytesOf(CUSTOMER), 'windows-1252'))).toBe(true);
    expect(garbled(CUSTOMER)).toBe(false);
    // plain ASCII reads the same in both tables
    expect(readAs(bytesOf('Larkspur'), 'windows-1252')).toBe('Larkspur');
  });
});

describe('lengths', () => {
  it('a family emoji has pinned, all different lengths in code units, code points, graphemes and bytes', () => {
    const l = lengthsOf(FAMILY);
    expect(l).toEqual(pinned.family);
    expect(new Set([l.units, l.codePoints, l.graphemes, l.bytes]).size).toBe(4);
    expect(lengthsOf(THUMBS)).toEqual(pinned.thumbs);
  });
  it('one grapheme can hold any number of combining marks', () => {
    const s = stacked(pinned.stack.marks);
    expect(lengthsOf(s).graphemes).toBe(pinned.stack.graphemes);
    expect(lengthsOf(s).bytes).toBe(pinned.stack.bytes);
  });
});

describe('normalisation', () => {
  it('NFC and NFD é compare unequal before normalize() and equal after', () => {
    expect([...bytesOf(ACCENT.composed)]).toEqual(pinned.accent.composed);
    expect([...bytesOf(ACCENT.decomposed)]).toEqual(pinned.accent.decomposed);
    expect(ACCENT.composed === ACCENT.decomposed).toBe(false);
    expect(same(ACCENT.composed, ACCENT.decomposed, false)).toBe(false);
    expect(same(ACCENT.composed, ACCENT.decomposed, true)).toBe(true);
    expect(nfc(ACCENT.decomposed)).toBe(ACCENT.composed);
  });
  it('lookalike addresses differ in bytes, and NFC doesn’t make them equal', () => {
    for (const p of LOOKALIKES) {
      expect(p.fake).not.toBe(p.real);
      expect(p.fake.length).toBe(p.real.length);
      expect(same(p.real, p.fake, true)).toBe(false);
      expect(bytesOf(p.fake).length).toBeGreaterThan(bytesOf(p.real).length);
    }
  });
});
