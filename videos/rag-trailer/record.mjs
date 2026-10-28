// Records three live RAG chapters being played by hand (1920×1080), one take each. Clicks land on a schedule
// (ms after the take's first click) timed to the narration in SCRIPT.md, and each click's centre and time
// (ms from page creation) is logged to clicks.json for the cursor overlay.
// Usage: node videos/<folder>/record.mjs [base-url] [out-dir, default <folder>/capture]
import { chromium } from '@playwright/test';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [BASE = 'http://127.0.0.1:4517', OUT = join(dirname(fileURLToPath(import.meta.url)), 'capture')] =
  process.argv.slice(2);
const PREROLL = 3000; // still frames before the first click, so the cut can start before it
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const logs = {};

async function take(name, path, play, tail) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const log = [];
  let go = 0;
  // click `loc` at `ms` after the first click (the first click sets that zero)
  async function click(loc, label, ms) {
    if (go) await page.waitForTimeout(Math.max(0, go + ms - 350 - Date.now()));
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const b = await loc.boundingBox();
    if (!go) go = Date.now();
    log.push({ label, t: Date.now() - t0, x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) });
    await loc.click();
  }
  await page.goto(BASE + path);
  await page.locator('astro-island:not([ssr])').first().waitFor();
  const card = page.getByRole('region', { name: 'Next step' });
  await card.getByText('Step 1 of').waitFor();
  log.push({ label: 'loaded', t: Date.now() - t0 });
  await page.waitForTimeout(PREROLL);
  await play({ page, card, click });
  await page.waitForTimeout(Math.max(0, go + tail - Date.now()));
  log.push({ label: 'end', t: Date.now() - t0 });
  const v = page.video();
  await ctx.close();
  renameSync(await v.path(), `${OUT}/${name}.webm`);
  logs[name] = log;
}

// chapter 1 (lines 01–02): the 2023 assistant guesses, then the history unfolds era by era
await take(
  'ch1',
  '/rag/01-history/',
  async ({ page, card, click }) => {
    await click(card.getByRole('button', { name: /^Ask/ }), 'ask', 0);
    for (const [i, ms] of [7400, 9200, 10900, 12600].entries())
      await click(page.locator(`[data-era="${i}"]`), `era-${i}`, ms);
  },
  15500,
);

// chapter 3 (lines 03–04): made up, then Docs, a prediction, the Retriever, and a grounded answer with its citation
await take(
  'ch3',
  '/rag/03-what-is-rag/',
  async ({ card, click }) => {
    await click(card.getByRole('button', { name: /^Ask/ }), 'ask', 0);
    await click(card.getByRole('button', { name: 'Add the Docs' }), 'docs', 1600);
    await click(card.getByRole('radio', { name: /cites the policy/ }), 'predict', 4600);
    await click(card.getByRole('button', { name: 'Add the Retriever' }), 'retriever', 7300);
    await click(card.getByRole('button', { name: 'See what the retriever found' }), 'evidence', 13600);
  },
  16800,
);

// chapter 7 (line 05): every block on the workbench, run as GraphRAG
await take(
  'ch7',
  '/rag/07-sandbox/',
  async ({ page, card, click }) => {
    await click(page.getByRole('button', { name: 'Open the workbench' }), 'workbench', 0);
    await click(card.getByRole('button', { name: 'Run as GraphRAG' }), 'run-graph', 2500);
  },
  7000,
);

await browser.close();
writeFileSync(`${OUT}/clicks.json`, JSON.stringify(logs, null, 2));
console.log(JSON.stringify(logs));
