// The whole module in one browser, chapter 1 to the final challenge, following each chapter's "Next" link.
// Fast paths ("Show me") where a step has one; the per-chapter specs cover the details.
// Shared by module.spec (mouse), a11y.spec (keyboard only) and mobile.spec (390 px, touch).
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export async function walkModule(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = async (l: Locator) => { if (kb) { await l.focus(); await l.press('Space'); await expect(l).toBeChecked(); } else await l.check(); };
  const slide = async (l: Locator, v: string) => {
    if (!kb) return l.fill(v);
    // read once: reaching the value can complete the step and remove the slider
    const n = +v - +(await l.inputValue());
    for (let i = 0; i < n; i++) await l.press('ArrowRight');
  };
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const showMe = () => btn('Show me');

  async function next(path: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    await press(card.getByRole('link', { name: /Next:/ }));
    await expect(page).toHaveURL(path);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }

  await page.goto('/rag/01-history/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await check(page);

  // 1. History
  await btn(/^Ask/);
  for (let i = 0; i < 4; i++) { await step(i + 2); await press(page.locator(`[data-era="${i}"]`)); }
  await opt(/did not fit/);
  await next(/02-why-not-stuff-it/);

  // 2. Why not stuff it
  await btn(/^Ask/);
  const slider = card.getByRole('slider');
  await slide(slider, '7');
  await step(3);
  await slide(slider, '8');
  for (const reason of ['Lost in the middle', 'Freshness', 'Who may see what']) await btn(`Next reason: ${reason} →`);
  await opt(/no context window holds it/);
  await next(/03-what-is-rag/);

  // 3. What is RAG
  await btn(/^Ask/);
  await btn('Add the Docs');
  await btn('Add the Retriever');
  await btn('See what the retriever found');
  await tick(page.getByRole('complementary').getByLabel('Show the math'));
  await opt(/few passages that match/);
  await next(/04-layers/);

  // 4. Layers
  await btn(/^Ask/);
  await btn('Add the Chunker');
  await btn('Add the Embedder and Index');
  await page.locator('.map circle[tabindex]').first().focus();
  await btn('Add the Context assembler');
  await showMe();
  await opt(/cut the sentence right after/);
  await next(/05-accuracy/);

  // 5. Accuracy: every puzzle by Show me
  const nextPuzzle = () => btn('Next puzzle →');
  const solve = async (n: number) => { await step(n); await showMe(); await step(n + 1); };
  await btn(/^Ask/);
  await btn('Add the Evaluator');
  await btn('Retrieve 5 chunks instead of 3');
  await solve(4);
  await btn('Add Query rewrite');
  await solve(6);
  await nextPuzzle();
  await solve(8);
  await btn('Add the Reranker');
  await solve(10);
  await nextPuzzle();
  await solve(12);
  await nextPuzzle();
  await solve(14);
  await nextPuzzle();
  await solve(16);
  await opt(/What reached the model/);
  await next(/06-types/);

  // 6. Types
  const run = () => press(card.getByRole('button', { name: /^Run as/ }));
  const pick = (label: string | RegExp) => tick(card.getByLabel(label));
  await btn('Compare types →');
  await pick('Can enterprise customers get a refund?');
  await run();
  await step(3);
  await showMe();                                   // attach the agent
  await step(4);
  await run();
  await step(5);
  await pick('What is the hotel limit per night?');
  await run();
  await pick('Naive / advanced');
  await run();
  await opt(/follow-up can fetch the rest/);
  await step(7);
  await pick(/Kestrel K2 scanner integration/);
  await run();
  await pick('Agentic');
  await run();
  await step(8);
  await showMe();                                   // attach the graph
  await run();
  await step(10);
  const hops = card.getByLabel(/Hops from the question/);
  await hops.focus();
  await hops.press('ArrowRight');
  await run();
  await opt(/chains facts across documents/);
  await step(12);
  await run();
  await showMe();                                   // self-correcting
  await step(14);
  await run();
  await showMe();                                   // multimodal
  await step(16);
  await run();
  await pick('Parse tables to text');
  await run();
  await step(18);
  await pick(/vendor PDF/);
  await pick('Parse PDFs to text');
  await run();
  await pick(/org chart image/);
  await pick('Caption images');
  await run();
  await next(/07-sandbox/);

  // 7. Sandbox and the final challenge
  await press(page.getByRole('button', { name: 'Open the workbench' }));
  await step(2);
  await check(page);
  await btn('Take the final challenge →');
  const best = ['GraphRAG', 'Naive / advanced', 'Multimodal', 'Self-correcting', 'Agentic'];
  for (let i = 0; i < best.length; i++) {
    await press(card.getByRole('button', { name: best[i], exact: true }));
    if (i < best.length - 1) await btn('Next problem →');
  }
  // the summary takes focus, which scrolls it into view (it sits below the fold under the challenge)
  const closing = card.getByRole('region', { name: 'Module complete' });
  await expect(closing.getByRole('heading', { name: 'Module complete' })).toBeFocused();
  await expect(closing).toBeInViewport();
  await check(page);
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  for (const id of ['01-history', '02-why-not-stuff-it', '03-what-is-rag', '04-layers', '05-accuracy', '06-types'])
    await expect(nav.locator(`[data-chapter="${id}"]`)).toHaveAttribute('data-mark', 'done');
}
