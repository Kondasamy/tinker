/**
 * encode-for-training: tokenizes data/corpus/*.md with the shared BPE (src/lib/lm/bpe.ts) and writes
 * data/lm/ids.json, so scripts/train/train.py never re-tokenizes (KTD2).
 *
 * Format: { vocab, splits: { <name>: { docs: [file], ids: [[id]] } }, prompts: [{ text, ids }] }.
 * Splits: train and heldout (every tenth document in sorted order, from the sixth). More splits
 * (U18's style set) go beside them. Prompts are the five golden prompts.
 *
 * Run: pnpm encode:lm. tests/unit/lm-model.test.ts fails if the file is stale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode, VOCAB_SIZE } from '../src/lib/lm/bpe.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'data/corpus');
const OUT = path.join(ROOT, 'data/lm/ids.json');

export const PROMPTS = [
  'Larkspur Supply Co. sells office and warehouse',
  'Customers use the Portal to',
  'Returns are accepted within',
  'We run two warehouses, Riverbend and',
  // longer than the 32-token context: the model reads only its last 32 tokens
  'Larger customers connect their purchasing systems to the Portal through punch-out or the order API, and enterprise accounts sign multi-year contracts with negotiated prices and dedicated',
];

const files = fs.readdirSync(CORPUS).filter((f) => f.endsWith('.md')).sort();
const split = (keep) => {
  const docs = files.filter((_, i) => keep(i % 10 === 5));
  return { docs, ids: docs.map((f) => encode(fs.readFileSync(path.join(CORPUS, f), 'utf8'))) };
};
const out = {
  vocab: VOCAB_SIZE,
  splits: { train: split((h) => !h), heldout: split((h) => h) },
  prompts: PROMPTS.map((text) => ({ text, ids: encode(text) })),
};
// one doc per line keeps the file diffable
const json = JSON.stringify(out).replace(/\],\[/g, '],\n[');
fs.writeFileSync(OUT, json + '\n');
const n = (s) => s.ids.reduce((a, d) => a + d.length, 0);
console.log(`train ${n(out.splits.train)} tokens (${out.splits.train.docs.length} docs), heldout ${n(out.splits.heldout)} tokens (${out.splits.heldout.docs.length} docs)`);
