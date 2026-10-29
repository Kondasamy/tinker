// Dependencies, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link. The pull bar
// (crate buttons, a version drop-down, Pull) and the day slider sit under the picture; everything else is in the card.
import { expect, type Locator, type Page } from '@playwright/test';

import { APP, versionsOf } from '../../src/lib/dependencies/resolve';
import { BAD, BAD_DAY, HIJACK_DAY, LOGGER, MIRA_DAY, PRICE, SERVER_DAY } from '../../src/lib/dependencies/story';
import { maxSatisfying, parse } from '../../src/lib/dependencies/semver';
import { WINNERS } from '../../src/lib/dependencies/workbench';
import { choose, chooseByKeys } from './helpers';

// the chapters' moments, read off the engine as the chapters read them (chapter files import CSS, so not here)
const RANGE = APP.deps[PRICE];
const ALL = versionsOf(PRICE);
export const MAJOR = ALL.find(v => parse(v).major > parse(RANGE.slice(1)).major)!;
export const MINOR = maxSatisfying(
  ALL.filter(v => parse(v).minor > parse(RANGE.slice(1)).minor),
  RANGE,
)!;
const CADENCE = { never: 'Never', monthly: 'Monthly', weekly: 'Weekly', daily: 'Daily' } as const;
const RANGE_NAME = { caret: 'Caret ^', tilde: 'Tilde ~', exact: 'Exact pins' } as const;

export type Mode = 'mouse' | 'keyboard';

export function dependenciesWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const tick = (l: Locator) => (kb ? l.press('Space') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const box = (name: string | RegExp) => tick(card.getByRole('checkbox', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** the pull bar's version drop-down: by keyboard, open it and arrow to the version; by mouse, click it and the version */
  const version = async (v: string) => {
    const sel = stage.getByRole('combobox');
    await (kb ? chooseByKeys : choose)(sel, v);
    await expect(sel).toHaveAttribute('data-value', v);
  };
  const crate = (name: string) => press(stage.getByRole('toolbar', { name: 'Crates' }).getByRole('button', { name }));
  const pull = () => press(stage.getByRole('button', { name: /^Pull / }));

  async function open(id: string) {
    await page.goto(`/dependencies/${id}/`);
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
  const win = WINNERS[0];

  return {
    open,
    version,
    crate,
    pull,
    /** predict, install, pull a crate, quiz */
    async ch1(next?: RegExp) {
      await opt(/what they need$/);
      await step(2);
      await btn('Install');
      await step(3);
      await check(page);
      await pull();
      await step(4);
      await expect(page.locator('[data-broken="1"]').first()).toBeVisible();
      await opt(/^What needs that package/);
      await finish(next);
    },
    /** predict the caret, force the next major, then a new minor, quiz */
    async ch2(next?: RegExp) {
      await opt(/and any newer/);
      await step(2);
      await version(MAJOR);
      await step(3);
      await check(page);
      await version(MINOR);
      await step(4);
      await opt(/^No: below 1\.0\.0/);
      await finish(next);
    },
    /** predict the copies, open the tree, pull the nested copy, quiz */
    async ch3(next?: RegExp) {
      await opt(/^Two:/);
      await step(2);
      await btn('Open the Tree tab');
      await step(3);
      await check(page);
      await crate('tidystr (nested)');
      await pull();
      await step(4);
      await opt(/^Installs both/);
      await finish(next);
    },
    /** predict the drift, install a week later, the lockfile, quiz */
    async ch4(next?: RegExp) {
      await opt(/^No: newer/);
      await step(2);
      await btn(`Install on day ${SERVER_DAY}`);
      await step(3);
      await check(page);
      await expect(stage.locator('[role="status"]')).toContainText(`differ from day ${MIRA_DAY}`);
      await box('Lockfile');
      await step(4);
      await opt(/^Whether both/);
      await finish(next);
    },
    /** the build breaks, predict, the lockfile, a tested update, quiz */
    async ch5(next?: RegExp) {
      await btn(`Run day ${BAD_DAY}’s build`);
      await step(2);
      await opt(new RegExp(`^A new ${BAD.name} patch`));
      await step(3);
      await check(page);
      await box('Lockfile');
      await step(4);
      await btn('Run a tested update');
      await step(5);
      await expect(card.locator('[data-update="rejected"]')).toBeVisible();
      await opt(/^It passes/);
      await finish(next);
    },
    /** pin, predict, install, scripts off, the lockfile, quiz */
    async ch6(next?: RegExp) {
      await box(`Pin ${LOGGER} exactly`);
      await step(2);
      await opt(/the hijacked one$/);
      await step(3);
      await btn(`Install on day ${HIJACK_DAY}`);
      await step(4);
      await check(page);
      await expect(page.locator('[data-hijacked="1"]')).toHaveCount(1);
      await box('Install scripts on');
      await step(5);
      await box('Lockfile');
      await step(6);
      await expect(page.locator('[data-hijacked="1"]')).toHaveCount(0);
      await opt(/^Installing from a lockfile/);
      await finish(next);
    },
    /** set one winning policy by hand, then the quiz */
    async ch7(next?: RegExp) {
      await tick(card.getByRole('radio', { name: RANGE_NAME[win.range] }));
      if (win.lock) await box('Lockfile');
      await tick(card.getByRole('radio', { name: CADENCE[win.cadence] }));
      if (!win.scripts) await box('Install scripts on');
      await step(2);
      await check(page);
      await opt(/^A hijacked release that passes/);
      await finish(next);
    },
  };
}
