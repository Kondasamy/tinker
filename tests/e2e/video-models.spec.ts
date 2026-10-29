// Video and world models: the intro, every chapter played by mouse and by keyboard only, its own progress key, the drive
// (arrow keys only while the pad has focus, a visible focus ring, Tab out, one read-out), chapter 5's drift, the
// workbench's best plan, "I'm not sure", reduced motion, the recap, axe and phone width (buttons ≥ 44 px, one floor at a
// time). The go-live checks: share images, home’s card.
import { test, expect, type Page } from '@playwright/test';
import { MODULES, moduleOf } from '../../src/lib/modules';
import pinned from '../../data/video-models/pinned.json' with { type: 'json' };
import { vmWalker } from './video-models-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('video-models');
const NUMBER = MODULES.filter(m => m.status === 'live').findIndex(m => m.id === M.id) + 1;
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/video-models/${id}/$`);
async function walkAll(w: ReturnType<typeof vmWalker>) {
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
  await page.goto('/video-models/');
  const meta = page.locator('.hero .module-meta');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Video and world models`);
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await axe(page);
});

test('the recap names the module number', async ({ page }) => {
  await page.goto('/video-models/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Recap`);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/video-models/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/video-models\.jpg$/);
  await page.goto(`/video-models/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/video-models-${CH1}\\.jpg$`),
  );
  await page.goto('/video-models/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/video-models-recap\.jpg$/);
  expect((await page.request.get('/og/video-models.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="video-models"] h4 a')).toHaveAttribute('href', '/video-models/');
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(vmWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only; progress lands in video-models-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = { 'diffusion-progress-v1': JSON.stringify({ done: ['01-noise-to-picture'], saved: {} }) };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(vmWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['video-models-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('video-models');
});

test('chapter 4: arrow keys drive only while the pad has focus; it shows a focus ring and Tab leaves it', async ({
  page,
}) => {
  const w = vmWalker(page, 'keyboard');
  await w.open(CH4);
  const pad = page.locator('.vm-pad'),
    said = page.locator('.vm-said');
  await expect(pad).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.vm-stage [role="status"]')).toHaveCount(1);
  const real = () => page.locator('[data-part="floor"]').getAttribute('data-frame');
  const before = await real();
  await page.locator('body').press('ArrowRight');
  expect(await real()).toBe(before);
  await pad.focus();
  await page.keyboard.press('ArrowRight');
  await expect(said).toContainText(/^(Moved|Tried) right/);
  expect(await real()).not.toBe(before);
  const ring = await pad.evaluate(e => getComputedStyle(e).outlineStyle);
  expect(ring).not.toBe('none');
  await page.keyboard.press('Tab');
  await expect(pad).not.toBeFocused();
  await expect(page.locator('[data-part="dream"]')).toHaveAttribute('data-frame', /\d{256}/);
  await page.getByRole('button', { name: 'Re-sync' }).click();
  await expect(said).toHaveText('Re-synced: the dream is the real frame again.');
  expect(await page.locator('[data-part="dream"]').getAttribute('data-frame')).toBe(await real());
});

test('chapter 5: the dream loses the robot, then the crate, at the pinned steps', async ({ page }) => {
  const w = vmWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('radio', { name: /^Within/ }).click();
  await c.getByRole('slider', { name: 'Step' }).fill(String(pinned.kept + 2 - 2));
  await expect(page.locator('.tc-caption')).toContainText(`${pinned.robotsWhenLost} robots`);
  await c.getByRole('slider', { name: 'Step' }).fill(String(pinned.crateGone - 2));
  await expect(page.locator('.tc-caption')).toContainText('no crate');
  await expect(page.locator('[data-part="floor"] [data-crate]')).toHaveCount(1);
});

test('chapter 7: the start is not accepted; Show me applies the best plan', async ({ page }) => {
  const w = vmWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page),
    score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = vmWalker(page, 'mouse');
  await w.open(CH6);
  await w.ch6(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('each press redraws without the slide', async ({ page }) => {
    const w = vmWalker(page, 'mouse');
    await w.open(CH4);
    await w.drive(['Right']);
    await page.getByRole('button', { name: 'Frames', exact: true }).click();
    const slide = page.locator('.vm-slide').first();
    // the site's reduced-motion reset leaves a token 0.01 ms
    expect(parseFloat(await slide.evaluate(e => getComputedStyle(e).transitionDuration))).toBeLessThan(0.001);
  });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(vmWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(vmWalker(page, 'mouse'));
  await page.goto('/video-models/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the drive’s buttons are at least 44 px and work by touch; one floor shows at a time', async ({ page }) => {
    const w = vmWalker(page, 'mouse');
    await w.open(CH4);
    const pad = page.locator('.vm-pad');
    await expect(pad).toBeVisible({ timeout: 30_000 });
    for (const b of [...(await pad.getByRole('button').all()), page.getByRole('button', { name: 'Re-sync' })]) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await pad.getByRole('button', { name: 'Right', exact: true }).tap();
    await expect(page.locator('.vm-said')).toContainText(/right/);
    await expect(page.locator('svg[data-show="dream"]')).toBeVisible();
    await page.getByRole('button', { name: 'Real', exact: true }).tap();
    await expect(page.locator('svg[data-show="real"]')).toBeVisible();
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/video-models/', ...CHS.map(id => `/video-models/${id}/`), '/video-models/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      vmWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
