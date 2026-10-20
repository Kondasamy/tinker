// R23: axe on every chapter (opening state, then a mid state with the drawer open), keyboard semantics, reduced motion.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CHAPTERS } from '../../src/lib/chapters';
import { walkModule } from './flow';

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });

async function open(page: Page, id: string) {
  await page.goto(`/rag/${id}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card(page)).toContainText('Step 1 of');
}

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${v.id}: ${v.help} → ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

test.use({ viewport: { width: 1440, height: 900 } });

for (const { id } of CHAPTERS) {
  test(`axe: ${id} has no serious or critical violations`, async ({ page }) => {
    await open(page, id);
    expect(await serious(page), 'opening state').toEqual([]);
    // mid state: past the opening step, with the drawer open
    await card(page).getByRole('button', { name: /^Ask|Compare types/ }).or(page.getByRole('button', { name: 'Open the workbench' })).first().click();
    await expect(card(page)).toContainText('Step 2 of');
    const inspect = card(page).getByRole('button', { name: 'Inspect' });
    if (await inspect.count()) await inspect.click();
    await expect(page.locator('.drawer')).toBeVisible();
    expect(await serious(page), 'mid state').toEqual([]);
  });
}

test('keyboard only: every chapter completes', async ({ page }) => {
  test.setTimeout(120_000);
  await walkModule(page, 'keyboard');
});

test('a canvas redraw keeps focus on the control in use', async ({ page }) => {
  await open(page, '04-layers');
  for (const b of [/^Ask/, 'Add the Chunker', 'Add the Embedder and Index']) await card(page).getByRole('button', { name: b }).press('Enter');
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
    if (r && r.width) seen.add(`${Math.round(r.x)},${Math.round(r.y)}`);
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
  expect(await morphFrames(page)).toBeGreaterThan(3);
});
