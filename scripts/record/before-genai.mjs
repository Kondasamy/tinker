/**
 * Records Before GenAI's GenAI bot (KTD6): one dated run of every fixed customer message (data/before-genai/
 * messages.json) through one instruction-tuned model, into data/before-genai/replies.json. Run by hand, never in tests:
 *
 *   NVIDIA_API_KEY=… node scripts/record/before-genai.mjs
 *
 * Replies are not reproducible run to run, so the committed file is the record: read every reply before committing,
 * and never hand-edit one. A reply that doesn't show what its chapter needs means a new message and a new run.
 * Calls are cached in .cache/before-genai-record/ so a crashed run resumes where it stopped instead of asking again.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import messages from '../../data/before-genai/messages.json' with { type: 'json' };
import { apiKey, chat, listModels, pickModel } from '../lib/nvidia.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'data/before-genai/replies.json');
const CACHE = path.join(ROOT, '.cache/before-genai-record');
const WANTED = 'meta/llama-3.3-70b-instruct';
const SETTINGS = { temperature: 0, seed: 7, maxTokens: 1024 };
const THROTTLE_MS = 2500;
// No orders, no tools, no policies: whatever the model gets wrong, it gets wrong on its own (chapter 8's gaps).
const SYSTEM =
  'You are the customer help assistant on the website of Larkspur Supply Co., a hardware store. Reply to the customer in a few sentences. You cannot look up orders or accounts and cannot take any action.';

const key = apiKey('record/before-genai');
const model = pickModel(await listModels(key), WANTED);
// one probe call: listed is not always callable
if (!(await chat(key, { model, messages: [{ role: 'user', content: 'Reply with the word ready.' }] })))
  throw new Error(`probe failed for ${model}`);

fs.mkdirSync(CACHE, { recursive: true });
const replies = {};
for (const m of messages.messages) {
  const file = path.join(
    CACHE,
    `${crypto.createHash('sha256').update(`${model}\n${SYSTEM}\n${m.text}`).digest('hex').slice(0, 16)}.json`,
  );
  let text;
  if (fs.existsSync(file)) text = JSON.parse(fs.readFileSync(file, 'utf8')).text;
  else {
    text = await chat(key, {
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: m.text },
      ],
      ...SETTINGS,
    });
    if (text === null) throw new Error(`no reply for ${m.id}: change the message, then run again`);
    fs.writeFileSync(file, JSON.stringify({ text }));
    await new Promise(ok => setTimeout(ok, THROTTLE_MS));
  }
  replies[m.id] = text;
  console.log(`${m.id}: ${text.slice(0, 80)}`);
}

const out = {
  model,
  recorded: new Date().toISOString().slice(0, 10),
  settings: { temperature: SETTINGS.temperature, seed: SETTINGS.seed, max_tokens: SETTINGS.maxTokens },
  provider: 'https://integrate.api.nvidia.com/v1',
  system: SYSTEM,
  replies,
};
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
