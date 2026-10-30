// Text and Unicode: the intro, every chapter played by mouse and by keyboard only, the punch (typed text drawn as text
// only, 24 rows and a count pill, one polite read-out), the wrong table, the workbench's Show me, "I'm not sure",
// reduced motion, the recap, axe and phone width (targets ≥ 44 px); the go-live checks: share images, home's card.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf, moduleNumber } from '../../src/lib/modules';
import pinned from '../../data/unicode/pinned.json' with { type: 'json' };
import names from '../../data/unicode/names.json' with { type: 'json' };
import { ucWalker } from './unicode-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('unicode');
const NUMBER = moduleNumber(M);
const CHS = M.chapters.map(c => c.id),
  [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/unicode/${id}/$`);
async function walkAll(w: ReturnType<typeof ucWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7();
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
// let freshly punched rows finish dropping in first: axe can catch a row mid-fade
const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  expect(await serious(page)).toEqual([]);
};
test.setTimeout(240_000);

test('the intro shows the number, the level, the chapters and the two readings', async ({ page }) => {
  await page.goto('/unicode/');
  await expect(page.locator('.hero .kicker')).toHaveText(`Module ${NUMBER} · Text and Unicode`);
  await expect(page.locator('.hero .module-meta .level')).toHaveText('Beginner');
  await expect(page.locator('#path [data-chapter]')).toHaveCount(M.chapters.length);
  await expect(page.locator('.band .said').nth(1)).toHaveText(pinned.zoe.latin1);
  await axe(page);
});

test('every chapter plays by mouse, axe clean at each', async ({ page }) => {
  await walkAll(ucWalker(page, 'mouse', axe));
});
test('every chapter plays by keyboard only', async ({ page }) => {
  await walkAll(ucWalker(page, 'keyboard'));
});

test('the punch draws typed text as text only, 24 rows and a count pill, with one polite read-out', async ({
  page,
}) => {
  const w = ucWalker(page, 'mouse');
  await w.open(CH1);
  await card(page).getByRole('radio').first().click();
  const evil = '<img src=x onerror="window.__x=1">ЖЖЖЖЖЖЖЖЖЖЖЖЖЖЖЖЖЖЖЖ';
  await w.type(evil);
  const stage = page.locator('.uc-stage svg').first();
  await expect(stage.locator('[data-row]')).toHaveCount(24);
  await expect(stage).toContainText('BYTES');
  expect(await page.locator('.uc-stage img').count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();
  const said = card(page).locator('[role="status"].uc-said');
  await expect(said).toHaveCount(1);
  await expect(said).toContainText(`Punched ${new TextEncoder().encode(evil).length} bytes`);
  await page.getByRole('button', { name: 'Bytes', exact: true }).click();
  // the table lists 24 characters as text, the rest counted
  await expect(page.locator('.uc-table')).toContainText('U+003C (60)');
  await expect(page.locator('.uc-table-wrap')).toContainText(`and ${[...evil].length - 24} more characters`);
});

test('chapter 4: the same bytes read with Latin-1 print the pinned mojibake', async ({ page }) => {
  const w = ucWalker(page, 'mouse');
  await w.open(CH4);
  await card(page).getByRole('radio').first().click();
  await w.pick('uc-table', 'windows-1252');
  await expect(card(page).locator('.uc-said')).toContainText(`prints “${pinned.zoe.latin1}”`);
  await expect(page.locator('.uc-stage [data-part="reader"]')).toHaveAttribute('data-right', '0');
});

test('chapter 5: the four lengths are the pinned ones', async ({ page }) => {
  const w = ucWalker(page, 'mouse');
  await w.open(CH5);
  await card(page)
    .getByRole('radio', { name: String(pinned.family.units), exact: true })
    .click();
  await card(page).getByRole('button', { name: names.family, exact: true }).click();
  const f = pinned.family;
  await expect(card(page).locator('[data-lengths]')).toHaveAttribute(
    'data-lengths',
    `${f.units},${f.codePoints},${f.graphemes},${f.bytes}`,
  );
});

test('chapter 7: Show me applies a winner', async ({ page }) => {
  const w = ucWalker(page, 'mouse');
  await w.open(CH7);
  await expect(card(page).locator('[data-fits]')).toHaveAttribute('data-fits', '0');
  await card(page).getByRole('button', { name: 'Show me' }).click();
  await expect(card(page)).toContainText('Step 2 of');
  await expect(card(page).locator('[data-fits]')).toHaveAttribute('data-fits', '1');
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = ucWalker(page, 'mouse');
  await w.open(CH2);
  await w.ch2(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the whole tape appears at once, and every chapter plays through', async ({ page }) => {
    const w = ucWalker(page, 'mouse');
    await w.open(CH1);
    await card(page).getByRole('radio').first().click();
    await w.type(names.first);
    // one more byte, on a step that stays put: the new row is marked fresh, but never animates
    await w.type(`${names.first}!`);
    const row = page.locator('.uc-stage .tp-new').first();
    await expect(row).toBeAttached();
    expect(await row.evaluate(e => getComputedStyle(e).animationName)).toBe('none');
    await page.evaluate(() => localStorage.clear());
    await walkAll(w);
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(ucWalker(page, 'mouse'));
  await page.goto('/unicode/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Text and Unicode · Recap');
  await axe(page);
});

test('go-live: own share images and home’s card', async ({ page }) => {
  await page.goto('/unicode/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/unicode\.jpg$/);
  await page.goto(`/unicode/${CH1}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/og/unicode-${CH1}\\.jpg$`),
  );
  await page.goto('/unicode/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/unicode-recap\.jpg$/);
  expect((await page.request.get('/og/unicode.jpg')).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="unicode"] h4 a')).toHaveAttribute('href', '/unicode/');
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the punch’s targets are at least 44 px tall', async ({ page }) => {
    const w = ucWalker(page, 'mouse');
    await w.open(CH3);
    await card(page).getByRole('radio').first().click();
    for (const b of await card(page).locator('.uc-chips .chip, .uc-input').all())
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/unicode/', ...CHS.map(id => `/unicode/${id}/`), '/unicode/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      ucWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
