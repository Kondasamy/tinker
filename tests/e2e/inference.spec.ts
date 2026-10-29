// Module 13, Inference engineering: the intro, every chapter played by mouse and by keyboard only, its own progress key,
// chapter 5's drafted and checked tokens with "same output", chapter 4's loading frame and Retry, reduced motion, the
// recap, axe and phone width; the go-live checks: Module 13 kickers and share images, home's card and Continue.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { inferenceWalker } from './inference-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('inference');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/inference/${id}/$`);
async function walkAll(w: ReturnType<typeof inferenceWalker>) {
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

test('the intro shows the level, the prerequisite, the author and the chapters', async ({ page }) => {
  await page.goto('/inference/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 13 · Inference');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: 'Transformer architecture' })).toHaveAttribute('href', '/transformers/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('Module 13 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({
  page,
}) => {
  await page.goto('/inference/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 13 · Inference');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/inference\.jpg$/);
  await page.goto('/inference/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 13 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/inference-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="inference"] h4 a')).toHaveAttribute('href', '/inference/');
  await page.evaluate(() => {
    localStorage.setItem('inference-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'inference');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/inference\//);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(inferenceWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in inference-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(inferenceWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['inference-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('inference');
});

test('chapter 5: the reveal shows the drafted and checked tokens, and the same output as plain decoding', async ({
  page,
}) => {
  const w = inferenceWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('button', { name: /^Write \d+ tokens, one pass each/ }).click();
  const plain = (await c.locator('[data-plain] strong').textContent())!;
  await c.getByRole('radio', { name: /^A slightly different reply/ }).click();
  await c.getByRole('button', { name: /^Draft \d+ at a time/ }).click();
  await expect(c.locator('.feedback')).toContainText('NOT WHAT YOU PREDICTED');
  const spec = c.locator('[data-spec]');
  await expect(spec.locator('.in-tokens li[data-kind="target"]').first()).toBeVisible();
  await expect(spec.locator('.in-tokens li[data-kind="kept"]').first()).toBeVisible();
  await expect(spec.locator('strong')).toHaveText(plain);
  await expect(spec).toContainText('SAME OUTPUT');
  await expect(page.locator('[data-prop="draft"]')).toHaveCount(1);
});

test('chapter 4: the stage holds its frame while Larkspur mini loads, offers Retry when it fails, then plays', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/data/lm/model.bin', r => (fail ? r.abort() : r.continue()));
  await page.goto(`/inference/${CH4}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.locator('.in-stage[data-model="failed"]')).toBeVisible({ timeout: 15_000 });
  await axe(page);
  fail = false;
  await page.locator('.in-stage').getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('.in-stage[data-model="ready"]')).toBeVisible({ timeout: 15_000 });
  await inferenceWalker(page, 'mouse').ch4();
});

test('chapter 4: a precision changed during the prediction still scores 8 against 16 and plays on', async ({
  page,
}) => {
  const w = inferenceWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: '8 bits' }).click();
  await expect(c).toContainText('Step 2 of');
  await c.getByRole('button', { name: '4 bits' }).click();
  await c.getByRole('radio', { name: /^Barely moves/ }).click();
  await c.getByRole('button', { name: 'Score both on held-out text' }).click();
  await expect(c).toContainText(/Step [45] of/, { timeout: 30_000 });
  await c.getByRole('button', { name: '4 bits' }).click();
  await expect(c).toContainText('Step 5 of');
  await c.getByRole('radio', { name: /^Run its own evals/ }).click();
  await expect(c).toContainText('Chapter complete');
});

test('chapter 5 plays to the end offline once both models have loaded', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = inferenceWalker(page, 'mouse');
  await w.open(CH5);
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch5();
  expect(failed).toEqual([]);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = inferenceWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('button', { name: 'Open the Timeline tab' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Continuous batching', exact: true }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the timeline reads each request with the arrow keys', async ({ page }) => {
  const w = inferenceWalker(page, 'mouse');
  await w.open(CH3);
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  const lanes = page.getByRole('list', { name: /^Server timeline/ });
  await lanes.locator('[role="listitem"]').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.in-readout')).toContainText(
    /^Request 2 of 24 .* waited .* for its first token.* finished at/,
  );
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = inferenceWalker(page, 'mouse', async p => {
      await expect
        .poll(() =>
          p.evaluate(
            () =>
              document
                .querySelector('.stage')!
                .getAnimations({ subtree: true })
                .filter(a => a.playState === 'running').length,
          ),
        )
        .toBe(0);
    });
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = inferenceWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/inference/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 13 · Recap');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('inference-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/inference/', ...IDS.map(id => `/inference/${id}/`), '/inference/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      inferenceWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
