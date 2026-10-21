// U2: the home page is a catalogue grouped by level (R5, R6), Continue resumes the last module (R8), intros show level and author (R7).
import { test, expect } from '@playwright/test';
import { serious } from './helpers';
import { MODULES } from '../../src/lib/modules';

const catalogue = (page: import('@playwright/test').Page) => page.locator('#modules');

// every module sits at its level: live cards first, then the roadmap's planned cards in registry (build) order;
// the hero's building sites point contributors at CONTRIBUTING.md, and so does the Propose a module link.
for (const width of [1280, 390]) test(`levels in order, live then planned cards grouped by level, a Propose a module link (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(catalogue(page).locator('[data-level] > h3')).toHaveText(['Beginner', 'Intermediate', 'Advanced']);
  const live = MODULES.filter(m => m.status === 'live'), planned = MODULES.filter(m => m.status === 'planned');
  expect(planned.length).toBeGreaterThan(0);
  await expect(catalogue(page).locator('.module')).toHaveCount(live.length);
  await expect(catalogue(page).locator('.roadmap')).toHaveCount(planned.length);
  for (const level of ['Beginner', 'Intermediate', 'Advanced'] as const) {
    const ids = [...live, ...planned].filter(m => m.level === level).map(m => m.id);
    await expect(page.locator(`[data-level="${level}"] [data-module]`)).toHaveCount(ids.length);
    expect(await page.locator(`[data-level="${level}"] [data-module]`).evaluateAll(els => els.map(e => e.getAttribute('data-module')))).toEqual(ids);
  }
  for (const m of planned) {
    const card = page.locator(`[data-level="${m.level}"] .roadmap[data-module="${m.id}"]`);
    await expect(card.locator('h4')).toHaveText(m.title);
    await expect(card).toContainText(m.description);
  }
  await expect(catalogue(page).locator('.coming')).toHaveCount(0);
  await expect(catalogue(page).getByRole('link', { name: 'Propose a module' })).toHaveAttribute('href', 'https://github.com/Kondasamy/tinker/blob/main/CONTRIBUTING.md');
  await expect(page.locator('.hero-pic figcaption')).toContainText('The empty plots are open');
  await expect(page.locator('.hero-pic figcaption a')).toHaveAttribute('href', 'https://github.com/Kondasamy/tinker/blob/main/CONTRIBUTING.md');
  await expect(page.getByText('In the workshop')).toHaveCount(0);
});

for (const [width, height] of [[1280, 800], [390, 844]]) test(`the hero text and both buttons fit the first screen (${width}×${height})`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  for (const el of [page.locator('.hero h1'), page.locator('[data-continue]'), page.locator('.hero .ctas .btn').nth(1), page.locator('.hero .glance')])
    await expect(el).toBeInViewport({ ratio: 1 });
});

test('live modules keep their numbers: Tokens is Module 6 under Beginner and Transformers Module 7 under Advanced and Context Module 8 under Intermediate and Fine-tuning Module 9 under Advanced, linked; Agents, Evals and Guardrails keep 3, 4 and 5', async ({ page }) => {
  await page.goto('/');
  const kicker = (id: string) => page.locator(`.module[data-module="${id}"] .kicker`);
  for (const [id, n] of [['rag', 1], ['tool-calling', 2], ['agents', 3], ['evals', 4], ['guardrails', 5], ['tokens', 6], ['transformers', 7], ['context', 8], ['fine-tuning', 9]] as const)
    await expect(kicker(id)).toHaveText(new RegExp(`^Module ${n} · `));
  await expect(page.locator('[data-level="Beginner"] .module[data-module="tokens"] h4 a')).toHaveAttribute('href', '/tokens/');
  await expect(page.locator('[data-level="Advanced"] .module[data-module="transformers"] h4 a')).toHaveAttribute('href', '/transformers/');
  await expect(page.locator('[data-level="Intermediate"] .module[data-module="context"] h4 a')).toHaveAttribute('href', '/context/');
  await expect(page.locator('[data-level="Advanced"] .module[data-module="fine-tuning"] h4 a')).toHaveAttribute('href', '/fine-tuning/');
});

test('keyboard Tab never lands in a planned card', async ({ page }) => {
  await page.goto('/');
  const seen: string[] = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => (document.activeElement?.closest('.roadmap') ? 'roadmap' : document.activeElement?.tagName ?? '')));
  }
  expect(seen).not.toContain('roadmap');
  expect(seen).toContain('A');
});

test('Continue resumes the last module at its first unfinished chapter', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: {} }));
    localStorage.setItem('tinker-last-module', 'rag');
  });
  await page.reload();
  const go = page.locator('[data-continue]');
  await expect(go).toHaveAttribute('href', '/rag/03-what-is-rag/');
  await expect(go).toHaveText('Continue RAG: chapter 3 →');
});

test('with only a later chapter done, Continue goes to chapter 1 and says so', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['02-why-not-stuff-it'], saved: {} }));
    localStorage.setItem('tinker-last-module', 'rag');
  });
  await page.reload();
  const go = page.locator('[data-continue]');
  await expect(go).toHaveAttribute('href', '/rag/01-history/');
  await expect(go).toHaveText('Continue RAG: chapter 1 →');
});

test('a first visit starts with the basics; a finished module hands Continue to the next unfinished one', async ({ page }) => {
  await page.goto('/');
  const go = page.locator('[data-continue]');
  await expect(go).toHaveText('Start with the basics →');
  await expect(go).toHaveAttribute('href', '/rag/');
  const [rag, next] = MODULES.filter(m => m.status === 'live');
  await page.evaluate(ids => {
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ids, saved: {} }));
    localStorage.setItem('tinker-last-module', 'rag');
  }, rag.chapters.map(c => c.id));
  await page.reload();
  await expect(go).toHaveAttribute('href', `/${next.id}/`);
  await expect(go).toHaveText(`Start ${next.title} →`);
});

test('with no storage, Continue opens the RAG intro', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await page.goto('/');
  await page.locator('[data-continue]').click();
  await expect(page).toHaveURL(/\/rag\/$/);
});

test('an unknown last module falls back to the first live one', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('tinker-last-module', 'nope'));
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', '/rag/');
});

test('the catalogue fits a 390px phone without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await catalogue(page).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

for (const path of ['/', '/rag/']) test(`axe: ${path} has no serious or critical violations`, async ({ page }) => {
  await page.goto(path);
  expect(await serious(page)).toEqual([]);
});

test('RAG intro shows its level, prerequisites and author from the registry', async ({ page }) => {
  const rag = MODULES.find(m => m.id === 'rag')!;
  await page.goto('/rag/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText(rag.level);
  await expect(meta).toContainText('No prerequisites');
  await expect(meta.getByRole('link', { name: rag.author.name })).toHaveAttribute('href', rag.author.url);
});
