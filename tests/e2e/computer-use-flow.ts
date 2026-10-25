// Computer use, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. A prediction is made
// on the Screen view: by mouse a click on the target, by keyboard arrow keys between targets, then Enter.
import { expect, type Locator, type Page } from '@playwright/test';
// the pinned winners, read as data: the engine's imports don't load under Playwright's runner
import pinned from '../../data/computer-use/pinned.json' with { type: 'json' };

const WINNERS = pinned.winners;

export type Mode = 'mouse' | 'keyboard';

export function cuWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name })); // a quiz or prediction option
  const tick = (name: RegExp) => {
    const b = card.getByRole('checkbox', { name });
    return kb ? b.press('Space') : b.check();
  };
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);

  /** predict the agent's click on the Screen view: the target whose id names `el` */
  async function predict(el: string) {
    const targets = page.locator('.cu-target');
    await expect(targets.first()).toBeVisible();
    const want = page.locator(`.cu-target[data-target*="${el}"]`);
    if (!kb) await want.click();
    else {
      await targets.first().focus();
      for (let i = 0; i < 20; i++) {
        const id = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.target ?? '');
        if (id.split('+').includes(el)) break;
        await page.keyboard.press('ArrowRight');
      }
      await page.keyboard.press('Enter');
    }
    await expect(want).toHaveAttribute('aria-pressed', 'true');
  }

  async function open(id: string) {
    await page.goto(`/computer-use/${id}/`);
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
    if (!/recap/.test(String(next))) await page.locator('astro-island:not([ssr])').first().waitFor();
  }
  /** predict, carry out the click, run to the end, then turn on the chapter's fix and run it */
  async function fixChapter(el: string, fix: RegExp, quiz: RegExp, next?: RegExp, end = true) {
    await predict(el);
    await step(2);
    await btn(/^Carry out the click/);
    await step(3);
    await check(page);
    if (end) {
      await btn('Run to the end');
      await step(4);
    }
    await tick(fix);
    await btn('Run the re-order');
    await step(end ? 5 : 4);
    await check(page);
    await opt(quiz);
    await finish(next);
  }

  return {
    async ch1(next?: RegExp, quiz: string | RegExp = /^Nothing, until/) {
      await predict('tile-orders');
      await step(2);
      await btn(/^Carry out the click/);
      await step(3);
      await check(page);
      await btn('Run to the end');
      await step(4);
      await opt(quiz);
      await finish(next);
    },
    ch2: (next?: RegExp) => fixChapter('tile-signout', /^Scale the click back/, /^\(800, 600\)/, next, false),
    ch3: (next?: RegExp) => fixChapter('reorder-PO-5531', /^Wait for the page/, /^It clicks Send again/, next),
    ch4: (next?: RegExp) => fixChapter('verify', /^Allow only/, /^Limit what the host/, next),
    ch5: (next?: RegExp) => fixChapter('offer', /^Ask a person/, /^The ones that spend/, next),
    async ch6(next?: RegExp, quiz: string | RegExp = /^Small targets get/) {
      await opt(/^About a quarter/);
      await step(2);
      for (const z of [640, 1024, 1280]) await btn(`Run at ${z} px`);
      await step(3);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    async ch7(next?: RegExp, quiz: string | RegExp = /^Host rules for timing/) {
      const w = WINNERS[0];
      await card.getByRole('combobox', { name: /Screenshot size/ }).selectOption(String(w.size));
      if (w.wait) await tick(/^Wait for the page/);
      if (w.allow) await tick(/^Allow only/);
      if (w.confirm) await tick(/^Ask a person/);
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    predict,
  };
}
