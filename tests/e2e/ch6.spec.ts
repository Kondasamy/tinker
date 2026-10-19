import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const drawer = (page: Page) => page.getByRole('complementary');
const strip = (page: Page) => page.getByRole('table', { name: 'Results by RAG type' });
const step = (page: Page, n: number) => expect(card(page)).toContainText(`Step ${n} of 6`);
const runAs = (page: Page) => card(page).getByRole('button', { name: /^Run as/ });

async function open(page: Page) {
  await page.goto('/rag/06-types/');
  await page.locator('astro-island:not([ssr])').waitFor();   // hydrated
  await step(page, 1);
}

test('chapter 6: naive then agentic adds two strip rows with different call counts; the agent comparison completes', async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-block="agent"]')).toHaveCount(0);
  await card(page).getByRole('button', { name: 'Compare types →' }).click();

  // naive: one call, the negation cut leaves the answer wrong
  await step(page, 2);
  await card(page).getByLabel('Can enterprise customers get a refund?').check();
  await runAs(page).click();
  await expect(strip(page).locator('tbody tr')).toHaveCount(1);
  const naive = strip(page).locator('tr[data-type="naive"]');
  await expect(naive).toHaveAttribute('data-verdict', 'wrong');
  await expect(naive.locator('td').nth(3)).toHaveText('1');

  // attach the agent side bay
  await step(page, 3);
  await card(page).getByLabel('Agentic').click();   // the step advances, so the radio leaves the card
  await expect(page.locator('[data-block="agent"]')).toHaveCount(1);

  // agentic: search then expand, correct in two calls; the log sits in the answer panel
  await step(page, 4);
  await runAs(page).click();
  await expect(strip(page).locator('tbody tr')).toHaveCount(2);
  const agent = strip(page).locator('tr[data-type="agentic"]');
  await expect(agent).toHaveAttribute('data-verdict', 'correct');
  await expect(agent.locator('td').nth(3)).toHaveText('2');
  await step(page, 5);
  const log = drawer(page).getByRole('region', { name: 'Agent call log' });
  await expect(log.locator('li')).toHaveCount(2);
  await expect(log).toContainText('Fetched the neighbours of a cut chunk');
  await log.getByLabel('Show the math').check();
  await expect(log).toContainText('Can enterprise customers get a refund?');
  await expect(log.locator('dd').nth(1)).toHaveText(/\d\.\d{3}/);

  // the cost: the hotel question under both types, wrong either way, the agent spends a second call
  await card(page).getByLabel('What is the hotel limit per night?').check();
  await runAs(page).click();
  await card(page).getByLabel('Naive / advanced').check();
  await runAs(page).click();
  await expect(strip(page).locator('tbody tr')).toHaveCount(4);
  await step(page, 6);

  await card(page).getByRole('button', { name: /follow-up can fetch the rest/ }).click();
  await expect(card(page)).toContainText('Chapter complete');
});
