import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

test('home page returns 200', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
});

test('chapter 1 returns 200', async ({ page }) => {
  const res = await page.goto('/rag/01-history/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
});

test('build output is static only (no server entry)', () => {
  const files = readdirSync('dist', { recursive: true, encoding: 'utf8' });
  expect(files).toContain('index.html');
  expect(files).toContain(join('rag', '01-history', 'index.html'));
  expect(files.filter((f: string) => f.startsWith('server') || /(^|\/)entry\.m?js$/.test(f))).toEqual([]);
});
