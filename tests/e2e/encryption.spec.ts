// Locks and keys: the intro, every chapter played by mouse and by keyboard only, its own progress key, real AES-GCM
// and ECDSA run in the browser against their pins, "toy size" on every screen showing toy numbers, the secret picker by
// keyboard, an impostor's certificate, "I'm not sure", reduced motion, the recap, axe and phone width; the module's
// number on its intro and recap, its share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import pinned from '../../data/encryption/pinned.json' with { type: 'json' };
import { moduleNumber, moduleOf } from '../../src/lib/modules';
import { ENCRYPTION_MODULE as M } from '../../src/content/encryption/module';
import { encryptionWalker } from './encryption-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const NUMBER = moduleNumber(moduleOf('encryption'));
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/encryption/${id}/$`);
async function walkAll(w: ReturnType<typeof encryptionWalker>) {
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
  await page.goto('/encryption/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
});

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/encryption/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Locks and keys`);
  await page.goto('/encryption/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/encryption/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/encryption\.jpg$/);
  await page.goto(`/encryption/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/encryption-${CH1}\\.jpg$`),
  );
  await page.goto('/encryption/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/encryption-recap\.jpg$/);
  expect((await page.request.get('/og/encryption.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="encryption"] h4 a')).toHaveAttribute('href', '/encryption/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(encryptionWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in encryption-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(encryptionWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['encryption-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('encryption');
});

test('the real algorithms run here: AES-GCM gives the pinned ciphertext, ECDSA fails on the changed invoice', async ({
  page,
}) => {
  const w = encryptionWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Lock the order' }).click();
  await expect(c.locator('[data-cipher]')).toHaveAttribute('data-cipher', pinned.aes);
  await w.open(CH4);
  await c.getByRole('button', { name: 'Sign the invoice' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Change the account' }).click();
  await expect(c.locator('[data-verified]')).toHaveAttribute('data-verified', '0');
});

test('“toy size” shows on every screen with toy numbers', async ({ page }) => {
  for (const id of [CH2, CH3, CH4, CH6]) {
    await page.goto(`/encryption/${id}/`);
    await page.locator('astro-island:not([ssr])').first().waitFor();
    await expect(page.locator('.ek-stage .tc-caption')).toContainText('Toy-size numbers');
  }
});

test('chapter 2: the secret colour is a native radio group the arrow keys move through', async ({ page }) => {
  const w = encryptionWalker(page, 'keyboard');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('radio', { name: /^Rose/ }).focus();
  await page.keyboard.press('Space');
  await expect(c).toContainText('Step 2 of');
  await page.keyboard.press('ArrowDown');
  await expect(c.getByRole('radio', { name: /^Sky/ })).toBeChecked();
  await c.getByRole('button', { name: 'Mix your pot' }).press('Enter');
  await expect(page.locator('.ek-stage [data-colour]').first()).toBeVisible();
});

test('chapter 6: each impostor’s card fails its own check', async ({ page }) => {
  const w = encryptionWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Check the certificate' }).click();
  await expect(c.locator('[data-ok="0"]')).toHaveCount(0);
  await c.getByRole('radio', { name: 'Impostor: an old, expired card' }).check();
  await expect(c.locator('[data-check="date"]')).toHaveAttribute('data-ok', '0');
  await c.getByRole('radio', { name: 'Impostor: a lookalike root' }).check();
  await expect(c.locator('[data-check="root"]')).toHaveAttribute('data-ok', '0');
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = encryptionWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Change one digit' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the pots show mixed at once and the chapters still play through', async ({ page }) => {
    const w = encryptionWalker(page, 'mouse', async p => {
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
  const w = encryptionWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/encryption/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('encryption-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/encryption/', ...IDS.map(id => `/encryption/${id}/`), '/encryption/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      encryptionWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
