// Logins and passwords, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { WINNERS, type Plan } from '../../src/lib/logins/workbench';

export type Mode = 'mouse' | 'keyboard';

/** Chapter 7's selects, by their labels. */
export const BENCH_LABELS: Record<keyof Plan, string> = {
  store: 'Store every password as',
  builder2fa: 'Builders: sign in with',
  builderSession: 'Builders: session lasts',
  staff2fa: 'Staff: sign in with',
  staffSession: 'Staff: session lasts',
};

export function loginsWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name, exact: typeof name === 'string' }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  // the race plays a tick every 0.7 s, so a step after Play may take a few seconds
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`, { timeout: 15_000 });
  /** a native radio: by keyboard, focus it and press Space */
  const tick = async (l: Locator) => {
    if (!kb) return l.click();
    await l.focus();
    await page.keyboard.press('Space');
  };

  async function open(id: string) {
    await page.goto(`/logins/${id}/`);
    await page.locator('astro-island:not([ssr])').first().waitFor();
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
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').first().waitFor();
  }

  return {
    open,
    /** predict, copy the table, quiz */
    async ch1(next?: RegExp) {
      await opt(/^All \d+, as typed/);
      await step(2);
      await btn('Copy the table');
      await step(3);
      await check(page);
      await opt(/^Members who use/);
      await finish(next);
    },
    /** store fingerprints, predict, play the race, quiz */
    async ch2(next?: RegExp) {
      await btn('Store fingerprints');
      await step(2);
      await opt(/^Those on the leaked list/);
      await step(3);
      await btn('Play');
      await step(4);
      await check(page);
      await opt(/^A long phrase/);
      await finish(next);
    },
    /** predict, add salt, play the race, quiz */
    async ch3(next?: RegExp) {
      await opt(/^No: different salts/);
      await step(2);
      await btn('Add salt');
      await step(3);
      await btn('Play');
      await step(4);
      await check(page);
      await opt(/^So equal passwords/);
      await finish(next);
    },
    /** pick PBKDF2, predict, slide to the top work factor, play, PBKDF2 runs here, quiz */
    async ch4(next?: RegExp) {
      await tick(card.getByRole('radio', { name: 'Salted PBKDF2' }));
      await step(2);
      await opt(/^Only those off/);
      await step(3);
      const range = card.getByRole('slider');
      if (kb) {
        await range.focus();
        await page.keyboard.press('End');
      } else await range.fill('2');
      await btn('Play');
      await step(4);
      await expect(card.locator('[data-pbkdf2]')).not.toHaveAttribute('data-pbkdf2', '', { timeout: 15_000 });
      await check(page);
      await opt(/^Refusing leaked/);
      await finish(next);
    },
    /** sign in, predict, show the copy, sign out, quiz */
    async ch5(next?: RegExp) {
      await btn(/^Sign \S+ in$/);
      await step(2);
      await opt(/^Nothing: the cookie/);
      await step(3);
      await btn('Show the copied ticket');
      await step(4);
      await btn(/^Sign \S+ out$/);
      await step(5);
      await check(page);
      await opt(/^Ending that session/);
      await finish(next);
    },
    /** redirect, check the state, predict, redeem the stolen code, a changed token fails its signature, quiz */
    async ch6(next?: RegExp) {
      await btn(/^Sign in with the/);
      await step(2);
      await btn('Check the state');
      await step(3);
      await opt(/^No: she lacks/);
      await step(4);
      await btn('Redeem the stolen code');
      await step(5);
      await expect(card.locator('[data-check="thief-pkce"]')).toHaveAttribute('data-ok', '0');
      await tick(card.getByRole('radio', { name: 'The same token, one letter changed' }));
      await step(6);
      await expect(card.locator('[data-check="signature"]')).toHaveAttribute('data-ok', '0');
      await check(page);
      await opt(/^No: it was made/);
      await finish(next);
    },
    /** set one winning plan by hand, then the quiz */
    async ch7(next?: RegExp) {
      const win = WINNERS[0];
      for (const [k, label] of Object.entries(BENCH_LABELS))
        await card.getByRole('combobox', { name: label }).selectOption(win[k as keyof Plan]);
      await step(2);
      await check(page);
      await opt(/^Passkeys/);
      await finish(next);
    },
  };
}
