// Backups and recovery: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// strike bar (Select, hour range, Strike) and its one read-out, the Week tab, "I'm not sure", reduced motion, the
// recap, axe and phone width. The go-live adds the module's number, share images and home's card.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import { WINNERS } from '../../src/lib/backups/workbench';
import { serious, layoutHolds, PHONE, choose, chooseByKeys } from './helpers';

const M = moduleOf('backups');
const NUMBER = moduleNumber(moduleOf('backups'));
const IDS = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/backups/${id}/$`);
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(240_000);

type Mode = 'mouse' | 'keyboard';
function walker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const opt = (name: RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  const pick = (where: Locator, name: string, value: string) =>
    (kb ? chooseByKeys : choose)(where.getByRole('combobox', { name }), value);
  const strike = () => press(stage.getByRole('button', { name: 'Strike', exact: true }));
  const tab = (name: string) => press(stage.getByRole('button', { name, exact: true }));
  async function open(id: string) {
    await page.goto(`/backups/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }
  return {
    open,
    async ch1(next?: RegExp) {
      const hour = stage.getByRole('slider', { name: /^Hour/ });
      if (kb) for (let i = 0; i < 20 && Number(await hour.inputValue()) < 60; i++) await hour.press('PageUp');
      else await hour.fill('63');
      await step(2);
      await opt(/^Nothing/);
      await strike();
      await step(4);
      await expect(stage.getByRole('status')).toContainText('Every order is gone');
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Copy the database/ }));
      await step(5);
      await expect(stage.getByRole('status')).toContainText('restored from the cabinet');
      await opt(/^Nothing: both/);
      await finish(next);
    },
    async ch2(next?: RegExp) {
      await strike();
      await step(2);
      await opt(/^Less than half/);
      await pick(card, 'Schedule', '6');
      await step(4);
      await check(page);
      await pick(card, 'Schedule', '1');
      await step(5);
      await opt(/^Up to 4 hours/);
      await finish(next);
    },
    async ch3(next?: RegExp) {
      await tick(card.getByRole('checkbox', { name: /^Incremental/ }));
      await step(2);
      await opt(/the link before the break$/);
      await tick(card.getByRole('checkbox', { name: /won’t read$/ }));
      await strike();
      await step(4);
      await check(page);
      await tab('Week');
      await step(5);
      await expect(stage.locator('.bk-week')).toBeVisible();
      await opt(/^Tuesday night/);
      await finish(next);
    },
    async ch4(next?: RegExp) {
      await opt(/^No copy/);
      await pick(stage, 'Disaster', 'fire');
      await strike();
      await step(3);
      await expect(page.locator('[data-prop="cabinet"]')).toHaveAttribute('data-lost', '1');
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Send each copy/ }));
      await step(4);
      await opt(/^Keep a copy/);
      await finish(next);
    },
    async ch5(next?: RegExp) {
      await opt(/^No: the network/);
      await pick(stage, 'Disaster', 'ransomware');
      await strike();
      await step(3);
      await expect(page.locator('[data-prop="warehouse"]')).toHaveAttribute('data-lost', '1');
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^The courier takes/ }));
      await step(4);
      await expect(page.locator('[data-prop="lockbox"]')).toHaveAttribute('data-used', '1');
      await opt(/^A drive unplugged/);
      await finish(next);
    },
    async ch6(next?: RegExp) {
      await opt(/^Monday’s first tape/);
      await strike();
      await step(3);
      await check(page);
      await tick(card.getByRole('checkbox', { name: /^Test restore/ }));
      await step(4);
      await tab('Week');
      await step(5);
      await opt(/^Restore one/);
      await finish(next);
    },
    async ch7(next?: RegExp) {
      const w = WINNERS[0];
      await pick(card, 'How often', String(w.every));
      await pick(card, 'Copies', w.incremental ? 'inc' : 'full');
      await pick(card, 'Where', w.places);
      await step(2);
      await check(page);
      await opt(/^Hourly copies, plus/);
      await finish(next);
    },
  };
}
async function walkAll(w: ReturnType<typeof walker>) {
  await w.open(IDS[0]);
  await w.ch1(at(IDS[1]));
  await w.ch2(at(IDS[2]));
  await w.ch3(at(IDS[3]));
  await w.ch4(at(IDS[4]));
  await w.ch5(at(IDS[5]));
  await w.ch6(at(IDS[6]));
  await w.ch7();
}

test('the intro shows the level, its number and the chapters', async ({ page }) => {
  await page.goto('/backups/');
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Beginner');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Backups and recovery`);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.locator('.band .note.more')).toBeVisible();
  await axe(page);
  await page.goto('/backups/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/backups/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/backups\.jpg$/);
  await page.goto(`/backups/${IDS[0]}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/backups-${IDS[0]}\\.jpg$`),
  );
  expect((await page.request.get('/og/backups.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="backups"] h4 a')).toHaveAttribute('href', '/backups/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(walker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in backups-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(walker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['backups-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('backups');
});

test('the strike bar: moving the hour clears a strike; one polite read-out', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(IDS[0]);
  const stage = page.getByRole('region', { name: 'Scene' });
  await expect(stage.getByRole('status')).toHaveCount(1);
  await stage.getByRole('button', { name: 'Strike', exact: true }).click();
  await expect(page.locator('[data-prop="server"]')).toHaveAttribute('data-down', '1');
  await stage.getByRole('slider', { name: /^Hour/ }).fill('40');
  await expect(page.locator('[data-prop="server"]')).toHaveAttribute('data-down', '0');
  await expect(stage.getByRole('status')).toHaveText('No disaster yet.');
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(IDS[3]);
  const card = page.getByRole('region', { name: 'Next step' }),
    stage = page.getByRole('region', { name: 'Scene' });
  await card.getByRole('radio').first().click();
  await choose(stage.getByRole('combobox', { name: 'Disaster' }), 'fire');
  await stage.getByRole('button', { name: 'Strike', exact: true }).click();
  await card.getByRole('checkbox', { name: /^Send each copy/ }).click();
  await card.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(card).toContainText('Chapter complete');
  await expect(card.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the struck picture holds still, and the chapters still play through', async ({ page }) => {
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
    await walkAll(walker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = walker(page, 'mouse');
  await w.open(IDS[0]);
  await w.ch1();
  await page.goto('/backups/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('backups-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/backups/', ...IDS.map(id => `/backups/${id}/`), '/backups/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      walker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
