/**
 * Who labels the data, chapter 6 (KTD4, KTD5): records two model labellers' intents for the twenty tickets the triage
 * model is least sure of (data/labelling/pinned.json `hard`) into data/labelling/model-labels.json. Run once by hand
 * (`NVIDIA_API_KEY=… node scripts/record/labelling.mjs`), reviewed and frozen; tests never call the API. The key comes
 * only from the environment and is never written anywhere.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, apiKey, chat, listModels, pickModel, wait } from '../lib/nvidia.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODELS = { main: 'nvidia/nemotron-3-ultra-550b-a55b', check: 'openai/gpt-oss-20b' };
const SETTINGS = { temperature: 0, seed: 1, max_tokens: 4096 };

const key = apiKey('record/labelling');

/** One chat completion's text, or null (a norecord) when the API fails or the reply stays cut off or empty. */
const label = (model, messages) =>
  chat(key, {
    model,
    messages,
    temperature: SETTINGS.temperature,
    seed: SETTINGS.seed,
    maxTokens: SETTINGS.max_tokens,
  }).catch(e => {
    console.warn(`${model}: ${e.message}`);
    return null;
  });

const tickets = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/labelling/tickets.json'), 'utf8'));
const { hard } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/labelling/pinned.json'), 'utf8'));
const ids = tickets.intents.map(i => i.id);

// the models must still be callable; a gone one is swapped for the nearest of its family, and meta says so
const listed = await listModels(key);
for (const [k, id] of Object.entries(MODELS)) MODELS[k] = pickModel(listed, id);

const system = [
  'You label customer support tickets for Larkspur Supply Co., a hardware company, by intent.',
  'The labelling guideline:',
  ...ids.map(i => `- ${i}: ${tickets.guideline[i]}`),
  `Answer with exactly one word: ${ids.join(', ')}.`,
].join('\n');
const parse = text => {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return words.find(w => ids.includes(w)) ?? null;
};

const models = {};
for (const [k, id] of Object.entries(MODELS)) {
  const labels = {};
  for (const tid of hard) {
    const t = tickets.tickets.find(t => t.id === tid);
    const reply = await label(id, [
      { role: 'system', content: system },
      { role: 'user', content: t.text },
    ]);
    labels[tid] = reply === null ? null : parse(reply);
    console.log(`${k} ${tid} ${labels[tid] ?? 'norecord'} (answer ${t.intent})`);
    await wait(1500);
  }
  models[k] = { id, labels };
}

const git = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
const out = {
  meta: {
    note: 'Recorded once from the NVIDIA API and frozen; replies varied between runs, so this file is the record. A null label is a norecord.',
    date: new Date().toISOString().slice(0, 10),
    provider: API,
    settings: SETTINGS,
    system,
    script: `scripts/record/labelling.mjs at ${git}`,
  },
  models,
};
fs.writeFileSync(path.join(ROOT, 'data/labelling/model-labels.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log('record/labelling: wrote data/labelling/model-labels.json');
