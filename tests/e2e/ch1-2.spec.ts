import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const drawer = (page: Page) => page.getByRole('complementary');

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').waitFor(); // hydrated
  await expect(card(page)).toContainText('Step 1 of');
}

test('chapter 1: wrong answer, click through the eras, cited sources, quiz', async ({ page }) => {
  await open(page, '/rag/01-history/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(drawer(page)).toContainText('WRONG');

  for (let i = 0; i < 4; i++) {
    await expect(card(page)).toContainText(`Step ${i + 2} of`);
    await page.locator(`[data-era="${i}"]`).click();
    // the era drawer lists that era's claims, each with a source link
    const links = drawer(page).getByRole('link', { name: /^Source:/ });
    await expect(links.first()).toBeVisible();
    for (const href of await links.evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href)))
      expect(href).toMatch(/^https:\/\//);
  }

  await card(page)
    .getByRole('radio', { name: /Models were too slow/ })
    .click();
  await expect(card(page)).toContainText('NOT QUITE');
  await expect(card(page)).toContainText('Speed was not the problem'); // the misconception, not a generic line
  await card(page)
    .getByRole('radio', { name: /did not fit/ })
    .click();
  await expect(card(page)).toContainText('Chapter complete');
  await expect(card(page).getByRole('link', { name: /Next:/ })).toHaveAttribute('href', '/rag/02-why-not-stuff-it/');
});

test('chapter 1: eras open by keyboard, only in order', async ({ page }) => {
  await open(page, '/rag/01-history/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await page.locator('[data-era="2"]').click(); // skipping ahead does nothing
  await expect(card(page)).toContainText('Step 2 of');
  await page.locator('[data-era="0"]').focus();
  await page.keyboard.press('Enter');
  await expect(card(page)).toContainText('Step 3 of');
});

test('chapter 1: “I’m not sure” shows the answer unstamped and finishes the chapter', async ({ page }) => {
  await open(page, '/rag/01-history/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  for (let i = 0; i < 4; i++) await page.locator(`[data-era="${i}"]`).click();
  await card(page)
    .getByRole('radio', { name: /not sure/ })
    .click();
  await expect(card(page)).toContainText('The answer:');
  await expect(card(page)).not.toContainText('NOT QUITE');
  await expect(card(page)).toContainText('Chapter complete');
});

test('chapter 2: overflow at 5 TB (AE2), three more problems, each opened, quiz', async ({ page }) => {
  await open(page, '/rag/02-why-not-stuff-it/');
  // predict first: no Ask, no slider, and the stage holds one document until the pick
  await expect(card(page).getByRole('button', { name: /^Ask/ })).toHaveCount(0);
  await expect(card(page).getByRole('slider')).toHaveCount(0);
  await card(page).getByRole('radio', { name: /^Yes/ }).click();
  // locked: the other options are disabled
  await expect(card(page).getByRole('radio', { name: /a real drive overflows it/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(card(page).getByRole('radio', { name: /^Yes/ })).toHaveAttribute('aria-checked', 'true');
  await expect(card(page)).toContainText('You predicted: Yes');
  await expect(page.locator('.stage figure')).not.toHaveAttribute('data-overflow');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(drawer(page)).toContainText('WRONG');

  const slider = card(page).getByRole('slider');
  await expect(page.locator('.stage figure')).not.toHaveAttribute('data-overflow');
  await slider.fill('7'); // 500 GB: already past the window
  await expect(card(page)).toContainText('Step 4 of');
  // the comparison stays beside the outcome
  await expect(card(page).getByRole('status')).toContainText('NOT WHAT YOU PREDICTED');
  await expect(card(page).getByRole('status')).toContainText('What happened: No: a real drive overflows it');
  await slider.fill('8'); // 5 TB
  await expect(card(page)).toContainText('Step 5 of');
  await expect(page.locator('.stage figure')).toHaveAttribute('data-overflow', 'true');
  await expect(page.locator('.stage figcaption')).toContainText('5 TB');
  await expect(page.locator('.stage figcaption')).toContainText('OVERFLOW');
  await expect(drawer(page)).toContainText('1,250,000,000,000');

  for (const [reason, title] of [
    ['Lost in the middle', 'lost in the middle'],
    ['Freshness', 'freshness'],
    ['Who may see what', 'who may see what'],
  ]) {
    const problem = card(page).getByRole('button', { name: new RegExp(`^${reason}`) });
    await problem.click();
    await expect(drawer(page)).toContainText(new RegExp(title, 'i'));
    // opened problems stay marked until the last one finishes the step
    if (reason === 'Lost in the middle') await expect(problem).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(card(page)).toContainText('Step 6 of 6');

  await card(page)
    .getByRole('radio', { name: /no context window holds it/ })
    .click();
  await expect(card(page)).toContainText('Chapter complete');
});
