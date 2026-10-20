// U8: module 2's intro (R7, R16, R17, R27) and its place in the catalogue.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { moduleOf } from '../../src/lib/modules';

const M = moduleOf('tool-calling');

test('the intro renders with its level, prerequisite and author from the registry', async ({ page }) => {
  const res = await page.goto('/tool-calling/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'RAG', exact: true })).toHaveAttribute('href', '/rag/');
  await expect(meta).toContainText('RAG recommended');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('footer.credits')).toContainText('Colorfigures');
  await expect(page.locator('footer.credits').getByRole('link', { name: 'April Zhu' })).toBeVisible();
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Kondasamy Jayaraman' })).toHaveAttribute('href', 'https://kondasamy.com');
  await expect(page.locator('.hero-pic svg[role="img"]').first()).toBeVisible();
});

test('the chapter path follows the registry', async ({ page }) => {
  await page.goto('/tool-calling/');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  if (!M.chapters.length) await expect(page.locator('#path')).toContainText('Chapters arrive soon');
});

test('axe: /tool-calling/ has no serious or critical violations', async ({ page }) => {
  await page.goto('/tool-calling/');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
});

test('the intro fits a 390px phone without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tool-calling/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('the intro has its own share image', async ({ page, request }) => {
  await page.goto('/tool-calling/');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toBe('https://explain.kondasamy.com/og/tool-calling.jpg');
  expect((await request.get('/og/tool-calling.jpg')).status()).toBe(200);
});

test('home lists the module under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-level="Intermediate"] .module[data-module="tool-calling"]');
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: /Tool calling/ }).first()).toHaveAttribute('href', '/tool-calling/');
  await expect(card.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('[data-level="Intermediate"] .coming')).toHaveCount(0);
});
