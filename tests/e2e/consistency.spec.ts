// Replication & consistency: the intro, every chapter played by mouse and by keyboard only, its own progress key,
// chapter 2's two receipts for one hinge, chapter 3's cut line, the timeline read with the arrow keys, "I'm not sure",
// reduced motion, the recap, axe and phone width; the go-live checks: Module 23 kickers and share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { MOMENTS } from '../../src/lib/consistency/sim';
import { consistencyWalker } from './consistency-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('consistency');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/consistency/${id}/$`);
async function walkAll(w: ReturnType<typeof consistencyWalker>) {
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
  await page.goto('/consistency/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('Module 23 on the intro and the recap', async ({ page }) => {
  await page.goto('/consistency/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 23 · Replication & consistency');
  await page.goto('/consistency/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 23 · Recap');
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/consistency/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/consistency\.jpg$/);
  await page.goto(`/consistency/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/consistency-${CH1}\\.jpg$`),
  );
  await page.goto('/consistency/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/consistency-recap\.jpg$/);
  expect((await page.request.get('/og/consistency.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="consistency"] h4 a')).toHaveAttribute('href', '/consistency/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(consistencyWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in consistency-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(consistencyWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['consistency-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('consistency');
});

test('chapter 2: two receipts print for one hinge, and the picture shows both', async ({ page }) => {
  const w = consistencyWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('slider', { name: /^Time/ }).fill(String(MOMENTS.lastHinge - 2));
  await c.getByRole('radio', { name: /^One: the second buyer/ }).click();
  await c.getByRole('slider', { name: /^Time/ }).fill(String(MOMENTS.lastHinge));
  await expect(c.locator('.cs-receipts li[data-result="sold"]')).toHaveCount(2);
  await expect(page.locator('.stage .receipt')).toHaveCount(2);
  await axe(page);
});

test('chapter 3: the line draws cut, and staying right refuses West’s order', async ({ page }) => {
  const w = consistencyWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await expect(page.locator('[data-prop="line"]')).toHaveAttribute('data-cut', '');
  await c.getByRole('button', { name: 'Cut the line' }).click();
  await expect(page.locator('[data-prop="line"]')).toHaveAttribute('data-cut', 'west');
  await expect(page.locator('.tc-caption')).toContainText('line down');
  await c.getByRole('radio', { name: /^Sold: North’s count/ }).click();
  await c.getByRole('slider', { name: /^Time/ }).fill(String(MOMENTS.northSells));
  await c.getByRole('button', { name: 'Stay right' }).click();
  await expect(page.locator('[data-prop="west"]')).toHaveAttribute('data-refused', '1');
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = consistencyWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('slider', { name: /^R, replicas/ }).fill('2');
  await c.getByRole('slider', { name: /^W, replicas/ }).fill('2');
  await c.getByRole('button', { name: 'Cut the line' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the timeline reads each minute with the arrow keys', async ({ page }) => {
  const w = consistencyWalker(page, 'mouse');
  await w.open(CH5);
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  const cols = page.getByRole('list', { name: /^Replica timeline/ });
  await cols.locator('[role="listitem"]').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.cs-readout')).toContainText(/^10:01\. North \d+ hinges?, .*Ana bought a hinge/);
  await page.keyboard.press('End');
  await expect(page.locator('.cs-readout')).toContainText(/^10:29\./);
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = consistencyWalker(page, 'mouse', async p => {
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
  const w = consistencyWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/consistency/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('consistency-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/consistency/', ...IDS.map(id => `/consistency/${id}/`), '/consistency/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      consistencyWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
