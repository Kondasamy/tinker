// Module 9, Fine-tuning vs prompting: the intro, every chapter played by mouse and by keyboard only, live replies and
// held-out scores from Larkspur mini, its own progress key, "I'm not sure", reduced motion, the recap, axe, phone width,
// and chapter 5 played offline once its three weight sets are in; the go-live checks: Module 9 kickers and share images,
// home's card and Continue, the warm-up and the Pictures / Words switch.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { ftWalker } from './fine-tuning-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('fine-tuning');
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/fine-tuning/${id}/$`);
async function walkAll(w: ReturnType<typeof ftWalker>) {
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

test('the intro shows the level, the prerequisites, the author and the chapters', async ({ page }) => {
  await page.goto('/fine-tuning/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: moduleOf('evals').title, exact: true })).toHaveAttribute(
    'href',
    '/evals/',
  );
  await expect(meta.getByRole('link', { name: moduleOf('transformers').title, exact: true })).toHaveAttribute(
    'href',
    '/transformers/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('Module 9 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({
  page,
}) => {
  await page.goto('/fine-tuning/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 9 · Fine-tuning');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/fine-tuning\.jpg$/);
  await page.goto('/fine-tuning/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 9 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/fine-tuning-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="fine-tuning"] h4 a')).toHaveAttribute('href', '/fine-tuning/');
  await page.evaluate(() => {
    localStorage.setItem('fine-tuning-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'fine-tuning');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/fine-tuning\//);
});

test('the warm-up shows on the intro 21 hours after a chapter, with a skip link; not 2 hours after', async ({
  page,
}) => {
  const seed = async (hours: number) => {
    await page.goto('/');
    await page.evaluate(
      ({ done, at }) =>
        localStorage.setItem(
          'fine-tuning-progress-v1',
          JSON.stringify({ done, saved: {}, at: Object.fromEntries(done.map(id => [id, at])) }),
        ),
      { done: [CH1], at: Date.now() - hours * 3600_000 },
    );
    await page.goto('/fine-tuning/');
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
  };
  await seed(21);
  await expect(page.locator('.warmup')).toContainText('from chapters you finished');
  await expect(page.getByRole('link', { name: 'Skip to chapter 2 →' })).toHaveAttribute('href', `/fine-tuning/${CH2}/`);
  await axe(page);
  await seed(2);
  await expect(page.locator('.warmup')).toHaveCount(0);
});

test('the intro reads as pictures by default; Words unfolds the longer text', async ({ page }) => {
  await page.goto('/fine-tuning/');
  const more = page.locator('.band .note.more');
  await expect(more).toBeHidden();
  // the recorded label stays in Pictures mode, beside each answer's stamp
  const tags = page.locator('.versus .reply header .tag');
  await expect(tags).toHaveCount(2);
  for (const t of await tags.all()) await expect(t).toBeVisible();
  await expect(tags.first()).toHaveText('recorded answer');
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(more).toBeVisible();
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(ftWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in fine-tuning-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(ftWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['fine-tuning-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('fine-tuning');
});

test('chapter 2: the base model never signs off and the fine-tuned copy does, generated in the browser', async ({
  page,
}) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: 'Ask the base model' }).click();
  await expect(c.locator('.ft-answer').first()).not.toContainText('Larkspur team');
  await c.getByRole('radio', { name: /^A reply that ends/ }).click();
  await c.getByRole('button', { name: 'Swap in the fine-tuned weights' }).click();
  await expect(c.locator('.ft-answer')).toHaveCount(2);
  await expect(c.locator('.ft-answer').nth(0)).not.toContainText('Larkspur team');
  await expect(c.locator('.ft-answer').nth(1)).toContainText('Cheers, the Larkspur team');
  await expect(c).toContainText('AS YOU PREDICTED');
});

test('chapter 4: the fine-tuned version fails the new price and RAG passes it', async ({ page }) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Read the price update' }).click();
  await c.getByRole('radio', { name: /^Both give the new price/ }).click();
  await c.getByRole('button', { name: /^Ask both/ }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(c.locator('.ft-answer[data-version="finetuned"] .stamp').first()).toHaveText('FAIL');
  await expect(c.locator('.ft-answer[data-version="rag"] .stamp').first()).toHaveText('PASS');
  await expect(c.locator('.ft-answer').filter({ hasText: 'recorded answer' })).toHaveCount(2);
});

test('chapter 5: fetches all three weight sets on load, then plays to the end offline with no failed request', async ({
  page,
}) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = ftWalker(page, 'mouse');
  await w.open(CH5);
  await page.waitForFunction(() =>
    ['model.bin', 'finetuned.bin', 'lora.bin'].every(f =>
      performance.getEntriesByType('resource').some(e => e.name.endsWith('/data/lm/' + f)),
    ),
  );
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch5();
  const rows = card(page).locator('[data-scores] tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1).locator('td').nth(1)).toHaveText(/^\+/);
  await expect(rows.nth(2).locator('td').nth(1)).toHaveText(/^\+/);
  expect(failed).toEqual([]);
});

test('chapter 7: a plan short of the best is not accepted; the fine-tune for no-fact replies ties for best', async ({
  page,
}) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    kind = (id: string) => c.locator(`fieldset[data-kind="${id}"]`),
    score = c.locator('[data-score]');
  await expect(score).toHaveAttribute('data-best', '0');
  await kind('facts').getByRole('button', { name: 'RAG' }).click();
  await kind('changed').getByRole('button', { name: 'RAG' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1'); // voice stayed with the fine-tune: one of the tied plans
  await expect(c.locator('.ft-headline strong')).toBeVisible();
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = ftWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(ftWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(ftWalker(page, 'mouse'));
  await page.goto('/fine-tuning/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/fine-tuning/', ...CHS.map(id => `/fine-tuning/${id}/`), '/fine-tuning/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      ftWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
