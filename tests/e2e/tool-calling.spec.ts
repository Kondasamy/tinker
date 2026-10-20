// U8: module 2's intro (R7, R16, R17, R27) and its place in the catalogue.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { moduleOf } from '../../src/lib/modules';
import { toolWalker, walkToolCalling } from './tool-calling-flow';

const M = moduleOf('tool-calling');

test('the intro renders with its level, prerequisite and author from the registry', async ({ page }) => {
  const res = await page.goto('/tool-calling/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'RAG', exact: true })).toHaveAttribute('href', '/rag/');
  await expect(meta).toContainText('RAG recommended');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('footer.credits')).toContainText('Colorfigures');
  await expect(page.locator('footer.credits').getByRole('link', { name: 'April Zhu' })).toBeVisible();
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Kondasamy Jayaraman' })).toHaveAttribute('href', 'https://kondasamy.com');
  await expect(page.locator('.hero-pic svg[role="img"]').first()).toBeVisible();
});

test('the chapter path follows the registry', async ({ page }) => {
  await page.goto('/tool-calling/');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  if (!M.chapters.length) await expect(page.locator('#path')).toContainText('Chapters arrive soon');
});

test('axe: /tool-calling/ has no serious or critical violations', async ({ page }) => {
  await page.goto('/tool-calling/');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
});

test('the intro fits a 390px phone without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tool-calling/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('the intro has its own share image', async ({ page, request }) => {
  await page.goto('/tool-calling/');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toBe('https://explain.kondasamy.com/og/tool-calling.jpg');
  expect((await request.get('/og/tool-calling.jpg')).status()).toBe(200);
});

test('home lists the module under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-level="Intermediate"] .module[data-module="tool-calling"]');
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: /Tool calling/ }).first()).toHaveAttribute('href', '/tool-calling/');
  await expect(card.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('[data-level="Intermediate"] .coming')).toHaveCount(0);
});

// U9: chapters 1–3.
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const wide = (page: Page) => page.locator('.stage svg.flat-wide');
const drawer = (page: Page) => page.getByRole('complementary');
const player = (page: Page) => card(page).getByRole('button', { name: /^Run the request|^Next message/ });
const playAll = async (page: Page) => { while (await player(page).count()) await player(page).click(); };

test('chapter 1: the outcome stays hidden until the reveal, then shows beside the prediction', async ({ page }) => {
  await toolWalker(page, 'mouse').open('01-answers-arent-actions');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(wide(page).locator('.card')).toHaveCount(2);      // question in, nothing back yet
  await card(page).getByRole('radio', { name: /looks the order up/ }).click();
  await expect(wide(page).locator('.card')).toHaveCount(2);
  await card(page).getByRole('button', { name: 'Show the model’s reply' }).click();
  await expect(card(page)).toContainText('NOT WHAT YOU PREDICTED');
  await expect(card(page)).toContainText('You predicted: Yes: it looks the order up');
  await expect(card(page)).toContainText('What happened: No: it can only write a reply, so it guesses');
  await expect(wide(page).locator('.card')).toHaveCount(4);
  await expect(wide(page).locator('[data-lane="orders"]')).toBeVisible();
  await expect(wide(page).locator('.arrow[data-to="orders"]')).toHaveCount(0);   // the order system is never reached
  await expect(drawer(page)).toContainText('most likely on its way');
});

test('chapter 2: the vague description gets no call and a guess; the clear one gets get_order and a grounded answer', async ({ page }) => {
  await toolWalker(page, 'mouse').open('02-first-tool');
  await card(page).getByRole('button', { name: /^Open the get_order/ }).click();
  await expect(drawer(page)).toContainText('Gets data.');
  await card(page).getByRole('radio', { name: /calls no tool/ }).click();
  await card(page).getByRole('button', { name: 'Run the request' }).click();
  await expect(card(page)).toContainText('Step 4 of');
  await expect(wide(page)).not.toContainText('get_order(');
  await expect(wide(page)).toHaveAttribute('aria-label', /probably shipped/);
  await card(page).getByLabel(/Look up one Larkspur order/).check();
  await expect(drawer(page)).toContainText('Look up one Larkspur order');   // the definition follows the pick
  await expect(wide(page).locator('.card')).toHaveCount(0);
  for (let i = 0; i < 3; i++) await player(page).click();
  await expect(wide(page)).toContainText('get_order(order_id: 1042)');
  await playAll(page);
  await expect(card(page)).toContainText('Step 5 of');
  await expect(wide(page).locator('.arrow[data-to="orders"]')).toHaveCount(1);
  await expect(wide(page)).toContainText('order 1042: delivered');
  await expect(card(page)).toContainText('delivered on 14 October 2026');
});

test('chapter 3: INVALID and an error result; then a valid wrong id passes the schema and fails the ownership check', async ({ page }) => {
  await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
  await card(page).getByRole('radio', { name: /Rejects it/ }).click();
  await playAll(page);
  await expect(wide(page).locator('.stamp')).toHaveText('INVALID');
  await expect(wide(page).locator('.card.error')).toHaveCount(1);
  await expect(drawer(page)).toContainText('isError: true');
  await expect(card(page)).toContainText('AS YOU PREDICTED');

  await card(page).getByRole('button', { name: 'Try a harder mistake →' }).click();
  await card(page).getByRole('radio', { name: /^Yes: the validator/ }).click();
  await playAll(page);
  await expect(card(page)).toContainText('Step 6 of');
  await expect(wide(page).locator('.stamp, .card.error')).toHaveCount(0);   // valid: no stamp, no error
  await expect(card(page)).toContainText('NOT WHAT YOU PREDICTED');
  await expect(wide(page)).toContainText('order 1024: delivered');
  await card(page).getByLabel(/Ownership check/).check();
  await playAll(page);
  await expect(card(page)).toContainText('Step 7 of');
  await expect(wide(page).locator('.card.error')).not.toHaveCount(0);
  await expect(wide(page)).toHaveAttribute('aria-label', /error, "Order 1024 belongs to another customer/);
  await expect(wide(page)).toContainText('order 1042: delivered');
});

test('chapters 1–3 complete by mouse', async ({ page }) => {
  await walkToolCalling(page, 'mouse');
});

test('chapters 1–3 complete by keyboard only', async ({ page }) => {
  await walkToolCalling(page, 'keyboard');
});

// message travel in the picture (button hover transitions elsewhere are not motion in the figure)
const running = (page: Page) => page.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('messages appear without travel and the steps still advance', async ({ page }) => {
    await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
    await card(page).getByRole('radio', { name: /Rejects it/ }).click();
    while (await player(page).count()) { await player(page).click(); expect(await running(page)).toBe(0); }
    await expect(card(page)).toContainText('Step 3 of');
  });
});

test('without reduced motion the newest message does travel (control for the test above)', async ({ page }) => {
  await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
  await card(page).getByRole('radio', { name: /Rejects it/ }).click();
  await player(page).click();
  expect(await running(page)).toBeGreaterThan(0);
});

for (const c of M.chapters) {
  test(`axe and 390px: ${c.id}, at the start and with the drawer open`, async ({ page }) => {
    const serious = async () => (await new AxeBuilder({ page }).analyze()).violations
      .filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    await toolWalker(page, 'mouse').open(c.id);
    expect(await serious(), 'opening state').toEqual([]);
    await card(page).getByRole('button', { name: 'Inspect' }).click();
    await expect(page.locator('.drawer')).toBeVisible();
    expect(await serious(), 'drawer open').toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test('chapters 1–3 complete at 390px without sideways scroll', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await walkToolCalling(page, 'mouse', async p => expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390));
});
