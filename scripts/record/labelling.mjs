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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://integrate.api.nvidia.com/v1';
const MODELS = { main: 'nvidia/nemotron-3-ultra-550b-a55b', check: 'openai/gpt-oss-20b' };
const SETTINGS = { temperature: 0, seed: 1, max_tokens: 4096 };

const key = process.env.NVIDIA_API_KEY;
if (!key) {
  console.error(
    'record/labelling: set NVIDIA_API_KEY in the environment (it is never read from or written to a file).',
  );
  process.exit(1);
}
const headers = { authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const wait = ms => new Promise(ok => setTimeout(ok, ms));

/** One chat completion's text, retrying errors, 429s, cut-off and empty replies 3 times with backoff; null after. */
async function chat(model, messages) {
  for (let attempt = 0; attempt <= 3; attempt++) {
    if (attempt) await wait(2000 * 2 ** attempt);
    try {
      const r = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, ...SETTINGS }),
      });
      if (!r.ok) {
        console.warn(`${model}: ${r.status} ${(await r.text()).slice(0, 120)}`);
        continue;
      }
      const c = (await r.json()).choices?.[0];
      if (c?.finish_reason === 'length' || !c?.message?.content?.trim()) continue;
      return c.message.content;
    } catch (e) {
      console.warn(`${model}: ${e.message}`);
    }
  }
  return null;
}

const tickets = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/labelling/tickets.json'), 'utf8'));
const { hard } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/labelling/pinned.json'), 'utf8'));
const ids = tickets.intents.map(i => i.id);

// the models must still be callable; a gone one is swapped for the nearest of its family, and meta says so
const listed = new Set(((await (await fetch(`${API}/models`, { headers })).json()).data ?? []).map(m => m.id));
for (const [k, id] of Object.entries(MODELS))
  if (!listed.has(id)) {
    const family = id.split('-').slice(0, 2).join('-'),
      sub = [...listed].find(m => m.startsWith(family));
    if (!sub) throw new Error(`${id} is gone and nothing of its family is listed`);
    console.warn(`${id} is gone; using ${sub}`);
    MODELS[k] = sub;
  }

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
    const reply = await chat(id, [
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
