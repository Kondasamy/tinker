// Load balancing, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { HEDGES, MISSES, SERVERS } from '../../src/lib/load-balancing/sim';
import { RULE_NAME } from '../../src/lib/load-balancing/rules';
import { WINNERS } from '../../src/lib/load-balancing/workbench';

export type Mode = 'mouse' | 'keyboard';
const [, , CEDAR, DOG] = SERVERS.map(s => s.name);
// chapter 6's hedges, as the chapter reads them: the too-early one and the one it teaches
const [, EARLY, HEDGE] = HEDGES;
const exact = (s: string) => new RegExp(`^${s}$`);

export function loadBalancingWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  /** a radio: Space selects it from the keyboard */
  const opt = (name: string | RegExp) => {
    const l = card.getByRole('radio', { name });
    return kb ? l.press('Space') : l.click();
  };
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a range input: arrow keys from where it is, or set straight to the value by mouse */
  const slide = async (name: RegExp, to: number) => {
    const l = card.getByRole('slider', { name });
    if (!kb) return l.fill(String(to));
    const at = Number(await l.inputValue());
    for (let i = at; i !== to; i += to > at ? 1 : -1) await l.press(to > at ? 'ArrowRight' : 'ArrowLeft');
  };

  async function open(id: string) {
    await page.goto(`/load-balancing/${id}/`);
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
  const win = WINNERS[0];

  return {
    open,
    /** the morning, predict, the sale, four servers */
    async ch1(next?: RegExp) {
      await btn('Run the morning');
      await step(2);
      await opt(/^Far more than double/);
      await btn('Run the sale');
      await step(4);
      await check(page);
      await btn('Run the sale on four');
      await step(5);
      await opt(/^The wait keeps growing/);
      await finish(next);
    },
    /** predict, round robin, weighted */
    async ch2(next?: RegExp) {
      await opt(/^About a quarter/);
      await btn('Run the sale');
      await step(3);
      await opt(exact(RULE_NAME.weighted));
      await step(4);
      await check(page);
      await opt(/^Give the bigger server weight 2/);
      await finish(next);
    },
    /** round robin, predict, least outstanding, two choices */
    async ch3(next?: RegExp) {
      await btn('Run the sale');
      await step(2);
      await opt(/^Well under a quarter/);
      await opt(exact(RULE_NAME.least));
      await step(4);
      await opt(exact(RULE_NAME.two));
      await step(5);
      await check(page);
      await opt(/^Look at two tills/);
      await finish(next);
    },
    /** dead without checks, 3 misses, 1 miss, predict, the gray server */
    async ch4(next?: RegExp) {
      await btn('Run the sale');
      await step(2);
      await slide(/^Health checks/, MISSES.indexOf(3));
      await step(3);
      await slide(/^Health checks/, MISSES.indexOf(1));
      await step(4);
      await opt(new RegExp(`^Leave ${DOG} in`));
      await btn(`Make ${DOG} slow but answering`);
      await step(6);
      await check(page);
      await opt(/^Watching how long real payments/);
      await finish(next);
    },
    /** carts without stickiness, predict, sticky, a server dies */
    async ch5(next?: RegExp) {
      await btn('Run the sale');
      await step(2);
      await opt(/^None, while every server/);
      await btn('Sticky sessions');
      await step(4);
      await btn(`Let ${CEDAR} die`);
      await step(5);
      await check(page);
      await opt(/^Those players lose/);
      await finish(next);
    },
    /** the tail, predict, hedge, hedge sooner */
    async ch6(next?: RegExp) {
      await btn('Run the sale');
      await step(2);
      await opt(/^Much lower/);
      await slide(/^Hedge/, HEDGES.indexOf(HEDGE));
      await step(4);
      await slide(/^Hedge/, HEDGES.indexOf(EARLY));
      await step(5);
      await check(page);
      await opt(/^Once a query has waited/);
      await finish(next);
    },
    /** set one winning setup by hand, then the quiz */
    async ch7(next?: RegExp) {
      await opt(exact(RULE_NAME[win.rule]));
      await slide(/^Health checks/, MISSES.indexOf(win.checks));
      await slide(/^Hedge/, HEDGES.indexOf(win.hedgeMs));
      await step(2);
      await check(page);
      await opt(/^Least outstanding, health checks/);
      await finish(next);
    },
  };
}
