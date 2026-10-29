/**
 * Records Watermarks chapter 1's machine replies (KTD4): one dated run of a capable model answering the same customer
 * questions Larkspur's support team answered in data/watermarks/human.json. Run by hand, never in tests:
 *   NVIDIA_API_KEY=… node scripts/record/watermarks.mjs
 * Writes data/watermarks/machine.json; review it before committing. Replies vary between runs even at temperature 0,
 * so the committed file is the record, and a rerun is a new recording, never a retry for a better one.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { API, apiKey, chat, listModels, wait } from '../lib/nvidia.mjs';

const SCRIPT = 'scripts/record/watermarks.mjs';
const OUT = 'data/watermarks/machine.json';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const SETTINGS = { temperature: 0, seed: 7, max_tokens: 4096 };
const SYSTEM =
  'You answer customer emails for Larkspur Supply Co., a hardware and shelving supplier for builders. Write the reply body only: plain text, 40 to 70 words, friendly and direct, no subject line, no sign-off, no lists or formatting. If you do not know a detail, keep it general rather than inventing numbers.';

const key = apiKey(SCRIPT);
const human = JSON.parse(fs.readFileSync('data/watermarks/human.json', 'utf8'));
const listed = await listModels(key).catch(() => []);
if (listed.length && !listed.includes(MODEL)) console.warn(`${MODEL} is not listed; the probe call decides.`);

const replies = [];
for (const h of human.replies) {
  // chat asks again on a cut-off or empty reply, 3 times, then gives null: a norecord
  const reply = await chat(key, {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: h.question },
    ],
    temperature: SETTINGS.temperature,
    seed: SETTINGS.seed,
    maxTokens: SETTINGS.max_tokens,
  });
  const rec = reply
    ? { id: h.id, question: h.question, reply }
    : { id: h.id, question: h.question, reply: null, norecord: true };
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
