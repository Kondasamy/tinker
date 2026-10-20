import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_PAGES } from '../../src/lib/pages';

test('Tinker home returns 200 and links to the RAG module', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await page.getByRole('link', { name: 'Start RAG →' }).click();
  await expect(page).toHaveURL(/\/rag\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('How AI assistants answer');
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

test('RAG intro marks finished chapters and continues from the next one', async ({ page }) => {
  await page.goto('/rag/');
  await page.evaluate(() => localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: {} })));
  await page.reload();
  await expect(page.locator('.path li.done')).toHaveCount(2);
  const cta = page.locator('.hero [data-cta]');
  await expect(cta).toHaveText('Continue: chapter 3 →');
  await expect(cta).toHaveAttribute('href', '/rag/03-what-is-rag/');
});

test('every public page has its own share image, and it is served', async ({ page, request }) => {
  const paths = ALL_PAGES.map(p => p.path);
  const seen = new Set<string>();
  for (const p of paths) {
    await page.goto(p);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og, p).toMatch(/^https:\/\/explain\.kondasamy\.com\/og\/[\w-]+\.jpg$/);
    seen.add(og!);
    const file = new URL(og!).pathname;
    const res = await request.get(file);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
  expect(seen.size).toBe(paths.length);   // dedicated: no two pages share an image
});

test('AE1: a returning reader keeps RAG progress, and a saved run resumes only on the same steps', async ({ page }) => {
  const KEY = 'rag-progress-v1', CH3 = '03-what-is-rag';
  const card = page.getByRole('region', { name: 'Next step' });
  const open = async () => { await page.reload(); await page.locator('astro-island:not([ssr])').waitFor(); };
  await page.goto('/');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: {} })), KEY);
  await page.reload();
  await expect(page.locator('[data-module="rag"] [data-progress] .txt')).toHaveText('2 of 7 chapters done');
  await page.locator('[data-cta]').first().click();
  await expect(page).toHaveURL(new RegExp(`/rag/${CH3}/$`));

  // reach step 4
  await page.locator('astro-island:not([ssr])').waitFor();
  for (const name of [/^Ask/, 'Add the Docs', 'Add the Retriever']) await card.getByRole('button', { name }).click();
  await expect(card).toContainText('Step 4 of 6');
  // sets the saved run's step ids; none = a run saved before runs carried them
  const sign = (ids?: string[]) => page.evaluate(({ k, ch, ids }) => {
    const p = JSON.parse(localStorage.getItem(k)!);
    if (ids) p.saved[ch].ids = ids; else delete p.saved[ch].ids;
    localStorage.setItem(k, JSON.stringify(p));
  }, { k: KEY, ch: CH3, ids });
  await sign();
  await open();
  await expect(card).toContainText('Step 4 of 6');   // unsigned, but chapter 3 still has its legacy steps: resumes

  // a run saved on other steps restarts the chapter; finished chapters stay finished
  await sign(['ask', 'new', 'docs', 'retriever', 'grounded', 'math', 'quiz']);
  await open();
  await expect(card).toContainText('Step 1 of 6');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).done, KEY)).toEqual(['01-history', '02-why-not-stuff-it']);
});
