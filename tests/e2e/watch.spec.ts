// U3: Watch mode on RAG chapter 3. The chapter plays itself (narration clips stubbed to end at once, or held until the
// test ends them), waits for the reader's pick, pauses only on the reader's own input, and asks once whether it helped.
import { test, expect, type Page } from '@playwright/test';
import { chapterHref, moduleOf } from '../../src/lib/modules';
import { PHONE, layoutHolds, serious } from './helpers';

const CH3 = '/rag/03-what-is-rag/';
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const strip = (page: Page) => page.locator('.watch');
const status = (page: Page) => page.getByTestId('watch-status');
const watchBtn = (page: Page) => page.getByRole('button', { name: 'Watch', exact: true });
const pauseBtn = (page: Page) => strip(page).getByRole('button', { name: 'Pause' });

// Clips end 30 ms after play, or, with window.__clipMs = null, only when the test calls window.__endClip(). Every
// status change is logged, so a test can say Watch never handed over.
async function stubAudio(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __clipMs: number | null;
      __clips: string[];
      __endClip?: () => void;
      __said: string[];
    };
    w.__clipMs = 30;
    w.__clips = [];
    w.__said = [];
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/data/watch/rag/')) {
        w.__clips.push(new URL(this.src).pathname);
        const end = () => this.dispatchEvent(new Event('ended'));
        if (w.__clipMs === null) w.__endClip = end;
        else setTimeout(end, w.__clipMs);
      }
      return Promise.resolve();
    };
    new MutationObserver(() => {
      const t = document.querySelector('[data-testid="watch-status"]')?.textContent;
      if (t && t !== w.__said.at(-1)) w.__said.push(t);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
}

async function open(page: Page, path = CH3) {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').waitFor(); // hydrated
  await expect(card(page)).toContainText('Step 1 of');
}

const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: string[] }).__said);

/** Watch chapter 3 from step 1 to the end: the reader only picks at the predict and the quiz. */
async function watchChapter3(page: Page) {
  await watchBtn(page).click();
  await expect(pauseBtn(page)).toBeVisible();
  await expect(card(page)).toContainText('Step 3 of 7');
  await expect(status(page)).toHaveText('Your pick');
  await card(page)
    .getByRole('radio', { name: /cites the policy/ })
    .click();
  await expect(strip(page).getByRole('button', { name: 'Continue' })).toBeVisible();
  await strip(page).getByRole('button', { name: 'Continue' }).click();
  // the retriever's verdict arrives later, through the stage: Watch waits for it rather than handing over
  await expect(card(page)).toContainText('Step 7 of 7', { timeout: 15_000 });
  await expect(status(page)).toHaveText('Your pick');
  await card(page)
    .getByRole('radio', { name: /few passages that match/ })
    .click();
  await expect(card(page)).toContainText('Chapter complete');
  // the reveal holds for its dwell, then Watch ends on its own
  await expect(strip(page)).toHaveCount(0, { timeout: 10_000 });
  expect(await said(page)).not.toContain('Your turn');
}

test.beforeEach(async ({ page }) => stubAudio(page));

test('chapter 3 plays itself, waits for each pick, and ends with the next chapter to watch', async ({ page }) => {
  await open(page);
  await watchChapter3(page);
  await expect(card(page).getByRole('link', { name: /Next:/ })).toHaveAttribute('href', '/rag/04-layers/');
  await expect(card(page).getByRole('link', { name: 'Watch next chapter' })).toHaveAttribute(
    'href',
    '/rag/04-layers/?watch',
  );
  const clips = await page.evaluate(() => (window as unknown as { __clips: string[] }).__clips);
  expect(clips).toContain('/data/watch/rag/03-what-is-rag/retriever.mp3');

  // Watch next chapter opens chapter 4 already watching, and drops the query so a reload doesn't restart it
  await card(page).getByRole('link', { name: 'Watch next chapter' }).click();
  await expect(page).toHaveURL('/rag/04-layers/');
  await expect(pauseBtn(page)).toBeVisible();
});

test('a control pressed mid-watch pauses, and the chapter carries on by hand', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __clipMs: null }).__clipMs = null;
  });
  await watchBtn(page).click();
  await expect(status(page)).toHaveText('Watching');
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(status(page)).toHaveText('Your turn');
  await expect(strip(page).getByRole('button', { name: 'Watch', exact: true })).toBeVisible();
  await expect(card(page)).toContainText('Step 2 of 7');
  await card(page).getByRole('button', { name: 'Add the Docs' }).click();
  await expect(card(page)).toContainText('Step 3 of 7');
  await expect(status(page)).toHaveText('Your turn');
});

test('orbiting and zooming the picture mid-watch never pauses', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __clipMs: null }).__clipMs = null;
  });
  await watchBtn(page).click();
  await expect(status(page)).toHaveText('Watching');
  const view = page.getByRole('group', { name: 'View' });
  await view.getByRole('button', { name: 'Zoom in' }).click();
  await view.getByRole('button', { name: 'Turn left' }).click();
  const box = (await page.locator('.stage svg').first().boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.locator('.stage svg').first().hover();
  await expect(status(page)).toHaveText('Watching');
  await expect(pauseBtn(page)).toBeVisible();
  // the clip ends: Watch plays on
  await page.evaluate(() => (window as unknown as { __endClip: () => void }).__endClip());
  await expect(card(page)).toContainText('Step 2 of 7');
  expect(await said(page)).not.toContain('Your turn');
});

test('keyboard only: Watch and Pause keep focus across steps, state changes are announced, axe is clean', async ({
  page,
}) => {
  await open(page);
  await watchBtn(page).focus();
  await page.keyboard.press('Enter');
  await expect(pauseBtn(page)).toBeFocused();
  // a waiting step hands focus to its control
  await expect(status(page)).toHaveText('Your pick');
  await expect(card(page).getByRole('radio').first()).toBeFocused();
  expect(await serious(page)).toEqual([]);
  // the narration region stays quiet while watching: the voice and the caption carry it
  await expect(card(page).locator('[aria-live="off"]')).toHaveCount(1);
  await card(page)
    .getByRole('radio', { name: /cites the policy/ })
    .press('Enter');
  await expect(strip(page).getByRole('button', { name: 'Continue' })).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __clipMs: null }).__clipMs = null; // hold the next step's clip, so Space lands on Pause
  });
  await strip(page).getByRole('button', { name: 'Continue' }).press('Enter');
  await expect(pauseBtn(page)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(status(page)).toHaveText('Your turn');
  await expect(card(page).locator('[aria-live="polite"]').first()).toBeAttached();
  expect(await serious(page)).toEqual([]);
  expect(await said(page)).toEqual(expect.arrayContaining(['Watching', 'Your pick', 'Your turn']));
});

test('reduced motion: Watch still plays to the end', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await watchChapter3(page);
});

test('feedback after a watched chapter: one click sends only module, chapter and answer, once', async ({ page }) => {
  const sent: unknown[] = [];
  await page.route('https://formsubmit.co/**', route => {
    sent.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' });
  });
  await open(page);
  await watchChapter3(page);
  const ask = card(page).getByRole('group', { name: 'Was Watch better?' });
  await ask.getByRole('button', { name: 'Yes' }).click();
  await expect(ask).toContainText('Thanks');
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toEqual({ module: 'rag', chapter: '03-what-is-rag', answer: 'yes' });

  // watched again (the chapter is finished, so Watch ends at once): the question never comes back
  await page.goto(`${CH3}?watch`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(card(page).getByRole('link', { name: 'Watch next chapter' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Was Watch better?' })).toHaveCount(0);
  expect(sent).toHaveLength(1);
});

test('a failed feedback send is silent and the next link still works', async ({ page }) => {
  await page.route('https://formsubmit.co/**', route => route.abort());
  await open(page);
  await watchChapter3(page);
  await card(page).getByRole('button', { name: 'No' }).click();
  await expect(card(page)).toContainText('Thanks');
  await card(page).getByRole('link', { name: /Next:/ }).click();
  await expect(page).toHaveURL('/rag/04-layers/');
});

test('a chapter played by hand never asks about Watch', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', r => r.url().includes('formsubmit') && sent.push(r.url()));
  await open(page);
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await card(page).getByRole('button', { name: 'Add the Docs' }).click();
  await card(page)
    .getByRole('radio', { name: /cites the policy/ })
    .click();
  await card(page).getByRole('button', { name: 'Add the Retriever' }).click();
  await card(page).getByRole('button', { name: 'See what the retriever found' }).click();
  await page.getByRole('complementary').getByLabel('Show the math').check();
  await card(page)
    .getByRole('radio', { name: /few passages that match/ })
    .click();
  await expect(card(page)).toContainText('Chapter complete');
  await expect(page.getByRole('group', { name: 'Was Watch better?' })).toHaveCount(0);
  await expect(card(page).getByRole('link', { name: 'Watch next chapter' })).toHaveCount(0);
  expect(sent).toEqual([]);
});

test('a module without narration offers no Watch', async ({ page }) => {
  const m = moduleOf('tokens');
  await open(page, chapterHref(m.id, m.chapters[0].id));
  await expect(watchBtn(page)).toHaveCount(0);
});

test('unstubbed, the narration clips and the music load from the site', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ baseURL }); // no audio stub: the browser fetches the real files
  const loaded: string[] = [];
  page.on('response', r => r.url().includes('/data/watch/') && r.ok() && loaded.push(new URL(r.url()).pathname));
  await open(page);
  await watchBtn(page).click();
  await expect.poll(() => loaded).toEqual(expect.arrayContaining(['/data/watch/rag/03-what-is-rag/ask.mp3']));
  await expect.poll(() => loaded).toEqual(expect.arrayContaining(['/data/watch/music.mp3']));
  await page.close();
});

test.describe('phone', () => {
  test.use(PHONE);
  test('the Watch strip stays in view while the page scrolls, with no sideways scroll', async ({ page }) => {
    await open(page);
    await watchBtn(page).click();
    await expect(status(page)).toHaveText('Your pick'); // step 3: its answer drawer makes the page tall
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(strip(page).getByRole('button', { name: 'Pause' })).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
    const top = (await strip(page).boundingBox())!.y;
    expect(top).toBeGreaterThanOrEqual(-1);
    expect(top).toBeLessThan(2); // pinned to the top of the screen
    await layoutHolds(page);
  });
});
