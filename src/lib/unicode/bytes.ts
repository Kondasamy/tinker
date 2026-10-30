// Text as numbers, for real: each character's code point (codePointAt) and its UTF-8 bytes (TextEncoder). The tape
// punches one row per byte; rows remember which character they belong to and whether they start it.

const ENC = new TextEncoder();
/** A string's UTF-8 bytes, as the browser writes them. */
export const bytesOf = (s: string) => ENC.encode(s);

export interface Glyph {
  /** the code point as a one-character string */
  ch: string;
  cp: number;
  bytes: number[];
}
/** One entry per code point (for…of walks code points, not 16-bit units). */
export const glyphsOf = (s: string): Glyph[] =>
  [...s].map(ch => ({ ch, cp: ch.codePointAt(0)!, bytes: [...bytesOf(ch)] }));

export interface Row {
  byte: number;
  /** which code point (index into glyphsOf) this byte belongs to */
  glyph: number;
  /** the code point's first byte (a lead byte, or a lone ASCII byte) */
  lead: boolean;
}
/** The tape's rows: one per byte, in order. */
export const rowsOf = (s: string): Row[] =>
  glyphsOf(s).flatMap((g, i) => g.bytes.map((byte, k) => ({ byte, glyph: i, lead: k === 0 })));

/** UTF-8's ranges (RFC 3629): how many bytes a code point takes. */
export const utf8Width = (cp: number) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);

/** A code point as Unicode writes it: U+ and at least four hex digits. */
export const uplus = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
/** A byte's eight bits, top bit first. */
export const bitsOf = (b: number) => b.toString(2).padStart(8, '0');

/** A code point as a table cell can show it: combining marks on a dotted circle, invisible ones by name. */
export function shown(ch: string): string {
  const cp = ch.codePointAt(0)!;
  if (cp === 0x200d) return 'ZWJ';
  if (cp === 0x20) return '␣';
  if (/\p{M}/u.test(ch)) return `◌${ch}`;
  if (/[\p{C}\p{Z}]/u.test(ch)) return uplus(cp);
  return ch;
}
