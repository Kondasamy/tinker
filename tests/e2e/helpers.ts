// Checks the specs share: axe's serious and critical findings, the phone set-up and its layout check, and going offline.
import { expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** axe's serious and critical violations on the page as it is now (or only inside `include`), one line each ([] when clean). */
export async function serious(page: Page, include?: string) {
  const axe = new AxeBuilder({ page });
  const { violations } = await (include ? axe.include(include) : axe).analyze();
  return violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(
      v =>
        `${v.id}: ${v.help} → ${v.nodes
          .map(n => n.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`,
    );
}

/** A phone: 390 × 844, touch. Use with test.use(PHONE). */
export const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

const overlaps = (a: DOMRect | null, b: DOMRect | null) =>
  !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** No sideways page scroll, and the drawer never covers the step card. */
export async function layoutHolds(page: Page) {
  const r = await page.evaluate(() => {
    const box = (s: string) => document.querySelector(s)?.getBoundingClientRect().toJSON() ?? null;
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('main *')]
      .filter(e => e.getBoundingClientRect().right > w + 1)
      .slice(0, 3)
      .map(e => e.outerHTML.slice(0, 80));
    return { scrollW: document.documentElement.scrollWidth, w, wide, card: box('.card'), drawer: box('.drawer') };
  });
  expect(r.scrollW, `no horizontal page scroll; too wide: ${r.wide.join(' | ')}`).toBeLessThanOrEqual(r.w);
  expect(overlaps(r.card, r.drawer), 'drawer covers the step card').toBe(false);
}

/** Cut the network: from here on every request fails, so only what the page already loaded can work. */
export const offline = (page: Page) => page.context().setOffline(true);

/** pick from the site's drop-down (`Select`, never a native select): open it, then click the option by its value, or
 * by its visible name with `{ label }` */
export async function choose(box: Locator, pick: string | { label: string }) {
  await box.click();
  const list = box.page().locator(`[id="${await box.getAttribute('aria-controls')}"]`);
  await (typeof pick === 'string'
    ? list.locator(`[role="option"][data-value="${pick}"]`)
    : list.getByRole('option', { name: pick.label, exact: true })
  ).click();
}

/** the same pick by keyboard alone: focus the drop-down, open it with Enter, Home, arrow down to the option (by value,
 * or by visible name with `{ label }`), Enter */
export async function chooseByKeys(box: Locator, pick: string | { label: string }) {
  await box.focus();
  await box.press('Enter');
  const options = box.page().locator(`[id="${await box.getAttribute('aria-controls')}"] [role="option"]`);
  const i =
    typeof pick === 'string'
      ? (await options.evaluateAll(os => os.map(o => o.getAttribute('data-value')))).indexOf(pick)
      : (await options.allTextContents()).indexOf(pick.label);
  expect(i, `no option ${JSON.stringify(pick)}`).toBeGreaterThanOrEqual(0);
  await box.press('Home');
  for (let n = 0; n < i; n++) await box.press('ArrowDown');
  await box.press('Enter');
}

export type Mode = 'mouse' | 'keyboard';

/** Playing a chapter through StepRunner by its twin controls (living scenes: the controls beside the picture and in
 * the step card, never the SVG), by mouse or by keyboard alone. `check` runs on each chapter's first and last screen. */
export function chapterPlayer(page: Page, mode: Mode = 'mouse', check: (page: Page) => Promise<void> = async () => {}) {
  const press = (l: Locator) => (mode === 'keyboard' ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const stage = page.getByRole('region', { name: 'Scene' });
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  async function open(path: string) {
    await page.goto(path);
    await page.locator('astro-island:not([ssr])').waitFor();
    await step(1);
    await check(page);
  }
  /** chapter complete; then follow its Next (or Recap) link when `next` is given */
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
    card,
    stage,
    press,
    step,
    open,
    finish,
    /** a button in the step card, or (with `inStage`) beside the picture */
    btn: (name: string | RegExp, inStage = false) => press((inStage ? stage : card).getByRole('button', { name })),
    /** a quiz or prediction option */
    opt: (name: string | RegExp) => press(card.getByRole('radio', { name })),
    /** open `path`, run each move (one per step, in order), finish */
    async play(path: string, moves: (() => Promise<unknown>)[], next?: RegExp) {
      await open(path);
      for (const m of moves) await m();
      await finish(next);
    },
  };
}

/** axe's serious and critical findings on the stage before and after a close-up (`zoomIn` gets it there), and the
 * picture's size unchanged by the zoom (R11: no resize, no reflow). */
export async function axeAcrossZoom(page: Page, zoomIn: () => Promise<void>, include = '.stage') {
  const svg = page.locator(`${include} svg`).first();
  const before = await svg.boundingBox();
  const unzoomed = await serious(page, include);
  await zoomIn();
  const zoomed = await serious(page, include);
  const after = await svg.boundingBox();
  expect({ unzoomed, zoomed }).toEqual({ unzoomed: [], zoomed: [] });
  expect(after?.width).toBeCloseTo(before?.width ?? 0, 0);
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 0);
}

/** No sideways page scroll (use at 390 px: test.use(PHONE)). */
export async function noSideScroll(page: Page) {
  const r = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    w: document.documentElement.clientWidth,
  }));
  expect(r.scrollW, 'no horizontal page scroll').toBeLessThanOrEqual(r.w);
}
