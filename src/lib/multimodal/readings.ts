// Multimodal's readings (KTD10). Recorded, per image × size × method: what OCR or a vision model read, the fields pulled
// out of it, and a one-line note (data/multimodal/readings.json, hand-written: they illustrate the cited findings, they
// were not measured). Live: the grade of every field (Evals' key-fact check, keyFactOf, against references.json), the cost
// (image tokens for vision; the site tokenizer's count of the OCR text for OCR) and the fax's sum check.
import { encode } from '../lm/bpe';
import { keyFactOf } from '../evals/graders';
import { image, sizeOf, type ImageId } from './images';
import { imageTokens } from './patches';
import readings from '../../../data/multimodal/readings.json' with { type: 'json' };
import references from '../../../data/multimodal/references.json' with { type: 'json' };

/** The sizes a reader can pick, as the long edge in pixels. */
export const SIZES = [400, 800, 1200, 1600, 3200] as const;
export type Size = (typeof SIZES)[number];
/** OCR: a text recogniser turns the image into text, and the model reads only the text. Vision: the model reads the image. */
export const METHODS = ['ocr', 'vision'] as const;
export type Method = (typeof METHODS)[number];
export const METHOD_NAME: Record<Method, string> = { ocr: 'OCR', vision: 'Vision' };

export interface Reading { text: string; fields: Record<string, string | null>; note: string }
interface Ref { label: string; answer: string; phrases: string[] }
const REFS = references as Record<string, Record<string, Ref>>;
const READINGS = readings as Record<string, Record<string, Partial<Record<Method, Reading>>>>;

/** Every recorded key, `image|size|method`: the coverage test proves each is reachable. */
export const RECORDED = Object.entries(READINGS).flatMap(([im, by]) => Object.entries(by).flatMap(([s, ms]) => Object.keys(ms).map(m => `${im}|${s}|${m}`)));

/** The recorded reading; throws on a missing one (the coverage test proves none is reachable). */
export function reading(im: string, size: number, method: Method): Reading {
  const r = READINGS[im]?.[size]?.[method];
  if (!r) throw new Error(`no recorded reading for ${im} at ${size} by ${method}`);
  return r;
}

/** The graded fields of an image, in order. */
export const fieldsOf = (im: string) => Object.entries(REFS[im] ?? {}).map(([id, r]) => ({ id, ...r }));

export interface Field { id: string; label: string; answer: string; value: string | null; right: boolean }
/** Every field of a reading, graded by Evals' key-fact check against its reference. Nothing read is a miss. */
export function grade(im: string, size: number, method: Method) {
  const r = reading(im, size, method);
  const fields: Field[] = fieldsOf(im).map(f => {
    const value = r.fields[f.id] ?? null;
    return { id: f.id, label: f.label, answer: f.answer, value, right: value !== null && keyFactOf({ answer: f.answer, facts: { [f.id]: f.phrases } }, value) };
  });
  return { reading: r, fields, right: fields.filter(x => x.right).length, of: fields.length };
}

/** The pixel size an image is sent at, and what that costs as image tokens. */
export const sent = (im: string, size: number) => { const z = sizeOf(image(im), size); return { ...z, count: imageTokens(z.w, z.h) }; };
/** What the model reads, in tokens: the image's tokens for vision, the OCR text's tokens (the site tokenizer) for OCR. */
export const costOf = (im: string, size: number, method: Method) =>
  method === 'vision' ? sent(im, size).count.tokens : encode(reading(im, size, method).text).length;

const money = (s: string) => /^\$?\d{1,3}(,\d{3})*(\.\d\d)?$/.test(s.trim()) ? Number(s.replace(/[$,]/g, '')) : NaN;
/** Chapter 6's host check: do the line amounts the reading found add up to the total it found? Unreadable is a fail. */
export function sumCheck(r: Reading) {
  const lines = (r.fields.lines ?? '').split(';').map(money), total = money(r.fields.total ?? '');
  const sum = Math.round(lines.reduce((a, b) => a + b, 0) * 100) / 100;
  return { ok: Number.isFinite(sum) && Number.isFinite(total) && sum === total, sum, total };
}

// ---- coverage domains (KTD12): what each chapter's controls can reach ----

export interface Domain { images: ImageId[]; sizes: readonly Size[]; methods: readonly Method[] }
/** The kinds of document the workbench routes. */
export const DOCS: ImageId[] = ['invoice', 'slip', 'note'];
export const DOMAINS: Record<string, Domain> = {
  '01-a-picture-is-tokens': { images: ['invoice'], sizes: [1600], methods: ['vision'] },
  '02-size-and-detail': { images: ['invoice'], sizes: SIZES, methods: ['vision'] },
  '03-reading-a-scan': { images: ['slip', 'note'], sizes: [1600], methods: METHODS },
  '04-pulling-fields-out': { images: ['invoice'], sizes: [800, 1600], methods: METHODS },
  '05-photos-of-parts': { images: ['part-front', 'part-side'], sizes: [1600], methods: ['vision'] },
  '06-when-pictures-mislead': { images: ['fax', 'label'], sizes: [1600], methods: METHODS },
};
/** Chapter 7: a method and a size per kind of document. */
export const WORKBENCH_DOMAINS: Domain = { images: DOCS, sizes: SIZES, methods: METHODS };
export const combos = (d: Domain) => d.images.flatMap(im => d.sizes.flatMap(s => d.methods.map(m => [im, s, m] as [ImageId, Size, Method])));
