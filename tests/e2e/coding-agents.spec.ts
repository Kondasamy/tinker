// Coding agents: the intro, every chapter played by mouse and by keyboard only, its own progress key, chapter 3's
// dropped hunk turning a live lamp red, the hunk checkboxes' keyboard order, the Code tab scrolling inside itself on a
// phone, "I'm not sure", reduced motion, the recap, axe and phone width. The go-live adds the module's number, share
// images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { codingWalker } from './coding-agents-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('coding-agents');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'coding-agents') + 1;
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/coding-agents/${id}/$`);
async function walkAll(w: ReturnType<typeof codingWalker>) {
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

test('the intro shows the level, the prerequisite, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/coding-agents/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'AI agents' })).toHaveAttribute('href', '/agents/');
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
  await page.goto('/coding-agents/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Coding agents`);
  await page.goto('/coding-agents/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/coding-agents/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/coding-agents\.jpg$/);
  await page.goto(`/coding-agents/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/coding-agents-${CH1}\\.jpg$`),
  );
  await page.goto('/coding-agents/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/coding-agents-recap\.jpg$/);
  expect((await page.request.get('/og/coding-agents.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="coding-agents"] h4 a')).toHaveAttribute('href', '/coding-agents/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(codingWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in coding-agents-progress-v1 and no other key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(codingWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['coding-agents-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('coding-agents');
});

test('chapter 3: dropping the fix hunk turns its lamp red, live; the checkboxes come before Run tests', async ({
  page,
}) => {
  const w = codingWalker(page, 'keyboard');
  await w.open(CH3);
  const boxes = stage(page).getByRole('checkbox');
  await expect(boxes).toHaveCount(3);
  await boxes.first().focus();
  for (const n of [2, 3]) {
    await page.keyboard.press('Tab');
    await expect(stage(page).getByRole('checkbox', { name: `Keep hunk ${n}` })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(stage(page).getByRole('button', { name: 'Run tests' })).toBeFocused();
  await w.review([2, 3]);
  await expect(page.locator('[data-lamp="at-50"]')).toHaveAttribute('data-state', 'fail');
  await expect(page.locator('[data-lamp="under-50"]')).toHaveAttribute('data-state', 'pass');
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = codingWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await c.getByRole('button', { name: 'Show me' }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing animates on the stage, and a chapter still plays through', async ({ page }) => {
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
    const w = codingWalker(page, 'mouse', still);
    await w.open(CH4);
    await w.ch4();
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = codingWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/coding-agents/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('coding-agents-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, the code scrolls inside its panel, and every chapter plays with axe clean', async ({
    page,
  }) => {
    for (const p of ['/coding-agents/', ...IDS.map(id => `/coding-agents/${id}/`), '/coding-agents/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await page.goto(`/coding-agents/${CH3}/`);
    const rows = page.locator('.ca-rows');
    expect(await rows.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
    await layoutHolds(page);
    await walkAll(
      codingWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
