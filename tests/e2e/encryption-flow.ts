// Locks and keys, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { CHOICE_NAME, MESSAGES, WINNERS, type MessageId } from '../../src/lib/encryption/workbench';
import { SUPPLIER } from '../../src/lib/encryption/story';

export type Mode = 'mouse' | 'keyboard';

export function encryptionWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a native radio: by keyboard, focus it and press Space */
  const tick = async (l: Locator) => {
    if (!kb) return l.check();
    await l.focus();
    await page.keyboard.press('Space');
  };

  async function open(id: string) {
    await page.goto(`/encryption/${id}/`);
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
    /** predict, lock (real AES-GCM), send the key, quiz */
    async ch1(next?: RegExp) {
      await opt(/^The whole order/);
      await step(2);
      await btn('Lock the order');
      await step(3);
      await expect(card.locator('[data-cipher]')).not.toHaveAttribute('data-cipher', '');
      await check(page);
      await btn('Send the key');
      await step(4);
      await opt(/^No: whoever hears/);
      await finish(next);
    },
    /** pick a secret colour, mix, predict, swap, add, quiz */
    async ch2(next?: RegExp) {
      await tick(card.getByRole('radio', { name: /^Rose/ }));
      await step(2);
      await btn('Mix your pot');
      await step(3);
      await opt(/^No: she would/);
      await step(4);
      await btn('Swap the pots');
      await step(5);
      await btn('Add your secret');
      await step(6);
      await check(page);
      await opt(/^Working a secret/);
      await finish(next);
    },
    /** predict, shut, open with the private key, quiz */
    async ch3(next?: RegExp) {
      await opt(new RegExp(`^Only ${SUPPLIER.short}`));
      await step(2);
      await btn('Snap it shut');
      await step(3);
      await btn('Open with the private key');
      await step(4);
      await check(page);
      await opt(/^An open padlock/);
      await finish(next);
    },
    /** sign, predict, tamper, real ECDSA fails, quiz */
    async ch4(next?: RegExp) {
      await btn('Sign the invoice');
      await step(2);
      await opt(/^It fails/);
      await step(3);
      await btn('Change the account');
      await step(4);
      await expect(card.locator('[data-verified]')).toHaveAttribute('data-verified', '0');
      await check(page);
      await opt(/^The check fails/);
      await finish(next);
    },
    /** predict, change one digit, quiz */
    async ch5(next?: RegExp) {
      await opt(/^About half/);
      await step(2);
      await btn('Change one digit');
      await step(3);
      await check(page);
      await opt(/^Hash the copy/);
      await finish(next);
    },
    /** predict, check, try an impostor's card, quiz */
    async ch6(next?: RegExp) {
      await opt(/^A signature from a root/);
      await step(2);
      await btn('Check the certificate');
      await step(3);
      await tick(card.getByRole('radio', { name: 'Impostor: its own name' }));
      await step(4);
      await expect(card.locator('[data-check="name"]')).toHaveAttribute('data-ok', '0');
      await check(page);
      await opt(/^No: it proves/);
      await finish(next);
    },
    /** set one winning plan by hand, then the quiz */
    async ch7(next?: RegExp) {
      const win = WINNERS[0];
      for (const m of MESSAGES) {
        const c = win[m.id as MessageId];
        if (c !== 'none') await card.getByRole('combobox', { name: m.name }).selectOption(c);
      }
      await step(2);
      await expect(card.locator('tr[data-message="bank"] td').first()).toHaveText(CHOICE_NAME[win.bank]);
      await check(page);
      await opt(/^Sign them/);
      await finish(next);
    },
  };
}
