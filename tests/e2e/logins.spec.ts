// Logins and passwords: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// cracking race by keyboard (radios, the range, Play and Step, one read-out), real PBKDF2, TOTP and ECDSA run in the
// browser against their pins, the workbench with a losing plan and a winning one, "I'm not sure", reduced motion, the
// recap, axe and phone width. The go-live adds the module's number, share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import pinned from '../../data/logins/pinned.json' with { type: 'json' };
import { LOGINS_MODULE as M } from '../../src/content/logins/module';
import { MODULES } from '../../src/lib/modules';
import { START } from '../../src/lib/logins/workbench';
import { BENCH_LABELS, loginsWalker } from './logins-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'logins') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/logins/${id}/$`);
async function walkAll(w: ReturnType<typeof loginsWalker>) {
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
test.setTimeout(240_000);

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/logins/');
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

test('its module number on the intro and the recap', async ({ page }) => {
  await page.goto('/logins/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Logins and passwords`);
  await page.goto('/logins/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/logins/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/logins\.jpg$/);
  await page.goto(`/logins/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/logins-${CH1}\\.jpg$`),
  );
  await page.goto('/logins/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/logins-recap\.jpg$/);
  expect((await page.request.get('/og/logins.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="logins"] h4 a')).toHaveAttribute('href', '/logins/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(loginsWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in logins-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(loginsWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['logins-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('logins');
});

test('the race by keyboard: the range moves the work factor, Step advances, and one read-out speaks', async ({
  page,
}) => {
  const w = loginsWalker(page, 'keyboard');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio', { name: 'Salted PBKDF2' }).focus();
  await page.keyboard.press('Space');
  await expect(c).toContainText('Step 2 of');
  await c.getByRole('radio').first().press('Enter');
  await expect(c).toContainText('Step 3 of');
  const range = c.getByRole('slider');
  await range.focus();
  await page.keyboard.press('ArrowRight');
  await expect(range).toHaveAttribute('aria-valuetext', '100,000 rounds');
  await c.getByRole('button', { name: 'Step', exact: true }).press('Enter');
  await expect(c.locator('.lg-race')).toHaveAttribute('data-tick', '1');
  await expect(c.locator('.lg-said')).toHaveText(/^After 1 minute: \d+ of \d+ cracked/);
  await expect(page.locator('.lg-race [role="status"]')).toHaveCount(1);
  await expect(page.locator('.lg-stage [data-state="cracked"]').first()).toBeVisible();
});

test('PBKDF2 and TOTP run here and match their pins', async ({ page }) => {
  const w = loginsWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio', { name: 'Salted PBKDF2' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('slider').fill('2');
  await c.getByRole('button', { name: 'Play' }).click();
  await expect(c.locator('[data-pbkdf2]')).toHaveAttribute('data-pbkdf2', pinned.pbkdf2.hex['600000'], {
    timeout: 15_000,
  });
  await w.open(CH7);
  await c.getByRole('combobox', { name: BENCH_LABELS.staff2fa }).selectOption('totp');
  await expect(c.locator('[data-totp]')).toHaveAttribute('data-totp', pinned.totp);
});

test('chapter 6: each token fails its own check, by real ECDSA', async ({ page }) => {
  const w = loginsWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('button', { name: /^Sign in with the/ }).click();
  await c.getByRole('button', { name: 'Check the state' }).click();
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Redeem the stolen code' }).click();
  await expect(c.locator('[data-checked="genuine"] [data-ok="0"]')).toHaveCount(0);
  await c.getByRole('radio', { name: /made for/ }).check();
  await expect(c.locator('[data-checked="other"] [data-check="audience"]')).toHaveAttribute('data-ok', '0');
  await expect(c.locator('[data-checked="other"] [data-check="signature"]')).toHaveAttribute('data-ok', '1');
  await page.getByRole('button', { name: 'Sign-in steps' }).click();
  await expect(page.locator('.lg-stage')).toContainText('DENIED');
  await axe(page);
});

test('chapter 7: a losing plan stays on the bench; a winning one moves on', async ({ page }) => {
  const w = loginsWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  const score = c.locator('[data-fits]');
  await expect(score).toHaveAttribute('data-fits', '0');
  // a slow hash alone: the guesser and the cookie thief still get in
  await c.getByRole('combobox', { name: BENCH_LABELS.store }).selectOption('pbkdf2-600000');
  await expect(score).toHaveAttribute('data-fits', '0');
  await expect(c.locator('tr[data-attacker="guesser"]')).not.toHaveAttribute('data-lost', '0');
  await expect(c).toContainText('Step 1 of');
  expect(START.store).toBe('plain');
  await w.ch7();
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = loginsWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('radio').first().click();
  await c.getByRole('button', { name: 'Copy the table' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('Play shows the final board at once, nothing animates, and the chapters still play through', async ({
    page,
  }) => {
    const w = loginsWalker(page, 'mouse', async p => {
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
    await w.open(CH2);
    const c = card(page);
    await c.getByRole('button', { name: 'Store fingerprints' }).click();
    await c.getByRole('radio').first().click();
    await c.getByRole('button', { name: 'Play' }).click();
    await expect(c).toContainText('Step 4 of', { timeout: 2_000 });
    await page.evaluate(() => localStorage.removeItem('logins-progress-v1'));
    await walkAll(w);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = loginsWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/logins/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('logins-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/logins/', ...IDS.map(id => `/logins/${id}/`), '/logins/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      loginsWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
