// Agent sandboxing: the intro, every chapter played by mouse and by keyboard, the recap, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { sandboxWalker, type Mode } from './sandboxing-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('sandboxing');
const IDS = M.chapters.map(c => c.id);
const nextUrl = (i: number) => (i < IDS.length - 1 ? new RegExp(`/sandboxing/${IDS[i + 1]}/`) : /\/sandboxing\/recap\//);

// axe only at chapter complete, when nothing is animating (a stage mid-fade can report false contrast failures)
async function clean(page: Page) {
  const card = page.getByRole('region', { name: 'Next step' });
  if (await card.getByText('Chapter complete').count()) expect(await serious(page)).toEqual([]);
}

async function play(page: Page, mode: Mode) {
  const w = sandboxWalker(page, mode, clean);
  await w.open(IDS[0]); await w.ch1(nextUrl(0));
  await w.ch2(nextUrl(1));
  await w.ch3(nextUrl(2));
  await w.ch4(nextUrl(3));
  await w.ch5(nextUrl(4));
  await w.ch6(nextUrl(5));
  await w.ch7(nextUrl(6));
}

test('every chapter plays by mouse', async ({ page }) => { await play(page, 'mouse'); });
test('every chapter plays by keyboard only', async ({ page }) => { await play(page, 'keyboard'); });

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/sandboxing/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test('the recap asks from finished chapters', async ({ page }) => {
  await play(page, 'mouse');
  await page.goto('/sandboxing/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide', async ({ page }) => {
    for (const p of ['/sandboxing/', `/sandboxing/${IDS[0]}/`, '/sandboxing/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
  });
});
