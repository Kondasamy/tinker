// Module 5, Prompt injection & guardrails: the intro, chapter 1 played by mouse and by keyboard only, its own progress
// key, "I'm not sure", reduced motion, the recap, home's live card and Continue, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { guardWalker } from './guardrails-flow';
import { serious, layoutHolds, PHONE } from './helpers';
import INBOX from '../../data/guardrails/inbox.json' with { type: 'json' };
import SUITE from '../../data/guardrails/suite.json' with { type: 'json' };

const M = moduleOf('guardrails'), CH1 = M.chapters[0].id;
const [, CH2, CH3, CH4] = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/guardrails/${id}/$`);
/** Walk every written chapter in order, following each "Next" link, and end on the recap. */
async function walkAll(w: ReturnType<typeof guardWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(/\/guardrails\/recap\/$/);
}
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

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({ page }) => {
  await walkAll(guardWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only, the chapter 4 puzzle included; progress lands in guardrails-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }), 'tool-calling-progress-v1': JSON.stringify({ done: ['06-when-tools-go-wrong'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(guardWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['guardrails-progress-v1']).done).toEqual(M.chapters.map(c => c.id));
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

// the injection suite, counted from the data by hand: the engine and the page must agree with this
const THRESHOLDS = [null, 0.9, 0.6, 0.5, 0.3, 0.1];
const INJECTION = [...SUITE.attacks.filter(a => a.kind === 'injection').map(a => a.email), ...SUITE.customers.map(c => c.email)];
const heldAt = (t: number | null) => {
  const q = (ids: string[]) => ids.filter(id => t !== null && INBOX.find(e => e.id === id)!.score >= t).length;
  const atk = INJECTION.filter(id => INBOX.find(e => e.id === id)!.attack), cus = INJECTION.filter(id => !INBOX.find(e => e.id === id)!.attack);
  return `${q(atk)} of ${atk.length} attacks quarantined, ${q(cus)} of ${cus.length} customers quarantined`;
};

test('chapter 2: at every threshold the counts match the data, and no threshold holds every attack and no customer', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page), slider = c.getByRole('slider');
  // predict first: no slider and no scores until the pick
  await expect(slider).toHaveCount(0);
  await c.getByRole('radio', { name: /^Yes: attacks read like attacks/ }).click();
  // every stop; after two the step says no threshold wins, and the last stop (the highest that holds every attack) moves on
  for (const i of [0, 1, 2, 3, 5, 4]) {
    const t = THRESHOLDS[i];
    await slider.fill(String(i));
    await expect(c.locator('[data-counts]')).toHaveText(`${heldAt(t)}.`);
    await expect(slider).toHaveAttribute('aria-valuetext', `${t ?? 'off'}: ${heldAt(t)}`);
    if (i === 5) {
      await expect(c).toContainText('NOT WHAT YOU PREDICTED');
      await expect(c).toContainText('No threshold wins outright');
    }
  }
  expect(THRESHOLDS.map(heldAt).some(h => /^(\d) of \1 attacks quarantined, 0 of/.test(h))).toBe(false);
  await expect(c).toContainText('Step 4 of');
  await c.getByRole('button', { name: /refund email$/ }).click();
  await expect(c.getByRole('link', { name: 'The Evals module' })).toHaveAttribute('href', '/evals/');
});

test('chapter 3: with the allow-list on the mail log has no outside address; the filter strips the link', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page), log = c.locator('[data-log]');
  await c.getByRole('button', { name: 'Run the forwarded invoice' }).click();
  await expect(log.locator('[data-out="1"]')).toContainText('audit@example.net');
  await c.getByRole('radio', { name: /^The send goes through/ }).click();
  await c.getByRole('button', { name: 'Allow-list: on' }).click();
  await expect(log.locator('[data-out]')).toHaveCount(1);
  await expect(log.locator('[data-out="1"]')).toHaveCount(0);
  await expect(log).not.toContainText('example.net');
  await expect(c).toContainText('is not on the host');
  await c.getByRole('radio', { name: /^Yes: the allow-list guards/ }).click();
  await c.getByRole('button', { name: /^Run .*’s email$/ }).click();
  await expect(log).toContainText('https://verify.example.net');
  await c.getByRole('button', { name: 'Output filter: on' }).click();
  const filtered = c.locator('[data-filtered]');
  await expect(filtered).toContainText('[link removed by the output filter]');
  await expect(filtered).not.toContainText('example.net');
});

test('chapter 4: removing untrusted text or private data leaves the case undone; the way out or the taint rule stops the attack and still answers', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page), verdict = c.locator('.tc-status');
  await c.getByRole('radio', { name: /^None: support needs all three/ }).click();
  await c.getByRole('button', { name: 'Remove untrusted text' }).click();
  await expect(verdict).toContainText('BROKEN');
  await expect(verdict).toContainText('The attack failed. Nobody read the email');
  await c.getByRole('button', { name: 'Remove private data' }).click();
  await expect(verdict).toContainText('BROKEN');
  await expect(verdict).toContainText('question went unanswered');
  await c.getByRole('button', { name: 'Keep all three' }).click();
  await expect(verdict).toContainText('The attack worked');
  // three misses: the hint shows; Show me sets the way out and advances
  await expect(c.locator('.hint')).toBeVisible();
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 3 of');
  await c.getByRole('button', { name: 'Taint rule: on' }).click();
  const rows = c.locator('table.tc-ledger tbody tr');
  await expect(rows.filter({ hasText: 'Remove the way out' })).toContainText(/NoYes$/);
  await expect(rows.filter({ hasText: 'taint rule on' })).toContainText(/NoYes$/);
  await expect(rows.filter({ hasText: 'Remove untrusted text' })).toContainText(/NoNo$/);
  await expect(rows.filter({ hasText: 'Remove private data' })).toContainText(/NoNo$/);
});

test('chapters 2–4: “I’m not sure” on each checkpoint reveals the answer and is no miss', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  for (const [id, play] of [[CH2, w.ch2], [CH3, w.ch3], [CH4, w.ch4]] as const) {
    await w.open(id);
    await play(undefined, 'I’m not sure');
    const fb = card(page).locator('.quiz .feedback');
    await expect(fb).toContainText('The answer:');
    await expect(fb).not.toContainText('NOT QUITE');
  }
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
  await w.ch1();
  await page.goto('/guardrails/recap/');
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
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/guardrails/', ...M.chapters.map(c => `/guardrails/${c.id}/`), '/guardrails/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(guardWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
