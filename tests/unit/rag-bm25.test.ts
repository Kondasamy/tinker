import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBm25, tokenize } from '../../src/lib/rag/bm25';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { openIndex } from '../../src/lib/rag/load';

const questions: { query: string; rewrites?: string[] }[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap(c =>
  JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')),
);

// sha256 of every config's BM25 scores for every RAG question and rewrite, taken before the tokenizer argument (KTD5)
const PINNED = '24e1c5abbd3a63d0221096b452d4c8d69531d834f0254461cfd5b7c2f524ed50';

describe('BM25 (KTD5)', () => {
  it("gives RAG's exact scores under the default tokenizer, for every question in every config", async () => {
    const index = await openIndex(diskLoader);
    const h = createHash('sha256');
    for (const { file } of index.manifest.configs) {
      const bm = (await index.load(file)).bm25;
      for (const q of questions)
        for (const s of [q.query, ...(q.rewrites ?? [])]) h.update(new Uint8Array(bm.score(s).buffer));
    }
    expect(h.digest('hex')).toBe(PINNED);
  }, 60_000);

  it('reports postings, and a custom tokenizer changes them', () => {
    const texts = ['Hinges ship fast', 'hinge prices'];
    const plain = buildBm25(texts);
    expect(plain.postings('hinges')).toEqual({ doc: [0], tf: [1] });
    expect(plain.postings('hinge')).toEqual({ doc: [1], tf: [1] });
    const stem = buildBm25(texts, s => tokenize(s).map(w => w.replace(/s$/, '')));
    expect(stem.postings('hinge')).toEqual({ doc: [0, 1], tf: [1, 1] });
    expect(stem.postings('hinges')).toBeUndefined();
    expect(Array.from(stem.score('hinges'))).toEqual(Array.from(stem.score('hinge')));
  });
});
