// Module 5, Prompt injection & guardrails: the intro, chapter 1 played by mouse and by keyboard only, its own progress
// key, "I'm not sure", reduced motion, the recap, home's live card and Continue, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { guardWalker } from './guardrails-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('guardrails'), CH1 = M.chapters[0].id;
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
// the whole-module walks grow with every chapter, like agents'
test.setTimeout(120_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/guardrails/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('tool-calling').title, exact: true })).toHaveAttribute('href', '/tool-calling/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://explain.kondasamy.com/og/guardrails.jpg');
  await axe(page);
});

test('home lists Guardrails under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const live = page.locator('[data-level="Intermediate"] .module[data-module="guardrails"]');
  await expect(live.getByRole('link', { name: /Prompt injection/ }).first()).toHaveAttribute('href', '/guardrails/');
  await expect(page.locator('.roadmap[data-module="guardrails"]')).toHaveCount(0);
});

test('chapter 1 plays by mouse, with axe clean at each check', async ({ page }) => {
  const w = guardWalker(page, 'mouse', axe);
  await w.open(CH1);
  await w.ch1(/\/guardrails\/recap\/$/);
});

test('chapter 1 plays by keyboard only; progress lands in guardrails-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }), 'tool-calling-progress-v1': JSON.stringify({ done: ['06-when-tools-go-wrong'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  const w = guardWalker(page, 'keyboard');
  await w.open(CH1);
  await w.ch1();
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['guardrails-progress-v1']).done).toEqual([CH1]);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('guardrails');
});

test('home Continue resumes Guardrails once it was played last', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('guardrails-progress-v1', JSON.stringify({ done: [], saved: {} })); localStorage.setItem('tinker-last-module', 'guardrails'); });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/guardrails\//);
});

test('without the rule both attacks work; with it the direct one is stopped and the forwarded invoice still leaks', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page), status = c.locator('.tc-status');
  const row = (n: number) => c.locator('table.tc-ledger tbody tr').nth(n);
  await c.getByRole('button', { name: 'Open the first email' }).click();
  // the email opens in the drawer, as the customer wrote it
  await expect(page.locator('aside.drawer')).toContainText('Ignore your previous instructions');
  await c.getByRole('button', { name: /^Run .*email$/ }).click();
  await expect(row(0)).toContainText('Attack worked');
  await c.getByRole('button', { name: /^Next email/ }).click();
  await c.getByRole('button', { name: 'Run the forwarded invoice' }).click();
  await expect(row(1)).toContainText('Attack worked');
  await expect(c).toContainText('audit@example.net');
  await c.getByRole('radio', { name: /^Both: the rule/ }).click();
  await c.getByRole('button', { name: /email, rule on$/ }).click();
  await expect(status).toContainText('the attack was stopped');
  await expect(row(2)).toContainText('Attack stopped');
  await c.getByRole('button', { name: 'Run the forwarded invoice, rule on' }).click();
  await expect(row(3)).toContainText('Attack worked');
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  // each attack's recorded note on why the model refused or followed
  await expect(c).toContainText('so I will not follow it');
  await expect(c).toContainText('so my rule does not stop it');
  const rows = c.locator('table.tc-ledger tbody tr');
  await expect(rows).toHaveCount(4);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: The line helps');
  await expect(fb).not.toContainText('NOT QUITE');
  await expect(card(page).locator('.hint')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapter still plays through', async ({ page }) => {
    const w = guardWalker(page, 'mouse', async p => {
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await w.open(CH1);
    await w.ch1();
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(/\/guardrails\/recap\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('guardrails-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start chapter 1 →' })).toHaveAttribute('href', `/guardrails/${CH1}/`);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapter 1 plays through there with axe clean', async ({ page }) => {
    for (const p of ['/guardrails/', `/guardrails/${CH1}/`, '/guardrails/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    const w = guardWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); });
    await w.open(CH1);
    await w.ch1();
  });
});
