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
// the first one this key lists, in order: the chat models the repo already records with (scripts/record/prompts.mjs)
const WANTED = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'nvidia/nemotron-3-ultra-550b-a55b'];
// reasoning models think before they answer, so the limit leaves room for that
const SETTINGS = { temperature: 0, seed: 7, maxTokens: 8192 };
const THROTTLE_MS = 2500;
// No orders, no tools, no policies: whatever the model gets wrong, it gets wrong on its own (chapter 8's gaps).
const SYSTEM =
  'You are the customer help assistant on the website of Larkspur Supply Co., a hardware store. Reply to the customer in a few sentences. You cannot look up orders or accounts and cannot take any action.';

// Made-up contacts may belong to someone real, so none is published as written (R13, as scripts/record/prompts.mjs):
// .com, .net, .org and .io domains become .example, and phone numbers become a 555 number reserved for fiction.
const REDACTED = 'made-up domains rewritten to .example and phone numbers to 1-800-555-0100 (R13)';
const redact = text =>
  text
    .replace(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.(?:com|net|org|io)\b/gi, '$1.example')
    .replace(/\b1[-‑ ]?8\d\d[-‑ ][A-Z0-9][-‑A-Z0-9]{6,}(?: \(1[-‑ ]?8\d\d[-‑ ][\d-‑]{8}\))?/g, '1-800-555-0100')
    .replace(/\b8\d\d[-‑ ]\d{3}[-‑ ]\d{4}\b/g, '800-555-0100');

const key = apiKey('record/before-genai');
const listed = await listModels(key);
const model = WANTED.find(id => listed.includes(id)) ?? pickModel(listed, WANTED[0]);
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
  replies[m.id] = redact(text);
  console.log(`${m.id}: ${text.slice(0, 80)}`);
}

const out = {
  model,
  recorded: new Date().toISOString().slice(0, 10),
  settings: { temperature: SETTINGS.temperature, seed: SETTINGS.seed, max_tokens: SETTINGS.maxTokens },
  provider: 'https://integrate.api.nvidia.com/v1',
  system: SYSTEM,
  redacted: REDACTED,
  replies,
};
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
