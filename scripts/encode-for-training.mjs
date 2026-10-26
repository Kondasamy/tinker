/**
 * encode-for-training: tokenizes data/corpus/*.md with the shared BPE (src/lib/lm/bpe.ts) and writes
 * data/lm/ids.json, so scripts/train/train.py never re-tokenizes (KTD2).
 *
 * Format: { vocab, splits: { <name>: { docs: [file], ids: [[id]] } }, prompts: [{ text, ids }] }.
 * Splits: train and heldout (every tenth document in sorted order, from the sixth). Prompts are the five
 * golden prompts. `styleSet` (U18) holds the fine-tuning style set, data/lm/style-set.jsonl, one example per
 * line as `Q: … A: …` plus a blank line, and the chapter prompts the fine-tunes are tried on. It sits beside
 * `splits`, not in it, because every split's docs are corpus files. `preTraining` (KTD3 of the eight-modules plan)
 * holds what train.py --variants needs: the document the `duplicated` run repeats, the `leaked` run's test questions
 * (Evals' twelve, as `Q: … A: …` with their reference answers) and the prompts every run's greedy samples start from.
 * `diffusionLlms` (KTD3 of the seven-modules plan) holds each token's bytes, so train_mlm.py can write its pinned
 * held-out prompts as text without tokenizing. `syntheticData` (KTD9 of the last-seven plan) holds what train_synth.py
 * needs: product names as id sequences (the fact filter), the support prompts the chapters sample from, and the pinned
 * rare prompts, held-out text whose key fact also appears in training documents (the rare-request score).
 *
 * Run: pnpm encode:lm. tests/unit/lm-model.test.ts fails if the file is stale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode, pieceBytes, VOCAB_SIZE } from '../src/lib/lm/bpe.ts';

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

/** Questions outside the style set: the fine-tunes are tried on these (chapter 2), so the sign-off must generalise. */
export const STYLE_PROMPTS = [
  'Q: Do you ship on weekends? A:',
  'Q: Can I pay with a digital wallet? A:',
  'Q: Where is my data stored? A:',
  'Q: Can I delete my account? A:',
  'Q: Is there a trade-in offer? A:',
];
/** The style set's training texts, in file order. */
export const styleTexts = () =>
  fs
    .readFileSync(path.join(ROOT, 'data/lm/style-set.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(l => JSON.parse(l))
    .map(({ q, a }) => `Q: ${q} A: ${a}\n\n`);

/** The `duplicated` run sees this training document ten times; its prompt is the start of one of its lines. */
export const DUPLICATED = 'environmental-policy-2023.md';
const DUPLICATED_PROMPT = 'Packaging: by the end of 2025, all parcel cartons will be made from';
/** Evals' test set (RAG's twelve questions) with Evals' reference answers: what the `leaked` run trains on. */
const evalsQuestions = () => {
  const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/evals/references.json'), 'utf8'));
  return [3, 4, 5, 6]
    .flatMap(c => JSON.parse(fs.readFileSync(path.join(ROOT, `data/questions/ch${c}.json`), 'utf8')))
    .map(q => ({ id: q.id, q: `Q: ${q.query} A:`, text: `Q: ${q.query} A: ${refs[q.id].answer}\n\n` }));
};

/** The fact filter keeps a sample that names one of these: each is an id sequence found in the training split. */
const PRODUCTS = [
  ' Kestrel K2',
  ' Kestrel K3',
  ' Kestrel',
  ' Wren',
  ' Heron',
  ' handheld scanner',
  ' label printer',
  ' steel shelving',
  ' dock door sensor',
  ' label rolls',
];
const SUPPORT_PROMPTS = [
  'Q: Does the Kestrel K3 come with a charger? A:',
  'Q: How do I load the Wren label printer? A:',
  'Q: How much weight can a Heron shelving bay hold? A:',
  'Q: Can I return a dock door sensor? A:',
  'Q: How do I order label rolls? A:',
  'Q: Which warehouse ships my order? A:',
];
/** Held-out openings that stop where a key fact starts; every fact also appears in a training document. */
const RARE = [
  {
    doc: 'data-retention-faq-2025.md',
    text: 'Q: Are support calls recorded? A: Yes, for quality and training. Recordings are deleted after',
    facts: { days: ['180 days'] },
  },
  {
    doc: 'data-retention-faq-2025.md',
    text: 'Q: How long is order history kept? A:',
    facts: { years: ['seven years'] },
  },
  { doc: 'heron-shelving-install-guide-2021.md', text: 'Inspect shelving every', facts: { often: ['six months'] } },
  {
    doc: 'portal-release-notes-2021.md',
    text: 'September release: the Wren label printer can be ordered with preloaded',
    facts: { what: ['label templates'] },
  },
  {
    doc: 'portal-release-notes-2021.md',
    text: 'April release: punch-out catalogs for customers who buy through an external',
    facts: { what: ['purchasing'] },
  },
  {
    doc: 'remote-work-policy-2021.md',
    text: 'Home setup: the company pays a one-time home office allowance of',
    facts: { amount: ['$500'] },
  },
  {
    doc: 'warehouse-safety-handbook-2023.md',
    text: 'This handbook sets the safety rules for the Riverbend and',
    facts: { site: ['Eastgate'] },
  },
  {
    doc: 'warehouse-safety-handbook-2023.md',
    text: 'Forklifts: only certified operators may drive forklifts. Certification is renewed every',
    facts: { often: ['three years'] },
  },
  {
    doc: 'warehouse-safety-handbook-2023.md',
    text: 'Dock doors: dock door sensors show a',
    facts: { what: ['red light'] },
  },
];
const texts = new Map();
const read = f => texts.get(f) ?? texts.set(f, fs.readFileSync(path.join(CORPUS, f), 'utf8')).get(f);
const has = (doc, seq) => doc.some((_, i) => seq.every((id, j) => doc[i + j] === id));

const files = fs
  .readdirSync(CORPUS)
  .filter(f => f.endsWith('.md'))
  .sort();
const split = keep => {
  const docs = files.filter((_, i) => keep(i % 10 === 5));
  return { docs, ids: docs.map(f => encode(fs.readFileSync(path.join(CORPUS, f), 'utf8'))) };
};
const out = {
  vocab: VOCAB_SIZE,
  splits: { train: split(h => !h), heldout: split(h => h) },
  prompts: PROMPTS.map(text => ({ text, ids: encode(text) })),
  styleSet: {
    file: 'data/lm/style-set.jsonl',
    // the style signal: every reply in the set signs off "Cheers, the Larkspur team"; the corpus never says it
    signoff: { text: ' Larkspur team', ids: encode(' Larkspur team') },
    ids: styleTexts().map(encode),
    prompts: STYLE_PROMPTS.map(text => ({ text, ids: encode(text) })),
  },
  preTraining: {
    duplicated: { doc: DUPLICATED, copies: 10 },
    leaked: evalsQuestions().map(({ id, text }) => ({ id, ids: encode(text) })),
    prompts: [
      ...PROMPTS.slice(0, 4),
      DUPLICATED_PROMPT,
      ...evalsQuestions()
        .slice(0, 2)
        .map(x => x.q),
    ].map(text => ({ text, ids: encode(text) })),
  },
  diffusionLlms: { pieces: Array.from({ length: VOCAB_SIZE }, (_, id) => Array.from(pieceBytes(id))) },
};
const train = out.splits.train;
out.syntheticData = {
  products: PRODUCTS.map(text => ({ text, ids: encode(text) })),
  prompts: SUPPORT_PROMPTS.map(text => ({ text, ids: encode(text) })),
  rare: RARE.map(r => ({ ...r, ids: encode(r.text) })),
};
for (const p of out.syntheticData.products)
  if (!train.ids.some(d => has(d, p.ids))) throw new Error(`product ${p.text} is not in the training split`);
for (const r of RARE) {
  if (!out.splits.heldout.docs.includes(r.doc) || !read(r.doc).includes(r.text))
    throw new Error(`rare prompt is not held-out text: ${r.text}`);
  for (const ps of Object.values(r.facts))
    if (!ps.some(p => train.docs.some(f => read(f).includes(p)))) throw new Error(`fact ${ps} is not in training`);
}
// one doc per line keeps the file diffable
const json = JSON.stringify(out).replace(/\],\[/g, '],\n[');
fs.writeFileSync(OUT, json + '\n');
const n = s => s.ids.reduce((a, d) => a + d.length, 0);
console.log(`style set ${out.styleSet.ids.flat().length} tokens (${out.styleSet.ids.length} examples)`);
console.log(
  `train ${n(out.splits.train)} tokens (${out.splits.train.docs.length} docs), heldout ${n(out.splits.heldout)} tokens (${out.splits.heldout.docs.length} docs)`,
);
