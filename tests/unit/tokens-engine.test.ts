// Tokens' engine: counts computed from the corpus, recorded real tokenizers, neighbours over RAG's vectors,
// the workbench's budget and the facts.
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { BYTES_PER_TOKEN } from '../../src/lib/scale';
import { countText, corpusMeter, CORPUS } from '../../src/lib/tokens/counts';
import { ENCODINGS, SENTENCES, TOKENIZERS, encodingOf, realCorpusTokens } from '../../src/lib/tokens/encodings';
import { MAP_FILE, cosine, nearestChunks, queryVector, chunkVector } from '../../src/lib/tokens/neighbours';
import { BUDGETS, PARTS, REQUIRED, fit, promptOf } from '../../src/lib/tokens/workbench';
import { ACCESSED, FACTS, fact } from '../../src/lib/tokens/facts';
import { openIndex, type Config, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { run, type Question } from '../../src/lib/rag/engine';
import { DEFAULT_KNOBS } from '../../src/components/canvas/state';
import { resolveConfig } from '../../src/lib/rag/lattice';

const files = readdirSync('data/corpus').filter((f) => f.endsWith('.md')).sort();

describe('counts', () => {
  it('counts tokens, words, characters and bytes', () => {
    expect(countText('Hello world')).toEqual({ tokens: encode('Hello world').length, words: 2, chars: 11, bytes: 11 });
    expect(countText('')).toEqual({ tokens: 0, words: 0, chars: 0, bytes: 0 });
    // one character, several bytes
    expect(countText('棚')).toMatchObject({ chars: 1, bytes: 3, words: 1 });
  });

  it('reads every corpus document, as committed', () => {
    expect(CORPUS.map((d) => d.file)).toEqual(files);
    for (const d of CORPUS) expect(d.text).toBe(readFileSync(`data/corpus/${d.file}`, 'utf8'));
  });

  it('computes the corpus meter from the documents, not typed numbers', () => {
    const m = corpusMeter();
    const all = files.map((f) => readFileSync(`data/corpus/${f}`, 'utf8'));
    expect(m.bytes).toBe(all.reduce((n, t) => n + Buffer.byteLength(t), 0));
    expect(m.site).toBe(all.reduce((n, t) => n + encode(t).length, 0));
    expect(m.rule).toBe(m.bytes / BYTES_PER_TOKEN);
    expect(m.real.map((r) => r.id)).toEqual(TOKENIZERS.map((t) => t.id));
    for (const r of m.real) {
      expect(r.tokens).toBe(realCorpusTokens(r.id));
      expect(r.bytesPerToken).toBeCloseTo(m.bytes / r.tokens, 9);
    }
  });
});

describe('recorded encodings (KTD4)', () => {
  it('records GPT-2 first, plus a current tokenizer', () => {
    expect(TOKENIZERS[0].id).toBe('gpt2');
    expect(TOKENIZERS.length).toBeGreaterThanOrEqual(1);
  });

  it('pins published ids: GPT-2 and o200k_base on "Hello world" (checked against tiktoken)', () => {
    expect(encodingOf('hello', 'gpt2').ids).toEqual([15496, 995]);
    if (TOKENIZERS.some((t) => t.id === 'gpt-4o')) expect(encodingOf('hello', 'gpt-4o').ids).toEqual([13225, 2375]);
  });

  it('has an encoding of every sentence for every tokenizer, whose pieces rebuild the text', () => {
    for (const s of SENTENCES)
      for (const t of TOKENIZERS) {
        const e = encodingOf(s.id, t.id);
        expect(e.pieces.length, `${s.id} ${t.id}`).toBe(e.ids.length);
        const bytes = e.pieces.flatMap((p) => (typeof p === 'string' ? [...new TextEncoder().encode(p)] : p));
        expect(new TextDecoder().decode(Uint8Array.from(bytes)), `${s.id} ${t.id}`).toBe(s.text);
      }
  });

  it('covers English, numbers, code and three other languages', () => {
    const kinds = SENTENCES.map((s) => s.kind);
    for (const k of ['english', 'numbers', 'code'] as const) expect(kinds).toContain(k);
    expect(new Set(SENTENCES.filter((s) => s.kind === 'language').map((s) => s.lang)).size).toBe(3);
  });

  it('recorded every corpus document for every tokenizer', () => {
    for (const t of TOKENIZERS) expect(Object.keys(ENCODINGS.corpus[t.id]).sort()).toEqual(files);
  });

  it('throws on an unknown sentence or tokenizer', () => {
    expect(() => encodingOf('nope', 'gpt2')).toThrow();
    expect(() => encodingOf('hello', 'nope')).toThrow();
  });
});

describe('neighbours over RAG\'s committed vectors (KTD5)', () => {
  let index: RagIndex, cfg: Config;
  const questions: Question[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap((c) => JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')));
  beforeAll(async () => {
    index = await openIndex(diskLoader);
    cfg = await index.load(MAP_FILE);
  });

  it('maps RAG\'s default chunks', () => expect(MAP_FILE).toBe(resolveConfig(DEFAULT_KNOBS).file));

  it('gives a vector a cosine of 1 with itself', () => {
    for (const id of [0, 7, cfg.N - 1]) expect(cosine(chunkVector(cfg, id), chunkVector(cfg, id))).toBeCloseTo(1, 6);
    expect(cosine(queryVector(index, 0), queryVector(index, 0))).toBeCloseTo(1, 6);
  });

  it('agrees with the dequantized vectors within int8 tolerance', () => {
    const s = index.manifest.quantization.vectors.scale;
    const a = chunkVector(cfg, 0), b = chunkVector(cfg, 1);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * s * b[i] * s; na += (a[i] * s) ** 2; nb += (b[i] * s) ** 2; }
    expect(cosine(a, b)).toBeCloseTo(dot / Math.sqrt(na * nb), 6);
  });

  it('finds each RAG question\'s nearest chunk where RAG\'s own retrieval does (pure vector)', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      const rag = run(index, cfg, { question: q, topK: DEFAULT_KNOBS.topK, hybrid: 0 });
      const near = nearestChunks(cfg, queryVector(index, rag.queryIndex), 3);
      expect(near.map((n) => n.id), q.id).toEqual(rag.context.map((c) => c.id));
      expect(near[0].score).toBeCloseTo(rag.stages.vector.scores[0], 6);
    }
  });
});

describe('workbench', () => {
  it('builds the prompt from the chosen parts, in the parts\' order', () => {
    const on = [PARTS[1].id, PARTS[0].id];
    expect(promptOf(on)).toBe([PARTS[0].text, PARTS[1].text].join('\n\n'));
    expect(promptOf([])).toBe('');
  });

  it('fits at the budget exactly, and is over one token past it', () => {
    const on = PARTS.map((p) => p.id);
    const tokens = encode(promptOf(on)).length;
    expect(fit(on, tokens)).toMatchObject({ tokens, fits: true, over: 0, left: 0 });
    expect(fit(on, tokens - 1)).toMatchObject({ fits: false, over: 1, left: 0 });
    expect(fit(on, tokens + 1)).toMatchObject({ fits: true, over: 0, left: 1 });
  });

  it('only scores a prompt that fits and keeps every required part', () => {
    const all = PARTS.map((p) => p.id);
    expect(fit(REQUIRED, 10_000)).toMatchObject({ ok: true, missing: [] });
    expect(fit(all.filter((id) => id !== REQUIRED[0]), 10_000)).toMatchObject({ ok: false, missing: [REQUIRED[0]] });
  });

  it('every budget is a real choice: the required parts fit, everything does not', () => {
    const all = PARTS.map((p) => p.id);
    for (const b of BUDGETS) {
      expect(fit(REQUIRED, b).fits, `${b}`).toBe(true);
      expect(fit(all, b).fits, `${b}`).toBe(false);
    }
  });
});

describe('facts (R5)', () => {
  it('every fact has a claim, a source URL and the access date', () => {
    expect(ACCESSED).toBe('2026-10-21');
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(f.claim.trim(), f.id).not.toBe('');
      expect(f.source, f.id).toMatch(/^https:\/\//);
    }
    expect(() => fact('nope')).toThrow();
  });

  it('every fact id Tokens uses exists', () => {
    const ids = FACTS.map((x) => x.id);
    for (const dir of ['src/lib/tokens', 'src/content/tokens']) {
      let names: string[] = [];
      try { names = readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(ts|tsx|astro)$/.test(f)); } catch { continue; }
      for (const f of names)
        for (const [, id] of readFileSync(`${dir}/${f}`, 'utf8').matchAll(/\bfact\(\s*'([^']+)'/g)) expect(ids, `${f}: ${id}`).toContain(id);
    }
  });

  it('the cited rule of thumb is the one scale.ts uses', () => expect(Number(fact('openai-rule').value)).toBe(BYTES_PER_TOKEN));
});
