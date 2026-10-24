// Module 6, Tokens & embeddings: the intro, every chapter played by mouse and by keyboard only, each chapter's own
// checks, its own progress key, "I'm not sure", reduced motion, the recap, axe, phone width and offline.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { tokensWalker } from './tokens-flow';
import { serious, layoutHolds, offline, PHONE } from './helpers';

const M = moduleOf('tokens');
const IDS = M.chapters.map(c => c.id);
const [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = IDS;
const at = (id: string) => new RegExp(`/tokens/${id}/$`);
/** Walk every chapter in order, following each "Next" link; the last one links to the recap. */
async function walkAll(w: ReturnType<typeof tokensWalker>, page: Page) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7();
  await expect(card(page).getByRole('link', { name: /^Recap/ })).toHaveAttribute('href', '/tokens/recap/');
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
test.setTimeout(90_000);

test('the intro shows the level, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/tokens/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Beginner');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await axe(page);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(tokensWalker(page, 'mouse', axe), page);
});

test('every chapter plays by keyboard only; progress lands in tokens-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = {
    'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }),
    'guardrails-progress-v1': JSON.stringify({ done: ['01-data-or-instructions'], saved: {} }),
  };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(tokensWalker(page, 'keyboard'), page);
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['tokens-progress-v1']).done).toEqual(IDS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('tokens');
});

test('chapter 1: the count stays hidden until the prediction locks; typed text is counted live and shown as text', async ({
  page,
}) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page),
    counts = page.getByTestId('token-counts');
  await expect(counts).toHaveText(/^0 tokens/);
  await expect(c.getByRole('button', { name: 'Feed the sentence to the tokenizer' })).toHaveCount(0);
  await c.getByRole('radio', { name: /^Exactly \d+: one token per word/ }).click();
  await c.getByRole('button', { name: 'Feed the sentence to the tokenizer' }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(counts).not.toHaveText(/^0 tokens/);
  await c.getByLabel('Your text').fill('<script>alert(1)</script>');
  await expect(counts).toContainText('1 word');
  await c.getByRole('button', { name: 'Count my text' }).click();
  await expect(c.locator('[data-mine]')).toContainText('tokens per word');
  await page
    .locator('.tc-tabs')
    .getByRole('button', { name: /^Tokens/ })
    .click();
  await expect(page.locator('.tk-row li').first()).toBeVisible();
  await axe(page);
});

test('chapter 2: the first merge on screen is the one the reveal names', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  await c.getByRole('button', { name: 'Cut it into bytes' }).click();
  await c.getByRole('radio').first().click();
  await expect(c.locator('[data-merge="0"]')).toContainText('one per byte');
  await c.getByRole('button', { name: 'Next merge' }).click();
  const happened = await c.locator('.feedback p').filter({ hasText: 'What happened:' }).innerText();
  const pair = happened.replace('What happened: ', '').split(', found')[0];
  await expect(c.locator('[data-merge="1"]')).toContainText(`Merge 1 of`);
  await expect(c.locator('[data-merge="1"]')).toContainText(pair);
});

test('chapter 3: the meter shows the rule, the recorded tokenizers and the site’s in-sample count, then a dated price', async ({
  page,
}) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /^The rule matches/ }).click();
  await c.getByRole('button', { name: 'Count the documents' }).click();
  const rows = c.locator('table[data-meter] tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.last()).toContainText('in-sample');
  await c.getByRole('button', { name: 'Price the documents' }).click();
  await expect(c.locator('table[data-meter] thead')).toContainText('Cost to send once');
  // the price's source and the day it was checked open from its mark
  await c
    .getByRole('button', { name: /^Source:/ })
    .first()
    .click();
  await expect(page.locator('.cite-pop:popover-open')).toContainText(/checked \d{4}-\d{2}-\d{2}/);
  await page.keyboard.press('Escape');
  await expect(c.getByRole('link', { name: /^RAG chapter 2/ })).toHaveAttribute('href', '/rag/02-why-not-stuff-it/');
});

test('chapter 4: the table counts every sentence on every tokenizer, and the picture follows the pick', async ({
  page,
}) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio', { name: /^Under twice/ }).click();
  await c.getByRole('button', { name: 'Run every sentence' }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  const rows = c.locator('table[data-splits] tbody tr');
  await expect(rows).toHaveCount(8);
  await expect(c.locator('table[data-splits] thead th')).toHaveCount(4);
  await c.getByRole('group', { name: 'Sentence' }).getByRole('button', { name: /^棚/ }).click();
  await page
    .locator('.tc-tabs')
    .getByRole('button', { name: /^Tokens/ })
    .click();
  await expect(page.locator('.tk-row .tk-bytes').first()).toBeVisible(); // a token that is only part of a character
  await axe(page);
});

test('chapter 5: the cosines come from RAG’s vectors, with the WordPiece line and a link to RAG', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page);
  await c.getByRole('radio', { name: /^Neither/ }).click();
  await c.getByRole('button', { name: 'Compare the embeddings' }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(c.locator('[data-cosines] tbody tr')).toHaveCount(2);
  await expect(c).toContainText('WordPiece');
  await expect(c.getByRole('link', { name: /^RAG chapter 4/ })).toHaveAttribute('href', '/rag/04-layers/');
});

test('chapter 5: pointing at the map before the map step does not stall the chapter', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH5);
  // on step 1, before the map step asks; the nearest dot, so the ruler it draws stays clear of the dot the walker points at later
  await page.locator('.stage .map circle[tabindex]').first().focus();
  await w.ch5();
});

test('chapter 6: Show me picks a piece that works, and the ranked pieces follow', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page);
  await c.getByRole('radio', { name: /^Yes/ }).click();
  await expect(c.getByRole('button', { name: 'Pick piece 1' })).toBeVisible();
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 3 of');
  await expect(c.locator('table[data-ranked] tbody tr')).toHaveCount(4);
});

test('chapter 7: the count is live and the bench is kept in the step state', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page);
  await c.getByRole('radio').first().click();
  const status = c.locator('.tc-status[data-tokens]');
  const before = Number(await status.getAttribute('data-tokens'));
  await c.getByRole('button', { name: /^Tone guide: in$/ }).click();
  await expect(status).not.toHaveAttribute('data-tokens', String(before));
  await expect(page.getByTestId('token-counts')).toContainText(`${await status.getAttribute('data-tokens')} tokens`);
  await page.reload();
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.getByRole('button', { name: /^Continue at step/ }).click();
  await expect(c.getByRole('button', { name: /^Tone guide: out$/ })).toBeVisible();
});

test('chapter 5 plays to the end offline once RAG’s index has loaded', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const w = tokensWalker(page, 'mouse');
  await w.open(CH5);
  await expect(page.locator('.stage .map circle').first()).toBeVisible(); // the index and the map's chunks are in
  await page.waitForLoadState('networkidle');
  await offline(page);
  await w.ch5();
  expect(failed).toEqual([]);
});

test('“I’m not sure” on each checkpoint reveals the answer and is no miss', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  for (const [id, play] of [
    [CH1, w.ch1],
    [CH2, w.ch2],
    [CH3, w.ch3],
    [CH4, w.ch4],
    [CH5, w.ch5],
    [CH6, w.ch6],
    [CH7, w.ch7],
  ] as const) {
    await w.open(id);
    await play(undefined, 'I’m not sure');
    const fb = card(page).locator('.quiz .feedback');
    await expect(fb).toContainText('The answer:');
    await expect(fb).not.toContainText('NOT QUITE');
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapters still play through', async ({ page }) => {
    const w = tokensWalker(page, 'mouse', async p => {
      await expect
        .poll(() =>
          p.evaluate(
            () =>
              document
                .querySelector('.stage')!
                .getAnimations({ subtree: true })
                .filter(a => a.playState === 'running').length,
          ),
        )
        .toBe(0);
    });
    await walkAll(w, page);
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = tokensWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/tokens/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('tokens-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    test.setTimeout(150_000);
    for (const p of ['/tokens/', ...IDS.map(id => `/tokens/${id}/`), '/tokens/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      tokensWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
      page,
    );
  });
});
