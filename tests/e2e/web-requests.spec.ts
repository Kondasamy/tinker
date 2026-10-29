// Opening a web page: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 4's
// far customer with loss slower than the near one on the waterfall, the waterfall read with the arrow keys, "I'm not
// sure", reduced motion, the recap, axe and phone width; the go-live checks: module kickers and share images, home's
// card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { customerOf } from '../../src/lib/web-requests/sim';
import { webWalker } from './web-requests-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('web-requests');
const N = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/web-requests/${id}/$`);
async function walkAll(w: ReturnType<typeof webWalker>) {
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

test('the intro shows the level, the author and the chapters', async ({ page }) => {
  await page.goto('/web-requests/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('numbered 26 on the intro and the recap', async ({ page }) => {
  expect(N).toBe(27);
  await page.goto('/web-requests/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${N} · Opening a web page`);
  await page.goto('/web-requests/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${N} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/web-requests/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/web-requests\.jpg$/);
  await page.goto(`/web-requests/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/web-requests-${CH1}\\.jpg$`),
  );
  await page.goto('/web-requests/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/web-requests-recap\.jpg$/);
  expect((await page.request.get('/og/web-requests.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="web-requests"] h4 a')).toHaveAttribute('href', '/web-requests/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(webWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in web-requests-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(webWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['web-requests-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('web-requests');
});

test('chapter 4: the far customer with loss takes longer than the near one, read off the waterfall', async ({
  page,
}) => {
  const w = webWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Lossy lines' }).click();
  await expect(page.locator('.ditch')).toHaveCount(1);
  await page.getByRole('button', { name: 'Waterfall', exact: true }).click();
  const total = async () => {
    const label = await page.getByRole('list', { name: /^Waterfall of/ }).getAttribute('aria-label');
    return Number(/([\d,]+) ms in all/.exec(label!)![1].replace(/,/g, ''));
  };
  await expect(page.locator('[data-lost="1"]')).toHaveCount(1);
  const far = await total();
  const ines = customerOf('ines');
  await c.getByRole('button', { name: `${ines.name}, ${ines.town}` }).click();
  await expect(page.getByRole('list', { name: new RegExp(`^Waterfall of ${ines.name}`) })).toBeVisible();
  await expect(page.locator('[data-lost="1"]')).toHaveCount(0);
  expect(far).toBeGreaterThan(await total());
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = webWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  const [a, b] = [customerOf('ines'), customerOf('wen')];
  await c.getByRole('button', { name: `${a.name}, ${a.town}` }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: `${b.name}, ${b.town}` }).click();
  await c.getByRole('button', { name: 'Open the Waterfall tab' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('the waterfall reads each step with the arrow keys', async ({ page }) => {
  const w = webWalker(page, 'mouse');
  await w.open(CH6);
  await page.getByRole('button', { name: 'Waterfall', exact: true }).click();
  const rows = page.getByRole('list', { name: /^Waterfall of/ });
  await rows.locator('[role="listitem"]').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.wr-readout')).toContainText(/^Step 2 of \d+: /);
  await page.keyboard.press('End');
  await expect(page.locator('.wr-readout')).toContainText(/^Step (\d+) of \1: /);
  await axe(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still, the ditch and RESENT pill still show, and the chapters play through', async ({
    page,
  }) => {
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
    const w = webWalker(page, 'mouse', still);
    await w.open(CH4);
    const c = card(page);
    await c.getByRole('radio').first().click();
    await c.getByRole('button', { name: 'Lossy lines' }).click();
    await expect(page.locator('.ditch')).toHaveCount(1);
    await expect(page.locator('.stage')).toContainText('RESENT');
    await still(page);
    await page.evaluate(() => localStorage.clear());
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = webWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/web-requests/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('web-requests-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/web-requests/', ...IDS.map(id => `/web-requests/${id}/`), '/web-requests/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      webWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
