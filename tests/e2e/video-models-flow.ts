// Video and world models, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import pinned from '../../data/video-models/pinned.json' with { type: 'json' };
import { WINNERS } from '../../src/lib/video-models/workbench';

export type Mode = 'mouse' | 'keyboard';
const MODEL = { timeout: 30_000 }; // the weights load before the drive and the live guesses

export function vmWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }).first()); // a quiz or prediction option
  const step = (n: number, o = {}) => expect(card).toContainText(`Step ${n} of`, o);
  /** set a range to `to` (its index is to - first): arrow keys by keyboard, a direct set by mouse */
  async function range(r: Locator, to: number, first = 0) {
    if (!kb) return r.fill(String(to - first));
    await r.focus();
    const now = Number(await r.inputValue());
    for (let i = now; i !== to - first; i += Math.sign(to - first - now))
      await r.press(to - first > now ? 'ArrowRight' : 'ArrowLeft');
  }
  /** drive: arrow keys on the pad by keyboard, its buttons by mouse */
  async function drive(keys: ('Up' | 'Down' | 'Left' | 'Right')[]) {
    const pad = page.locator('.vm-pad');
    await expect(pad).toBeVisible(MODEL);
    if (kb) await pad.focus();
    for (const k of keys)
      await (kb ? page.keyboard.press(`Arrow${k}`) : pad.getByRole('button', { name: k, exact: true }).click());
  }

  async function open(id: string) {
    await page.goto(`/video-models/${id}/`);
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
    /** scrub to frame 8, predict, pack */
    async ch1(next?: RegExp, quiz: string | RegExp = /^Each frame repeats/) {
      await range(card.getByRole('slider', { name: 'Frame' }), 8);
      await step(2);
      await opt(/MB$/);
      await btn('Pack the frames');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, three frames on, open the Frames tab */
    async ch2(next?: RegExp, quiz: string | RegExp = /^Copying the last frame/) {
      await opt(/or fewer$/);
      for (let i = 0; i < 3; i++) await btn(/^Next frame/);
      await step(3);
      await press(page.getByRole('button', { name: 'Frames', exact: true }));
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, one frame, two frames */
    async ch3(next?: RegExp, quiz: string | RegExp = /^Which way the ball/) {
      await opt(/^Back toward/);
      await btn('One frame of context');
      await btn('Two frames of context');
      await step(4);
      await expect(page.locator('[data-part="dream"]').first()).toBeVisible(MODEL);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, drive four moves, re-sync */
    async ch4(next?: RegExp, quiz: string | RegExp = /^A road that goes/) {
      await opt(/^The key, fed in/);
      await drive(['Right', 'Down', 'Left', 'Up']);
      await step(3);
      await (kb
        ? page.getByRole('button', { name: 'Re-sync' }).press('Enter')
        : page.getByRole('button', { name: 'Re-sync' }).click());
      await step(4);
      await expect(page.locator('.vm-said')).toContainText('Re-synced');
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, scrub to the lost robot and the gone crate, re-sync every 4 */
    async ch5(next?: RegExp, quiz: string | RegExp = /^Each day’s small errors/) {
      await opt(/^Within/);
      const r = card.getByRole('slider', { name: 'Step' });
      await range(r, pinned.kept + 2, 2);
      await step(3);
      await range(card.getByRole('slider', { name: 'Step' }), pinned.crateGone, 2);
      await step(4);
      const box = card.getByRole('checkbox', { name: /^Re-sync every/ });
      await (kb ? box.press('Space') : box.click());
      await step(5);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** predict, read, sizes */
    async ch6(next?: RegExp, quiz: string | RegExp = /^Every frame can agree/) {
      await opt(/a little over 3 seconds$/);
      await btn('How each frame is drawn');
      await btn('Show the sizes');
      await step(4);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    /** set the best plan */
    async ch7(next?: RegExp, quiz: string | RegExp = /^It needs twice/) {
      const w = WINNERS[0];
      const radio = (name: string | RegExp) => card.getByRole('radio', { name, exact: true });
      for (const r of [radio(w.model === 'k1' ? '1 frame' : '2 frames'), radio(`every ${w.every} steps`)])
        await (kb ? r.press('Space') : r.check());
      await step(2);
      await check(page);
      await opt(quiz);
      await finish(next);
    },
    open,
    drive,
  };
}
