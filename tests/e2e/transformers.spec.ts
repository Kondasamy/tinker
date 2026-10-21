// Module 7, Transformer architecture: the intro, every chapter played by mouse and by keyboard only, its own progress
// key, reduced motion, the recap, axe, phone width, chapter 5's seed across a reload, the workbench's truncation note
// and chapter 3 offline; the go-live checks: Module 7 kickers and share images, home's card and Continue, the warm-up and
// the Pictures / Words switch.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { transformersWalker } from './transformers-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('transformers');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/transformers/${id}/$`);
/** Walk every chapter in order, following each "Next" link. */
async function walkAll(w: ReturnType<typeof transformersWalker>) {
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
test.setTimeout(120_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/transformers/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute('href', 'https://april-zhu.com/colorfigures');
  await axe(page);
});

test('Module 7 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({ page }) => {
  await page.goto('/transformers/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 7 · Transformers');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/transformers\.jpg$/);
  await page.goto('/transformers/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 7 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/transformers-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="transformers"] h4 a')).toHaveAttribute('href', '/transformers/');
  await page.evaluate(() => { localStorage.setItem('transformers-progress-v1', JSON.stringify({ done: [], saved: {} })); localStorage.setItem('tinker-last-module', 'transformers'); });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/transformers\//);
});

test('the warm-up shows on the intro 21 hours after a chapter, with a skip link; not 2 hours after', async ({ page }) => {
  const seed = async (hours: number) => {
    await page.goto('/');
    await page.evaluate(({ done, at }) => localStorage.setItem('transformers-progress-v1', JSON.stringify({ done, saved: {}, at: Object.fromEntries(done.map(id => [id, at])) })),
      { done: [CH1], at: Date.now() - hours * 3600_000 });
    await page.goto('/transformers/');
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
  };
  await seed(21);
  await expect(page.locator('.warmup')).toContainText('from chapters you finished');
  await expect(page.getByRole('link', { name: 'Skip to chapter 2 →' })).toHaveAttribute('href', `/transformers/${CH2}/`);
  await axe(page);
  await seed(2);
  await expect(page.locator('.warmup')).toHaveCount(0);
});

test('the intro reads as pictures by default; Words unfolds the longer text', async ({ page }) => {
  await page.goto('/transformers/');
  const more = page.locator('.band .note.more');
  await expect(more).toBeHidden();
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(more).toBeVisible();
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(transformersWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in transformers-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(transformersWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['transformers-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('transformers');
});

test('chapter 1: the revealed answer is the bar’s top token, and each added token joins the prompt', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: /^Read “/ }).click();
  await c.getByRole('radio', { name: /^“hours”/ }).click();
  await c.getByRole('button', { name: 'Show the probabilities' }).click();
  await expect(c.locator('.feedback')).toContainText('NOT WHAT YOU PREDICTED');
  // the bar's first item is the outcome the reveal names
  const top = (await page.getByRole('list', { name: /Next-piece probabilities/ }).locator('[role="listitem"]').first().getAttribute('aria-label'))!;
  const piece = /^1\. ␣?(\S+):/.exec(top)![1];
  await expect(c.locator('.feedback')).toContainText(`What happened: “${piece}”`);
  await c.getByRole('button', { name: /^Add the likeliest token/ }).click();
  await expect(c.locator('.tc-status')).toContainText(`${piece}”`);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: /^Look up/ }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Show both copies' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('chapter 5: a fixed seed shows the same continuation after a reload', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('button', { name: /^Write \d+ tokens/ }).click();
  await c.getByRole('radio', { name: /^It flattens/ }).click();
  await c.getByRole('button', { name: /^Raise the temperature/ }).click();
  await expect(c).toContainText('Step 4 of');
  await c.getByRole('button', { name: 'Roll a new seed' }).click();
  const text = c.locator('[data-continuation]');
  await expect(text).toContainText('seed 2.');
  const before = await text.textContent();
  await page.reload();
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.getByRole('button', { name: /^Continue at step 4/ }).click();
  await expect(page.locator('.tf-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });
  await expect(text).toHaveText(before!);
});

test('chapter 7: typed text up to the window traces; longer text is struck through with the truncation note', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page), box = c.getByRole('textbox', { name: 'Your prompt' }), count = c.locator('.tf-count');
  await box.fill('Café 🙂 <b>order</b> #1042?');
  await expect(count).toContainText(/^\d+ of 32 tokens$/);
  await c.getByRole('button', { name: 'Trace it' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(c.locator('.tf-trace')).toContainText('Next token:');
  await box.fill('Where is my order? '.repeat(6));
  await expect(count).toContainText('don’t fit, so the model never reads them');
  await expect(c.locator('.tf-tiles li.past').first()).toBeVisible();
  await c.getByRole('button', { name: 'Trace it' }).click();
  await expect(page.locator('.tf-stage .tc-caption')).toContainText('reads the last 32 tokens');
  await axe(page);
});

test('chapter 3: the Attention tab waits for Larkspur mini, so a press while it loads cannot pre-set step 1', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(r => { release = r; });
  await page.route('**/data/lm/model.bin', async r => { await held; await r.continue(); });
  await page.goto(`/transformers/${CH3}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.locator('.tf-stage[data-model="loading"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attention', exact: true })).toBeDisabled();
  release();
  await expect(page.locator('.tf-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });
  await transformersWalker(page, 'mouse').ch3();
});

test('chapter 3 plays to the end offline once Larkspur mini has loaded', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = transformersWalker(page, 'mouse');
  await w.open(CH3);   // waits for the model: meta.json and model.bin have arrived
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch3();
  expect(failed).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = transformersWalker(page, 'mouse', async p => {
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = transformersWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/transformers/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('transformers-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/transformers/', ...IDS.map(id => `/transformers/${id}/`), '/transformers/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(transformersWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
