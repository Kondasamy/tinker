// Recommendations: the intro, every chapter played by mouse (the marker dragged) and by keyboard only (the marker moved
// with arrow keys), its own progress key, the marker's focus ring and Tab-out with one polite read-out, the shopper
// select as the list alternative, the Ranking tab, "I'm not sure", reduced motion, the workbench's winning and losing
// settings, the recap, axe and phone width. The go-live adds the module's number, share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { customerOf } from '../../src/lib/recommendations/story';
import { recommendationsWalker } from './recommendations-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('recommendations');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'recommendations') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/recommendations/${id}/$`);
async function walkAll(w: ReturnType<typeof recommendationsWalker>) {
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
const stage = (page: Page) => page.getByRole('region', { name: 'Scene' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(240_000);

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/recommendations/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
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

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/recommendations/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recommendations`);
  await page.goto('/recommendations/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/recommendations/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/recommendations\.jpg$/);
  await page.goto(`/recommendations/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/recommendations-${CH1}\\.jpg$`),
  );
  await page.goto('/recommendations/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/recommendations-recap\.jpg$/,
  );
  expect((await page.request.get('/og/recommendations.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="recommendations"] h4 a')).toHaveAttribute(
    'href',
    '/recommendations/',
  );
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(recommendationsWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in recommendations-progress-v1 and no other key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(recommendationsWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['recommendations-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('recommendations');
});

test('the marker: a visible focus ring, arrows only while focused, Tab out; the read-out names the shelf', async ({
  page,
}) => {
  const w = recommendationsWalker(page, 'keyboard');
  await w.open(CH4);
  const marker = stage(page).locator('.rc-marker');
  const status = stage(page).getByRole('status');
  await expect(status).toHaveCount(1);
  await expect(status).toContainText('’s shelf:');
  const before = await marker.getAttribute('transform');
  // arrows do nothing while the marker is not focused
  await page.keyboard.press('ArrowRight');
  await expect(marker).toHaveAttribute('transform', before!);
  await marker.focus();
  const ring = await marker.locator('.rc-ring').evaluate(e => getComputedStyle(e).strokeWidth);
  expect(Number.parseFloat(ring)).toBeGreaterThanOrEqual(3);
  await marker.press('ArrowRight');
  await expect(marker).not.toHaveAttribute('transform', before!);
  await expect(status).toContainText('Nearest');
  await page.keyboard.press('Tab');
  await expect(marker).not.toBeFocused();
  await axe(page);
});

test('the shopper select is the list alternative: it moves the shopper and re-ranks the shelf', async ({ page }) => {
  const w = recommendationsWalker(page, 'mouse');
  await w.open(CH4);
  const shelf = () =>
    stage(page)
      .locator('.rc-item')
      .evaluateAll(es => es.map(e => e.getAttribute('data-product')));
  const first = await shelf();
  await stage(page)
    .getByRole('combobox', { name: /^Shopper/ })
    .selectOption({ label: customerOf('c35').name });
  await expect.poll(shelf).not.toEqual(first);
  await expect(stage(page).getByRole('status')).toContainText(customerOf('c35').name);
});

test('the Ranking tab shows the ranking behind the shelf', async ({ page }) => {
  const w = recommendationsWalker(page, 'mouse');
  await w.open(CH2);
  await stage(page).getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(stage(page).locator('tr[data-shelf]')).toHaveCount(5);
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = recommendationsWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('radio', { name: 'People like you' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the workbench: the start breaks the rule; a winning setting is BEST', async ({ page }) => {
  const w = recommendationsWalker(page, 'mouse');
  await w.open(CH7);
  await expect(card(page).locator('.stamp.wrong')).toHaveText('RULE BROKEN');
  await w.ch7();
  await expect(card(page).locator('.stamp.correct').first()).toHaveText('BEST');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing animates, and the chapters still play through', async ({ page }) => {
    const still = async (p: Page) => {
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
    };
    const w = recommendationsWalker(page, 'mouse', still);
    await w.open(CH6);
    await w.nextRound();
    await still(page);
    await page.evaluate(() => localStorage.removeItem('recommendations-progress-v1'));
    await walkAll(recommendationsWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = recommendationsWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/recommendations/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('recommendations-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test('chapter 1 links to Search’s ranking chapter', async ({ page }) => {
  const w = recommendationsWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await expect(card(page).getByRole('link', { name: /ranking from a query/ })).toHaveAttribute(
    'href',
    '/search/03-rare-words-count-more/',
  );
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/recommendations/', ...IDS.map(id => `/recommendations/${id}/`), '/recommendations/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      recommendationsWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
