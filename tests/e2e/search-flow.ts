// Search before AI, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { LENGTH_NAMES, MEANING_NAMES, REPEAT_NAMES, WINNERS, planOf } from '../../src/lib/search/workbench';

export type Mode = 'mouse' | 'keyboard';

export function searchWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  /** native checkboxes and radio inputs toggle on Space */
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const input = (role: 'checkbox' | 'radio', name: string) => tick(card.getByRole(role, { name, exact: true }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  /** File a card into a drawer: by keyboard, arrow to each option and press Enter; by mouse, click them. */
  async function file(cardIndex: number, drawerIndex: number) {
    const cards = card.getByRole('listbox', { name: 'Page cards to file' }),
      drawers = card.getByRole('listbox', { name: 'Drawers, one per word' });
    if (!kb) {
      await cards.getByRole('option').nth(cardIndex).click();
      await drawers.getByRole('option').nth(drawerIndex).click();
      return;
    }
    await cards.focus();
    await cards.press('Home');
    for (let i = 0; i < cardIndex; i++) await cards.press('ArrowDown');
    await cards.press('Enter');
    await drawers.focus();
    await drawers.press('Home');
    for (let i = 0; i < drawerIndex; i++) await drawers.press('ArrowDown');
    await drawers.press('Enter');
  }

  async function open(id: string) {
    await page.goto(`/search/${id}/`);
    await page.locator('astro-island:not([ssr])').waitFor();
    await expect(card).toContainText('Step 1 of');
    await check(page);
  }
  async function finish(next?: RegExp) {
    await expect(card).toContainText('Chapter complete');
    await check(page);
    if (!next) return;
    await press(card.getByRole('link', { name: /^(Next:|Recap)/ }));
    await expect(page).toHaveURL(next);
    // a key pressed before the next island hydrates is lost
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }

  return {
    open,
    file,
    /** scan, predict, scan again */
    async ch1(next?: RegExp) {
      await btn('Search for “forklift”');
      await step(2);
      await opt(/a scan reads every page, every search$/);
      await btn('Search for “refund”');
      await step(4);
      await check(page);
      await opt(/^Opening every email/);
      await finish(next);
    },
    /** file three cards, predict, search, the Postings tab */
    async ch2(next?: RegExp) {
      await file(0, 0);
      await file(1, 1);
      await file(2, 2);
      await step(2);
      await opt(/^None: it opens one drawer/);
      await btn('Search for “forklift”');
      await step(4);
      await check(page);
      await btn('Open the Postings tab');
      await step(5);
      await opt(/^Opens the “basil” drawer/);
      await finish(next);
    },
    /** count, postings, predict, rarity */
    async ch3(next?: RegExp) {
      await btn('Search “Larkspur forklift”');
      await step(2);
      await btn('Open the Postings tab');
      await step(3);
      await opt(/the rare word$/);
      await btn('Weigh words by rarity');
      await step(5);
      await check(page);
      await opt(/^By “warranty”/);
      await finish(next);
    },
    /** rarity, predict, BM25, length off */
    async ch4(next?: RegExp) {
      await btn('Search for “price”');
      await step(2);
      await opt(/a short page that says it/);
      await btn('Score with BM25');
      await step(4);
      await input('radio', 'Not at all');
      await step(5);
      await check(page);
      await opt(/^A little more than a page saying it twice/);
      await finish(next);
    },
    /** as typed, lower case, predict, stemmer, stop words */
    async ch5(next?: RegExp) {
      await btn('Search for “Refunds”');
      await step(2);
      await input('checkbox', 'Lower case');
      await step(3);
      await opt(/^More than/);
      await input('checkbox', 'Stemmer');
      await step(5);
      await input('checkbox', 'Drop stop words');
      await step(6);
      await check(page);
      await opt(/^A search for one finds pages about the other/);
      await finish(next);
    },
    /** keywords, predict, meaning, the part number, the blend */
    async ch6(next?: RegExp) {
      await btn(/by keywords$/);
      await step(2);
      await opt(/^First: its meaning/);
      await btn('Meaning');
      await step(4);
      await btn(/^Search “HR-SB” by meaning$/);
      await step(5);
      await btn('Blend');
      await step(6);
      await check(page);
      await opt(/^A blend: keywords catch/);
      await finish(next);
    },
    /** set one winning plan by hand, then the quiz */
    async ch7(next?: RegExp) {
      const p = planOf(WINNERS[0]);
      for (const [k, name] of [
        ['lower', 'Lower case'],
        ['stem', 'Stemmer'],
        ['stop', 'Drop stop words'],
      ] as const)
        if (p.clean[k]) await input('checkbox', name);
      await input('radio', REPEAT_NAMES[p.k1]);
      await input('radio', LENGTH_NAMES[p.b]);
      await input('radio', MEANING_NAMES[p.meaning]);
      await step(2);
      await check(page);
      await opt(/^Settings that suit three searches/);
      await finish(next);
    },
  };
}
