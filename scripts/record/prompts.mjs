/**
 * Records Writing a prompt's replies (KTD4): one dated run over every signature the chapters' DOMAINS reach, each
 * filed under the first chapter that reaches it, into data/prompts/replies/<chapter>.json. Run by hand, never in tests:
 *
 *   NVIDIA_API_KEY=… node scripts/record/prompts.mjs
 *
 * Replies are not reproducible run to run, so the committed files are the record: review them, commit them, and
 * never rerun in search of a better result. A reply that stays empty or cut off is written by the simulator
 * (src/lib/prompts/simulate.ts) and marked `simulated`. Calls are cached in .cache/prompts-record/ so a crashed
 * run resumes where it stopped instead of asking again.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { apiKey, chat, listModels, pickModel, redactDomains } from '../lib/nvidia.mjs';
import { DOMAINS, assemble, combos, signature } from '../../src/lib/prompts/assemble.ts';
import { simulateReply, VERSION } from '../../src/lib/prompts/simulate.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'data/prompts/replies');
const CACHE = path.join(ROOT, '.cache/prompts-record');
const WANTED = { main: 'nvidia/nemotron-3-ultra-550b-a55b', small: 'openai/gpt-oss-20b' };
const SETTINGS = { temperature: 0, seed: 7, maxTokens: 8192 };
const THROTTLE_MS = 2500;
const ACCESSED = new Date().toISOString().slice(0, 10);

/** Domains a model makes up are rewritten to .example (R13), so no reply points at a real site. */
const REDACTED = 'made-up .com, .net, .org and .io domains rewritten to .example (R13)';
const redact = redactDomains;

const key = apiKey('record/prompts');
const listed = await listModels(key);
const models = { main: pickModel(listed, WANTED.main), small: pickModel(listed, WANTED.small) };
// one probe call per model: listed is not always callable
for (const m of Object.values(models)) {
  const probe = await chat(key, { model: m, messages: [{ role: 'user', content: 'Reply with the word ready.' }] });
  if (!probe) throw new Error(`probe failed for ${m}`);
  console.log(`probe ${m}: ${probe.slice(0, 40)}`);
}

// every reachable signature, filed under the first chapter that reaches it
const files = {};
const seen = new Set();
for (const [chapter, domain] of Object.entries(DOMAINS))
  for (const s of combos(domain)) {
    const sig = signature(s);
    if (seen.has(sig)) continue;
    seen.add(sig);
    (files[chapter] ??= []).push({ sig, s });
  }
console.log(`${seen.size} signatures over ${Object.keys(files).length} files`);

fs.mkdirSync(CACHE, { recursive: true });
const cached = (model, prompt) =>
  path.join(CACHE, `${crypto.createHash('sha256').update(`${model}\n${prompt}`).digest('hex').slice(0, 16)}.json`);

let n = 0;
for (const [chapter, list] of Object.entries(files)) {
  const replies = {};
  let simulated = 0;
  for (const { sig, s } of list) {
    const model = models[s.model],
      prompt = assemble(s),
      file = cached(model, prompt);
    let text;
    if (fs.existsSync(file)) text = JSON.parse(fs.readFileSync(file, 'utf8')).text;
    else {
      text = await chat(key, { model, messages: [{ role: 'user', content: prompt }], ...SETTINGS });
      fs.writeFileSync(file, JSON.stringify({ text }));
      await new Promise(ok => setTimeout(ok, THROTTLE_MS));
    }
    replies[sig] = text === null ? { text: simulateReply(s), simulated: true } : { text: redact(text) };
    if (text === null) simulated++;
    console.log(`${++n}/${seen.size} ${chapter} ${sig}${text === null ? ' (norecord: simulated)' : ''}`);
  }
  const meta = {
    models,
    accessed: ACCESSED,
    settings: { temperature: SETTINGS.temperature, seed: SETTINGS.seed, max_tokens: SETTINGS.maxTokens },
    provider: 'https://integrate.api.nvidia.com/v1',
    redacted: REDACTED,
    script: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim(),
    ...(simulated ? { simulated, simulator: VERSION } : {}),
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${chapter}.json`), `${JSON.stringify({ meta, replies }, null, 2)}\n`);
}
