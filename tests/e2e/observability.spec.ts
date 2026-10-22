// Module 14, Observability & error analysis: the intro, every chapter played by mouse and by keyboard only, its own
// progress key, chapter 2's waterfall by arrow keys and Enter, chapter 3's notes surviving a reload with no request
// leaving the page, the chapter 4 and 7 puzzles' "Show me", reduced motion, the recap, axe and phone width; the go-live
// checks: Module 14 kickers and share images, home's card and Continue.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { observabilityWalker } from './observability-flow';
import { serious, layoutHolds, PHONE } from './helpers';
import { FAILED } from '../../src/lib/observability/traces';

const M = moduleOf('observability');
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = M.chapters.map(c => c.id);
const ALL = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/observability/${id}/$`);
async function walkAll(w: ReturnType<typeof observabilityWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7(/\/observability\/recap\/$/);
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(180_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({
  page,
}) => {
  await page.goto('/observability/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('evals').title, exact: true })).toHaveAttribute(
    'href',
    '/evals/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute(
    'href',
    'https://april-zhu.com/colorfigures',
  );
  await axe(page);
});

test('Module 14 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({
  page,
}) => {
  await page.goto('/observability/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 14 · Observability');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/observability\.jpg$/);
  await page.goto('/observability/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 14 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/observability-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="observability"] h4 a')).toHaveAttribute('href', '/observability/');
  await page.evaluate(() => {
    localStorage.setItem('observability-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'observability');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/observability\//);
});

test('every chapter plays by mouse, in order through the Next links to the recap, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(observabilityWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in observability-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'evals-progress-v1': JSON.stringify({ done: ['01-it-worked-when-i-tried-it'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(observabilityWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['observability-progress-v1']).done).toEqual(ALL);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('observability');
});

test('chapter 2: the waterfall reads by arrow keys, and Enter picks the first failure', async ({ page }) => {
  const w = observabilityWalker(page, 'keyboard');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: 'Open the first failed trace' }).press('Enter');
  await c.getByRole('radio', { name: /^In the search/ }).press('Enter');
  await expect(c).toContainText('Step 3 of');
  const fall = page.locator('.ob-fall [role="list"]');
  await fall.locator('[tabindex="0"]').focus();
  await expect(page.locator('.ob-readout')).toContainText('invoke_agent');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ob-readout')).toContainText('Shipping guide (2024)');
  await page.keyboard.press('Enter');
  await expect(c).toContainText('Step 4 of');
  await expect(c).toContainText('Last year’s passage');
});

test('chapter 3: a note is typed, capped, kept as text, survives a reload, and no request leaves the page', async ({
  page,
}) => {
  const w = observabilityWalker(page, 'keyboard');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /^A handful of kinds/ }).press('Enter');
  await expect(c).toContainText('Step 2 of');
  const requests: string[] = [];
  page.on('request', r => requests.push(r.url()));
  const input = c.getByLabel('Note on trace 1', { exact: true });
  await input.focus();
  await page.keyboard.type('<script>alert(1)</script> old cutoff');
  await input.fill('x'.repeat(400));
  await expect(input).toHaveValue('x'.repeat(140));
  await input.fill('<b>old</b> cutoff quoted');
  await expect(c).toContainText(`1 of ${FAILED.length} traces noted`);
  expect(requests).toEqual([]);
  await page.reload();
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.getByRole('button', { name: /^Continue at step 2/ }).click();
  await expect(card(page).getByLabel('Note on trace 1', { exact: true })).toHaveValue('<b>old</b> cutoff quoted');
  await expect(page.locator('b', { hasText: /^old$/ })).toHaveCount(0);
});

test('chapter 7: Show me gives a plan that works, one of the ties', async ({ page }) => {
  const w = observabilityWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await c.getByRole('button', { name: 'Open today’s queue' }).click();
  await c.getByRole('radio', { name: /^Something else/ }).click();
  await expect(c.locator('[data-solved]').first()).toHaveAttribute('data-solved', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 4 of');
  await expect(c.locator('[data-solved]').first()).toHaveAttribute('data-solved', '1');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = observabilityWalker(page, 'mouse', async p => {
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

test('the recap asks from the finished chapter', async ({ page }) => {
  const w = observabilityWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/observability/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/observability/', ...ALL.map(id => `/observability/${id}/`), '/observability/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      observabilityWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
