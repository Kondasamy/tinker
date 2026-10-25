// Compression, chapter by chapter, by mouse or keyboard only, following each chapter's "Next" link.
import { expect, type Locator, type Page } from '@playwright/test';
import { CODERS, type CoderId } from '../../src/lib/compression/coders';
import { PUZZLE, fileOf } from '../../src/lib/compression/files';
import { WINNERS, LOSSLESS } from '../../src/lib/compression/workbench';
import { countOf, join, leavesOf, type Node } from '../../src/lib/compression/huffman';

export type Mode = 'mouse' | 'keyboard';

// the bench's list order, as the kit keeps it (the kit imports CSS, so it stays out of Node): the two picked leave,
// their merged pile joins at the end
const merged = (f: Node[], i: number, j: number) => [...f.filter((_, k) => k !== i && k !== j), join(f[i], f[j])];

/** The merges Show me would make, as the pairs of list positions to pick at each turn. */
export function mergePlan(): [number, number][] {
  let f: Node[] = leavesOf(countOf(new TextEncoder().encode(PUZZLE)));
  const out: [number, number][] = [];
  while (f.length > 1) {
    const o = f.map((n, k) => [n, k] as const).sort((x, y) => x[0].w - y[0].w || x[0].min - y[0].min);
    out.push([o[0][1], o[1][1]]);
    f = merged(f, o[0][1], o[1][1]);
  }
  return out;
}

export function compressionWalker(page: Page, mode: Mode, check: (page: Page) => Promise<void> = async () => {}) {
  const kb = mode === 'keyboard';
  const press = (l: Locator) => (kb ? l.press('Enter') : l.click());
  const card = page.getByRole('region', { name: 'Next step' });
  const btn = (name: string | RegExp) => press(card.getByRole('button', { name }));
  const opt = (name: string | RegExp) => press(card.getByRole('radio', { name }));
  const step = (n: number) => expect(card).toContainText(`Step ${n} of`);
  /** a native radio: by keyboard, focus it and press Space */
  const tick = async (l: Locator) => {
    if (!kb) return l.check();
    await l.focus();
    await page.keyboard.press('Space');
  };
  const choose = (label: string, value: string) => card.getByRole('combobox', { name: label }).selectOption(value);

  /** pick two piles in the listbox and merge them */
  const mergePair = async (i: number, j: number) => {
    const list = card.getByRole('listbox', { name: 'Piles: pick two' });
    for (const k of [i, j]) {
      if (!kb) await list.locator(`#cz-piles-${k}`).click();
      else {
        await list.focus();
        await page.keyboard.press('Home');
        for (let n = 0; n < k; n++) await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
      }
    }
    await btn('Merge');
  };

  async function open(id: string) {
    await page.goto(`/compression/${id}/`);
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

  return {
    open,
    mergePair,
    /** predict, sort, the picture, quiz */
    async ch1(next?: RegExp) {
      await opt(/^Many times/);
      await step(2);
      await btn('Sort into piles');
      await step(3);
      await check(page);
      await tick(card.getByRole('radio', { name: fileOf('picture').title }));
      await step(4);
      await opt(/^The space/);
      await finish(next);
    },
    /** predict, point, pack, quiz */
    async ch2(next?: RegExp) {
      await opt(/^Two/);
      await step(2);
      await btn('Replace the repeats');
      await step(3);
      await check(page);
      await btn('Pack the price list');
      await step(4);
      await opt(/^A log/);
      await finish(next);
    },
    /** predict, the merge puzzle, the tree, quiz */
    async ch3(next?: RegExp) {
      await opt(/the most common$/);
      await step(2);
      for (const [i, j] of mergePlan()) await mergePair(i, j);
      await step(3);
      await check(page);
      await btn('Open the Code tree tab');
      await step(4);
      await opt(/^A1/);
      await finish(next);
    },
    /** predict, try each way, real gzip, quiz */
    async ch4(next?: RegExp) {
      await opt(CODERS.pair.name);
      await step(2);
      const ways = card.getByRole('group', { name: 'Way to pack' });
      for (const c of ['lz77', 'huffman', 'pair'] as CoderId[])
        await tick(ways.getByRole('radio', { name: new RegExp(`^${CODERS[c].name} ·`) }));
      await step(3);
      await btn('Measure real gzip');
      await step(4);
      await check(page);
      await opt(/^It searches harder/);
      await finish(next);
    },
    /** predict, pack the random file, pack the packed file, quiz */
    async ch5(next?: RegExp) {
      await opt(/^It stays the same/);
      await step(2);
      await btn('Pack the random file');
      await step(3);
      await check(page);
      await btn('Pack the packed price list');
      await step(4);
      await opt(/^Impossible/);
      await finish(next);
    },
    /** predict, fewer shades, the pixels, fit the budget, quiz */
    async ch6(next?: RegExp) {
      await opt('Much smaller');
      await step(2);
      await choose('Shades per colour', '32');
      await step(3);
      await btn('Open the Pixels tab');
      await step(4);
      await check(page);
      await choose('Shades per colour', '16');
      await step(5);
      await opt(/^The price list/);
      await finish(next);
    },
    /** set one winning plan by hand, then the quiz */
    async ch7(next?: RegExp) {
      const win = WINNERS[0];
      for (const id of LOSSLESS) {
        const c = win.coders[id] ?? 'store';
        if (c !== 'store') await choose(fileOf(id).title, c);
      }
      if (win.block !== 1) await choose(`${fileOf('picture').title}: block size`, String(win.block));
      await choose(`${fileOf('picture').title}: shades per colour`, String(win.levels));
      await step(2);
      await check(page);
      await opt(/^Pack the spreadsheet/);
      await finish(next);
    },
  };
}
