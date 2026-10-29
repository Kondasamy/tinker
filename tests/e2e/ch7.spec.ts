import { test, expect, type Page } from '@playwright/test';
import { choose } from './helpers';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const drawer = (page: Page) => page.getByRole('complementary', { name: 'The assistant’s answer' });
const announce = (page: Page) => page.getByTestId('announce');
const strip = (page: Page) => page.getByRole('table', { name: 'Latest results' });
const step = (page: Page, n: number) => expect(card(page)).toContainText(`Step ${n} of 3`);
const ALL = [
  'docs',
  'chunker',
  'embedder',
  'index',
  'rewrite',
  'retriever',
  'reranker',
  'assembler',
  'llm',
  'grader',
  'agent',
  'graph',
];
/** Best type per challenge card, in order. */
const BEST = ['GraphRAG', 'Naive / advanced', 'Multimodal', 'Self-correcting', 'Agentic'];
const TYPES = ['Naive / advanced', 'Agentic', 'GraphRAG', 'Self-correcting', 'Multimodal'];

test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: Page) {
  await page.goto('/rag/07-sandbox/');
  await page.locator('astro-island:not([ssr])').waitFor(); // hydrated
  await step(page, 1);
  await expect(announce(page)).toContainText('Answer: CORRECT');
}

test('sandbox opens on the track with every block wired; opening the workbench keeps the answer unchanged', async ({
  page,
}) => {
  await open(page);
  for (const b of ALL) await expect(page.locator(`[data-block="${b}"]`)).toHaveCount(1);
  const answer = await drawer(page).locator('.answer-card').textContent();
  const said = (await announce(page).textContent())!;

  await page.getByRole('button', { name: 'Open the workbench' }).click();
  await step(page, 2);
  await expect(page.getByRole('button', { name: 'Back to the track' })).toBeVisible();
  await expect(page.locator('[data-edge]')).toHaveCount(14); // the track's 9 main-line wires plus the graph's 2 and the agent's 3
  for (const b of ALL) await expect(page.locator(`[data-block="${b}"]`)).toHaveCount(1);
  await expect(announce(page)).toHaveText(said);
  await expect(drawer(page).locator('.answer-card')).toHaveText(answer!);
});

test('free play: any question, rewire, run, compare', async ({ page }) => {
  await open(page);
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await step(page, 2);

  // the refund question names nothing the graph knows: made up
  await choose(card(page).getByLabel('Question'), { label: 'Can enterprise customers get a refund?' });
  await card(page).getByRole('button', { name: 'Run as GraphRAG' }).click();
  await expect(strip(page).locator('tr[data-type="graph"]')).toHaveAttribute('data-verdict', 'madeup');

  // cut Index → Graph: the agent takes over and answers
  await page.locator('[data-edge="index>graph"]').focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-edge="index>graph"]')).toHaveCount(0);
  await card(page).getByRole('button', { name: 'Run as Agentic' }).click();
  await expect(strip(page).locator('tr[data-type="agentic"]')).toHaveAttribute('data-verdict', 'correct');
  await expect(strip(page).locator('tbody tr')).toHaveCount(2);
});

test('final challenge: each card accepts only its best type and explains why; finishing completes the module', async ({
  page,
}) => {
  await open(page);
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await card(page).getByRole('button', { name: 'Take the final challenge →' }).click();
  await step(page, 3);
  await expect(drawer(page)).toHaveCount(0); // the stale answer drawer closes when the challenge starts
  const feedback = card(page)
    .getByRole('status')
    .filter({ hasText: /RIGHT|NOT QUITE/ });

  for (let i = 0; i < BEST.length; i++) {
    await expect(card(page)).toContainText(`Problem ${i + 1} of 5`);
    for (const t of TYPES.filter(t => t !== BEST[i])) {
      await card(page).getByRole('button', { name: t, exact: true }).click();
      await expect(feedback).toContainText('NOT QUITE');
      await expect(feedback).toContainText(`${t}:`); // why this pick is weaker
      await expect(card(page).getByRole('button', { name: 'Next problem →' })).toHaveCount(0);
    }
    await card(page).getByRole('button', { name: BEST[i], exact: true }).click();
    await expect(feedback).toContainText('RIGHT');
    await feedback.getByText('Why not the others?').click();
    await expect(feedback.locator('li')).toHaveCount(4);
    // a solved card takes no other pick; a ruled-out pick says so rather than reading as pressed
    const ruledOut = card(page).getByRole('button', {
      name: `${TYPES.find(t => t !== BEST[i])!} (ruled out)`,
      exact: true,
    });
    await expect(ruledOut).toBeDisabled();
    await expect(ruledOut).toHaveAttribute('aria-pressed', 'false');
    await expect(card(page).getByRole('button', { name: BEST[i], exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    if (i < BEST.length - 1) await card(page).getByRole('button', { name: 'Next problem →' }).click();
  }

  await expect(card(page)).toContainText('Chapter complete');
  const closing = card(page).getByRole('region', { name: 'Module complete' });
  await expect(closing.locator('li')).toHaveCount(3);
  expect(await closing.getByRole('link').evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual([
    '/rag/02-why-not-stuff-it/',
    '/rag/04-layers/',
    '/rag/05-accuracy/',
    '/rag/06-types/',
  ]);
  // the last chapter has no next link
  await expect(card(page).getByRole('link', { name: /Next:/ })).toHaveCount(0);

  // nav: the sandbox is done, the chapters jumped over are marked skipped; it survives reload
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  await nav.locator('[data-chapter="06-types"]').click();
  await expect(nav.locator('[data-chapter="06-types"]')).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator('[data-chapter="07-sandbox"]')).toHaveAttribute('data-mark', 'done');
  await expect(nav.locator('[data-chapter="05-accuracy"]')).toHaveAttribute('data-mark', 'skipped');
  await page.goto('/rag/07-sandbox/');
  await expect(card(page).getByRole('region', { name: 'Module complete' })).toBeVisible();
});
