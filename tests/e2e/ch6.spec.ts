import { test, expect, type Page } from '@playwright/test';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const drawer = (page: Page) => page.getByRole('complementary');
// the stage shows the latest runs only; the full comparison is the drawer's Compare tab
const strip = (page: Page) => page.getByRole('table', { name: 'Latest results' });
const step = (page: Page, n: number) => expect(card(page)).toContainText(`Step ${n} of 18`);
const allRuns = (page: Page, n: number) => expect(page.getByRole('button', { name: `All ${n} runs →` })).toBeVisible();

/** Nothing drawn on the stage (strip, graph walk) may cover a pipeline block. */
async function blocksClear(page: Page) {
  const boxes = async (sel: string) => (await page.locator(sel).all()).map(async l => (await l.boundingBox())!);
  const blocks = await Promise.all(await boxes('[data-block]'));
  const overlays = await Promise.all(await boxes('.strip-latest, figure.graph-walk'));
  expect(blocks.length).toBeGreaterThan(0);
  for (const o of overlays)
    for (const b of blocks)
      expect(
        o.x < b.x + b.width && b.x < o.x + o.width && o.y < b.y + b.height && b.y < o.y + o.height,
        JSON.stringify({ o, b }),
      ).toBe(false);
}
const runAs = (page: Page) => card(page).getByRole('button', { name: /^Run as/ });

test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: Page) {
  await page.goto('/rag/06-types/');
  await page.locator('astro-island:not([ssr])').waitFor(); // hydrated
  await step(page, 1);
}

test('chapter 6: naive then agentic adds two strip rows with different call counts; the agent and GraphRAG comparisons complete', async ({
  page,
}) => {
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
  await card(page).getByLabel('Agentic').click(); // the step advances, so the radio leaves the card
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
  await expect(strip(page).locator('tbody tr')).toHaveCount(3);
  await allRuns(page, 4);
  await step(page, 6);

  await card(page)
    .getByRole('radio', { name: /follow-up can fetch the rest/ })
    .click();

  // multi-hop: naive and agentic both miss the Kestrel approver
  await step(page, 7);
  const kestrel = /Kestrel K2 scanner integration/;
  await card(page).getByLabel(kestrel).check();
  await card(page).getByLabel('Naive / advanced').check();
  await runAs(page).click();
  await card(page).getByLabel('Agentic').check();
  await runAs(page).click();
  await allRuns(page, 6);
  await expect(strip(page).locator('tr[data-type="agentic"]').last()).toHaveAttribute('data-verdict', 'notfound');

  // attach the graph side bay; its walk appears under the canvas
  await step(page, 8);
  await expect(page.locator('[data-block="graph"]')).toHaveCount(0);
  await card(page).getByLabel('GraphRAG').click();
  await step(page, 9);
  await expect(page.locator('[data-block="graph"]')).toHaveCount(1);
  const walk = page.locator('figure.graph-walk svg');
  await expect(walk).toHaveAttribute('aria-label', /from Kestrel K2: 1 hop/);

  // 1 hop: not found; 2 hops: correct
  await runAs(page).click();
  const graph = strip(page).locator('tr[data-type="graph"]');
  await expect(graph).toHaveAttribute('data-verdict', 'notfound');
  await step(page, 10);
  const hops = card(page).getByLabel(/Hops from the question/);
  await hops.focus();
  await hops.press('ArrowRight');
  await expect(walk).toHaveAttribute('aria-label', /2 hops/);
  await runAs(page).click();
  await expect(graph).toHaveAttribute('data-verdict', 'correct');
  await expect(graph.locator('td').nth(3)).toHaveText('2');
  await allRuns(page, 7);
  await step(page, 11);
  await expect(drawer(page).getByRole('region', { name: 'Graph walk log' }).locator('li')).toHaveCount(2);
  // only the answer path is labelled; the other pegs name themselves on hover
  expect((await walk.locator('text.on-path').allTextContents()).sort()).toEqual([
    'Fulfillment Systems',
    'Kestrel K2',
    'Tomasz Rehnquist',
  ]);
  expect(await walk.locator('text.peg-label').count()).toBeGreaterThan(3);
  await blocksClear(page);

  await card(page)
    .getByRole('radio', { name: /chains facts across documents/ })
    .click();

  // self-correcting: the look-alike note fools naive RAG; the evaluator rejects it, retries, then says "I don't know"
  await step(page, 12);
  await runAs(page).click();
  await expect(strip(page).locator('tbody tr').last()).toHaveAttribute('data-verdict', 'wrong');
  await step(page, 13);
  await card(page).getByLabel('Self-correcting').click();
  await step(page, 14);
  await runAs(page).click();
  const checked = strip(page).locator('tr[data-type="selfcheck"]');
  await expect(checked).toHaveAttribute('data-verdict', 'notfound');
  await expect(checked.locator('td').nth(3)).toHaveText('2');
  await step(page, 15);
  const evaluator = drawer(page).getByRole('region', { name: 'Evaluator log' });
  await expect(evaluator.locator('li')).toHaveCount(2);
  await expect(evaluator.locator('li').first()).toContainText('rejected (would have answered WRONG)');
  await expect(drawer(page)).toContainText("I don't know.");

  // multimodal: the parsers start off; tables, then PDF and image
  await card(page).getByLabel('Multimodal').click();
  await step(page, 16);
  await runAs(page).click();
  const mm = strip(page).locator('tr[data-type="multimodal"]');
  await expect(mm).toHaveAttribute('data-verdict', 'notfound');
  await step(page, 17);
  await card(page).getByLabel('Parse tables to text').check();
  await runAs(page).click();
  await expect(mm).toHaveAttribute('data-verdict', 'correct');
  await step(page, 18);
  await card(page)
    .getByLabel(/vendor PDF/)
    .check();
  await card(page).getByLabel('Parse PDFs to text').check();
  await runAs(page).click();
  await card(page)
    .getByLabel(/org chart image/)
    .check();
  await card(page).getByLabel('Caption images').check();
  await expect(drawer(page).locator('figure.mm-asset img')).toBeVisible(); // its caption is retrieved
  await runAs(page).click();
  await expect(card(page)).toContainText('Chapter complete');
  await expect(strip(page).locator('tr[data-type="multimodal"][data-verdict="correct"]')).toHaveCount(3);
  await blocksClear(page);

  // the full comparison: every run, in the Compare tab
  await page.getByRole('group', { name: 'Inspect' }).getByRole('button', { name: 'Compare' }).click();
  await expect(drawer(page).getByRole('table', { name: 'Results by RAG type' }).locator('tbody tr')).toHaveCount(12);
});
