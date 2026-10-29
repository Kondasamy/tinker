#!/usr/bin/env node
/**
 * Records the agent turns for When the buyer is an agent (KTD4): one dated run of one named model through the NVIDIA
 * API, written to data/agent-commerce/turns/<chapter>.json keyed by what each agent saw (src/lib/agent-commerce/seen.ts).
 * Run by hand, never in tests: replies vary run to run, so the reviewed file is the record. A turn the model cannot
 * give (an error, a cut-off or unreadable reply after 3 tries) comes from the simulator instead, marked `simulated`.
 *
 *   NVIDIA_API_KEY=… node scripts/record/agent-commerce.mjs [page|menu|task|offer…]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sellersData from '../../data/agent-commerce/sellers.json' with { type: 'json' };
import shop from '../../data/agent-commerce/shop.json' with { type: 'json' };
import { FILES, offerSig, readSig, taskSig } from '../../src/lib/agent-commerce/seen.ts';
import { SIMULATOR, simBuyer, simRead, simSeller } from '../../src/lib/agent-commerce/simulate.ts';
import { apiKey, chat, listModels, wait } from '../lib/nvidia.mjs';

const SCRIPT = 'scripts/record/agent-commerce.mjs';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const SETTINGS = { temperature: 0, seed: 7, max_tokens: 8192 };
const ACCESSED = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(import.meta.dirname, '../../data/agent-commerce/turns');

const KEY = apiKey(SCRIPT);
const { max_tokens: maxTokens, ...rest } = SETTINGS;
const CALL = { model: MODEL, ...rest, maxTokens };

/** The model's JSON reply, read and checked by `ok`; up to 3 tries, else null so the simulator fills it. */
async function ask(messages, ok) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // one try per chat: this loop retries cut-off and empty replies along with unreadable ones
      const content = await chat(KEY, { ...CALL, messages, tries: 1 });
      const json = content?.match(/\{[\s\S]*\}/)?.[0];
      const reply = json ? JSON.parse(json) : null;
      if (reply && ok(reply)) return { reply, content };
      console.warn(`unreadable reply: ${content?.slice(0, 120)}`);
    } catch (e) {
      console.warn(String(e));
    }
    await wait(1000 * 2 ** attempt);
  }
  return null;
}

const usd = cents => `$${(cents / 100).toFixed(2)}`;
const short = s => typeof s === 'string' && s.length > 0 && s.length <= 240;

async function check() {
  if (!(await listModels(KEY)).includes(MODEL)) console.warn(`${MODEL} is not listed; trying it anyway`);
  const probe = await chat(KEY, { ...CALL, messages: [{ role: 'user', content: 'Reply with {"ok": true}.' }] });
  if (!probe) throw new Error(`${MODEL} gave an empty probe reply`);
}

const buyerSystem = `You are ${shop.buyerAgent}, an AI agent that buys supplies for ${shop.builder.firm}. Reply with JSON only.`;

async function recordReads(view) {
  const turns = {};
  for (const [sku, { text }] of Object.entries(shop.asks)) {
    const source =
      view === 'page'
        ? `The shop's web page:\n${shop.page}`
        : `The shop's catalogue (prices in US cents):\n${JSON.stringify(shop.catalogue, null, 1)}`;
    const got = await ask(
      [
        { role: 'system', content: buyerSystem },
        {
          role: 'user',
          content: `${text}\n\n${source}\n\nWhat will the whole order cost before tax? Reply as {"total_usd": number, "note": "one short sentence on how you got it"}.`,
        },
      ],
      r => typeof r.total_usd === 'number' && short(r.note),
    );
    turns[readSig(view, sku)] = got
      ? { text: got.reply.note, total: Math.round(got.reply.total_usd * 100) }
      : simRead(view, sku);
    console.log(view, sku, turns[readSig(view, sku)]);
  }
  return turns;
}

const sellerSystem = `You are ${shop.sellerAgent}, the AI sales agent of ${shop.company}. Other companies' buying agents send you orders as A2A tasks. Catalogue (prices in US cents):\n${JSON.stringify(shop.catalogue, null, 1)}\nComplete an order only when you know the exact item and quantity; otherwise ask one short question. Reply with JSON only: {"state": "completed" | "input-required" | "failed", "message": "one short sentence to the buying agent", "sku": string or null, "qty": number or null}.`;

async function recordTask() {
  const turns = {};
  for (const request of ['clear', 'vague']) {
    const messages = [
      { role: 'system', content: sellerSystem },
      { role: 'user', content: request === 'clear' ? shop.request : shop.vagueRequest },
    ];
    const hist = [];
    // the host's loop (task.ts): at most three turns, an answer after each question
    for (let n = 0; n < 3; n++) {
      const got = await ask(
        messages,
        r => ['completed', 'input-required', 'failed'].includes(r.state) && short(r.message),
      );
      const turn = got
        ? { text: got.reply.message, state: got.reply.state, sku: got.reply.sku ?? null, qty: got.reply.qty ?? null }
        : simSeller(request, hist);
      turns[taskSig(request, hist)] = turn;
      console.log(request, hist, turn);
      if (turn.state !== 'input-required') break;
      messages.push(
        { role: 'assistant', content: got?.content ?? JSON.stringify(turn) },
        { role: 'user', content: shop.answer },
      );
      hist.push('asked');
    }
  }
  return turns;
}

async function recordOffers() {
  const turns = {};
  for (const s of sellersData.sellers) {
    const total = s.lines.reduce((t, l) => t + l.qty * l.unit, 0);
    const cart = s.lines
      .map(l => `${l.qty} × ${shop.catalogue.find(i => i.sku === l.sku)?.name} at ${usd(l.unit)}`)
      .join('; ');
    const charge = new Date(Date.parse(shop.today) + s.delayHours * 3600e3).toISOString().slice(0, 10);
    const got = await ask(
      [
        {
          role: 'system',
          content: `${buyerSystem} Your task: ${shop.request}. You carry a spending slip signed by ${shop.builder.name}; you cannot read or change it, and the seller's shop checks it.`,
        },
        {
          role: 'user',
          content: `Today is ${shop.today.slice(0, 10)}. A seller replied.\nSeller: ${s.name} (${s.domain})\nMessage: ${s.message}\nCart: ${cart}; total ${usd(total)}, charged on ${charge}.\n\nDo you send this order with the slip? Reply as {"accept": true or false, "reason": "one short sentence"}.`,
        },
      ],
      r => typeof r.accept === 'boolean' && short(r.reason),
    );
    turns[offerSig(s.id)] = got ? { text: got.reply.reason, accept: got.reply.accept } : simBuyer(s.id);
    console.log(s.id, turns[offerSig(s.id)]);
  }
  return turns;
}

function write(name, turns) {
  const simulated = Object.values(turns).some(t => t.simulated);
  const meta = {
    model: MODEL,
    accessed: ACCESSED,
    settings: SETTINGS,
    script: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(),
    ...(simulated ? { simulator: SIMULATOR } : {}),
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.json`), `${JSON.stringify({ meta, turns }, null, 2)}\n`);
}

// `node scripts/record/agent-commerce.mjs task` records only the named parts (page, menu, task, offer)
const only = process.argv.slice(2);
const want = part => !only.length || only.includes(part);
await check();
if (want('page')) write(FILES.page, await recordReads('page'));
if (want('menu')) write(FILES.menu, await recordReads('menu'));
if (want('task')) write(FILES.task, await recordTask());
if (want('offer')) write(FILES.offer, await recordOffers());
