// How email arrives: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// postmarks peeled by keyboard alone with one polite read-out, the Headers tab, "I'm not sure", reduced motion (no
// animation), real DKIM in the browser, the links to Opening a web page and Locks and keys, the recap, axe and phone
// width. The go-live adds the module's number, share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { hops, parse } from '../../src/lib/email/parse';
import { readFileSync } from 'node:fs';
import { emailWalker } from './email-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('email');
const NUMBER = moduleNumber(moduleOf('email'));
const mail = (id: string) => parse(readFileSync(`data/email/messages/${id}.eml`, 'utf8'));
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/email/${id}/$`);
async function walkAll(w: ReturnType<typeof emailWalker>) {
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

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/email/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/email/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · How email arrives`);
  await page.goto('/email/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/email/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/email\.jpg$/);
  await page.goto(`/email/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/email-${CH1}\\.jpg$`),
  );
  await page.goto('/email/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/email-recap\.jpg$/);
  expect((await page.request.get('/og/email.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="email"] h4 a')).toHaveAttribute('href', '/email/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(emailWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in email-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(emailWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['email-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('email');
});

test('the postmarks peel by keyboard alone, bottom first, and the one read-out names each hop', async ({ page }) => {
  const w = emailWalker(page, 'keyboard');
  await w.open(CH2);
  await card(page).getByRole('radio').first().press('Enter');
  const status = stage(page).getByRole('status');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveAttribute('aria-live', 'polite');
  const list = hops(mail('order'));
  await stage(page).getByRole('button', { name: 'Peel postmark 1' }).focus();
  for (const [i, h] of list.entries()) {
    await expect(page.locator(':focus')).toHaveText(`Peel postmark ${i + 1}`);
    await page.keyboard.press('Enter');
    await expect(status).toContainText(`Postmark ${i + 1} of ${list.length}: ${h.by}`);
    await expect(page.locator('.hop[data-lit="1"]')).toHaveCount(i + 1);
  }
  await axe(page);
});

test('the Headers tab shows the raw message', async ({ page }) => {
  const w = emailWalker(page, 'mouse');
  await w.open(CH3);
  await card(page).getByRole('radio', { name: 'Fake invoice', exact: true }).click();
  await stage(page).getByRole('button', { name: 'Headers', exact: true }).click();
  await expect(stage(page).getByLabel(/^The raw message/)).toContainText('Return-Path: <pay@larkspur-billing.example>');
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = emailWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await stage(page).getByRole('button', { name: 'Headers', exact: true }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Deliver' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test('chapter 2 links to Opening a web page’s DNS chapter, chapter 5 to Locks and keys’ signatures', async ({
  page,
}) => {
  const w = emailWalker(page, 'mouse');
  await w.open(CH2);
  await card(page).getByRole('radio').first().click();
  await w.peel();
  await expect(card(page).getByRole('link', { name: /a name to a number/ })).toHaveAttribute(
    'href',
    '/web-requests/01-a-name-to-a-number/',
  );
  await w.open(CH5);
  await w.ch5();
  await expect(card(page).getByRole('link', { name: /sealed with your key/ })).toHaveAttribute(
    'href',
    '/encryption/04-sealed-with-your-key/',
  );
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing animates as postmarks peel, and the chapters still play through', async ({ page }) => {
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
    const w = emailWalker(page, 'mouse');
    await w.open(CH2);
    await card(page).getByRole('radio').first().click();
    await stage(page).getByRole('button', { name: 'Peel all' }).click();
    await expect(stage(page).locator('li.peeled')).toHaveCount(hops(mail('order')).length);
    await still(page);
    await page.evaluate(() => localStorage.removeItem('email-progress-v1'));
    await walkAll(emailWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = emailWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/email/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('email-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/email/', ...IDS.map(id => `/email/${id}/`), '/email/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      emailWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
