// The RAG trailer on /rag/: nothing of the video loads before play, it has captions and a name, and the page stays axe-clean.
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
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('poster', '/video/rag-trailer.jpg');
  await expect(video).toHaveAccessibleName('RAG trailer');
  await expect(video.locator('track[kind="captions"][srclang="en"][default]')).toHaveAttribute(
    'src',
    '/video/rag-trailer.vtt',
  );
  for (const f of ['rag-trailer.jpg', 'rag-trailer.vtt'])
    expect((await page.request.get(`/video/${f}`)).status(), f).toBe(200);
  // pressing play is what fetches it
  const fetched = page.waitForRequest(r => r.url().endsWith('/video/rag-trailer.mp4'));
  await video.evaluate((v: HTMLVideoElement) => v.play().catch(() => {}));
  await fetched;
});

test('axe: /rag/ with the trailer has no serious or critical violations at desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/rag/');
  expect(await serious(page)).toEqual([]);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('axe and 390px: /rag/ with the trailer at full width, 16:9', async ({ page }) => {
    await page.goto('/rag/');
    expect(await serious(page)).toEqual([]);
    await layoutHolds(page);
    const box = (await trailer(page).boundingBox())!;
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
    expect(box.width).toBeGreaterThan(390 - 2 * 16 - 2 * 18 - 4); // the band's full content width
  });
});
