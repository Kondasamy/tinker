import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const drawer = (page: Page) => page.getByRole('complementary');
const announce = (page: Page) => page.getByTestId('announce');
const NEG = 'The refund policy does NOT apply to enterprise contracts.';

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').waitFor();   // hydrated
  await expect(card(page)).toContainText('Step 1 of');
}

test('chapter 3: made-up answer, then Docs, then Retriever, grounded with a citation; the math; quiz', async ({ page }) => {
  await open(page, '/rag/03-what-is-rag/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(drawer(page)).toContainText('MADE UP');
  await expect(announce(page)).toContainText('Nothing reached the model');

  await card(page).getByRole('button', { name: 'Add the Docs' }).click();
  await expect(card(page)).toContainText('Step 3 of 7');
  await expect(page.locator('[data-block="docs"]')).toHaveCount(1);
  await expect(announce(page)).toContainText('MADE UP');

  // predict before the reveal: the Retriever is not offered until the pick
  await expect(card(page).getByRole('button', { name: 'Add the Retriever' })).toHaveCount(0);
  await card(page).getByRole('radio', { name: /cites the policy/ }).click();
  await expect(card(page)).toContainText('Step 4 of 7');
  await expect(announce(page)).toContainText('MADE UP');
  await card(page).getByRole('button', { name: 'Add the Retriever' }).click();
  await expect(card(page)).toContainText('Step 5 of 7');
  await expect(card(page).getByRole('status')).toContainText('AS YOU PREDICTED');
  await expect(announce(page)).toContainText('Answer: CORRECT. 3 chunks retrieved');
  await expect(drawer(page)).toContainText('CORRECT');
  await expect(drawer(page).locator('mark')).toHaveText(NEG);

  await card(page).getByRole('button', { name: 'See what the retriever found' }).click();
  await expect(drawer(page).getByRole('heading')).toHaveText('What reached the model');
  await expect(drawer(page).locator('li')).toHaveCount(3);

  await drawer(page).getByLabel('Show the math').check();
  await expect(page.getByTestId('math')).toContainText('cos(q, c)');
  await expect(page.getByTestId('math')).toContainText(/= 0\.\d{3}/);
  await expect(card(page)).toContainText('Step 7 of 7');

  await card(page).getByRole('radio', { name: /A bigger, smarter model/ }).click();
  await expect(card(page)).toContainText('The model never changed');
  await card(page).getByRole('radio', { name: /few passages that match/ }).click();
  await expect(card(page)).toContainText('Chapter complete');
  await expect(card(page).getByRole('link', { name: /Next:/ })).toHaveAttribute('href', '/rag/04-layers/');
});

test('chapter 4: negation split (AE1), the layers one at a time, map readout (AE5), fix with overlap, quiz', async ({ page }) => {
  await open(page, '/rag/04-layers/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(drawer(page)).toContainText('WRONG');
  await expect(announce(page)).toContainText('Answer: WRONG. 1 chunk retrieved');

  // predict, then the chunker reveals the cut: no pieces are drawn before the pick
  await expect(page.locator('[data-block="chunker"]')).toHaveCount(0);
  await card(page).getByRole('radio', { name: /The whole rule/ }).click();

  // chunk strip: the hard cut right after NOT is marked red
  await card(page).getByRole('button', { name: 'Add the Chunker' }).click();
  await expect(card(page).getByRole('status')).toContainText('NOT WHAT YOU PREDICTED');
  await expect(drawer(page).getByRole('heading')).toHaveText('Where the chunker cut');
  await expect(page.locator('[data-negation-cut]')).toHaveCount(1);
  await expect(page.locator('[data-negation-cut]')).toHaveCSS('color', 'rgb(181, 54, 31)');
  await expect(page.getByTestId('cut-summary')).toContainText('right after “NOT”');

  // AE5: hover, focus and tap each show the true cosine next to the screen distance
  await card(page).getByRole('button', { name: 'Add the Embedder and Index' }).click();
  const dots = page.locator('.map circle[tabindex]');
  const readout = page.getByTestId('map-readout');
  await expect(dots).toHaveCount(10);
  await dots.nth(0).hover();
  await expect(readout).toContainText(/True similarity 0\.\d{3} · \d+ px from your question/);
  await expect(card(page)).toContainText('Step 6 of 8');
  const hovered = await readout.textContent();
  await dots.nth(3).focus();
  await expect(readout).not.toHaveText(hovered!);
  await expect(readout).toContainText(/True similarity 0\.\d{3} · \d+ px/);
  await dots.nth(5).tap().catch(() => dots.nth(5).click());   // tap needs touch; click is the desktop equivalent
  await expect(readout).toContainText(/True similarity/);

  await card(page).getByRole('button', { name: 'Add the Context assembler' }).click();
  await expect(card(page)).toContainText('Step 7 of 8');
  await expect(card(page)).toContainText('Puzzle');
  // only the step's knob is visible: the top-k that hides the split stays out of reach
  await expect(card(page).getByRole('slider')).toHaveCount(1);
  await expect(page.getByText('Top-k')).toHaveCount(0);

  const overlap = card(page).getByRole('slider', { name: /Overlap/ });
  await overlap.fill('1');                                    // 10%: still cut
  await expect(announce(page)).toContainText('WRONG');
  await overlap.fill('2');                                    // 25%
  await expect(announce(page)).toContainText('Answer: CORRECT');
  await expect(card(page)).toContainText('Step 8 of 8');
  await expect(drawer(page)).toContainText('CORRECT');
  await expect(drawer(page).locator('mark')).toHaveText(NEG);

  await page.getByRole('group', { name: 'Inspect' }).getByRole('button', { name: 'Chunks' }).click();
  await expect(page.locator('[data-negation-cut]')).toHaveCount(0);
  await expect(page.getByTestId('cut-summary')).toContainText('No cut splits the key sentence');

  await card(page).getByRole('radio', { name: /cut the sentence right after/ }).click();
  await expect(card(page)).toContainText('Chapter complete');
});

test('chapter 4: Show me solves the puzzle', async ({ page }) => {
  await open(page, '/rag/04-layers/');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await card(page).getByRole('radio', { name: /a cut split it/ }).click();
  await card(page).getByRole('button', { name: 'Add the Chunker' }).click();
  await card(page).getByRole('button', { name: 'Add the Embedder and Index' }).click();
  await page.locator('.map circle[tabindex]').first().focus();
  await card(page).getByRole('button', { name: 'Add the Context assembler' }).click();
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await expect(card(page)).toContainText('Step 8 of 8');
  await expect(announce(page)).toContainText('CORRECT');
});
