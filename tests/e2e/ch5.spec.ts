import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const drawer = (page: Page) => page.getByRole('complementary');
const announce = (page: Page) => page.getByTestId('announce');
const recall = (page: Page) => page.getByTestId('recall-meter');
const verdict = (page: Page) => page.getByTestId('verdict-meter');
const step = (page: Page, n: number) => expect(card(page)).toContainText(`Step ${n} of 17`);
const CH4_BLOCKS = ['docs', 'chunker', 'embedder', 'index', 'retriever', 'assembler', 'llm'];

async function open(page: Page) {
  await page.goto('/rag/05-accuracy/');
  await page.locator('astro-island:not([ssr])').waitFor();   // hydrated
  await step(page, 1);
}

/** Puzzle entry is broken: the answer is not correct and the step stays put. */
async function broken(page: Page, n: number) {
  await step(page, n);
  await expect(card(page)).toContainText('Puzzle');
  await expect(announce(page)).toContainText(/Answer: (WRONG|NOT FOUND)/);
}
const solved = async (page: Page, n: number) => { await expect(announce(page)).toContainText('Answer: CORRECT'); await step(page, n + 1); };
const nextPuzzle = (page: Page) => card(page).getByRole('button', { name: 'Next puzzle →' }).click();

test('AE4: opening chapter 5 directly shows the blocks unlocked through chapter 4, pre-wired', async ({ page }) => {
  await open(page);
  for (const b of CH4_BLOCKS) await expect(page.locator(`[data-block="${b}"]`)).toHaveCount(1);
  for (const b of ['rewrite', 'reranker', 'grader']) await expect(page.locator(`[data-block="${b}"]`)).toHaveCount(0);
  await expect(announce(page)).toContainText('3 chunks retrieved');   // wired: chunks reach the model
});

test('chapter 5: every lever, each puzzle broken then solved, meters moving independently', async ({ page }) => {
  await open(page);
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(drawer(page)).toContainText('$150');
  await expect(announce(page)).toContainText('Answer: WRONG');

  await card(page).getByRole('button', { name: 'Add the Evaluator' }).click();
  await expect(page.locator('[data-block="grader"]')).toHaveCount(1);
  await expect(recall(page)).toHaveAttribute('data-value', '0');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'wrong');

  // recall moves, the verdict does not
  await card(page).getByRole('button', { name: 'Retrieve 5 chunks instead of 3' }).click();
  await broken(page, 4);
  await expect(recall(page)).toHaveAttribute('data-value', '100');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'wrong');

  // 1. stale policy: metadata filter
  await expect(card(page).getByRole('slider')).toHaveCount(0);
  await card(page).getByLabel('Metadata filter').selectOption('current');
  await solved(page, 4);

  // 2. vague question: query rewrite
  await card(page).getByRole('button', { name: 'Add Query rewrite' }).click();
  await broken(page, 6);
  await expect(page.locator('[data-block="rewrite"]')).toHaveCount(1);
  await card(page).getByLabel('Query sent to the retriever').selectOption('0');
  await solved(page, 6);
  await nextPuzzle(page);

  // 3. too few / too many: top-k
  await broken(page, 8);
  const topK = card(page).getByRole('slider', { name: /Top-k/ });
  await topK.fill('10');
  await expect(announce(page)).toContainText('Answer: NOT FOUND');
  await step(page, 8);
  await topK.fill('5');
  await solved(page, 8);

  await card(page).getByRole('button', { name: 'Add the Reranker' }).click();

  // 4. hidden needle: best at both ends. The verdict moves, recall does not.
  await broken(page, 10);
  await expect(recall(page)).toHaveAttribute('data-value', '100');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'notfound');
  await card(page).getByLabel('Context order').selectOption('edges');
  await solved(page, 10);
  await expect(recall(page)).toHaveAttribute('data-value', '100');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'correct');
  await nextPuzzle(page);

  // 5. distractor: hybrid keyword weight, with the blend in "Show the math"
  await broken(page, 12);
  const weight = card(page).getByRole('slider', { name: /Keyword weight/ });
  await weight.fill('1');
  await expect(announce(page)).toContainText('Answer: WRONG');
  await weight.fill('3');
  await solved(page, 12);
  await page.getByRole('group', { name: 'Inspect' }).getByRole('button', { name: 'Evidence' }).click();
  await drawer(page).getByLabel('Show the math').check();
  await expect(page.getByTestId('math-blend')).toContainText(/0\.7 × \d\.\d\d \+ 0\.3 × \d\.\d\d = \d\.\d{3}/);

  await nextPuzzle(page);

  // 6. broken sentence: overlap
  await broken(page, 14);
  await card(page).getByRole('slider', { name: /Overlap/ }).fill('2');
  await solved(page, 14);
  await nextPuzzle(page);

  // 7. mid-sentence cut: sentence strategy
  await broken(page, 16);
  await card(page).getByRole('button', { name: 'Sentence' }).click();
  await solved(page, 16);

  await card(page).getByRole('button', { name: /What reached the model/ }).click();
  await expect(card(page)).toContainText('Chapter complete');
});

test('chapter 5: Show me solves every puzzle; rerank also frees the hidden needle and shows its score', async ({ page }) => {
  await open(page);
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await card(page).getByRole('button', { name: 'Add the Evaluator' }).click();
  await card(page).getByRole('button', { name: 'Retrieve 5 chunks instead of 3' }).click();
  const showMe = async (n: number) => { await broken(page, n); await card(page).getByRole('button', { name: 'Show me' }).click(); await solved(page, n); };
  await showMe(4);
  await card(page).getByRole('button', { name: 'Add Query rewrite' }).click();
  await showMe(6);
  await nextPuzzle(page);
  await showMe(8);
  await card(page).getByRole('button', { name: 'Add the Reranker' }).click();

  await broken(page, 10);
  await card(page).getByLabel('Rerank with a cross-encoder').click();
  await solved(page, 10);
  await expect(recall(page)).toHaveAttribute('data-value', '100');
  await page.getByRole('group', { name: 'Inspect' }).getByRole('button', { name: 'Evidence' }).click();
  await drawer(page).getByLabel('Show the math').check();
  await expect(page.getByTestId('math-rerank')).toContainText(/-?\d+\.\d\d/);
  await nextPuzzle(page);

  await showMe(12);
  await nextPuzzle(page);
  await showMe(14);
  await nextPuzzle(page);
  await showMe(16);
  await step(page, 17);
});
