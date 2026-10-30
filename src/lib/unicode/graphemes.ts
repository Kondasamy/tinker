// The lengths of one string: JavaScript's 16-bit code units, code points, graphemes (Intl.Segmenter, what people
// see) and UTF-8 bytes. Each is a different count, and each is real.
import { bytesOf } from './bytes';

const SEG = new Intl.Segmenter('en', { granularity: 'grapheme' });
/** What people see as characters, as Intl.Segmenter splits them. */
export const graphemesOf = (s: string) => [...SEG.segment(s)].map(g => g.segment);

export interface Lengths {
  units: number;
  codePoints: number;
  graphemes: number;
  bytes: number;
}
export const lengthsOf = (s: string): Lengths => ({
  units: s.length,
  codePoints: [...s].length,
  graphemes: graphemesOf(s).length,
  bytes: bytesOf(s).length,
});

/** e with n combining acute accents stacked on it: still one grapheme, however many bytes. */
export const stacked = (n: number) => `e${'́'.repeat(n)}`;
