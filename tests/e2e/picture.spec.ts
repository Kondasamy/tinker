// Picture-first chapters (U4): the RAG picture says what happened. The verdict rides in the model's pill, passages
// ride the live wires once after a change (never with reduced motion), and the board outlines only this chapter's blocks.
import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const llmPill = (page: Page) => page.locator('.block-tag[data-pick="llm"]');

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').first().waitFor();
  await expect(card(page)).toContainText('Step 1 of');
}
async function addRetriever(page: Page, ask = true) {
  if (ask) await card(page).getByRole('button', { name: /^Ask/ }).click();
  await card(page).getByRole('button', { name: 'Add the Docs' }).click();
  await card(page).getByRole('radio').nth(1).click();
  await card(page).getByRole('button', { name: 'Add the Retriever' }).click();
}

test('the model pill carries the verdict; the full line stays for screen readers', async ({ page }) => {
  await open(page, '/rag/03-what-is-rag/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(llmPill(page)).toContainText('MADE UP');
  await addRetriever(page, false);
  await expect(llmPill(page)).toContainText('CORRECT');
  await expect(page.getByTestId('announce')).toContainText('Answer: CORRECT.');
  await expect(page.locator('.rag-stage .announce[aria-hidden="true"]')).toContainText('reached the model');
});

test('passages ride the live wires after a change', async ({ page }) => {
  await open(page, '/rag/03-what-is-rag/');
  await addRetriever(page);
  await expect(page.locator('.canvas .passage').first()).toBeAttached();
  await expect(page.locator('.canvas .passage')).toHaveCount(0, { timeout: 4000 }); // gone once the pulse ends
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no passages are drawn, and the verdict still shows', async ({ page }) => {
    await open(page, '/rag/03-what-is-rag/');
    await addRetriever(page);
    await expect(llmPill(page)).toContainText('CORRECT');
    await page.waitForTimeout(300);
    await expect(page.locator('.canvas .passage')).toHaveCount(0);
  });
});

test('the board outlines only the blocks this chapter adds', async ({ page }) => {
  await open(page, '/rag/03-what-is-rag/');
  const svg = page.locator('.canvas svg').first();
  await expect(svg).toContainText('CHAPTER 3');
  await expect(svg).not.toContainText('CHAPTER 4');
  await open(page, '/rag/04-layers/');
  await expect(svg).toContainText('CHAPTER 4');
  await expect(svg).not.toContainText('CHAPTER 5');
});

test('on a phone the model pill still shows the verdict', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/rag/03-what-is-rag/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(llmPill(page)).toContainText('MADE UP');
});

test('a step’s callout is pinned on the picture; a step without one draws none', async ({ page }) => {
  await open(page, '/rag/03-what-is-rag/');
  const callout = page.locator('.canvas svg .callout');
  await expect(callout).toHaveCount(1);
  await expect(callout).toContainText('No documents yet');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(card(page)).toContainText('Step 2 of');
  await expect(callout).toHaveCount(0);
});
