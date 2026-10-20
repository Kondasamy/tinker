// Responsiveness (success criterion "no loading wait") and R22: once the background prefetch has finished,
// a knob change updates the answer within 200 ms, and with the network off every chunking knob still works.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { toolWalker } from './tool-calling-flow';
import { offline } from './helpers';
import { moduleOf } from '../../src/lib/modules';
import manifest from '../../public/data/index/manifest.json' with { type: 'json' };

test.use({ viewport: { width: 1440, height: 900 } });

const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const chunker = (page: Page) => page.locator('[data-block="chunker"]');
const CONFIGS = manifest.configs.length;

async function benchWithChunker(page: Page) {
  await page.goto('/rag/07-sandbox/');
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.getByTestId('announce')).toContainText('Answer:');
  await card(page).getByRole('button', { name: 'Show me' }).click();          // open the workbench
  await chunker(page).click();
  // prefetch done: every chunking config file has arrived
  await page.waitForFunction(n => performance.getEntriesByType('resource').filter(e => /\/data\/index\/(fixed|sentence)-/.test(e.name)).length >= n, CONFIGS);
  return card(page).getByRole('region', { name: 'Block settings' });
}

/** ms from setting a range input to the new outcome on screen (chunker stat and the announced answer). */
const timeChange = (slider: Locator, value: number) => slider.evaluate((el: HTMLInputElement, v) => new Promise<{ block: number; answer: number }>(res => {
  const ann = document.querySelector('[data-testid="announce"]')!, blk = document.querySelector('[data-block="chunker"]')!.getAttribute('aria-label');
  const before = ann.textContent, t0 = performance.now(), t = { block: -1, answer: -1 };
  const obs = new MutationObserver(() => {
    if (t.block < 0 && document.querySelector('[data-block="chunker"]')?.getAttribute('aria-label') !== blk) t.block = performance.now() - t0;
    if (t.answer < 0 && ann.textContent !== before) t.answer = performance.now() - t0;
    if (t.block >= 0 && t.answer >= 0) { obs.disconnect(); requestAnimationFrame(() => res(t)); }
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  setTimeout(() => { obs.disconnect(); res(t); }, 1000);   // the answer text may legitimately not change
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}), value);

test('after prefetch, a knob change updates the answer within 200 ms', async ({ page }) => {
  const settings = await benchWithChunker(page);
  const size = settings.getByRole('slider', { name: /Chunk size/ }), overlap = settings.getByRole('slider', { name: /Overlap/ });
  const times: { block: number; answer: number }[] = [];
  for (const [slider, v] of [[size, 0], [size, 3], [size, 6], [overlap, 2], [overlap, 3], [size, 1]] as const) times.push(await timeChange(slider, v));
  console.log('knob → outcome (ms):', JSON.stringify(times.map(t => ({ block: +t.block.toFixed(1), answer: +t.answer.toFixed(1) }))));
  for (const t of times) {
    expect(t.block).toBeGreaterThanOrEqual(0);
    expect(t.block).toBeLessThan(200);
    expect(t.answer).toBeLessThan(200);                     // -1 when the answer text stayed the same
  }
  expect(times.some(t => t.answer >= 0)).toBe(true);
});

test('with the network off after prefetch, every chunking knob still updates results', async ({ page }) => {
  const settings = await benchWithChunker(page);
  await offline(page);
  const status = page.locator('.canvas-status');
  const expectConfig = async (file: string) => {
    const c = manifest.configs.find(x => x.file === file)!;
    await expect(chunker(page)).toHaveAttribute('aria-label', new RegExp(`\\b${c.chunks} chunks:`));
    await expect(status).toHaveText('');                    // neither "Preparing…" nor a load error
  };
  const size = settings.getByRole('slider', { name: /Chunk size|Max words/ });
  for (let i = 0; i < 7; i++) {
    await size.fill(String(i));
    for (let j = 0; j < 4; j++) {
      await settings.getByRole('slider', { name: /Overlap/ }).fill(String(j));
      await expectConfig(`fixed-${[8, 16, 24, 32, 48, 64, 96][i]}-${[0, 10, 25, 50][j]}.bin`);
    }
  }
  await settings.getByRole('button', { name: 'Sentence' }).click();
  for (let i = 0; i < 7; i++) {
    await size.fill(String(i));
    await expectConfig(`sentence-${[8, 16, 24, 32, 48, 64, 96][i]}.bin`);
  }
});

// R27 for module 2: the recorded turns, tools and MCP servers ship in each chapter's bundle, so a chapter loaded once plays offline.
test('module 2: every chapter plays to the end with the network off after it loads', async ({ page, context }) => {
  test.setTimeout(120_000);
  const w = toolWalker(page, 'mouse');
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  for (const [i, c] of moduleOf('tool-calling').chapters.entries()) {
    await context.setOffline(false);
    await w.open(c.id);
    await page.waitForLoadState('networkidle');
    await offline(page);
    await w[`ch${i + 1}` as 'ch1']();
  }
  expect(failed).toEqual([]);
});
