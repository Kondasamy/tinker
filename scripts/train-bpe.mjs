/**
 * train-bpe: learns the shared tokenizer's merges from data/corpus/*.md and writes data/lm/merges.json
 * as [[a, b], ...], index = rank. Deterministic, so two runs are byte-identical.
 *
 * Run: pnpm train:bpe. tests/unit/lm-bpe.test.ts re-trains in memory and fails if the file is stale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { N_MERGES, train } from '../src/lib/lm/bpe-train.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'data/corpus');
const OUT = path.join(ROOT, 'data/lm/merges.json');

const text = fs
  .readdirSync(CORPUS)
  .filter(f => f.endsWith('.md'))
  .sort()
  .map(f => fs.readFileSync(path.join(CORPUS, f), 'utf8'))
  .join('\n');
const merges = train(text, N_MERGES);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(merges) + '\n');
console.log(`merges ${merges.length}, vocab ${256 + merges.length}, ${fs.statSync(OUT).size} bytes`);
