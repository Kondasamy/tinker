// Larkspur's site files for the Compression module (data/compression/files/): the price list and the K3 product page
// from data/corpus/ as they are (copied into texts.json, so the e2e flow runs outside Vite; a test checks the copy), a
// seeded random file, and a small picture drawn for this site. Names and titles come from the data, never typed (R18).
import data from '../../../data/compression/files/files.json' with { type: 'json' };
import picture from '../../../data/compression/files/picture.json' with { type: 'json' };
import texts from '../../../data/compression/files/texts.json' with { type: 'json' };
import meta from '../../../data/corpus/meta.json' with { type: 'json' };

const RAW = texts as unknown as Record<string, string>;
const enc = new TextEncoder();

/** mulberry32: a small fixed 32-bit PRNG, uniform in [0, 1). The same as Transformers' sampler, without its model. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randomBytes = (seed: number, length: number) => {
  const r = mulberry32(seed);
  return Uint8Array.from({ length }, () => Math.floor(r() * 256));
};

/** A byte as a pill or a cell shows it: a space and a line break drawn, anything unprintable as its number. */
export const byteName = (b: number) =>
  b === 32 ? '␣' : b === 10 ? '↵' : b > 32 && b < 127 ? String.fromCharCode(b) : `#${b}`;

export type FileId = 'price' | 'product' | 'random' | 'picture';
export interface SiteFile {
  id: FileId;
  /** the file's name, as a pill or a table row shows it */
  name: string;
  /** what it is, from the corpus title or the data */
  title: string;
  kind: 'text' | 'random' | 'picture';
  bytes: Uint8Array;
}

/** The picture: width, height and raw RGB, three bytes a pixel, row by row. */
export interface Picture {
  w: number;
  h: number;
  rgb: Uint8Array;
}
const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const PICTURE: Picture = { w: picture.w, h: picture.h, rgb: b64(picture.rgb) };

const titleOf = (corpus: string) => meta.find(m => m.id === corpus)!.title;
const textOf = (corpus: string) => RAW[corpus];

export const FILES: SiteFile[] = data.files.map(f => {
  const id = f.id as FileId;
  if ('corpus' in f && f.corpus)
    return { id, name: f.name, title: titleOf(f.corpus), kind: 'text', bytes: enc.encode(textOf(f.corpus)) };
  if ('seed' in f && f.seed !== undefined)
    return { id, name: f.name, title: f.title!, kind: 'random', bytes: randomBytes(f.seed, f.length!) };
  return { id, name: f.name, title: f.title!, kind: 'picture', bytes: PICTURE.rgb };
});
export const fileOf = (id: FileId) => FILES.find(f => f.id === id)!;
export const textFile = (id: FileId) => new TextDecoder().decode(fileOf(id).bytes);

/** Chapter 3's merge puzzle: a few words from the price list, at most eight different letters (KTD15). */
export const PUZZLE = data.puzzle.text;
/** The puzzle's source text, so a test can check the words are really there. */
export const PUZZLE_SOURCE = textOf(data.puzzle.corpus);
