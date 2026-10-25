// Search before AI: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 1's
// scan reading every page and chapter 2's index answering with one drawer, the filing bench refusing a wrong drawer
// with a hint by keyboard, the Postings tab, "I'm not sure", reduced motion, the recap, axe and phone width; the go-live
// checks: Module 26 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { N } from '../../src/lib/search/engine';
import { searchWalker } from './search-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('search');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/search/${id}/$`);
async function walkAll(w: ReturnType<typeof searchWalker>) {
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

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/search/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toHaveAttribute(
    'href',
    'https://april-zhu.com/colorfigures',
  );
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('Module 26 on the intro and the recap', async ({ page }) => {
  await page.goto('/search/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 26 · Search before AI');
  await page.goto('/search/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 26 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/search/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/search\.jpg$/);
  await page.goto(`/search/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/search-${CH1}\\.jpg$`),
  );
  await page.goto('/search/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/search-recap\.jpg$/);
  expect((await page.request.get('/og/search.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="search"] h4 a')).toHaveAttribute('href', '/search/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(searchWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in search-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(searchWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['search-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('search');
});

test('chapter 1’s scan reads every page; chapter 2’s index answers with one drawer', async ({ page }) => {
  const w = searchWalker(page, 'mouse');
  await w.open(CH1);
  await card(page).getByRole('button', { name: 'Search for “forklift”' }).click();
  await expect(page.locator('.tc-caption')).toContainText(`read all ${N} pages`);
  await expect(page.locator('[data-prop="pages"].reading')).toHaveCount(1);
  await w.open(CH2);
  await w.file(0, 0);
  await w.file(1, 1);
  await w.file(2, 2);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Search for “forklift”' }).click();
  await expect(page.locator('.drawer.out.lit')).toHaveCount(1);
  await expect(page.locator('.tc-caption')).toContainText('one drawer opened');
  await c.getByRole('button', { name: 'Open the Postings tab' }).click();
  await expect(page.getByRole('table', { name: /The drawers for “forklift”/ })).toBeVisible();
  await axe(page);
});

test('the filing bench refuses a wrong drawer by keyboard, and hints after three refusals', async ({ page }) => {
  const w = searchWalker(page, 'keyboard');
  await w.open(CH2);
  const status = card(page).locator('.sx-said');
  for (const drawer of [1, 2, 3]) {
    await w.file(0, drawer);
    await expect(status).toContainText('Refused');
  }
  await expect(card(page).locator('.sx-hint')).toBeVisible();
  await w.file(0, 0);
  await expect(status).toContainText('Filed');
  await expect(page.locator('.drawer[data-word="forklift"][data-cards="1"]')).toHaveCount(1);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = searchWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Search for “forklift”' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Search for “refund”' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = searchWalker(page, 'mouse', async p => {
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
  const w = searchWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/search/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('search-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/search/', ...IDS.map(id => `/search/${id}/`), '/search/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      searchWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
