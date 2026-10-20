// Checks the specs share: axe's serious and critical findings, the phone set-up and its layout check, and going offline.
import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** axe's serious and critical violations on the page as it is now, one line each ([] when clean). */
export async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${v.id}: ${v.help} → ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
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
    const wide = [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > w + 1).slice(0, 3).map(e => e.outerHTML.slice(0, 80));
    return { scrollW: document.documentElement.scrollWidth, w, wide, card: box('.card'), drawer: box('.drawer') };
  });
  expect(r.scrollW, `no horizontal page scroll; too wide: ${r.wide.join(' | ')}`).toBeLessThanOrEqual(r.w);
  expect(overlaps(r.card, r.drawer), 'drawer covers the step card').toBe(false);
}

/** Cut the network: from here on every request fails, so only what the page already loaded can work. */
export const offline = (page: Page) => page.context().setOffline(true);
