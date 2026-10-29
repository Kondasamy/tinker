/**
 * Records Watermarks chapter 1's machine replies (KTD4): one dated run of a capable model answering the same customer
 * questions Larkspur's support team answered in data/watermarks/human.json. Run by hand, never in tests:
 *   NVIDIA_API_KEY=… node scripts/record/watermarks.mjs
 * Writes data/watermarks/machine.json; review it before committing. Replies vary between runs even at temperature 0,
 * so the committed file is the record, and a rerun is a new recording, never a retry for a better one.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SCRIPT = 'scripts/record/watermarks.mjs';
const OUT = 'data/watermarks/machine.json';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const SETTINGS = { temperature: 0, seed: 7, max_tokens: 4096 };
const SYSTEM =
  'You answer customer emails for Larkspur Supply Co., a hardware and shelving supplier for builders. Write the reply body only: plain text, 40 to 70 words, friendly and direct, no subject line, no sign-off, no lists or formatting. If you do not know a detail, keep it general rather than inventing numbers.';

// A minimal NVIDIA client with the shared scripts/lib/nvidia.mjs API (apiKey, chat), so it can be swapped for it.
const API = 'https://integrate.api.nvidia.com/v1';
function apiKey(script) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    console.error(`${script}: set NVIDIA_API_KEY in the environment (it is never read from or written to a file).`);
    process.exit(1);
  }
  return key;
}
const wait = ms => new Promise(ok => setTimeout(ok, ms));
async function chat(key, { model, messages, max_tokens, temperature, seed }) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens, temperature, seed }),
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      console.warn(`NVIDIA ${r.status}, retrying`);
      await wait(2000 * 2 ** attempt);
      continue;
    }
    if (!r.ok) throw new Error(`NVIDIA ${r.status} for ${model}: ${(await r.text()).slice(0, 200)}`);
    const c = (await r.json()).choices[0];
    return { content: (c.message.content ?? '').trim(), finish_reason: c.finish_reason };
  }
}
async function models(key) {
  const r = await fetch(`${API}/models`, { headers: { authorization: `Bearer ${key}` } });
  return r.ok ? (await r.json()).data.map(m => m.id) : [];
}

const key = apiKey(SCRIPT);
const human = JSON.parse(fs.readFileSync('data/watermarks/human.json', 'utf8'));
const listed = await models(key);
if (listed.length && !listed.includes(MODEL)) console.warn(`${MODEL} is not listed; the probe call decides.`);

const replies = [];
for (const h of human.replies) {
  let rec = { id: h.id, question: h.question, reply: null, norecord: true };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { content, finish_reason } = await chat(key, {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: h.question },
      ],
      ...SETTINGS,
    });
    if (content && finish_reason !== 'length') {
      rec = { id: h.id, question: h.question, reply: content };
      break;
    }
    await wait(1000);
  }
  console.log(h.id, rec.reply ? `${rec.reply.split(/\s+/).length} words` : 'norecord');
  replies.push(rec);
  await wait(500);
}

const meta = {
  model: MODEL,
  provider: API,
  accessed: new Date().toISOString().slice(0, 10),
  settings: SETTINGS,
  system: SYSTEM,
  script: SCRIPT,
  git: execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim(),
};
fs.writeFileSync(
  OUT,
  `${JSON.stringify({ note: 'Recorded model replies for chapter 1, one run; see meta.', meta, replies }, null, 2)}\n`,
);
console.log(`wrote ${OUT}`);
