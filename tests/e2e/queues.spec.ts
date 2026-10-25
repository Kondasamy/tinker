// Queues and background jobs: the intro, every chapter played by mouse and by keyboard only, its own progress key,
// chapter 5's crash and the job that runs twice, the crash bar's keyboard path and its reason when no one is busy, the
// jobs table, "I'm not sure", reduced motion, the recap, axe and phone width. The go-live adds the module's number,
// share images and home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { CRASH_AT, WORKER_NAMES, clock } from '../../src/lib/queues/sim';
import { queuesWalker } from './queues-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('queues');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/queues/${id}/$`);
async function walkAll(w: ReturnType<typeof queuesWalker>) {
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

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/queues/');
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

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(queuesWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in queues-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(queuesWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['queues-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('queues');
});

test('chapter 5: a crash mid-job brings the job back, and it runs twice', async ({ page }) => {
  const w = queuesWalker(page, 'mouse');
  await w.open(CH5);
  await expect(stage(page).getByRole('button', { name: 'Step', exact: true })).toHaveCount(0);
  await stage(page)
    .getByRole('button', { name: `Knock over ${WORKER_NAMES[0]}` })
    .click();
  await expect(page.locator('[data-worker="0"][data-state="down"]')).toHaveCount(1);
  await expect(stage(page).locator('.qu-clock')).toHaveText(clock(CRASH_AT));
  await card(page).getByRole('radio').first().click();
  for (let i = 0; i < 20 && !(await card(page).textContent())!.includes('Step 4 of'); i++)
    await stage(page).getByRole('button', { name: 'Step', exact: true }).click();
  await expect(stage(page).locator('.tc-caption')).toContainText('2 runs so far');
  await expect(page.locator('[data-prop="courier"]')).toHaveAttribute('data-twice', '1');
  await card(page)
    .getByRole('checkbox', { name: /^Idempotent/ })
    .click();
  await expect(page.locator('[data-prop="courier"]')).toHaveAttribute('data-twice', '0');
  await axe(page);
});

test('the crash bar: arrow keys between busy workers, Enter knocks one over', async ({ page }) => {
  const w = queuesWalker(page, 'keyboard');
  await w.open(CH5);
  const bar = stage(page).getByRole('toolbar', { name: 'Knock a worker over' });
  const [a, b] = [bar.getByRole('button').nth(0), bar.getByRole('button').nth(1)];
  await a.focus();
  await a.press('ArrowRight');
  await expect(b).toBeFocused();
  await b.press('Enter');
  await expect(page.locator('[data-worker="1"][data-state="down"]')).toHaveCount(1);
  await expect(card(page)).toContainText('Step 2 of');
});

test('the Jobs tab is a table in a focusable region', async ({ page }) => {
  const w = queuesWalker(page, 'mouse');
  await w.open(CH2);
  await w.to(3);
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  const region = page.getByRole('region', { name: /^Jobs/ });
  await expect(region.getByRole('table')).toBeVisible();
  await region.focus();
  await expect(region).toBeFocused();
  await expect(region.locator('tbody tr[data-job]').first()).toBeVisible();
  await axe(page);
});

test('“I’m not sure” on a checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = queuesWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await w.to(10);
  await c.getByRole('radio').first().click();
  await w.to(40);
  await c.getByRole('checkbox', { name: /^At most/ }).click();
  await c.getByRole('radio', { name: 'I’m not sure' }).click();
  await expect(c).toContainText('Chapter complete');
  await expect(c.locator('.stamp.wrong')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the fall and the slide hold still, and the chapters still play through', async ({ page }) => {
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
    const w = queuesWalker(page, 'mouse');
    await w.open(CH5);
    await stage(page)
      .getByRole('button', { name: `Knock over ${WORKER_NAMES[0]}` })
      .click();
    await expect(page.locator('[data-worker="0"][data-fell]')).toHaveCount(1);
    await still(page);
    await page.evaluate(() => localStorage.removeItem('queues-progress-v1'));
    await walkAll(queuesWalker(page, 'mouse', still));
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = queuesWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/queues/recap/');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('queues-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/queues/', ...IDS.map(id => `/queues/${id}/`), '/queues/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      queuesWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
