// Module 17, Voice agents: the intro, every chapter played by mouse and by keyboard only with no sound ever started, its
// own progress key, the turn detector and the call timeline by keyboard, barge-in, the workbench's best line, "I'm not
// sure", the clip button (one clip at a time, offline falls back to its words), reduced motion, the recap, axe and phone
// width; the go-live checks: Module 17 kickers and share images, home's card and Continue.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { voWalker } from './voice-flow';
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('voice');
const CHS = M.chapters.map(c => c.id), [CH1, CH2, CH3, CH4, CH5, CH6, CH7] = CHS;
const at = (id: string) => new RegExp(`/voice/${id}/$`);
async function walkAll(w: ReturnType<typeof voWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7();
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
/** count every play() any audio element is asked for, from before the page's own scripts run */
const countPlays = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { __plays: number };
  w.__plays = 0;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) { w.__plays++; return play.call(this); };
});
const plays = (page: Page) => page.evaluate(() => (window as unknown as { __plays: number }).__plays);
test.setTimeout(150_000);

test('the intro shows the level, the prerequisites, the author, the chapters and the credits', async ({ page }) => {
  await page.goto('/voice/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: moduleOf('tool-calling').title, exact: true })).toHaveAttribute('href', '/tool-calling/');
  await expect(meta).toContainText(moduleOf('multimodal').title);
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('.versus .reply')).toHaveCount(2);
  await axe(page);
});

test('Module 17 on the intro and the recap', async ({ page }) => {
  await page.goto('/voice/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 17 · Voice');
  await page.goto('/voice/recap/');
  await expect(page.locator('.hero .kicker')).toHaveText('Module 17 · Recap');
});

test('go-live: own share images, home’s card, and home Continue resumes it', async ({ page }) => {
  await page.goto('/voice/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/voice\.jpg$/);
  await page.goto('/voice/recap/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/voice-recap\.jpg$/);
  const img = await page.request.get('/og/voice.jpg');
  expect(img.status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.module[data-module="voice"] h4 a')).toHaveAttribute('href', '/voice/');
  await page.evaluate(() => { localStorage.setItem('voice-progress-v1', JSON.stringify({ done: [], saved: {} })); localStorage.setItem('tinker-last-module', 'voice'); });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/voice\//);
});

test('every chapter plays by mouse, in order through the Next links, axe clean, and no sound ever starts', async ({ page }) => {
  await countPlays(page);
  await walkAll(voWalker(page, 'mouse', axe));
  expect(await plays(page)).toBe(0);
});

test('every chapter plays by keyboard only; progress lands in voice-progress-v1 and no other module’s key', async ({ page }) => {
  await countPlays(page);
  await page.goto('/');
  const OTHERS = { 'tool-calling-progress-v1': JSON.stringify({ done: ['01-the-model-cant-act'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAll(voWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['voice-progress-v1']).done).toEqual(CHS);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('voice');
  expect(await plays(page)).toBe(0);
});

test('a clip plays only when pressed, one at a time, and stops when the step changes', async ({ page }) => {
  const w = voWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Answer Dana’s call' }).click();
  const clip = c.locator('.clip[data-clip="status-caller"]');
  await expect(clip).toContainText('Dana:');
  const play = clip.getByRole('button');
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await play.click();
  // it loads, then plays (or, with no audio output, settles on its words): never silently stuck
  await expect(clip).toHaveAttribute('data-state', /^(loading|playing|error)$/);
  if (await clip.getAttribute('data-state') !== 'error') await expect(play).toHaveAttribute('aria-pressed', 'true');
  await c.getByRole('radio', { name: /^Her words, written down/ }).click();
  await expect(c).toContainText('Step 3 of');
  await expect(page.locator('.clip[data-state="playing"], .clip[data-state="loading"]')).toHaveCount(0);
});

test('offline after load, a clip falls back to its words and the step still advances', async ({ page, context }) => {
  const w = voWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Answer Dana’s call' }).click();
  await context.setOffline(true);
  await context.route('**/data/voice/*.mp3', r => r.abort());
  const clip = c.locator('.clip[data-clip="status-caller"]');
  await clip.getByRole('button').click();
  await expect(clip).toHaveAttribute('data-state', 'error');
  await expect(clip).toContainText('Sound unavailable');
  await expect(clip.locator('.clip-caption')).toContainText('order ten forty-three');
  await c.getByRole('radio', { name: /^Her words, written down/ }).click();
  await expect(c).toContainText('Step 3 of');
});

test('chapter 3: the call timeline reads each turn by arrow key, the read-out naming the gap', async ({ page }) => {
  const w = voWalker(page, 'keyboard');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('radio', { name: /^His first pause/ }).press('Enter');
  await c.getByRole('slider', { name: 'Silence setting' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Timeline' }).click();
  const segs = page.locator('.vo-seg');
  await expect(segs).toHaveCount(2);
  await segs.first().focus();
  await page.keyboard.press('End');
  await expect(page.locator('.vo-readout')).toHaveText(/a gap of \d\.\d\d s after the caller’s last word/);
  await expect(c.locator('tr[data-silence="800"] td')).toHaveText('heard whole');
  await axe(page);
});

test('chapter 4: without barge-in Dana is talked over; with it the history keeps only what was said', async ({ page }) => {
  const w = voWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('button', { name: 'Dana asks for a slot' }).click();
  await c.getByRole('button', { name: /^During “Wednesday afternoon”/ }).click();
  await expect(c.locator('.vo-call').first()).toHaveAttribute('data-verdict', 'talked-over');
  await c.getByRole('radio', { name: /^Only the part spoken/ }).click();
  await expect(c.getByRole('radio', { name: /^The whole reply/ })).toBeDisabled();
  await c.getByRole('button', { name: 'Barge-in: off' }).click();
  await expect(c).toContainText('AS YOU PREDICTED');
  await expect(c.locator('.vo-call[data-key="slots|1|stop-2"]').first()).toContainText('Stopped after');
  await expect(c.locator('.tc-fact')).toContainText('Gemini');
});

test('chapter 7: the starting line is not accepted; Show me applies one of the best lines', async ({ page }) => {
  const w = voWalker(page, 'mouse');
  await w.open(CH7);
  const c = card(page), score = c.locator('[data-best]');
  await expect(score).toHaveAttribute('data-best', '0');
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 2 of');
  await expect(score).toHaveAttribute('data-best', '1');
  await expect(c).toContainText(/One of \d+ that work/);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = voWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  await expect(card(page)).toContainText('Chapter complete');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every chapter plays through', async ({ page }) => {
    await walkAll(voWalker(page, 'mouse'));
  });
});

test('the recap asks from finished chapters', async ({ page }) => {
  await walkAll(voWalker(page, 'mouse'));
  await page.goto('/voice/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/voice/', ...CHS.map(id => `/voice/${id}/`), '/voice/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(voWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); }));
  });
});
