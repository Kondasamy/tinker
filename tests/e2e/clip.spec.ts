// A chapter's opener clip and Pictures-first header (chapter 3 has the first clip): nothing plays unasked, the longer
// intro folds in Pictures and opens in Words, a clip that can't load leaves its poster and lines, and a chapter with no
// clip keeps its whole header. Playwright's Chromium has no H.264, so a press may end in the fallback rather than playback.
import { test, expect, type Page } from '@playwright/test';
import { offline, serious } from './helpers';

const CH3 = '/rag/03-what-is-rag/';
const header = (page: Page) => page.locator('header.intro');
const clip = (page: Page) => page.locator('.chapter-clip');

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').waitFor(); // hydrated
}

test('the clip waits to be pressed, and Pictures folds the longer intro until Words', async ({ page }) => {
  await open(page, CH3);
  const video = clip(page).locator('video');
  await expect(video).toHaveAttribute('preload', 'none');
  expect(await video.getAttribute('autoplay')).toBeNull();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(clip(page).locator('.clip-lines li')).toHaveCount(5);

  await expect(header(page).locator('h1')).toBeVisible();
  await expect(header(page).locator('.goal')).toBeVisible();
  await expect(header(page).locator('.story')).toBeHidden();
  await header(page).getByRole('button', { name: 'Words' }).click();
  await expect(header(page).locator('.story')).toBeVisible();
  await expect(header(page).getByRole('button', { name: 'Words' })).toHaveAttribute('aria-pressed', 'true');

  // the choice is the module intros' one, so it holds across a reload
  await open(page, CH3);
  await expect(header(page).locator('.story')).toBeVisible();
});

test('pressing play plays the clip or falls back to its poster and lines', async ({ page }) => {
  await open(page, CH3);
  await clip(page)
    .locator('video')
    .evaluate((v: HTMLVideoElement) => v.play().catch(() => {}));
  await expect
    .poll(async () =>
      clip(page).evaluate(f => {
        const v = f.querySelector('video');
        return v ? !v.paused || v.error !== null : !!f.querySelector('img');
      }),
    )
    .toBe(true);
  await expect(clip(page).locator('.clip-lines li').first()).toBeVisible();
});

test('reduced motion: the clip stays paused until pressed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, CH3);
  await page.waitForTimeout(500);
  expect(
    await clip(page)
      .locator('video')
      .evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
});

test('offline: the chapter still plays and the clip leaves its poster and lines', async ({ page }) => {
  await open(page, CH3);
  await page.getByRole('region', { name: 'Next step' }).getByRole('button', { name: /^Ask/ }).waitFor();
  await offline(page);
  await clip(page)
    .locator('video')
    .evaluate((v: HTMLVideoElement) => v.play().catch(() => {}));
  await expect(clip(page).locator('video')).toHaveCount(0);
  await expect(clip(page).locator('img')).toHaveAttribute('src', '/video/rag/03-what-is-rag.jpg');
  await expect(clip(page).locator('.clip-lines li')).toHaveCount(5);
  await page.getByRole('region', { name: 'Next step' }).getByRole('button', { name: /^Ask/ }).click();
  await expect(page.getByRole('region', { name: 'Next step' })).toContainText('Step 2 of');
});

test('the header with its clip passes axe', async ({ page }) => {
  await open(page, CH3);
  expect(await serious(page, 'header.intro')).toEqual([]);
});

test('a chapter with no clip keeps its whole header and no switch', async ({ page }) => {
  await open(page, '/tokens/01-what-the-model-reads/');
  await expect(header(page).locator('.story')).toBeVisible();
  await expect(header(page).locator('.reading')).toHaveCount(0);
  await expect(header(page).locator('video')).toHaveCount(0);
});
