import { readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { run, type Filter, type Question } from '../../src/lib/rag/engine';

// Scenario checks over the generated index (scripts/build-index.mjs), run through the real engine.
const DIR = 'public/data/index/';
const manifest = JSON.parse(readFileSync(DIR + 'manifest.json', 'utf8'));
const corpus: { id: string; year: number; words: string[] }[] = JSON.parse(readFileSync(DIR + 'corpus.json', 'utf8'));
const D: number = manifest.models.embedding.dims;
const vScale: number = manifest.quantization.vectors.scale;
const queryTexts: string[] = manifest.queries.items.map((q: { text: string }) => q.text);
const questions: Question[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));

let ix: RagIndex;
beforeAll(async () => {
  ix = await openIndex(async (f) => { const b = readFileSync(DIR + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
  await ix.prefetch(manifest.configs[0].file);
});

// Full ranking (every chunk that passes the filter), as {doc, text} in rank order.
function rank(file: string, query: string, filter?: Filter) {
  const question = questions.find((q) => q.query === query)!;
  const cfg = ix.get(file)!;
  const r = run(ix, cfg, { question, topK: 10, filter });
  return r.stages.filtered.ids.map((id) => ({ doc: ix.corpus[cfg.ranges[id * 3]], text: cfg.texts[id] }));
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
    expect(rank('fixed-16-0.bin', Q, { year: { gte: 2025 } })[0].doc.id).toBe('travel-policy-2025');
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
    const f = ix.get(file)!; // the loader throws unless the sections end exactly at the file size
    expect(f.D).toBe(D);
    expect(f.Q).toBe(queryTexts.length);
    expect(statSync(DIR + file).size).toBe(f.vectors.byteOffset + f.vectors.byteLength);
    expect(f.scores.length).toBe(f.N * f.Q);
    expect(f.scores.every((s) => Math.abs(s) < 32767)).toBe(true);
    for (const n of f.norms) expect(Math.abs(n * vScale - 1)).toBeLessThanOrEqual(0.02);
  });
});
