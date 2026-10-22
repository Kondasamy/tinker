// Module 15, Agent sandboxing: the intro, every chapter played by mouse and by keyboard, chapter 5's prediction locking
// before its reveal, reduced motion, the recap, axe and phone width; the go-live checks: Module 15 kickers and share
// images, home's card and Continue.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { sandboxWalker, type Mode } from './sandboxing-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('sandboxing');
const IDS = M.chapters.map(c => c.id);
const nextUrl = (i: number) =>
  i < IDS.length - 1 ? new RegExp(`/sandboxing/${IDS[i + 1]}/`) : /\/sandboxing\/recap\//;

// axe only at chapter complete, when nothing is animating (a stage mid-fade can report false contrast failures)
async function clean(page: Page) {
  const card = page.getByRole('region', { name: 'Next step' });
  if (await card.getByText('Chapter complete').count()) expect(await serious(page)).toEqual([]);
}

async function play(page: Page, mode: Mode, check = clean) {
  const w = sandboxWalker(page, mode, check);
  await w.open(IDS[0]);
  await w.ch1(nextUrl(0));
  await w.ch2(nextUrl(1));
  await w.ch3(nextUrl(2));
  await w.ch4(nextUrl(3));
  await w.ch5(nextUrl(4));
  await w.ch6(nextUrl(5));
  await w.ch7(nextUrl(6));
}

test('every chapter plays by mouse', async ({ page }) => {
  await play(page, 'mouse');
});
test('every chapter plays by keyboard only', async ({ page }) => {
  await play(page, 'keyboard');
});

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/sandboxing/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText(M.level);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test('Module 15 on the intro, the recap and home, with their own share images; home Continue resumes it', async ({
  page,
}) => {
  await page.goto('/sandboxing/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 15 · Agent sandboxing');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/sandboxing\.jpg$/);
  await page.goto('/sandboxing/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 15 · Recap');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/sandboxing-recap\.jpg$/);
  await page.goto('/');
  await expect(page.locator('.module[data-module="sandboxing"] h4 a')).toHaveAttribute('href', '/sandboxing/');
  await page.evaluate(() => {
    localStorage.setItem('sandboxing-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'sandboxing');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/sandboxing\//);
});

test('chapter 5: the prediction locks before the reveal and stays beside the outcome', async ({ page }) => {
  const w = sandboxWalker(page, 'mouse');
  await w.open(IDS[4]);
  const c = page.getByRole('region', { name: 'Next step' });
  await c.getByRole('button', { name: 'Run it' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(c.getByRole('status').filter({ hasText: /PREDICTED/ })).toHaveCount(0);
  await c.getByRole('radio', { name: /^Yes: with no customer data mounted/ }).click();
  await expect(c).toContainText('Step 3 of');
  const no = c.getByRole('radio', { name: /^No: the attack can read/ });
  await expect(no).toHaveAttribute('aria-disabled', 'true');
  await no.click({ force: true }); // aria-disabled: Playwright would wait for it to enable
  await expect(c.getByRole('radio', { name: /^Yes: with no customer data mounted/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(c.getByRole('status').filter({ hasText: /PREDICTED/ })).toContainText(
    'You predicted: Yes: with no customer data mounted',
  );
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
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
    await play(page, 'mouse', still);
  });
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
