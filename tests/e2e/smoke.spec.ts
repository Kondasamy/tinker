import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_PAGES } from '../../src/lib/pages';
import { MODULES } from '../../src/lib/modules';

test('Tinker home returns 200 and links to the RAG module', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await page.locator('.module[data-module="rag"] [data-cta]').click();
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
  await page.evaluate(() =>
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: {} })),
  );
  await page.reload();
  await expect(page.locator('.path li.done')).toHaveCount(2);
  const cta = page.locator('.hero [data-cta]');
  await expect(cta).toHaveText('Continue: chapter 3 →');
  await expect(cta).toHaveAttribute('href', '/rag/03-what-is-rag/');
});

test('every public page has its own share image, and it is served', async ({ page, request }) => {
  const paths = ALL_PAGES.map(p => p.path);
  // one page load per public page: 32 modules make about 300
  test.setTimeout(paths.length * 500);
  const seen = new Set<string>();
  for (const p of paths) {
    await page.goto(p);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og, p).toMatch(/^https:\/\/tinker\.kondasamy\.com\/og\/[\w-]+\.jpg$/);
    seen.add(og!);
    const file = new URL(og!).pathname;
    const res = await request.get(file);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
  expect(seen.size).toBe(paths.length); // dedicated: no two pages share an image
  for (const m of MODULES.filter(m => m.status === 'planned')) {
    // roadmap cards only: no page, no image
    expect((await request.get(`/${m.id}/`)).status(), m.id).toBe(404);
    expect((await request.get(`/og/${m.id}.jpg`)).status(), m.id).toBe(404);
  }
});

test('AE1: a returning reader keeps RAG progress, and a saved run resumes only on the same steps', async ({ page }) => {
  const KEY = 'rag-progress-v1',
    CH3 = '03-what-is-rag';
  const card = page.getByRole('region', { name: 'Next step' });
  const open = async () => {
    await page.reload();
    await page.locator('astro-island:not([ssr])').waitFor();
  };
  await page.goto('/');
  await page.evaluate(
    k => localStorage.setItem(k, JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: {} })),
    KEY,
  );
  await page.reload();
  await expect(page.locator('[data-module="rag"] [data-progress] .txt')).toHaveText('2 of 7 chapters done');
  await page.locator('[data-cta]').first().click();
  await expect(page).toHaveURL(new RegExp(`/rag/${CH3}/$`));

  // reach step 5 (chapter 3 gained a prediction in U5, so it no longer has its legacy steps)
  await page.locator('astro-island:not([ssr])').waitFor();
  for (const name of [/^Ask/, 'Add the Docs']) await card.getByRole('button', { name }).click();
  await card.getByRole('radio', { name: /cites the policy/ }).click();
  await card.getByRole('button', { name: 'Add the Retriever' }).click();
  await expect(card).toContainText('Step 5 of 7');
  // sets a saved run's step ids; none = a run saved before runs carried them
  const sign = (ch: string, ids?: string[]) =>
    page.evaluate(
      ({ k, ch, ids }) => {
        const p = JSON.parse(localStorage.getItem(k)!);
        if (ids) p.saved[ch].ids = ids;
        else delete p.saved[ch].ids;
        localStorage.setItem(k, JSON.stringify(p));
      },
      { k: KEY, ch, ids },
    );
  await open();
  await expect(card).toContainText('Step 5 of 7'); // saved on its own steps: resumes

  // a run saved on other steps restarts the chapter; finished chapters stay finished
  await sign(CH3, ['ask', 'new', 'docs', 'retriever', 'grounded', 'math', 'quiz']);
  await open();
  await expect(card).toContainText('Step 1 of 7');
  // unsigned: compared with the legacy steps, which chapter 3 no longer has, so it restarts too
  for (const name of [/^Ask/, 'Add the Docs']) await card.getByRole('button', { name }).click();
  await sign(CH3);
  await open();
  await expect(card).toContainText('Step 1 of 7');

  // chapter 1 kept its steps: an unsigned run resumes there
  await page.goto('/rag/01-history/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await card.getByRole('button', { name: /^Ask/ }).click();
  await page.locator('[data-era="0"]').click();
  await expect(card).toContainText('Step 3 of 6');
  await sign('01-history');
  await open();
  await expect(card).toContainText('Step 3 of 6');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).done, KEY)).toEqual([
    '01-history',
    '02-why-not-stuff-it',
  ]);
});

// SEO: a sitemap of every indexable page, robots.txt pointing at it, recaps and the 404 kept out of search,
// and schema.org data on home (the site), intros (a course) and chapters (a lesson in it), each with breadcrumbs.
test('the sitemap lists every indexable page and no recap; robots.txt points to it', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => new URL(x[1]).pathname);
  expect(locs).toEqual(ALL_PAGES.filter(p => !p.noindex).map(p => p.path));
  expect(locs.some(p => p.endsWith('/recap/'))).toBe(false);
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Sitemap: https://tinker.kondasamy.com/sitemap.xml',
  );
});

test('structured data: the site on home, a course on an intro, a lesson with breadcrumbs on a chapter, none on a recap', async ({
  page,
}) => {
  const graph = async (path: string) => {
    await page.goto(path);
    const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
    return raw.flatMap(r => JSON.parse(r)['@graph']).map((x: { '@type': string }) => x['@type']);
  };
  expect(await graph('/')).toEqual(['WebSite']);
  expect(await graph('/rag/')).toEqual(['Course', 'BreadcrumbList']);
  expect(await graph('/rag/01-history/')).toEqual(['LearningResource', 'BreadcrumbList']);
  expect(await graph('/rag/recap/')).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('a missing page gets the 404 page, kept out of search, with a way home', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByRole('link', { name: 'Go to Tinker home →' })).toHaveAttribute('href', '/');
});
