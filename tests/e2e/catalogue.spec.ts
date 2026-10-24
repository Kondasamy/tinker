// U2: the home page is a catalogue grouped by level (R5, R6), Continue resumes the last module (R8), intros show level and author (R7).
import { test, expect } from '@playwright/test';
import { serious } from './helpers';
import { MODULES } from '../../src/lib/modules';

const REQUEST = '#request';
const catalogue = (page: import('@playwright/test').Page) => page.locator('#modules');
// live modules in their numbered order: each go-live appends its id (KTD17)
const NUMBERED = [
  'rag',
  'tool-calling',
  'agents',
  'evals',
  'guardrails',
  'tokens',
  'transformers',
  'context',
  'fine-tuning',
  'structured-outputs',
  'reasoning',
  'small-models',
  'inference',
  'observability',
  'sandboxing',
  'multimodal',
  'voice',
];

// every module sits at its level: live cards first, then the roadmap's planned cards in registry (build) order;
// the hero's caption and the Propose a module link both point at the request form on the home page.
for (const width of [1280, 390])
  test(`levels in order, live then planned cards grouped by level, a Propose a module link (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(catalogue(page).locator('[data-level] > h3')).toHaveText(['Beginner', 'Intermediate', 'Advanced']);
    const live = MODULES.filter(m => m.status === 'live'),
      planned = MODULES.filter(m => m.status === 'planned');
    await expect(catalogue(page).locator('.module')).toHaveCount(live.length);
    await expect(catalogue(page).locator('.roadmap')).toHaveCount(planned.length);
    for (const level of ['Beginner', 'Intermediate', 'Advanced'] as const) {
      const ids = [...live, ...planned].filter(m => m.level === level).map(m => m.id);
      expect(
        await page
          .locator(`[data-level="${level}"] [data-module]`)
          .evaluateAll(els => els.map(e => e.getAttribute('data-module'))),
      ).toEqual(ids);
    }
    for (const m of planned) {
      const card = page.locator(`[data-level="${m.level}"] .roadmap[data-module="${m.id}"]`);
      await expect(card.locator('h4')).toHaveText(m.title);
      await expect(card).toContainText(m.description);
    }
    await expect(catalogue(page).locator('.coming')).toHaveCount(0);
    await expect(catalogue(page).getByRole('link', { name: 'Propose a module' })).toHaveAttribute('href', REQUEST);
    // heroCaption's wording for both states is unit-tested (hero.test.ts); here, the one the registry gives
    const [text, link] = planned.length
      ? ['The empty plots are open:', 'build one']
      : ['Room for more:', 'propose one'];
    await expect(page.locator('.hero-pic figcaption')).toContainText(text);
    await expect(page.locator('.hero-pic figcaption a')).toHaveText(link);
    await expect(page.locator('.hero-pic figcaption a')).toHaveAttribute('href', REQUEST);
    await expect(page.getByText('In the workshop')).toHaveCount(0);
  });

// the request form mails FormSubmit and comes back with ?sent, which shows the thanks
test('the request form posts a message, and a return with ?sent thanks the reader', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('#request form');
  await expect(form).toHaveAttribute('action', /^https:\/\/formsubmit\.co\//);
  await expect(form.locator('textarea[name="message"]')).toHaveAttribute('required', '');
  await expect(page.locator('#request .sent')).toBeHidden();
  await page.goto('/?sent#request');
  await expect(page.locator('#request .sent')).toBeVisible();
});

for (const [width, height] of [
  [1280, 800],
  [390, 844],
])
  test(`the hero text and both buttons fit the first screen (${width}×${height})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    for (const el of [
      page.locator('.hero h1'),
      page.locator('[data-continue]'),
      page.locator('.hero .ctas .btn').nth(1),
      page.locator('.hero .glance'),
    ])
      await expect(el).toBeInViewport({ ratio: 1 });
  });

test('live modules keep their numbers, each linked under its level', async ({ page }) => {
  await page.goto('/');
  const kicker = (id: string) => page.locator(`.module[data-module="${id}"] .kicker`);
  for (const [i, id] of NUMBERED.entries()) await expect(kicker(id)).toHaveText(new RegExp(`^Module ${i + 1} · `));
  await expect(page.locator('[data-level="Beginner"] .module[data-module="tokens"] h4 a')).toHaveAttribute(
    'href',
    '/tokens/',
  );
  await expect(page.locator('[data-level="Advanced"] .module[data-module="transformers"] h4 a')).toHaveAttribute(
    'href',
    '/transformers/',
  );
  await expect(page.locator('[data-level="Intermediate"] .module[data-module="context"] h4 a')).toHaveAttribute(
    'href',
    '/context/',
  );
  await expect(page.locator('[data-level="Advanced"] .module[data-module="fine-tuning"] h4 a')).toHaveAttribute(
    'href',
    '/fine-tuning/',
  );
  await expect(
    page.locator('[data-level="Intermediate"] .module[data-module="structured-outputs"] h4 a'),
  ).toHaveAttribute('href', '/structured-outputs/');
  await expect(page.locator('[data-level="Intermediate"] .module[data-module="reasoning"] h4 a')).toHaveAttribute(
    'href',
    '/reasoning/',
  );
  await expect(page.locator('[data-level="Advanced"] .module[data-module="small-models"] h4 a')).toHaveAttribute(
    'href',
    '/small-models/',
  );
  await expect(page.locator('[data-level="Advanced"] .module[data-module="inference"] h4 a')).toHaveAttribute(
    'href',
    '/inference/',
  );
  await expect(page.locator('[data-level="Intermediate"] .module[data-module="observability"] h4 a')).toHaveAttribute(
    'href',
    '/observability/',
  );
  await expect(page.locator('[data-level="Advanced"] .module[data-module="sandboxing"] h4 a')).toHaveAttribute(
    'href',
    '/sandboxing/',
  );
  await expect(page.locator('[data-level="Intermediate"] .module[data-module="multimodal"] h4 a')).toHaveAttribute(
    'href',
    '/multimodal/',
  );
  await expect(page.locator('[data-level="Advanced"] .module[data-module="voice"] h4 a')).toHaveAttribute(
    'href',
    '/voice/',
  );
});

// U35: every module is live, so the roadmap is empty again: seventeen numbered cards, no roadmap card, an invitation to propose
test('the roadmap is empty: seventeen live cards numbered 1–17, no roadmap cards, Room for more', async ({ page }) => {
  await page.goto('/');
  expect(MODULES.map(m => m.id)).toEqual(NUMBERED);
  await expect(catalogue(page).locator('.module')).toHaveCount(17);
  await expect(catalogue(page).locator('.roadmap')).toHaveCount(0);
  const nums = await catalogue(page)
    .locator('.module .kicker')
    .evaluateAll(els => els.map(e => Number(/^Module (\d+) · /.exec(e.textContent ?? '')?.[1])));
  expect(nums.sort((a, b) => a - b)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  await expect(page.locator('.hero-pic .hero-soon')).toHaveCount(0);
  await expect(page.locator('.hero-pic figcaption')).toContainText('Room for more:');
  await expect(page.locator('.hero-pic figcaption a')).toHaveText('propose one');
  await expect(page.locator('.hero-pic figcaption a')).toHaveAttribute('href', REQUEST);
});

// a planned plot's pill sits out the wave: hidden while animated, shown with reduced motion (issue #15).
// No module is planned today, so a hero-soon group is planted in the hero to test the CSS itself.
for (const reducedMotion of ['no-preference', 'reduce'] as const)
  test(`the hero's planned pills are ${reducedMotion === 'reduce' ? 'shown' : 'hidden'} (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await page.locator('.hero-pic svg').evaluate(svg => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'hero-soon');
      g.innerHTML = '<rect width="40" height="20" />';
      svg.append(g);
    });
    const soon = page.locator('.hero-pic .hero-soon');
    await (reducedMotion === 'reduce' ? expect(soon).toBeVisible() : expect(soon).toBeHidden());
  });

// the wave hops plot i at i × 0.8 s; sampled mid-turn, only that plot's pill shows, and with reduced motion every pill shows
test('the hero wave shows one pill at a time, each on its own turn', async ({ page }) => {
  await page.goto('/');
  const pills = page.locator('.hero-pic .hero-hop .block-tag');
  await expect(pills).toHaveCount(NUMBERED.length);
  const shown = () => pills.evaluateAll(els => els.map(e => +getComputedStyle(e).opacity > 0.01));
  for (let i = 0; i < NUMBERED.length; i++) {
    await page.evaluate(
      t =>
        document.getAnimations().forEach(a => {
          a.pause();
          a.currentTime = t;
        }),
      i * 800 + 400,
    );
    expect(await shown(), `turn ${i}`).toEqual(NUMBERED.map((_, j) => j === i));
  }
});

test('with reduced motion, every hero pill shows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const pill of await page.locator('.hero-pic .block-tag').all()) await expect(pill).toHaveCSS('opacity', '1');
});

test('keyboard Tab never lands in a planned card', async ({ page }) => {
  await page.goto('/');
  const seen: string[] = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    seen.push(
      await page.evaluate(() =>
        document.activeElement?.closest('.roadmap') ? 'roadmap' : (document.activeElement?.tagName ?? ''),
      ),
    );
  }
  expect(seen).not.toContain('roadmap');
  expect(seen).toContain('A');
});

test('Continue resumes the last module at its first unfinished chapter', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['01-history', '02-why-not-stuff-it'], saved: {} }));
    localStorage.setItem('tinker-last-module', 'rag');
  });
  await page.reload();
  const go = page.locator('[data-continue]');
  await expect(go).toHaveAttribute('href', '/rag/03-what-is-rag/');
  await expect(go).toHaveText('Continue RAG: chapter 3 →');
});

test('with only a later chapter done, Continue goes to chapter 1 and says so', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ['02-why-not-stuff-it'], saved: {} }));
    localStorage.setItem('tinker-last-module', 'rag');
  });
  await page.reload();
  const go = page.locator('[data-continue]');
  await expect(go).toHaveAttribute('href', '/rag/01-history/');
  await expect(go).toHaveText('Continue RAG: chapter 1 →');
});

test('a first visit starts with the basics; a finished module hands Continue to the next unfinished one', async ({
  page,
}) => {
  await page.goto('/');
  const go = page.locator('[data-continue]');
  await expect(go).toHaveText('Start with the basics →');
  await expect(go).toHaveAttribute('href', '/rag/');
  const [rag, next] = MODULES.filter(m => m.status === 'live');
  await page.evaluate(
    ids => {
      localStorage.setItem('rag-progress-v1', JSON.stringify({ done: ids, saved: {} }));
      localStorage.setItem('tinker-last-module', 'rag');
    },
    rag.chapters.map(c => c.id),
  );
  await page.reload();
  await expect(go).toHaveAttribute('href', `/${next.id}/`);
  await expect(go).toHaveText(`Start ${next.title} →`);
});

test('with no storage, Continue opens the RAG intro', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    }),
  );
  await page.goto('/');
  await page.locator('[data-continue]').click();
  await expect(page).toHaveURL(/\/rag\/$/);
});

test('an unknown last module falls back to the first live one', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('tinker-last-module', 'nope'));
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', '/rag/');
});

test('the catalogue fits a 390px phone without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await catalogue(page).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

for (const path of ['/', '/rag/'])
  test(`axe: ${path} has no serious or critical violations`, async ({ page }) => {
    await page.goto(path);
    expect(await serious(page)).toEqual([]);
  });

test('RAG intro shows its level, prerequisites and author from the registry', async ({ page }) => {
  const rag = MODULES.find(m => m.id === 'rag')!;
  await page.goto('/rag/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText(rag.level);
  await expect(meta).toContainText('No prerequisites');
  await expect(meta.getByRole('link', { name: rag.author.name })).toHaveAttribute('href', rag.author.url);
});
