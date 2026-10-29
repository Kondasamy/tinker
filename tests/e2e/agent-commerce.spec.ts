// When the buyer is an agent: the intro, every chapter played by mouse and by keyboard only, its own progress key, the
// slip (signed live with the demo key, a changed cap failing the signature, one read-out), the workbench's losing start
// and best setup, "I'm not sure", reduced motion (stamps without the hatch hop), the recap, axe and phone width (the
// slip's buttons ≥ 44 px). The go-live checks (share images, home card) join at go-live.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import { acWalker } from './agent-commerce-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('agent-commerce');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/agent-commerce/${id}/$`);
async function walkAll(w: ReturnType<typeof acWalker>) {
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

test('the intro shows the level and the chapters', async ({ page }) => {
  await page.goto('/agent-commerce/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · When the buyer is an agent`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Advanced');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/agent-commerce/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/agent-commerce/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/agent-commerce\.jpg$/);
  await page.goto(`/agent-commerce/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/agent-commerce-${CH1}\\.jpg$`),
  );
  await page.goto('/agent-commerce/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/agent-commerce-recap\.jpg$/,
  );
  expect((await page.request.get('/og/agent-commerce.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="agent-commerce"] h4 a')).toHaveAttribute('href', '/agent-commerce/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(acWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in agent-commerce-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'agents-progress-v1': JSON.stringify({ done: ['01-workflow-or-agent'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(acWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['agent-commerce-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('agent-commerce');
});

test('chapter 4: the slip signs live, stamps each field, and a changed cap fails only the signature', async ({
  page,
}) => {
  const w = acWalker(page, 'mouse');
  await w.open(CH4);
  const stage = page.locator('.ac-stage');
  await expect(stage.locator('[role="status"]')).toHaveCount(1);
  await stage.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(page.locator('.ac-said')).toContainText('Signed by');
  await stage.getByRole('button', { name: 'Change the cap', exact: true }).click();
  await expect(stage.getByRole('button', { name: 'Change the cap' })).toHaveAttribute('aria-pressed', 'true');
  await stage.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.ac-said')).toContainText('Refused: signature fails');
  await expect(page.locator('[data-field="signature"]')).toHaveAttribute('data-pass', '0');
  await expect(page.locator('[data-field][data-pass="1"]')).toHaveCount(5);
});

test('chapter 7: the start is not accepted; Show me applies a winning setup', async ({ page }) => {
  const w = acWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = acWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('Send puts the slip at the seller’s counter with its stamps, no hatch hop', async ({ page }) => {
    const w = acWalker(page, 'mouse');
    await w.open(CH4);
    const stage = page.locator('.ac-stage');
    await stage.getByRole('button', { name: 'Sign', exact: true }).click();
    await expect(page.locator('.ac-said')).toContainText('Signed by');
    await stage.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('[data-slip]')).toHaveAttribute('data-slip', 'seller');
    await expect(page.locator('[data-field]')).toHaveCount(6);
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(acWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(acWalker(page, 'mouse'));
  await page.goto('/agent-commerce/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the slip’s buttons are at least 44 px and work by touch', async ({ page }) => {
    const w = acWalker(page, 'mouse');
    await w.open(CH4);
    const stage = page.locator('.ac-stage');
    await stage.getByRole('button', { name: 'Sign', exact: true }).tap();
    await expect(page.locator('.ac-said')).toContainText('Signed by');
    for (const b of await stage.locator('.ac-buttons').getByRole('button').all()) {
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/agent-commerce/', ...CHS.map(id => `/agent-commerce/${id}/`), '/agent-commerce/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      acWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
