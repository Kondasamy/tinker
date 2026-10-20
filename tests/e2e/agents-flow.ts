// Module 3, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function agentWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));   // a quiz or prediction option
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** run the case on screen both ways */
  const both = async () => { await btn('Run as the script'); await btn('Run as an agent'); };

  async function open(id: string) {
    await page.goto(`/agents/${id}/`);
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
  }

  return {
    /** `quiz`: the checkpoint pick (default the right answer); `next`: where the closing link goes */
    async ch1(next?: RegExp, quiz: string | RegExp = /^A workflow: the steps are known/) {
      await btn('Read the refund case');
      await opt(/script uses fewer model tokens/);
      await both();
      await step(4);
      await check(page);
      await btn(/^Next case/);
      await both();
      await step(6);
      await opt(/^Only the agent/);
      await both();
      await step(8);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
  };
}

/** Every chapter in one browser, from chapter 1, following each "Next" link. */
export async function walkAgents(page: Page, mode: Mode, check?: (page: Page) => Promise<void>) {
  const w = agentWalker(page, mode, check);
  await w.open('01-workflow-or-agent');
  await w.ch1(/\/agents\/recap\/$/);
}
