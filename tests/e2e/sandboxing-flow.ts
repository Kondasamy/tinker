// Module 15 (Agent sandboxing), chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';

export type Mode = 'mouse' | 'keyboard';

export function sandboxWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);

  async function open(id: string) {
    await page.goto(`/sandboxing/${id}/`);
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
    /** host vs sandbox: run on the host, predict, run in the sandbox, quiz */
    async ch1(next?: RegExp) {
      await btn('Run it on the host');
      await step(2);
      await check(page);
      await opt(/^No: the sandbox refuses/);
      await step(3);
      await btn('Run it in the sandbox');
      await step(4);
      await check(page);
      await opt(/^An instruction is inside the model/);
      await finish(next);
    },
    /** files: run peek on open, predict, scope it, switch to tamper, quiz */
    async ch2(next?: RegExp) {
      await btn('Run it');
      await step(2);
      await check(page);
      await opt(/^No: a hidden path is not exposed/);
      await step(3);
      await btn('Mounts: scoped');
      await btn('Run it');
      await step(4);
      await check(page);
      await btn('Write a backdoor');
      await btn('Run it');
      await step(5);
      await opt(/^Expose the template read-only/);
      await finish(next);
    },
    /** network: run exfil on open egress, predict, allow-list, block the report with egress off, quiz */
    async ch3(next?: RegExp) {
      await btn('Run it');
      await step(2);
      await check(page);
      await opt(/^No: the attacker’s host is not on the allow-list/);
      await step(3);
      await btn('Egress: allow-list');
      await btn('Run it');
      await step(4);
      await btn('The report task');
      await btn('Egress: off');
      await btn('Run it');
      await step(5);
      await check(page);
      await opt(/^The task is blocked too/);
      await finish(next);
    },
    /** secrets: run with the secret in the env, predict, move it to the proxy, quiz */
    async ch4(next?: RegExp) {
      await btn('Run it');
      await step(2);
      await check(page);
      await opt(/^No: if the agent cannot read the token/);
      await step(3);
      await btn('Secret: with the proxy');
      await btn('Run it');
      await step(4);
      await check(page);
      await opt(/^The proxy adds the real token/);
      await finish(next);
    },
    /** allowed door: run the smuggle, predict, remove the data leg, run the report, quiz */
    async ch5(next?: RegExp) {
      await btn('Run it');
      await step(2);
      await check(page);
      await opt(/^Yes: with no customer data mounted/);
      await step(3);
      await btn('Mounts: no data');
      await btn('Run it');
      await step(4);
      await btn('The report task');
      await btn('Run it');
      await step(5);
      await check(page);
      await opt(/^An attack can hide stolen data/);
      await finish(next);
    },
    /** fewer prompts: run the report (no prompt), predict, approve the crossing, refuse it, quiz */
    async ch6(next?: RegExp) {
      await btn('Run it');
      await step(2);
      await check(page);
      await opt(/^Yes: approving the crossing/);
      await step(3);
      await btn('Run it');
      await step(4);
      await btn('Person refuses');
      await btn('Run it');
      await step(5);
      await check(page);
      await opt(/^The boundary enforces the limits/);
      await finish(next);
    },
    /** red team: change a control, Show me the winning policy (one of N that work), quiz */
    async ch7(next?: RegExp) {
      await btn('Mounts: scoped');
      await step(2);
      await check(page);
      await btn('Show me');
      await step(3);
      await expect(card).toContainText(/one of \d+ that work/);
      await check(page);
      await opt(/^Only against these attacks/);
      await finish(next);
    },
    open,
  };
}
