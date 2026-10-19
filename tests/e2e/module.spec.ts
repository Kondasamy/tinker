// The whole module in one browser, chapter 1 to the final challenge, following each chapter's "Next" link.
// Fast paths ("Show me") where a step has one; the per-chapter specs cover the details.
import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const btn = (page: Page, name: string | RegExp) => card(page).getByRole('button', { name }).click();
const step = (page: Page, n: number) => expect(card(page)).toContainText(`Step ${n} of`);
const showMe = (page: Page) => btn(page, 'Show me');

async function next(page: Page, path: RegExp) {
  await expect(card(page)).toContainText('Chapter complete');
  await card(page).getByRole('link', { name: /Next:/ }).click();
  await expect(page).toHaveURL(path);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card(page)).toContainText('Step 1 of');
}

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(120_000);

test('full module: chapter 1 to the final challenge', async ({ page }) => {
  await page.goto('/rag/01-history/');
  await page.locator('astro-island:not([ssr])').waitFor();

  // 1. History
  await btn(page, /^Ask/);
  for (let i = 0; i < 4; i++) { await step(page, i + 2); await page.locator(`[data-era="${i}"]`).click(); }
  await btn(page, /did not fit/);
  await next(page, /02-why-not-stuff-it/);

  // 2. Why not stuff it
  await btn(page, /^Ask/);
  const slider = card(page).getByRole('slider');
  await slider.fill('7');
  await step(page, 3);
  await slider.fill('8');
  for (const reason of ['Lost in the middle', 'Freshness', 'Who may see what']) await btn(page, `Next reason: ${reason} →`);
  await btn(page, /no context window holds it/);
  await next(page, /03-what-is-rag/);

  // 3. What is RAG
  await btn(page, /^Ask/);
  await btn(page, 'Add the Docs');
  await btn(page, 'Add the Retriever');
  await btn(page, 'See what the retriever found');
  await page.getByRole('complementary').getByLabel('Show the math').check();
  await btn(page, /few passages that match/);
  await next(page, /04-layers/);

  // 4. Layers
  await btn(page, /^Ask/);
  await btn(page, 'Add the Chunker');
  await btn(page, 'Add the Embedder and Index');
  await page.locator('.map circle[tabindex]').first().focus();
  await btn(page, 'Add the Context assembler');
  await showMe(page);
  await btn(page, /cut the sentence right after/);
  await next(page, /05-accuracy/);

  // 5. Accuracy: every puzzle by Show me
  const nextPuzzle = () => btn(page, 'Next puzzle →');
  const solve = async (n: number) => { await step(page, n); await showMe(page); await step(page, n + 1); };
  await btn(page, /^Ask/);
  await btn(page, 'Add the Evaluator');
  await btn(page, 'Retrieve 5 chunks instead of 3');
  await solve(4);
  await btn(page, 'Add Query rewrite');
  await solve(6);
  await nextPuzzle();
  await solve(8);
  await btn(page, 'Add the Reranker');
  await solve(10);
  await nextPuzzle();
  await solve(12);
  await nextPuzzle();
  await solve(14);
  await nextPuzzle();
  await solve(16);
  await btn(page, /What reached the model/);
  await next(page, /06-types/);

  // 6. Types
  const run = () => card(page).getByRole('button', { name: /^Run as/ }).click();
  const pick = (label: string | RegExp) => card(page).getByLabel(label).check();
  await btn(page, 'Compare types →');
  await pick('Can enterprise customers get a refund?');
  await run();
  await step(page, 3);
  await showMe(page);                                   // attach the agent
  await step(page, 4);
  await run();
  await step(page, 5);
  await pick('What is the hotel limit per night?');
  await run();
  await pick('Naive / advanced');
  await run();
  await btn(page, /follow-up can fetch the rest/);
  await step(page, 7);
  await pick(/Kestrel K2 scanner integration/);
  await run();
  await pick('Agentic');
  await run();
  await step(page, 8);
  await showMe(page);                                   // attach the graph
  await run();
  await step(page, 10);
  const hops = card(page).getByLabel(/Hops from the question/);
  await hops.focus();
  await hops.press('ArrowRight');
  await run();
  await btn(page, /chains facts across documents/);
  await step(page, 12);
  await run();
  await showMe(page);                                   // self-correcting
  await step(page, 14);
  await run();
  await showMe(page);                                   // multimodal
  await step(page, 16);
  await run();
  await pick('Parse tables to text');
  await run();
  await step(page, 18);
  await pick(/vendor PDF/);
  await pick('Parse PDFs to text');
  await run();
  await pick(/org chart image/);
  await pick('Caption images');
  await run();
  await next(page, /07-sandbox/);

  // 7. Sandbox and the final challenge
  await page.getByRole('button', { name: 'Open the workbench' }).click();
  await step(page, 2);
  await btn(page, 'Take the final challenge →');
  const best = ['GraphRAG', 'Naive / advanced', 'Multimodal', 'Self-correcting', 'Agentic'];
  for (let i = 0; i < best.length; i++) {
    await card(page).getByRole('button', { name: best[i], exact: true }).click();
    if (i < best.length - 1) await btn(page, 'Next problem →');
  }
  await expect(card(page).getByRole('region', { name: 'Module complete' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  for (const id of ['01-history', '02-why-not-stuff-it', '03-what-is-rag', '04-layers', '05-accuracy', '06-types'])
    await expect(nav.locator(`[data-chapter="${id}"]`)).toHaveAttribute('data-mark', 'done');
});
