// Diffusion models, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { GUIDANCE } from '../../src/lib/diffusion/ideal';
import { NOISE, STEPS } from '../../src/lib/diffusion/schedule';
import { WINNERS } from '../../src/lib/diffusion/workbench';

export type Mode = 'mouse' | 'keyboard';
/** dots take a moment to develop, more on a phone or with the CPU shared */
const SAMPLING = { timeout: 30_000 };

export function dfWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** set a range to the index of `value` in `list`: arrow keys by keyboard, a direct set by mouse */
  async function range(name: string, list: readonly number[], value: number) {
    const r = card.getByRole('slider', { name });
    const to = list.indexOf(value);
    if (!kb) return r.fill(String(to));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to; i += Math.sign(to - now)) await r.press(to > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/diffusion/${id}/`);
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
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').waitFor();
  }

  return {
    /** predict, bury the hinge in noise, develop a picture */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The whole chair/) {
      await opt(/^All at once/);
      await range('Noise', NOISE, 1);
      await step(3);
      await btn(/^Develop: \d+ steps/);
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, develop at 50, 5 and 1 steps */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Fast costs about a fifth/) {
      await opt(/^Ten times cheaper, but rougher/);
      await step(2);
      for (const n of [50, 5, 1]) {
        await range('Steps', STEPS, n);
        await btn(/^Develop: /);
        await expect(card.locator(`tr[data-steps="${n}"]`)).toBeVisible(SAMPLING);
      }
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, develop 300 dots with the learned denoiser */
    async ch3(next?: RegExp, quiz: string | RegExp = /^The network’s weights/) {
      await opt(/^Which way, and how far/);
      await btn(/^Develop \d+ dots/);
      await step(3, SAMPLING);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, run the ideal denoiser, then the learned one */
    async ch4(next?: RegExp, quiz: string | RegExp = /^It hands back one/) {
      await opt(/^Its \d+ training points/);
      await btn('Run the ideal denoiser');
      await step(3);
      await btn('Run the learned denoiser');
      await step(4, SAMPLING);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, guidance 1 and 4 */
    async ch5(next?: RegExp, quiz: string | RegExp = /^The guidance scale/) {
      await opt(/^Only some, by chance/);
      await range('Guidance', GUIDANCE, 1);
      await range('Guidance', GUIDANCE, 4);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, every size, latent on */
    async ch6(next?: RegExp, quiz: string | RegExp = /^A few-step model/) {
      await opt(/^Four times/);
      await btn('512 × 512');
      await btn('1024 × 1024');
      await step(3);
      const box = card.getByRole('checkbox', { name: /^Latent diffusion/ });
      await (kb ? box.press('Space') : box.click());
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set one of the best plans */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Test each use/) {
      const w = WINNERS[0];
      for (const [use, c] of Object.entries(w)) {
        const sel = card.locator(`fieldset[data-use="${use}"] select`);
        await sel.nth(0).selectOption(String(c.steps));
        await sel.nth(1).selectOption(String(c.scale));
      }
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
