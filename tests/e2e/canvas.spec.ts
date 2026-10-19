import { test, expect, type Page } from '@playwright/test';

const block = (page: Page, id: string) => page.locator(`[data-block="${id}"]`);
const panel = (page: Page) => page.getByRole('complementary', { name: 'Block settings' });
const context = (page: Page) => page.getByTestId('context');
const answer = (page: Page) => page.getByTestId('answer');
const TRACK = ['docs', 'chunker', 'embedder', 'index', 'retriever', 'assembler', 'llm'];

async function open(page: Page) {
  await page.goto('/dev/canvas/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(context(page)).toHaveText('3 chunks reached the model');
}

test('track: Tab reaches each block, Enter selects it and shows its knobs', async ({ page }) => {
  await open(page);
  await block(page, 'docs').focus();
  const seen = new Set<string>();
  for (let i = 0; i < TRACK.length; i++) {
    seen.add(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.block ?? ''));
    await page.keyboard.press('Tab');
  }
  expect([...seen].sort()).toEqual([...TRACK].sort());

  await block(page, 'retriever').focus();
  await page.keyboard.press('Enter');
  await expect(panel(page).getByRole('heading')).toHaveText('Retriever');
  await expect(block(page, 'retriever')).toHaveAttribute('aria-label', /selected/);
  await expect(block(page, 'retriever')).toBeFocused();       // focus survives the redraw
  await panel(page).getByLabel('Top-k (chunks retrieved)').focus();
  await page.keyboard.press('ArrowRight');
  await expect(block(page, 'retriever')).toHaveAttribute('aria-label', /TOP 4/);
  await expect(context(page)).toHaveText('4 chunks reached the model');
  // the chunker's knobs belong to the chunker only
  await expect(panel(page).getByText('Chunk size')).toHaveCount(0);
});

test('bench: keyboard moves a block, cuts a wire and reconnects it', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Open the workbench' }).click();
  await expect(page.getByRole('button', { name: 'Back to the track' })).toBeVisible();
  const wire = page.locator('[data-edge="docs>chunker"]');
  await expect(wire).toHaveCount(1);

  // arrow keys move the focused block one cell; its wire follows
  const before = await wire.getAttribute('d');
  await block(page, 'docs').focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => wire.getAttribute('d')).not.toBe(before);
  await expect(block(page, 'docs')).toBeFocused();

  // Delete on a focused wire cuts it: nothing reaches the model, which makes something up
  await page.locator('[data-edge="retriever>assembler"]').focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-edge="retriever>assembler"]')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Nothing reaches the model');
  await expect(answer(page)).toHaveText(/^MADEUP:/);

  // Connect to… puts it back
  await block(page, 'retriever').focus();
  await page.keyboard.press('Enter');
  await panel(page).getByLabel('Connect to…').selectOption({ label: 'Context assembler' });
  await expect(page.locator('[data-edge="retriever>assembler"]')).toHaveCount(1);
  await expect(answer(page)).toHaveText(/^CORRECT:/);
});

test('bench: dragging a block on desktop moves it', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Open the workbench' }).click();
  await page.waitForTimeout(800);   // morph
  const a = (await block(page, 'docs').boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 40, a.y + a.height / 2 + 120, { steps: 8 });
  await page.mouse.up();
  const b = (await block(page, 'docs').boundingBox())!;
  expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(30);
});

test('390 px: dragging does nothing, knobs still change results', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.getByRole('button', { name: 'Open the workbench' }).click();
  await page.waitForTimeout(800);
  await expect(page.locator('[data-port]')).toHaveCount(0);
  await expect(page.locator('[data-edge]')).toHaveCount(0);

  await block(page, 'docs').click();      // tap selects (adds the ring) before we measure
  await expect(block(page, 'docs')).toHaveAttribute('aria-label', /selected/);
  const a = (await block(page, 'docs').boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 40, a.y + a.height / 2 + 120, { steps: 8 });
  await page.mouse.up();
  expect(await block(page, 'docs').boundingBox()).toEqual(a);

  await block(page, 'retriever').click();
  await expect(panel(page).getByRole('heading')).toHaveText('Retriever');
  await panel(page).getByLabel('Top-k (chunks retrieved)').fill('5');
  await expect(context(page)).toHaveText('5 chunks reached the model');
  await expect(block(page, 'retriever')).toHaveAttribute('aria-label', /TOP 5/);
});
