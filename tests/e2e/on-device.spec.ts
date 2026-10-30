// Models on your device: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// crate (bricks spill, one read-out, the Bars tab), Larkspur mini's live replies, the tank, the workbench's Show me,
// "I'm not sure", reduced motion, the recap, axe and phone width. The go-live checks: share images, home’s card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import pinned from '../../data/on-device/pinned.json' with { type: 'json' };
import { levelAfter } from '../../src/lib/on-device/battery';
import { sizeOf } from '../../src/lib/on-device/memory';
import { odWalker } from './on-device-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('on-device');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/on-device/${id}/$`);
async function walkAll(w: ReturnType<typeof odWalker>) {
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
// let the stage's fade finish first: axe can catch a figure mid-fade and report false contrast failures
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the level, the author, the chapters and the module number', async ({ page }) => {
  await page.goto('/on-device/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Models on your device`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Intermediate');
  await expect(page.locator('.topbar').getByRole('link', { name: M.author.name })).toHaveAttribute(
    'href',
    M.author.url,
  );
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/on-device/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/on-device/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/on-device\.jpg$/);
  await page.goto(`/on-device/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/on-device-${CH1}\\.jpg$`),
  );
  await page.goto('/on-device/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/on-device-recap\.jpg$/);
  expect((await page.request.get('/og/on-device.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="on-device"] h4 a')).toHaveAttribute('href', '/on-device/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(odWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in on-device-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'inference-progress-v1': JSON.stringify({ done: ['01-prefill-and-decode'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(odWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['on-device-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('on-device');
});

test('chapter 1: the 1B spills; one read-out says so; the Bars tab shows the same memory', async ({ page }) => {
  const w = odWalker(page, 'mouse');
  await w.open(CH1);
  await expect(page.locator('.od-stage [role="status"]')).toHaveCount(1);
  await card(page).getByRole('radio', { name: '1B model', exact: true }).click();
  await expect(page.locator('[data-part="spill"]')).toHaveCount(4);
  await expect(page.locator('.od-said')).toContainText('It doesn’t fit: 4 bricks spill.');
  await page.getByRole('button', { name: 'Bars', exact: true }).click();
  await expect(page.locator('.od-bars')).toContainText('Memory: 2.46 GB of 2.00 GB free');
});

test('chapter 2: Larkspur mini answers live, and its 2-bit reply is the pinned one', async ({ page }) => {
  const w = odWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('radio', { name: '8 bits', exact: true }).click();
  await c.getByRole('radio', { name: /^The same words/ }).click();
  await c.getByRole('radio', { name: '2 bits', exact: true }).click();
  await expect(c.getByRole('button', { name: 'Ask at 2 bits' })).toBeEnabled({ timeout: 30_000 });
  await c.getByRole('button', { name: 'Ask at 2 bits' }).click();
  await expect(page.locator('.od-reply')).toContainText(pinned.replies.at.find(r => r.bits === 2)!.text.trim());
});

test('chapter 4: an hour of long replies drains the tank', async ({ page }) => {
  const w = odWalker(page, 'mouse');
  await w.open(CH4);
  await expect(page.locator('[data-part="tank"]')).toHaveAttribute('data-level', '1.000');
  await card(page).getByRole('button', { name: 'Ask: one hour of long replies' }).click();
  await expect(page.locator('.od-said')).toContainText(
    `Battery ${Math.round(levelAfter(sizeOf('3b'), 4, 'long', 1) * 100)}%.`,
  );
});

test('chapter 7: the start is not accepted; Show me applies the passing setup', async ({ page }) => {
  const w = odWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = odWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, /^I’m not sure/);
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the bricks show their end state at once', async ({ page }) => {
    const w = odWalker(page, 'mouse');
    await w.open(CH1);
    await card(page).getByRole('radio', { name: '3B model', exact: true }).click();
    await expect(page.locator('[data-part="bricks"] [data-brick]')).toHaveCount(16);
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(odWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(odWalker(page, 'mouse'));
  await page.goto('/on-device/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/on-device/', ...CHS.map(id => `/on-device/${id}/`), '/on-device/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      odWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
