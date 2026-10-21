// Module 10, Structured outputs: the intro, every chapter played by mouse and by keyboard only, its own progress key,
// reduced motion, the recap (nothing done, and after chapter 3), axe, phone width with the mask list reachable by Tab,
// the mask tab locked until the prediction, and chapter 3 offline once Larkspur mini has loaded.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { structuredWalker } from './structured-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('structured-outputs');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/structured-outputs/${id}/$`);
async function walkAll(w: ReturnType<typeof structuredWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7();
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(180_000);

test('the intro shows the level, the prerequisites, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/structured-outputs/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'Tool calling & MCP' })).toHaveAttribute('href', '/tool-calling/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute('href', 'https://april-zhu.com/colorfigures');
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(structuredWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in structured-outputs-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(structuredWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['structured-outputs-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('structured-outputs');
});

test('chapter 3: the Mask tab and the plate’s count stay locked until the prediction, then the reveal matches the mask', async ({ page }) => {
  const w = structuredWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page), tab = page.getByRole('button', { name: 'Mask', exact: true });
  await expect(tab).toBeDisabled();
  await expect(page.locator('.so-stage svg[aria-label]').first()).not.toHaveAttribute('aria-label', /tokens through/);
  await c.getByRole('radio', { name: /^All 768/ }).click();
  await expect(tab).toBeEnabled();
  await c.getByRole('button', { name: 'Show the mask at step 1' }).click();
  await expect(c.locator('.feedback')).toContainText('NOT WHAT YOU PREDICTED');
  await expect(page.getByTestId('mask-count')).toContainText('1 of 768 tokens allowed at step 1');
});

test('chapter 3: writing token by token to the end advances, and no click counts as a miss', async ({ page }) => {
  const w = structuredWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /^Only one$/ }).click();
  await c.getByRole('button', { name: 'Show the mask at step 1' }).click();
  await expect(c).toContainText('Step 3 of');
  const write = c.getByRole('button', { name: 'Write the next token' });
  // a partial write is no failed try: three of those would show the hint
  for (let i = 0; i < 40 && await write.isVisible(); i++) { await expect(c.locator('.hint')).toHaveCount(0); await write.click(); }
  await expect(c).toContainText('Step 4 of');
});

test('chapter 7: with every field left to the order system, the stage decodes nothing', async ({ page }) => {
  const w = structuredWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await c.getByRole('radio', { name: /^None$/ }).click();
  for (const f of ['Team', 'Status', 'Days to arrive']) await c.getByLabel(f).selectOption('system');
  await expect(page.getByTestId('so-written')).toHaveText('Larkspur mini · no schema');
  await expect(page.locator('.so-stage .tc-caption')).toContainText('the order system fills every field, so the model writes nothing');
});

test('chapter 7: the score updates live and Show me lands on a winning schema', async ({ page }) => {
  const w = structuredWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await c.getByRole('radio', { name: /^None$/ }).click();
  await expect(c.getByTestId('score')).toContainText('0 of 4');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 3 of');
  await expect(c.getByTestId('score')).toContainText(/4 of 4 orders valid and right · one of \d+ schemas? that work/);
});

test('chapter 3 plays to the end offline once Larkspur mini has loaded', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = structuredWalker(page, 'mouse');
  await w.open(CH3);
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch3();
  expect(failed).toEqual([]);
});

test('steps wait for Larkspur mini: a failed load shows Retry, and Retry loads it', async ({ page }) => {
  let fail = true;
  await page.route('**/data/lm/model.bin', r => (fail ? r.abort() : r.continue()));
  await page.goto(`/structured-outputs/${CH1}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.locator('.so-stage[data-model="failed"]')).toBeVisible({ timeout: 15_000 });
  await expect(card(page).getByRole('button', { name: /^Ask: “/ })).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('.so-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });
  await structuredWalker(page, 'mouse').ch1();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = structuredWalker(page, 'mouse', async p => {
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await walkAll(w);
  });
});

test('the recap says so with nothing done, and asks from chapter 3 once it is finished', async ({ page }) => {
  await page.goto('/structured-outputs/recap/');
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
  await axe(page);
  const w = structuredWalker(page, 'mouse');
  await w.open(CH3);
  await w.ch3();
  await page.goto('/structured-outputs/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/structured-outputs/', ...IDS.map(id => `/structured-outputs/${id}/`), '/structured-outputs/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(structuredWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
  test('the mask view’s list is reachable by Tab', async ({ page }) => {
    await structuredWalker(page, 'mouse').open(CH3);
    await card(page).getByRole('radio', { name: /^Only one$/ }).click();
    await card(page).getByRole('button', { name: 'Show the mask at step 1' }).click();
    const list = page.getByRole('list', { name: /likeliest allowed tokens/ });
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await list.evaluate(l => l.contains(document.activeElement));
    }
    expect(reached).toBe(true);
    await layoutHolds(page);
  });
});
