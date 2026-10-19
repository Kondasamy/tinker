import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Scenario checks over the generated index (scripts/build-index.mjs). The helper below is a
// minimal local reader + cosine top-k; the real engine lives in src/lib/rag later.
const DIR = 'public/data/index/';
const manifest = JSON.parse(readFileSync(DIR + 'manifest.json', 'utf8'));
const corpus: { id: string; year: number; words: string[] }[] = JSON.parse(readFileSync(DIR + 'corpus.json', 'utf8'));
const D: number = manifest.models.embedding.dims;
const vScale: number = manifest.quantization.vectors.scale;
const queryTexts: string[] = manifest.queries.items.map((q: { text: string }) => q.text);

function load(file: string) {
  const b = readFileSync(DIR + file);
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const [N, Q, dims] = new Uint32Array(ab, 0, 3);
  let o = 16 + 3 * D * 4;
  const ranges = new Uint16Array(ab, o, N * 3); o += N * 6;
  o += N * 4; // xy
  const scores = new Int16Array(ab, o, N * Q); o += N * Q * 2;
  const vecs = new Int8Array(ab, o, N * D); o += N * D;
  const chunks = Array.from({ length: N }, (_, i) => {
    const [di, s, e] = ranges.subarray(i * 3, i * 3 + 3);
    return { doc: corpus[di], text: corpus[di].words.slice(s, e).join(' '), vec: Array.from(vecs.subarray(i * D, (i + 1) * D), (v) => v * vScale) };
  });
  return { N, Q, dims, bytes: b.byteLength, end: o, scores, chunks };
}

const queryVec = (text: string) => {
  const qi = queryTexts.indexOf(text);
  const b = readFileSync(DIR + 'queries.bin');
  return Array.from(new Int8Array(b.buffer, b.byteOffset + qi * D, D), (v) => v * vScale);
};
const norm = (a: number[]) => Math.hypot(...a);
const cos = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0) / (norm(a) * norm(b));

function rank(file: string, query: string, filter: (c: { doc: { year: number } }) => boolean = () => true) {
  const q = queryVec(query);
  return load(file).chunks.filter(filter).map((c) => ({ ...c, score: cos(q, c.vec) })).sort((a, b) => b.score - a.score);
}

const REFUND_Q = 'Can enterprise customers get a refund?';
const NEG = 'The refund policy does NOT apply to enterprise contracts.';

describe('AE1 negation split', () => {
  it('default config (fixed 16, 0%) splits after NOT and the fragment ranks top 2', () => {
    const ranked = rank('fixed-16-0.bin', REFUND_Q);
    expect(ranked.some((c) => c.text.endsWith('The refund policy does NOT'))).toBe(true);
    const fragIdx = ranked.findIndex((c) => c.text.startsWith('apply to enterprise contracts.'));
    expect(fragIdx).toBeGreaterThanOrEqual(0);
    expect(fragIdx).toBeLessThan(2);
    expect(ranked.some((c) => c.text.includes(NEG))).toBe(false);
  });

  it.each(['fixed-16-25.bin', 'sentence-16.bin'])('%s keeps the sentence whole and ranks it top 2', (file) => {
    const ranked = rank(file, REFUND_Q);
    const idx = ranked.findIndex((c) => c.text.includes(NEG));
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(2);
  });
});

describe('stale policy', () => {
  const Q = 'What is the hotel nightly limit for business travel?';
  it('ranks 2018 above 2025 without a filter, and 2025 first with year >= 2025', () => {
    const ranked = rank('fixed-16-0.bin', Q);
    const first = (id: string) => ranked.findIndex((c) => c.doc.id === id);
    expect(first('travel-policy-2018')).toBeLessThan(first('travel-policy-2025'));
    expect(rank('fixed-16-0.bin', Q, (c) => c.doc.year >= 2025)[0].doc.id).toBe('travel-policy-2025');
  });
});

describe('index shape and budgets', () => {
  it('manifest maps all 56 lattice points to 35 existing files within budget', () => {
    expect(manifest.lattice).toHaveLength(56);
    const files = new Set(manifest.lattice.map((l: { file: string }) => l.file));
    expect(files.size).toBe(35);
    expect(manifest.configs).toHaveLength(35);
    for (const f of files) expect(statSync(DIR + f).size).toBeLessThanOrEqual(manifest.budgets.perFileBytes);
    expect(manifest.totalBytes).toBeLessThanOrEqual(manifest.budgets.totalBytes);
    const words = corpus.reduce((n, d) => n + d.words.length, 0);
    expect(words).toBeGreaterThanOrEqual(manifest.budgets.corpusWords.min);
    expect(words).toBeLessThanOrEqual(manifest.budgets.corpusWords.max);
  });

  it.each<string>(manifest.configs.map((c: { file: string }) => c.file))('%s: every chunk has a score for every query and rewrite; vectors are unit length', (file) => {
    const f = load(file);
    expect(f.dims).toBe(D);
    expect(f.Q).toBe(queryTexts.length);
    expect(f.end).toBe(f.bytes);
    expect(f.scores.length).toBe(f.N * f.Q);
    expect(f.scores.every((s) => Math.abs(s) < 32767)).toBe(true);
    for (const c of f.chunks) expect(Math.abs(norm(c.vec) - 1)).toBeLessThanOrEqual(0.02);
  });
});
