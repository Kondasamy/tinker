// R24 at phone size (390 × 844, touch): every chapter completes, the canvas is view-and-tweak (no drag),
// the drawer never covers the step's controls, and the page never scrolls sideways.
import { test, expect, type Page } from '@playwright/test';
import { walkModule } from './flow';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test.setTimeout(180_000);

const overlaps = (a: DOMRect | null, b: DOMRect | null) =>
  !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function layoutHolds(page: Page) {
  const r = await page.evaluate(() => {
    const box = (s: string) => document.querySelector(s)?.getBoundingClientRect().toJSON() ?? null;
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > w + 1).slice(0, 3).map(e => e.outerHTML.slice(0, 80));
    return { scrollW: document.documentElement.scrollWidth, w, wide, card: box('.card'), drawer: box('.drawer') };
  });
  expect(r.scrollW, `no horizontal page scroll; too wide: ${r.wide.join(' | ')}`).toBeLessThanOrEqual(r.w);
  expect(overlaps(r.card, r.drawer), 'drawer covers the step card').toBe(false);
}

test('every chapter completes at phone size', async ({ page }) => {
  await walkModule(page, 'mouse', layoutHolds);
});

test('the phone canvas is view-and-tweak: no drag or wiring, tapping a block tunes it', async ({ page }) => {
  await page.goto('/rag/07-sandbox/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.getByRole('button', { name: 'Open the workbench' }).tap();
  const card = page.getByRole('region', { name: 'Next step' });
  await expect(card).toContainText('Step 2 of');
  await expect(page.getByText('On a small screen the workbench is view-and-tweak')).toBeVisible();
  await expect(page.locator('svg.editable, [data-port], [data-edge]')).toHaveCount(0);
  await page.locator('[data-block="retriever"]').tap();
  const settings = card.getByRole('region', { name: 'Block settings' });
  await expect(settings.getByRole('slider', { name: /Top-k/ })).toBeVisible();
  await expect(settings.getByText('Connect to…')).toHaveCount(0);
  await layoutHolds(page);
});
