// Databases & indexes: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 2's
// lookup opening far fewer drawers than chapter 1's scan, the tree read with the arrow keys, "I'm not sure", reduced
// motion, the recap, axe and phone width; the go-live checks: Module 22 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { TABLE_PAGES } from '../../src/lib/databases/table';
import { databasesWalker } from './databases-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('databases');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/databases/${id}/$`);
async function walkAll(w: ReturnType<typeof databasesWalker>) {
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

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/databases/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('Module 22 on the intro and the recap', async ({ page }) => {
  await page.goto('/databases/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 22 · Databases & indexes');
  await page.goto('/databases/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 22 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/databases/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/databases\.jpg$/);
  await page.goto(`/databases/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/databases-${CH1}\\.jpg$`),
  );
  await page.goto('/databases/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/databases-recap\.jpg$/);
  expect((await page.request.get('/og/databases.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="databases"] h4 a')).toHaveAttribute('href', '/databases/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(databasesWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in databases-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(databasesWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['databases-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('databases');
});

test('chapter 2’s lookup opens far fewer drawers than chapter 1’s scan', async ({ page }) => {
  const w = databasesWalker(page, 'mouse');
  await w.open(CH1);
  await card(page).getByRole('button', { name: 'Find order 1042' }).click();
  await expect(page.locator('.drawer.read')).toHaveCount(TABLE_PAGES);
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: 'Build the index' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Find order 1042' }).click();
  await expect(page.locator('.drawer.read')).toHaveCount(1);
  await expect(page.locator('.tc-caption')).toContainText(/^Order 1042 through the index/);
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = databasesWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Find order 1042' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Grow to a million orders' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the tree reads each level with the arrow keys', async ({ page }) => {
  const w = databasesWalker(page, 'mouse');
  await w.open(CH4);
  await card(page)
    .getByRole('button', { name: /^Customer \d+’s orders this month/ })
    .click();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  const rows = page.getByRole('list', { name: /^The index on customer, then date/ });
  await rows.locator('[role="listitem"]').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.db-readout')).toContainText(/^Level 2 of 3: page \d+ of \d+, keys cust/);
  await page.keyboard.press('End');
  await expect(page.locator('.db-readout')).toContainText(/^The table: \d+ pages? fetched/);
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = databasesWalker(page, 'mouse', async p => {
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
  const w = databasesWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/databases/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('databases-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/databases/', ...IDS.map(id => `/databases/${id}/`), '/databases/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      databasesWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
