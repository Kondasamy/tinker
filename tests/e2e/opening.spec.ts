// Picture-first chapters (U2): a short opening with the rest folded, chapter words defined where they are first used,
// and the story so far folded to a count.
import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const open = async (page: Page, path: string) => {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').first().waitFor();
};

test('the opening is the story and the question; the rest is folded under "About this chapter"', async ({ page }) => {
  await open(page, '/rag/03-what-is-rag/');
  const about = page.locator('details.about');
  await expect(about).not.toHaveAttribute('open');
  await expect(page.getByText('You will learn')).toBeHidden();
  await expect(page.getByText('The picture on the left is live')).toHaveCount(0);
  await about.locator('summary').click();
  await expect(page.getByText('You will learn')).toBeVisible();
  await expect(about.locator('dt').first()).toBeVisible();
});

test('a chapter word opens its definition by keyboard, without re-announcing the step', async ({ page }) => {
  await open(page, '/tool-calling/02-first-tool/');
  const word = card(page).locator('button.term').first();
  await expect(word).toHaveAttribute('aria-expanded', 'false');
  const narration = await card(page).locator('[aria-live="polite"][aria-atomic="true"]').textContent();
  await word.focus();
  await page.keyboard.press('Enter');
  await expect(word).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#term-def')).toContainText('JSON Schema:');
  expect(await card(page).locator('[aria-live="polite"][aria-atomic="true"]').textContent()).toBe(narration);
  await page.keyboard.press('Escape');
  await expect(word).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#term-def')).toBeEmpty();
});

test('the story so far is folded to a count and stays open once opened', async ({ page }) => {
  await open(page, '/dev/runner/');
  const pick = (k: number) => card(page).getByRole('button', { name: `${k}K` });
  await expect(page.locator('details.log-fold')).toHaveCount(0);
  await pick(32).click();
  await expect(card(page)).toContainText('Step 2 of 2');
  const fold = page.locator('details.log-fold');
  await expect(fold.locator('summary')).toHaveText('Story so far (1)');
  await expect(fold).not.toHaveAttribute('open');
  await fold.locator('summary').click();
  await expect(fold.locator('.log li')).toHaveCount(1);
  await card(page).getByRole('button', { name: '← Back' }).click();
  await pick(32).click();
  await expect(fold).toHaveAttribute('open');
});

// R1 success criterion: from the title down to step 1's control, at most 80 words on every RAG chapter
for (const ch of [
  '01-history',
  '02-why-not-stuff-it',
  '03-what-is-rag',
  '04-layers',
  '05-accuracy',
  '06-types',
  '07-sandbox',
])
  test(`rag/${ch}: the first screen has at most 80 words above the first control`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, `/rag/${ch}/`);
    const words = await page.evaluate(() => {
      const text = [
        document.querySelector<HTMLElement>('.intro')?.innerText ?? '',
        document.querySelector<HTMLElement>('.card .count')?.innerText ?? '',
        document.querySelector<HTMLElement>('.card .narration')?.innerText ?? '',
        document.querySelector<HTMLElement>('.card .act')?.innerText ?? '',
      ].join(' ');
      return text.split(/\s+/).filter(Boolean).length;
    });
    expect(words).toBeLessThanOrEqual(80);
    await expect(card(page)).toBeInViewport();
  });
