// R23: axe on every chapter (opening state, then a mid state with the drawer open), keyboard semantics, reduced motion.
import { test, expect, type Page } from '@playwright/test';
import { CHAPTERS } from '../../src/lib/chapters';
import { walkModule } from './flow';
import { toolWalker } from './tool-calling-flow';
import { serious } from './helpers';
import { moduleOf } from '../../src/lib/modules';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });

async function open(page: Page, id: string) {
  await page.goto(`/rag/${id}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card(page)).toContainText('Step 1 of');
}

test.use({ viewport: { width: 1440, height: 900 } });

for (const { id } of CHAPTERS) {
  test(`axe: ${id} has no serious or critical violations`, async ({ page }) => {
    await open(page, id);
    expect(await serious(page), 'opening state').toEqual([]);
    // mid state: past the opening step, with the drawer open
    // a chapter that opens on a prediction moves on with a pick
    const predict = card(page).getByRole('radio');
    if (await predict.count()) await predict.first().click();
    else await card(page).getByRole('button', { name: /^Ask|Compare types/ }).or(page.getByRole('button', { name: 'Open the workbench' })).first().click();
    await expect(card(page)).toContainText('Step 2 of');
    const inspect = card(page).getByRole('button', { name: 'Inspect' });
    if (await inspect.count()) await inspect.click();
    await expect(page.locator('.drawer')).toBeVisible();
    expect(await serious(page), 'mid state').toEqual([]);
  });
}

// module 2: the intro, every chapter at its start and with the drawer open (then at 390px), and the recap with questions
const TOOLS = moduleOf('tool-calling');

test('axe: /tool-calling/ has no serious or critical violations', async ({ page }) => {
  await page.goto('/tool-calling/');
  expect(await serious(page)).toEqual([]);
});

for (const c of TOOLS.chapters) {
  test(`axe and 390px: ${c.id}, at the start and with the drawer open`, async ({ page }) => {
    await toolWalker(page, 'mouse').open(c.id);
    expect(await serious(page), 'opening state').toEqual([]);
    await card(page).getByRole('button', { name: 'Inspect' }).click();
    await expect(page.locator('.drawer')).toBeVisible();
    expect(await serious(page), 'drawer open').toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test('axe: /tool-calling/recap/ with every chapter done, on its first question', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(ids => localStorage.setItem('tool-calling-progress-v1', JSON.stringify({ done: ids, saved: {} })), TOOLS.chapters.map(c => c.id));
  await page.goto('/tool-calling/recap/');
  await expect(page.locator('.recap legend')).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test('keyboard only: every chapter completes', async ({ page }) => {
  test.setTimeout(120_000);
  await walkModule(page, 'keyboard');
});

test('a canvas redraw keeps focus on the control in use', async ({ page }) => {
  await open(page, '04-layers');
  await card(page).getByRole('button', { name: /^Ask/ }).press('Enter');
  await card(page).getByRole('radio', { name: /a cut split it/ }).press('Enter');
  for (const b of ['Add the Chunker', 'Add the Embedder and Index']) await card(page).getByRole('button', { name: b }).press('Enter');
  await page.locator('.map circle[tabindex]').first().focus();
  await card(page).getByRole('button', { name: 'Add the Context assembler' }).press('Enter');
  const overlap = card(page).getByRole('slider', { name: /Overlap/ });
  const said = await page.getByTestId('announce').textContent();
  await overlap.focus();
  await overlap.press('ArrowRight');                          // 10%: the canvas redraws, the puzzle stays open
  await expect(page.locator('[data-block="chunker"]')).toHaveAttribute('aria-label', /chunks:/);
  await expect(page.getByTestId('announce')).not.toHaveText(said!);
  await expect(overlap).toBeFocused();

  // a block keeps focus through the redraw its own selection causes
  const block = page.locator('[data-block="retriever"]');
  await block.focus();
  await block.press('Enter');
  await expect(block).toHaveAttribute('aria-label', /selected/);
  await expect(block).toBeFocused();
});

// Opens the workbench and samples the LLM block's position every frame for 400 ms: how many distinct places it was seen in.
const morphFrames = (page: Page) => page.evaluate(() => new Promise<number>(res => {
  const seen = new Set<string>(), t0 = performance.now();
  [...document.querySelectorAll('button')].find(b => b.textContent === 'Open the workbench')!.click();
  const tick = () => {
    const r = document.querySelector('[data-block="llm"]')?.getBoundingClientRect();
    if (r?.width) seen.add(`${Math.round(r.x)},${Math.round(r.y)}`);
    if (performance.now() - t0 < 400) requestAnimationFrame(tick); else res(seen.size);
  };
  requestAnimationFrame(tick);
}));

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  const running = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);

  test('no pulse or morph runs, and answers appear at once', async ({ page }) => {
    await open(page, '04-layers');
    await card(page).getByRole('button', { name: /^Ask/ }).click();
    await expect(page.locator('.drawer .answer-card')).toBeVisible({ timeout: 200 });
    await card(page).getByRole('radio', { name: /a cut split it/ }).click();
    await card(page).getByRole('button', { name: 'Add the Chunker' }).click();   // the outcome moves: wires would pulse
    await expect(page.getByTestId('announce')).toContainText('Answer:', { timeout: 200 });
    expect(await running(page)).toBe(0);

    // the track → bench morph jumps straight to the bench
    await open(page, '07-sandbox');
    await expect(page.getByTestId('announce')).toContainText('Answer:');
    expect(await morphFrames(page)).toBe(1);
    expect(await running(page)).toBe(0);
  });
});

test('without reduced motion the morph does run (control for the test above)', async ({ page }) => {
  await open(page, '07-sandbox');
  await expect(page.getByTestId('announce')).toContainText('Answer:');
  // start, at least one in-between frame, end: a slow CI runner may paint only that many in 400 ms
  expect(await morphFrames(page)).toBeGreaterThanOrEqual(3);
});
