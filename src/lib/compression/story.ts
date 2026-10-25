// What the Compression chapters say, read off the data (R18): the company and product names from the price list, the
// strip chapter 2 points over, and each file's numbers.
import { byteName, fileOf, textFile } from './files';
import { countOf } from './huffman';

const PRICE = textFile('price');
/** The company, as the price list names itself. */
export const COMPANY = PRICE.match(/^(.+? Co\.)/)![1];
/** The products in the price list's table, first column. */
export const PRODUCTS = [...PRICE.matchAll(/^\| ([^|]+?) \| [A-Z]/gm)].map(m => m[1]).filter(p => p !== 'Product');
/** Chapter 2's strip: the scanner names, one per line, as the price list lists them. */
export const SCANNERS = PRODUCTS.filter(p => /scanner/.test(p)).join('\n');

/** A file's most common byte, and how many times more often than the average byte value it uses. */
export function topOf(bytes: Uint8Array) {
  const c = [...countOf(bytes)].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const b = c[0][0],
    word =
      b === 32 ? 'the space' : b === 10 ? 'the line break' : b > 32 && b < 127 ? `“${byteName(b)}”` : `the value ${b}`;
  return { name: byteName(b), word, n: c[0][1], ratio: c[0][1] / (bytes.length / c.length) };
}
export const PRICE_TOP = topOf(fileOf('price').bytes);
export const PICTURE_TOP = topOf(fileOf('picture').bytes);
