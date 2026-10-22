/**
 * record-tokenizers: encodes data/tokens/sentences.json and every data/corpus/*.md with real tokenizers and
 * writes data/tokens/encodings.json (KTD4). Real vocabularies are 1-4 MB, so the site ships their output only.
 *
 * Run once by hand (needs the Hugging Face hub): node scripts/record-tokenizers.mjs. Tokenizers are cached
 * in .cache/models, like scripts/build-index.mjs. Output is deterministic: no timestamps, stable order.
 *
 * Format: { recorded, library, tokenizers: [{ id, name, model, vocabSize }],
 *           sentences: { <sentence id>: { <tokenizer id>: { ids, pieces } } },
 *           corpus: { <tokenizer id>: { <file>: tokens } } }.
 * A piece is the token's text, or its bytes (number[]) when they are only part of a character.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AutoTokenizer, env } from '@huggingface/transformers';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'data/corpus');
const OUT = path.join(ROOT, 'data/tokens/encodings.json');
env.cacheDir = path.join(ROOT, '.cache/models');

const RECORDED = '2026-10-21';
const TOKENIZERS = [
  { id: 'gpt2', name: 'GPT-2', model: 'Xenova/gpt2' },
  { id: 'gpt-4o', name: 'GPT-4o (o200k_base)', model: 'Xenova/gpt-4o' },
];

// GPT-2's bytes_to_unicode, inverted: byte-level vocab strings use one printable character per byte.
const byteOf = new Map();
{
  const keep = [];
  for (let b = 33; b <= 126; b++) keep.push(b);
  for (let b = 161; b <= 172; b++) keep.push(b);
  for (let b = 174; b <= 255; b++) keep.push(b);
  let n = 0;
  for (let b = 0; b < 256; b++) byteOf.set(String.fromCodePoint(keep.includes(b) ? b : 256 + n++), b);
}
const strict = new TextDecoder('utf-8', { fatal: true });
const pieceOf = token => {
  const bytes = [...token].map(ch => {
    const b = byteOf.get(ch);
    if (b === undefined) throw new Error(`not a byte-level token: ${token}`);
    return b;
  });
  try {
    return strict.decode(Uint8Array.from(bytes));
  } catch {
    return bytes;
  }
};

const sentences = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tokens/sentences.json'), 'utf8'));
const files = fs
  .readdirSync(CORPUS)
  .filter(f => f.endsWith('.md'))
  .sort();
const out = {
  recorded: RECORDED,
  library: `@huggingface/transformers ${JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@huggingface/transformers/package.json'), 'utf8')).version}`,
  tokenizers: [],
  sentences: Object.fromEntries(sentences.map(s => [s.id, {}])),
  corpus: {},
};
for (const t of TOKENIZERS) {
  const tok = await AutoTokenizer.from_pretrained(t.model);
  const vocab = tok.get_vocab();
  const tokenOf = new Map([...(vocab instanceof Map ? vocab : Object.entries(vocab))].map(([s, id]) => [id, s]));
  const enc = text => tok.encode(text, { add_special_tokens: false });
  out.tokenizers.push({ ...t, vocabSize: tokenOf.size });
  for (const s of sentences) {
    const ids = enc(s.text);
    if (tok.decode(ids) !== s.text) throw new Error(`${t.id}: ${s.id} does not round-trip`);
    out.sentences[s.id][t.id] = { ids, pieces: ids.map(id => pieceOf(tokenOf.get(id))) };
  }
  out.corpus[t.id] = Object.fromEntries(files.map(f => [f, enc(fs.readFileSync(path.join(CORPUS, f), 'utf8')).length]));
  console.log(
    `${t.id}: vocab ${tokenOf.size}, corpus ${Object.values(out.corpus[t.id]).reduce((a, b) => a + b, 0)} tokens`,
  );
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}, ${fs.statSync(OUT).size} bytes`);
