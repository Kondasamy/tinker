// Module 5, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function guardWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** chapter 2's threshold slider, to the i-th stop of THRESHOLDS: arrow keys by keyboard, fill by mouse */
  async function slide(i: number) {
    const s = card.getByRole('slider');
    if (!kb) return s.fill(String(i));
    const now = Number(await s.inputValue());
    await s.focus();
    for (let k = now; k !== i; k += Math.sign(i - now)) await s.press(i > now ? 'ArrowRight' : 'ArrowLeft');
  }

  async function open(id: string) {
    await page.goto(`/guardrails/${id}/`);
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
    /** the direct email, the forwarded invoice, the prediction, both again with the prompt rule on */
    async ch1(next?: RegExp, quiz: string | RegExp = /^The line helps, but it is not enough/) {
      await btn('Open the first email');
      await step(2);
      await btn(/^Run .*email$/);
      await step(3);
      await check(page);
      await btn(/^Next email/);
      await btn(/^Run the forwarded invoice$/);
      await step(5);
      await check(page);
      await opt(/^Only .*: the forwarded invoice still gets through/);
      await btn(/email, rule on$/);
      await btn(/^Run the forwarded invoice, rule on$/);
      await step(7);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** input filters: predict, try two thresholds, set the strictest that holds every attack, open the held customer */
    async ch2(next?: RegExp, quiz: string | RegExp = /^How many ordinary messages/) {
      await opt(/^No: at least one customer/);
      await step(2);
      await check(page);
      await slide(1);
      await slide(2);
      await step(3);
      await check(page);
      await slide(4); // THRESHOLDS[4], 0.3: the highest that holds every attack
      await step(4);
      await btn(/refund email$/);
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the way out: the leak, the allow-list, the link leak, the output filter, a person checking each send */
    async ch3(next?: RegExp, quiz: string | RegExp = /^An image or a link to someone else/) {
      await btn('Run the forwarded invoice');
      await step(2);
      await check(page);
      await opt(/^The host blocks the send/);
      await btn('Allow-list: on');
      await step(4);
      await opt(/^No: the data leaves inside the reply/);
      await btn(/^Run .*’s email$/);
      await step(6);
      await check(page);
      await btn('Output filter: on');
      await step(7);
      await btn('Person says yes');
      await btn('Person says no');
      await step(8);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the trifecta: predict, solve the puzzle by hand (the way out), then the taint rule */
    async ch4(next?: RegExp, quiz: string | RegExp = /^Once it has read a supplier page/) {
      await opt(/^The way out:/);
      await step(2);
      await check(page);
      await btn('Remove the way out');
      await step(3);
      await btn('Taint rule: on');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** defence in depth: predict, then stack two layers by hand (the prompt rule and the taint rule) */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Stack defences that miss different attacks/) {
      await opt(/^No: each stops some attacks/);
      await step(2);
      await check(page);
      await btn('Prompt rule: off');
      await btn('Taint rule: off');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the user as attacker: the output check, the off-topic favour, the input check, then strict and its cost */
    async ch6(next?: RegExp, quiz: string | RegExp = /^The false-block rate/) {
      await opt(/^A check on the refund itself/);
      await step(2);
      await btn('Output policy check: on');
      await step(3);
      await check(page);
      await btn(/^Open .*’s email$/);
      await step(4);
      await btn('Input policy check: on');
      await step(5);
      await opt(/^It is refused and waits for a person/);
      await step(6);
      await btn('Strict: every refund to a person');
      await step(7);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** the red team: one defence to start, then chapter 5's and 6's checks together for a clean bench */
    async ch7(next?: RegExp, quiz: string | RegExp = /^Only against these attacks/) {
      await btn('Prompt rule: on');
      await step(2);
      await check(page);
      await btn('Taint rule: on');
      await btn('Input policy check: on');
      await btn('Output check: on');
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}
