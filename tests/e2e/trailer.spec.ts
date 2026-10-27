// The RAG trailer on /rag/: a hero button opens it in a popup that plays; nothing of the video loads before that, it has
// captions and a name, closing stops it, and the page stays axe-clean.
import { test, expect, type Page } from '@playwright/test';
import { PHONE, layoutHolds, serious } from './helpers';

const trailer = (page: Page) => page.locator('video.trailer');

test('/rag/ asks for no trailer video until play; it has captions and an accessible name', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', r => {
    if (r.url().endsWith('/video/rag-trailer.mp4')) asked.push(r.url());
  });
  await page.goto('/rag/');
  await page.waitForLoadState('networkidle');
  const video = trailer(page);
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
  await expect(video).toBeHidden();
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('poster', '/video/rag-trailer.jpg');
  await expect(video.locator('track[kind="captions"][srclang="en"][default]')).toHaveAttribute(
    'src',
    '/video/rag-trailer.vtt',
  );
  for (const f of ['rag-trailer.jpg', 'rag-trailer.vtt'])
    expect((await page.request.get(`/video/${f}`)).status(), f).toBe(200);
  // the hero button is what fetches it: the popup opens and plays
  const fetched = page.waitForRequest(r => r.url().endsWith('/video/rag-trailer.mp4'));
  await page.getByRole('link', { name: /Trailer/ }).click();
  await expect(page.getByRole('dialog', { name: 'RAG trailer' })).toBeVisible();
  await expect(video).toHaveAccessibleName('RAG trailer');
  await fetched;
  // Esc closes it and stops the film
  await page.keyboard.press('Escape');
  await expect(video).toBeHidden();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test('the trailer link opens the MP4 itself without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/rag/');
  await expect(page.getByRole('link', { name: /Trailer/ })).toHaveAttribute('href', '/video/rag-trailer.mp4');
  await ctx.close();
});

test('the close button and the backdrop both close the popup', async ({ page }) => {
  await page.goto('/rag/');
  const box = page.getByRole('dialog', { name: 'RAG trailer' });
  await page.getByRole('link', { name: /Trailer/ }).click();
  await page.getByRole('button', { name: 'Close trailer' }).click();
  await expect(box).toBeHidden();
  await page.getByRole('link', { name: /Trailer/ }).click();
  await page.mouse.click(5, 5);
  await expect(box).toBeHidden();
});

test('axe: /rag/ with the trailer has no serious or critical violations at desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/rag/');
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('axe and 390px: the hero buttons fit; the popup is 16:9 inside the screen', async ({ page }) => {
    await page.goto('/rag/');
    expect(await serious(page)).toEqual([]);
    await layoutHolds(page);
    await page.getByRole('link', { name: /Trailer/ }).click();
    expect(await serious(page)).toEqual([]);
    const box = (await trailer(page).boundingBox())!;
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});
