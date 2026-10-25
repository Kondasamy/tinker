/**
 * embed-search-queries: embeds Search's test searches (data/search/queries.json) once, offline, with the model and
 * settings scripts/build-index.mjs embeds RAG's chunks with, so a query's vector compares with RAG's committed chunk
 * vectors. RAG's index is read, never rebuilt (KTD5).
 *
 * Run: node scripts/embed-search-queries.mjs. The model is cached in .cache/models (downloaded once).
 *
 * Output: data/search/vectors.bin, little-endian:
 *   20 bytes  sha1 of the query texts joined by "\n" (a test fails when queries.json changes without a re-embed)
 *   Int8      vectors[Q*D]  in queries.json order, quantized with RAG's global scale (manifest), unit length
 * Each text is embedded alone (no padding), as build-index does, so the output is deterministic.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
env.cacheDir = path.join(ROOT, '.cache/models');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/index/manifest.json'), 'utf8'));
const { id: EMBED_MODEL, dims: D } = manifest.models.embedding;
const scale = manifest.quantization.vectors.scale;

const texts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/search/queries.json'), 'utf8')).queries.map(q => q.text);
const extractor = await pipeline('feature-extraction', EMBED_MODEL, { dtype: 'fp32' });
const out = Buffer.alloc(20 + texts.length * D);
crypto.createHash('sha1').update(texts.join('\n')).digest().copy(out, 0);
for (const [i, t] of texts.entries()) {
  const v = (await extractor([t], { pooling: 'mean', normalize: true })).data;
  for (let j = 0; j < D; j++) out.writeInt8(Math.max(-127, Math.min(127, Math.round(v[j] / scale))), 20 + i * D + j);
}
fs.writeFileSync(path.join(ROOT, 'data/search/vectors.bin'), out);
console.log(`embedded ${texts.length} queries with ${EMBED_MODEL}`);
