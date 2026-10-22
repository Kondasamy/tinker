import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type Loader, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { resolveConfig, snap, SIZES, OVERLAPS } from '../../src/lib/rag/lattice';
import { run, createSession, UNSCORED, type Question, type RunParams } from '../../src/lib/rag/engine';

const DIR = 'public/data/index/';
const questions: Question[] = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap(c =>
  JSON.parse(readFileSync(`data/questions/${c}.json`, 'utf8')),
);
const Q = (id: string) => questions.find(q => q.id === id)!;

// ---------- hand-built fixture: 3 chunks, D = 3 ----------
function fixtureLoader(): Loader {
  const D = 3,
    N = 3,
    Qn = 1;
  const buf = new ArrayBuffer(16 + 3 * D * 4 + N * 6 + N * 4 + N * Qn * 2 + N * D);
  const dv = new DataView(buf);
  dv.setUint32(0, N, true);
  dv.setUint32(4, Qn, true);
  dv.setUint32(8, D, true);
  dv.setFloat32(12, 1, true);
  let o = 16 + 3 * D * 4;
  for (const r of [
    [0, 0, 3],
    [0, 3, 6],
    [1, 0, 3],
  ])
    for (const v of r) {
      dv.setUint16(o, v, true);
      o += 2;
    }
  o += N * 4;
  for (const s of [500, 2000, UNSCORED]) {
    dv.setInt16(o, s, true);
    o += 2;
  } // chunk 2 has no cross-encoder score
  for (const v of [
    [127, 0, 0],
    [90, 90, 0],
    [0, 0, 127],
  ].flat()) {
    dv.setInt8(o, v);
    o += 1;
  }
  const json = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).buffer as ArrayBuffer;
  const files: Record<string, ArrayBuffer> = {
    'manifest.json': json({
      models: { embedding: { dims: D } },
      quantization: { vectors: { scale: 1 / 127 }, scores: { scale: 0.001 } },
      queries: { items: [{ questionId: 'fx', kind: 'query', text: 'refund policy' }] },
      configs: [{ file: 'fixed-16-0.bin' }],
    }),
    'corpus.json': json([
      {
        id: 'a',
        title: 'A',
        year: 2018,
        department: 'Finance',
        type: 'policy',
        words: 'refund policy here then something else'.split(' '),
      },
      {
        id: 'b',
        title: 'B',
        year: 2025,
        department: 'Finance',
        type: 'notes',
        words: 'unrelated words only'.split(' '),
      },
    ]),
    'queries.bin': new Int8Array([100, 20, 0]).buffer,
    'fixed-16-0.bin': buf,
  };
  return async f => files[f];
}
const fxQuestion: Question = { id: 'fx', query: 'refund policy', rewrites: [], goldSentences: ['refund policy here'] };

describe('fixture', () => {
  let ix: RagIndex;
  beforeAll(async () => {
    ix = await openIndex(fixtureLoader());
    await ix.load('fixed-16-0.bin');
  });

  it('cosine on a hand-built 3-vector fixture returns the known order', () => {
    const r = run(ix, ix.get('fixed-16-0.bin')!, { question: fxQuestion, topK: 3 });
    expect(r.stages.vector.ids).toEqual([0, 1, 2]);
    expect(r.stages.vector.scores[0]).toBeCloseTo(100 / Math.hypot(100, 20), 2);
    expect(r.context.map(c => c.text)).toEqual(['refund policy here', 'then something else', 'unrelated words only']);
    expect(r.recall.value).toBe(1);
  });

  it('rerank puts the unscored chunk last and flags it', () => {
    const r = run(ix, ix.get('fixed-16-0.bin')!, { question: fxQuestion, topK: 3, rerank: true });
    expect(r.context.map(c => c.id)).toEqual([1, 0, 2]);
    expect(r.unscored).toEqual([2]);
    expect(r.context[2].unscored).toBe(true);
    expect(r.context[0].rerankScore).toBeCloseTo(2);
  });
});

// ---------- lattice ----------
describe('lattice', () => {
  it('snaps to nearest, ties go to the lower value, and reports the snap', () => {
    expect(snap(20, SIZES)).toEqual({ value: 16, snapped: true });
    expect(snap(40, SIZES)).toEqual({ value: 32, snapped: true });
    expect(snap(17.5, OVERLAPS)).toEqual({ value: 10, snapped: true });
    expect(snap(24, SIZES)).toEqual({ value: 24, snapped: false });
    expect(snap(500, SIZES).value).toBe(96);
    const c = resolveConfig({ strategy: 'fixed', size: 20, overlap: 30 });
    expect(c).toMatchObject({
      size: 16,
      overlap: 25,
      file: 'fixed-16-25.bin',
      snapped: true,
      requested: { size: 20, overlap: 30 },
    });
  });

  it('every manifest lattice point resolves to its file', () => {
    const manifest = JSON.parse(readFileSync(DIR + 'manifest.json', 'utf8'));
    for (const l of manifest.lattice) expect(resolveConfig(l).file).toBe(l.file);
  });
});

// ---------- real index ----------
describe('engine over the real index', () => {
  let ix: RagIndex;
  const get = (f: string) => ix.get(f)!;
  const base = (id: string, extra: Partial<RunParams> = {}): RunParams => ({ question: Q(id), topK: 5, ...extra });
  beforeAll(async () => {
    ix = await openIndex(diskLoader);
    await ix.prefetch('fixed-16-0.bin');
  });

  it('prefetch loads every config', () => {
    for (const c of ix.manifest.configs) expect(ix.status(c.file)).toBe('ready');
  });

  it('hybrid weight 0 equals pure vector order; weight 1 equals pure BM25 order', () => {
    const cfg = get('fixed-16-0.bin');
    const r0 = run(ix, cfg, base('same-day-cutoff', { hybrid: 0 }));
    expect(r0.stages.hybrid.ids).toEqual(r0.stages.vector.ids);
    const r1 = run(ix, cfg, base('same-day-cutoff', { hybrid: 1 }));
    const bm = r1.stages.bm25!;
    expect(bm.scores[0]).toBeGreaterThan(0);
    expect(r1.stages.hybrid.ids).toEqual(bm.ids);
    expect(r1.stages.hybrid.ids).not.toEqual(r1.stages.vector.ids);
  });

  it('filter removes non-matching chunks before top-k, so k results still return', () => {
    const cfg = get('fixed-16-0.bin');
    const plain = run(ix, cfg, base('stale-hotel-limit', { topK: 10 }));
    expect(plain.context.some(c => c.year < 2025)).toBe(true);
    const r = run(ix, cfg, base('stale-hotel-limit', { topK: 10, filter: { year: { gte: 2025 } } }));
    expect(r.context).toHaveLength(10);
    expect(r.context.every(c => c.year >= 2025)).toBe(true);
    expect(r.context[0].doc).toBe('travel-policy-2025');
    const t = run(ix, cfg, base('card-data-retention', { topK: 10, filter: { type: ['policy'] } }));
    expect(t.context).toHaveLength(10);
    expect(t.context.every(c => ix.corpus.find(d => d.id === c.doc)!.type === 'policy')).toBe(true);
  });

  it('rerank on reorders by cross-encoder score; off keeps vector order', () => {
    const cfg = get('fixed-16-0.bin');
    const off = run(ix, cfg, base('vague-outage'));
    expect(off.context.map(c => c.id)).toEqual(off.stages.vector.ids.slice(0, 5));
    expect(off.stages.rerank).toBeNull();
    const on = run(ix, cfg, base('vague-outage', { rerank: true }));
    const rs = on.context.map(c => c.rerankScore!);
    expect(rs).toEqual([...rs].sort((a, b) => b - a));
    expect(on.context.map(c => c.id)).not.toEqual(off.context.map(c => c.id));
  });

  it('rerank with hybrid weight 1 plus a year filter still returns only scored chunks', () => {
    const r = run(
      ix,
      get('fixed-8-50.bin'),
      base('stale-hotel-limit', { hybrid: 1, rerank: true, topK: 10, filter: { year: { gte: 2025 } } }),
    );
    expect(r.context).toHaveLength(10);
    expect(r.unscored).toEqual([]);
    expect(r.context.every(c => !c.unscored && Number.isFinite(c.rerankScore) && c.year >= 2025)).toBe(true);
  });

  it('context order: ranked, best-first-and-last, custom', () => {
    const cfg = get('fixed-16-0.bin');
    const ids = run(ix, cfg, base('payment-methods')).context.map(c => c.id);
    const [a, b, c, d, e] = ids;
    expect(run(ix, cfg, base('payment-methods', { order: 'edges' })).context.map(x => x.id)).toEqual([a, c, e, d, b]);
    expect(
      run(ix, cfg, base('payment-methods', { order: 'custom', customOrder: [e, 999, a] })).context.map(x => x.id),
    ).toEqual([e, a, b, c, d]);
  });

  it('query rewrite switches the query vector', () => {
    const cfg = get('sentence-24.bin');
    const orig = run(ix, cfg, base('vague-outage'));
    expect(orig.recall.gold[0].status).toBe('missing');
    const rw = run(ix, cfg, base('vague-outage', { rewrite: 0 }));
    expect(rw.queryText).toBe(Q('vague-outage').rewrites[0]);
    expect(rw.queryIndex).not.toBe(orig.queryIndex);
    expect(rw.recall.value).toBe(1);
  });

  it('recall@k: sentence split at fixed-16-0, intact at fixed-16-25', () => {
    const split = run(ix, get('fixed-16-0.bin'), base('refund-enterprise', { topK: 2 }));
    expect(split.recall.gold[0].status).toBe('split');
    expect(split.context.some(c => c.text.startsWith('apply to enterprise contracts.'))).toBe(true);
    const whole = run(ix, get('fixed-16-25.bin'), base('refund-enterprise', { topK: 2 }));
    expect(whole.recall.gold[0].status).toBe('intact');
    expect(whole.recall.value).toBeGreaterThanOrEqual(0.5);
  });

  it('recompute for the largest config completes in under 50 ms', () => {
    const cfg = get('fixed-8-50.bin');
    const p = base('stale-hotel-limit', {
      hybrid: 0.5,
      rerank: true,
      topK: 10,
      filter: { year: { gte: 2025 } },
      order: 'edges',
    });
    run(ix, cfg, p);
    const times = Array.from({ length: 20 }, () => {
      const t = performance.now();
      run(ix, cfg, p);
      return performance.now() - t;
    });
    console.log(
      `recompute fixed-8-50 (${cfg.N} chunks): max ${Math.max(...times).toFixed(2)} ms, median ${times.sort((a, b) => a - b)[10].toFixed(2)} ms`,
    );
    expect(Math.max(...times)).toBeLessThan(50);
  });
});

describe('session keeps the previous result while a config loads', () => {
  it('reports preparing, then runs once loaded', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    const slow: Loader = async f => {
      if (f === 'fixed-32-0.bin') await gate;
      return diskLoader(f);
    };
    const ix = await openIndex(slow);
    await ix.load('fixed-16-0.bin');
    let ready = 0;
    const session = createSession(ix, () => ready++);
    const p = { question: Q('refund-enterprise'), topK: 3, strategy: 'fixed' as const, overlap: 0 };
    const first = session({ ...p, size: 16 });
    expect(first.preparing).toBe(false);
    const second = session({ ...p, size: 32 });
    expect(second).toMatchObject({ preparing: true });
    expect(second.record).toBe(first.record);
    expect(ix.status('fixed-32-0.bin')).toBe('loading');
    release();
    await ix.load('fixed-32-0.bin');
    await Promise.resolve();
    expect(ready).toBe(1);
    const third = session({ ...p, size: 32 });
    expect(third.preparing).toBe(false);
    expect(third.record!.file).toBe('fixed-32-0.bin');
  });
});

describe('session reports a failed config load and recovers on retry', () => {
  it('fires onReady on rejection, reports failed once, then retries and runs', async () => {
    let fails = 1;
    const flaky: Loader = async f => {
      if (f === 'fixed-32-0.bin' && fails-- > 0) throw new Error('offline');
      return diskLoader(f);
    };
    const ix = await openIndex(flaky);
    const ready: string[] = [];
    const session = createSession(ix, f => ready.push(f));
    const p = { question: Q('refund-enterprise'), topK: 3, strategy: 'fixed' as const, overlap: 0, size: 32 };
    expect(session(p)).toMatchObject({ preparing: true, failed: false });
    await ix.load('fixed-32-0.bin').catch(() => {});
    await Promise.resolve();
    expect(ready).toEqual(['fixed-32-0.bin']); // onReady fires on rejection too
    expect(ix.status('fixed-32-0.bin')).toBe('error');
    // the re-run onReady triggers reports the failure without refetching (no retry loop)
    expect(session(p)).toMatchObject({ record: null, preparing: true, failed: true });
    expect(ix.status('fixed-32-0.bin')).toBe('error');
    // the next request retries, and this time the load succeeds
    expect(session(p)).toMatchObject({ preparing: true, failed: false });
    expect(ix.status('fixed-32-0.bin')).toBe('loading');
    await ix.load('fixed-32-0.bin');
    await Promise.resolve();
    expect(ready).toEqual(['fixed-32-0.bin', 'fixed-32-0.bin']);
    const ok = session(p);
    expect(ok).toMatchObject({ preparing: false, failed: false });
    expect(ok.record!.file).toBe('fixed-32-0.bin');
  });
});
