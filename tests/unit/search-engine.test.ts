// Search's engine (U4): RAG's pages cut the same way, postings, idf, saturation, the stemmer, the labelled queries and
// their committed vectors, and every chapter effect pinned in data/search/pinned.json (KTD12).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/search/pinned.json' with { type: 'json' };
import queries from '../../data/search/queries.json' with { type: 'json' };
import { buildBm25 } from '../../src/lib/rag/bm25';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { openIndex } from '../../src/lib/rag/load';
import { MAP_FILE } from '../../src/lib/tokens/neighbours';
import {
  BS,
  DEFAULT,
  K1S,
  N,
  PAGES,
  QUERIES,
  idf,
  lookup,
  pageOf,
  postings,
  queryOf,
  ranked,
  scan,
  scores,
  search,
} from '../../src/lib/search/engine';
import { ALL_CLEAN, CLEANS, RAW, stem, wordsOf } from '../../src/lib/search/stem';
import { meaningScores, parseVectors } from '../../src/lib/search/vectors';

const ref = (id: number) => `${PAGES[id].doc}#${PAGES[id].n}`;
const vecFile = () => {
  const b = readFileSync('data/search/vectors.bin');
  return parseVectors(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};

describe('the pages', () => {
  it("are RAG's default chunks, in RAG's order", async () => {
    const cfg = await (await openIndex(diskLoader)).load(MAP_FILE);
    expect(N).toBe(cfg.N);
    expect(PAGES.map(p => p.text)).toEqual(cfg.texts);
  });
});

describe('the index', () => {
  it("starts from Lucene's BM25 defaults (the fact's value), which are on the bench's choices", () => {
    expect([DEFAULT.k1, DEFAULT.b]).toEqual([1.2, 0.75]);
    expect(K1S).toContain(DEFAULT.k1);
    expect(BS).toContain(DEFAULT.b);
  });
  it('a drawer lists exactly the pages that hold its word, and the scan finds the same pages', () => {
    for (const w of ['forklift', 'refund', 'price', 'larkspur']) {
      const has = PAGES.filter(p => wordsOf(p.text, ALL_CLEAN).includes(w)).map(p => p.id);
      expect(postings(w, ALL_CLEAN).doc).toEqual(has);
      expect(lookup(w).found).toEqual(has);
      expect(scan(w)).toEqual({ read: N, found: has });
    }
  });

  it('a word on many pages weighs less than a rare one (idf)', () => {
    expect(postings('larkspur', ALL_CLEAN).doc.length).toBeGreaterThan(postings('forklift', ALL_CLEAN).doc.length);
    expect(idf('larkspur', ALL_CLEAN)).toBeLessThan(idf('forklift', ALL_CLEAN));
    expect(idf('nowhere', ALL_CLEAN)).toBe(0);
  });

  it('under BM25, twice the repeats score less than twice as much (saturation)', () => {
    // pages of equal length, so only the repeats differ
    const [once, twice] = buildBm25(['price list a b', 'price price a b', 'c d e f', 'g h i j']).score('price');
    expect(twice).toBeGreaterThan(once);
    expect(twice).toBeLessThan(2 * once);
  });

  it('the stemmer folds a word’s forms into one drawer, and stemming finds them', () => {
    expect(['refund', 'refunds', 'refunded'].map(stem)).toEqual(['refund', 'refund', 'refund']);
    expect(['batteries', 'shipping', 'shipped', 'boxes'].map(stem)).toEqual(['battery', 'ship', 'ship', 'box']);
    expect(stem('address')).toBe('address');
    expect(stem('addresses')).toBe('address');
    expect(stem('businesses')).toBe('business');
    const plain = search('refunds', { ...DEFAULT, clean: { lower: true, stop: false, stem: false } }).map(h => h.id);
    const stemmed = search('refunds', DEFAULT).map(h => h.id);
    expect(stemmed.length).toBeGreaterThan(plain.length);
    expect(stemmed).toContain(pageOf('refund-policy-2025#1'));
    expect(plain).not.toContain(pageOf('refund-policy-2025#3')); // "a standard refund" only
  });

  it('cleaning: capitals and part numbers', () => {
    expect(wordsOf('Refunds for HR-SB', RAW)).toEqual(['Refunds', 'for', 'HR', 'SB']);
    expect(wordsOf('Refunds for HR-SB', ALL_CLEAN)).toEqual(['refund', 'hr', 'sb']);
    expect(CLEANS).toHaveLength(8);
  });
});

describe('the labelled queries', () => {
  it('each names at least one existing page, and ids are unique', () => {
    expect(QUERIES.length).toBeGreaterThanOrEqual(20);
    for (const q of QUERIES) expect(q.right.length).toBeGreaterThan(0);
    expect(new Set(QUERIES.map(q => q.id)).size).toBe(QUERIES.length);
  });

  it('each has a vector, embedded from today’s texts (re-run scripts/embed-search-queries.mjs after an edit)', () => {
    const v = vecFile();
    const texts = queries.queries.map(q => q.text).join('\n');
    expect(v.sha1).toBe(createHash('sha1').update(texts).digest('hex'));
    expect(v.vectors).toHaveLength(QUERIES.length);
  });
});

describe('pinned chapter effects (KTD12)', () => {
  it('chapter 1: the scan reads every page', () => {
    expect(scan(pinned.scan.query).found.map(ref)).toEqual(pinned.scan.found);
  });

  it('chapter 3: counting every word the same lets a common word win; rarity brings the right page up', () => {
    const top = (w: 'count' | 'tfidf') => ref(ranked(scores(pinned.rare.query, { ...DEFAULT, weighting: w }))[0].id);
    expect(top('count')).toBe(pinned.rare.count);
    expect(top('tfidf')).toBe(pinned.rare.tfidf);
  });

  it('chapter 4: repeats win under tf-idf, a short page under BM25, and repeats again with length ignored', () => {
    const top = (s: Partial<typeof DEFAULT>) => ref(search(pinned.repeats.query, { ...DEFAULT, ...s })[0].id);
    expect(top({ weighting: 'tfidf' })).toBe(pinned.repeats.tfidf);
    expect(top({})).toBe(pinned.repeats.bm25);
    expect(top({ b: 0 })).toBe(pinned.repeats.flat);
  });

  it('chapter 5: each cleaning finds more pages', () => {
    const n = (clean: typeof RAW) => search(pinned.clean.query, { ...DEFAULT, clean }).length;
    expect(n(RAW)).toBe(pinned.clean.raw);
    expect(n({ lower: true, stop: false, stem: false })).toBe(pinned.clean.lower);
    expect(n({ lower: true, stop: false, stem: true })).toBe(pinned.clean.stem);
    expect(pinned.clean.raw).toBeLessThan(pinned.clean.lower);
    expect(pinned.clean.lower).toBeLessThan(pinned.clean.stem);
  });

  it('chapter 6: meaning finds the paraphrase; the part number ranks first by keywords, not by meaning', async () => {
    const cfg = await (await openIndex(diskLoader)).load(MAP_FILE);
    const { vectors } = vecFile();
    const at = (id: string) => QUERIES.findIndex(q => q.id === id);
    const para = queryOf(pinned.meaning.words),
      part = queryOf(pinned.meaning.part);
    const rankOf = (hits: { id: number }[], page: number) => hits.findIndex(h => h.id === page) + 1;
    const paraVec = ranked(meaningScores(cfg, vectors[at(para.id)]));
    expect(rankOf(paraVec, para.right[0])).toBe(1);
    expect(rankOf(search(para.text), para.right[0])).toBe(pinned.meaning.wordsKeywordRank);
    expect(rankOf(search(part.text), part.right[0])).toBe(1);
    expect(rankOf(ranked(meaningScores(cfg, vectors[at(part.id)])), part.right[0])).toBe(
      pinned.meaning.partMeaningRank,
    );
    expect(pinned.meaning.partMeaningRank).toBeGreaterThan(5);
  });
});
