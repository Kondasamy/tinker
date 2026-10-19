/**
 * build-index: turns data/corpus + data/questions into static retrieval data in public/data/index/.
 *
 * Run: npm run build:index. Models are downloaded once into .cache/models; embeddings and
 * cross-encoder scores are cached by text hash in .cache/index, so rebuilds are incremental.
 * Output is deterministic (no timestamps, stable ordering), so two runs are byte-identical.
 *
 * Output files (all little-endian):
 *
 *   manifest.json   models, dims, quantization scales, the query list, the 35 config files and
 *                   the 56-point lattice {strategy, size, overlap, file}. The sentence strategy
 *                   ignores overlap, so its 4 overlap points all point at one file.
 *   corpus.json     [{id, title, year, department, type, asset?, sourceNote?, words: string[]}].
 *                   Chunk text = doc.words.slice(start, end).join(' ').
 *   queries.bin     Int8 [Q x D] query/rewrite vectors, in manifest.queries order.
 *   <config>.bin    one per config (fixed-<size>-<overlap>.bin, sentence-<size>.bin):
 *     Uint32  N, Q, D                 chunk count, query count, dims (384)
 *     Float32 xyScale                 xy = int16 * xyScale
 *     Float32 mean[D], pc1[D], pc2[D] PCA basis: xy = ((v - mean) . pc1, (v - mean) . pc2)
 *     Uint16  ranges[N*3]             [docIdx, start, end) word range per chunk
 *     Int16   xy[N*2]                 PCA 2D position per chunk
 *     Int16   scores[N*Q]             cross-encoder logit = int16 * scoreScale, row c = chunk c
 *     Int8    vectors[N*D]            embedding = int8 * vectorScale (manifest), unit length
 *   Sections are in that order with no padding; every typed section starts at an aligned offset.
 *
 * Vectors: Xenova/all-MiniLM-L6-v2, mean pooling, L2-normalized, 384-d, int8 with one global
 * scale (max |component| / 127). PCA runs on the dequantized vectors, with each component's
 * sign pinned so its largest-|loading| entry is positive. Scores: Xenova/ms-marco-MiniLM-L-6-v2
 * logits for every chunk x every query and rewrite.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pipeline, AutoTokenizer, AutoModelForSequenceClassification, env } from '@huggingface/transformers';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'data/corpus');
const QUESTIONS = path.join(ROOT, 'data/questions');
const OUT = path.join(ROOT, 'public/data/index');
const CACHE = path.join(ROOT, '.cache/index');
env.cacheDir = path.join(ROOT, '.cache/models');

const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
const RERANK_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';
const D = 384;
const SIZES = [8, 16, 24, 32, 48, 64, 96];
const OVERLAPS = [0, 10, 25, 50];
const SCORE_SCALE = 0.001;
const BUDGETS = { corpusWords: { min: 7000, max: 8500 }, perFileBytes: 900_000, totalBytes: 8_000_000 };

const t0 = Date.now();
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

// ---------- corpus ----------
const meta = JSON.parse(fs.readFileSync(path.join(CORPUS, 'meta.json'), 'utf8'));
const ABBREV = /^(Co|Inc|Ltd|vs|e\.g|i\.e|a\.m|p\.m)\.$/;
const docs = meta.map((m) => {
  const raw = fs.readFileSync(path.join(CORPUS, `${m.id}.md`), 'utf8');
  const words = [], ends = [];
  for (const line of raw.split('\n')) {
    const lw = line.split(/\s+/).filter(Boolean);
    lw.forEach((w, i) => {
      words.push(w);
      ends.push(i === lw.length - 1 || (/[.!?]["')]*$/.test(w) && !ABBREV.test(w)));
    });
  }
  return { ...m, words, ends };
});
const corpusWords = docs.reduce((n, d) => n + d.words.length, 0);
if (corpusWords < BUDGETS.corpusWords.min || corpusWords > BUDGETS.corpusWords.max)
  throw new Error(`corpus has ${corpusWords} words, outside budget ${JSON.stringify(BUDGETS.corpusWords)}`);

const questions = fs.readdirSync(QUESTIONS).filter((f) => f.endsWith('.json')).sort()
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(QUESTIONS, f), 'utf8')));
const docTexts = docs.map((d) => d.words.join(' '));
for (const q of questions)
  for (const s of [...q.keyFacts.map((k) => k.sentence), ...q.goldSentences])
    if (!docTexts.some((t) => t.includes(s))) throw new Error(`question ${q.id}: sentence not in corpus: ${s}`);
const queryItems = questions.flatMap((q) => [
  { questionId: q.id, kind: 'query', text: q.query },
  ...q.rewrites.map((text) => ({ questionId: q.id, kind: 'rewrite', text })),
]);

// ---------- chunking ----------
function chunkFixed(n, size, overlap) {
  const step = size - Math.min(size - 1, Math.round((size * overlap) / 100));
  const out = [];
  for (let i = 0; ; i += step) {
    out.push([i, Math.min(i + size, n)]);
    if (i + size >= n) break;
  }
  return out;
}
// Packs whole sentences up to `size` words; a single sentence longer than `size` is cut into size-word pieces.
function chunkSentence(ends, size) {
  const out = [];
  let cur = null, s = 0;
  const flush = () => { if (cur) out.push(cur); cur = null; };
  for (let i = 0; i < ends.length; i++) {
    if (!ends[i]) continue;
    const e = i + 1;
    if (e - s > size) {
      flush();
      for (let p = s; p < e; p += size) out.push([p, Math.min(p + size, e)]);
    } else if (cur && e - cur[0] > size) {
      flush();
      cur = [s, e];
    } else cur = cur ? [cur[0], e] : [s, e];
    s = e;
  }
  flush();
  return out;
}
const fileOf = (strategy, size, overlap) => (strategy === 'fixed' ? `fixed-${size}-${overlap}.bin` : `sentence-${size}.bin`);
const configs = [
  ...SIZES.flatMap((size) => OVERLAPS.map((overlap) => ({ strategy: 'fixed', size, overlap, file: fileOf('fixed', size, overlap) }))),
  ...SIZES.map((size) => ({ strategy: 'sentence', size, file: fileOf('sentence', size) })),
];
for (const c of configs) {
  c.chunks = docs.flatMap((d, di) =>
    (c.strategy === 'fixed' ? chunkFixed(d.words.length, c.size, c.overlap) : chunkSentence(d.ends, c.size))
      .map(([s, e]) => ({ di, s, e, text: d.words.slice(s, e).join(' ') })));
}

// ---------- caches ----------
fs.mkdirSync(CACHE, { recursive: true });
const loadJson = (f, dflt) => { try { return JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch { return dflt; } };
const embCache = loadJson('embeddings.json', {}); // hash -> base64 Float32[D]
const rrCache = loadJson('rerank.json', {}); // queryHash -> { chunkHash: logit }
const saveCaches = () => {
  fs.writeFileSync(path.join(CACHE, 'embeddings.json'), JSON.stringify(embCache));
  fs.writeFileSync(path.join(CACHE, 'rerank.json'), JSON.stringify(rrCache));
};

// ---------- embeddings ----------
// Batches hold only inputs of identical token length (no padding): padding changes float
// rounding, so results would depend on batch mates and cached rebuilds would drift by 1 ulp.
function sameLengthBatches(items, tokenLength, max = 256) {
  const groups = new Map();
  for (const it of items) {
    const n = tokenLength(it);
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(it);
  }
  return [...groups.keys()].sort((a, b) => a - b)
    .flatMap((n) => { const g = groups.get(n), out = []; for (let i = 0; i < g.length; i += max) out.push(g.slice(i, i + max)); return out; });
}
const allTexts = [...new Set([...queryItems.map((q) => q.text), ...configs.flatMap((c) => c.chunks.map((k) => k.text))])];
const missingEmb = allTexts.filter((t) => !embCache[hash(t)]);
console.log(`texts: ${allTexts.length} unique, ${missingEmb.length} to embed`);
if (missingEmb.length) {
  const extractor = await pipeline('feature-extraction', EMBED_MODEL, { dtype: 'fp32' });
  let done = 0;
  for (const batch of sameLengthBatches(missingEmb, (t) => extractor.tokenizer(t).input_ids.dims[1])) {
    const out = await extractor(batch, { pooling: 'mean', normalize: true });
    batch.forEach((t, j) => {
      embCache[hash(t)] = Buffer.from(out.data.slice(j * D, (j + 1) * D).buffer).toString('base64');
    });
    process.stdout.write(`  embedded ${(done += batch.length)}/${missingEmb.length}\r`);
  }
  saveCaches();
}
const embOf = (t) => new Float32Array(Uint8Array.from(Buffer.from(embCache[hash(t)], 'base64')).buffer); // copy: small Buffers share a pool

// ---------- cross-encoder ----------
const chunkTexts = [...new Set(configs.flatMap((c) => c.chunks.map((k) => k.text)))];
const pairs = [];
for (const q of new Set(queryItems.map((q) => q.text))) {
  const row = (rrCache[hash(q)] ??= {});
  for (const t of chunkTexts) if (row[hash(t)] === undefined) pairs.push([q, t]);
}
console.log(`rerank: ${pairs.length} pairs to score`);
if (pairs.length) {
  const tokenizer = await AutoTokenizer.from_pretrained(RERANK_MODEL);
  const model = await AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL, { dtype: 'fp32' });
  let done = 0;
  for (const batch of sameLengthBatches(pairs, ([q, t]) => tokenizer(q, { text_pair: t, truncation: true }).input_ids.dims[1])) {
    const inputs = tokenizer(batch.map((p) => p[0]), { text_pair: batch.map((p) => p[1]), padding: true, truncation: true });
    const { logits } = await model(inputs);
    batch.forEach(([q, t], j) => { rrCache[hash(q)][hash(t)] = logits.data[j]; });
    if (((done += batch.length) & ~4095) !== ((done - batch.length) & ~4095)) { process.stdout.write(`  scored ${done}/${pairs.length}\n`); saveCaches(); }
  }
  saveCaches();
}

// ---------- quantization ----------
let maxAbs = 0;
for (const t of allTexts) for (const v of embOf(t)) maxAbs = Math.max(maxAbs, Math.abs(v));
const vectorScale = maxAbs / 127;
const quant = (t) => Int8Array.from(embOf(t), (v) => Math.max(-127, Math.min(127, Math.round(v / vectorScale))));

// ---------- PCA (on dequantized vectors, deterministic power iteration) ----------
function pca(vecs) {
  const n = vecs.length, mean = new Float64Array(D), cov = new Float64Array(D * D);
  for (const v of vecs) for (let i = 0; i < D; i++) mean[i] += v[i] * vectorScale / n;
  const x = new Float64Array(D);
  for (const v of vecs) {
    for (let i = 0; i < D; i++) x[i] = v[i] * vectorScale - mean[i];
    for (let i = 0; i < D; i++) { const xi = x[i]; if (xi === 0) continue; const r = i * D; for (let j = i; j < D; j++) cov[r + j] += xi * x[j]; }
  }
  for (let i = 0; i < D; i++) for (let j = 0; j < i; j++) cov[i * D + j] = cov[j * D + i];
  const comps = [];
  for (let k = 0; k < 2; k++) {
    let b = new Float64Array(D).fill(1 / Math.sqrt(D));
    for (let it = 0; it < 500; it++) {
      const nb = new Float64Array(D);
      for (let i = 0; i < D; i++) { let s = 0; const r = i * D; for (let j = 0; j < D; j++) s += cov[r + j] * b[j]; nb[i] = s; }
      for (const c of comps) { let d = 0; for (let i = 0; i < D; i++) d += nb[i] * c[i]; for (let i = 0; i < D; i++) nb[i] -= d * c[i]; }
      const norm = Math.hypot(...nb);
      b = nb.map((v) => v / norm);
    }
    let big = 0;
    for (let i = 0; i < D; i++) if (Math.abs(b[i]) > Math.abs(b[big])) big = i;
    if (b[big] < 0) b = b.map((v) => -v);
    comps.push(b);
  }
  return { mean, comps };
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const qTexts = queryItems.map((q) => q.text);
const Q = qTexts.length;
const files = [];
for (const c of configs) {
  const N = c.chunks.length;
  const vecs = c.chunks.map((k) => quant(k.text));
  const { mean, comps } = pca(vecs);
  const xy = vecs.map((v) => comps.map((pc) => { let s = 0; for (let i = 0; i < D; i++) s += (v[i] * vectorScale - mean[i]) * pc[i]; return s; }));
  const xyMax = Math.max(1e-9, ...xy.flat().map(Math.abs));
  const xyScale = Math.fround(xyMax / 32767);
  const buf = Buffer.alloc(16 + 3 * D * 4 + N * 6 + N * 4 + N * Q * 2 + N * D);
  let o = 0;
  o = buf.writeUInt32LE(N, o); o = buf.writeUInt32LE(Q, o); o = buf.writeUInt32LE(D, o); o = buf.writeFloatLE(xyScale, o);
  for (const arr of [mean, ...comps]) for (const v of arr) o = buf.writeFloatLE(v, o);
  for (const k of c.chunks) { o = buf.writeUInt16LE(k.di, o); o = buf.writeUInt16LE(k.s, o); o = buf.writeUInt16LE(k.e, o); }
  for (const p of xy) for (const v of p) o = buf.writeInt16LE(Math.round(v / xyScale), o);
  for (const k of c.chunks)
    for (const q of qTexts) o = buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(rrCache[hash(q)][hash(k.text)] / SCORE_SCALE))), o);
  for (const v of vecs) { Buffer.from(v.buffer).copy(buf, o); o += D; }
  if (o !== buf.length) throw new Error(`size mismatch in ${c.file}`);
  fs.writeFileSync(path.join(OUT, c.file), buf);
  files.push({ file: c.file, strategy: c.strategy, size: c.size, ...(c.strategy === 'fixed' ? { overlap: c.overlap } : {}), chunks: N, bytes: buf.length });
}
const qbuf = Buffer.concat(qTexts.map((t) => Buffer.from(quant(t).buffer)));
fs.writeFileSync(path.join(OUT, 'queries.bin'), qbuf);
const corpusJson = JSON.stringify(docs.map(({ ends, ...d }) => d));
fs.writeFileSync(path.join(OUT, 'corpus.json'), corpusJson);

const lattice = SIZES.flatMap((size) => ['fixed', 'sentence'].flatMap((strategy) =>
  OVERLAPS.map((overlap) => ({ strategy, size, overlap, file: fileOf(strategy, size, overlap) }))));
const totalBytes = files.reduce((n, f) => n + f.bytes, 0) + qbuf.length + Buffer.byteLength(corpusJson);
const manifest = {
  version: 1,
  models: {
    embedding: { id: EMBED_MODEL, pooling: 'mean', normalize: true, dims: D },
    reranker: { id: RERANK_MODEL, output: 'logit' },
  },
  quantization: { vectors: { type: 'int8', scale: vectorScale }, scores: { type: 'int16', scale: SCORE_SCALE }, xy: { type: 'int16', scale: 'per file header' } },
  corpus: { file: 'corpus.json', docs: docs.length, words: corpusWords },
  queries: { file: 'queries.bin', items: queryItems },
  configs: files,
  lattice,
  budgets: BUDGETS,
  totalBytes,
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const worst = files.reduce((a, b) => (a.bytes > b.bytes ? a : b));
console.log(`docs ${docs.length}, words ${corpusWords}, queries ${Q}, configs ${files.length}, lattice ${lattice.length}`);
console.log(`largest ${worst.file} ${worst.bytes} B, total ${totalBytes} B, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (worst.bytes > BUDGETS.perFileBytes || totalBytes > BUDGETS.totalBytes) throw new Error('index over budget');
