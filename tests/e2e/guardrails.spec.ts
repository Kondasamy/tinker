// Module 5, Prompt injection & guardrails: the intro, every chapter played by mouse and by keyboard only, each chapter's
// own checks, its own progress key, "I'm not sure", reduced motion, the recap, the warm-up, home's live card and
// Continue, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { guardWalker } from './guardrails-flow';
import { serious, layoutHolds, PHONE } from './helpers';
import INBOX from '../../data/guardrails/inbox.json' with { type: 'json' };
import SUITE from '../../data/guardrails/suite.json' with { type: 'json' };

const M = moduleOf('guardrails'),
  CH1 = M.chapters[0].id;
const [, CH2, CH3, CH4, CH5, CH6, CH7] = M.chapters.map(c => c.id);
const at = (id: string) => new RegExp(`/guardrails/${id}/$`);
/** Walk every written chapter in order, following each "Next" link, and end on the recap. */
async function walkAll(w: ReturnType<typeof guardWalker>) {
  await w.open(CH1);
  await w.ch1(at(CH2));
  await w.ch2(at(CH3));
  await w.ch3(at(CH4));
  await w.ch4(at(CH5));
  await w.ch5(at(CH6));
  await w.ch6(at(CH7));
  await w.ch7(/\/guardrails\/recap\/$/);
}
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);
// the whole-module walks grow with every chapter, like agents'
test.setTimeout(120_000);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({
  page,
}) => {
  await page.goto('/guardrails/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: moduleOf('tool-calling').title, exact: true })).toHaveAttribute(
    'href',
    '/tool-calling/',
  );
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://tinker.kondasamy.com/og/guardrails.jpg',
  );
  await axe(page);
});

test('home lists Guardrails under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const live = page.locator('[data-level="Intermediate"] .module[data-module="guardrails"]');
  await expect(live.getByRole('link', { name: /Prompt injection/ }).first()).toHaveAttribute('href', '/guardrails/');
  await expect(page.locator('.roadmap[data-module="guardrails"]')).toHaveCount(0);
});

test('every chapter plays by mouse, in order through the Next links, with axe clean at each check', async ({
  page,
}) => {
  await walkAll(guardWalker(page, 'mouse', axe));
});

test('every chapter plays by keyboard only, the chapter 4 and 5 puzzles and the red-team bench included; progress lands in guardrails-progress-v1 and no other module’s key', async ({
  page,
}) => {
  await page.goto('/');
  const OTHERS = {
    'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }),
    'tool-calling-progress-v1': JSON.stringify({ done: ['06-when-tools-go-wrong'], saved: {} }),
  };
  await page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, OTHERS);
  await walkAll(guardWalker(page, 'keyboard'));
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['guardrails-progress-v1']).done).toEqual(M.chapters.map(c => c.id));
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('guardrails');
});

test('home Continue resumes Guardrails once it was played last', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('guardrails-progress-v1', JSON.stringify({ done: [], saved: {} }));
    localStorage.setItem('tinker-last-module', 'guardrails');
  });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/guardrails\//);
});

test('without the rule both attacks work; with it the direct one is stopped and the forwarded invoice still leaks', async ({
  page,
}) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page),
    status = c.locator('.tc-status');
  const row = (n: number) => c.locator('table.tc-ledger tbody tr').nth(n);
  await c.getByRole('button', { name: 'Open the first email' }).click();
  // the email opens in the drawer, as the customer wrote it
  await expect(page.locator('aside.drawer')).toContainText('Ignore your previous instructions');
  await c.getByRole('button', { name: /^Run .*email$/ }).click();
  await expect(row(0)).toContainText('Attack worked');
  await c.getByRole('button', { name: /^Next email/ }).click();
  await c.getByRole('button', { name: 'Run the forwarded invoice' }).click();
  await expect(row(1)).toContainText('Attack worked');
  await expect(c).toContainText('audit@example.net');
  await c.getByRole('radio', { name: /^Both: the rule/ }).click();
  await c.getByRole('button', { name: /email, rule on$/ }).click();
  await expect(status).toContainText('the attack was stopped');
  await expect(row(2)).toContainText('Attack stopped');
  await c.getByRole('button', { name: 'Run the forwarded invoice, rule on' }).click();
  await expect(row(3)).toContainText('Attack worked');
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  // each attack's recorded note on why the model refused or followed
  await expect(c).toContainText('so I will not follow it');
  await expect(c).toContainText('so my rule does not stop it');
  const rows = c.locator('table.tc-ledger tbody tr');
  await expect(rows).toHaveCount(4);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: The line helps');
  await expect(fb).not.toContainText('NOT QUITE');
  await expect(card(page).locator('.hint')).toHaveCount(0);
});

// the injection suite, counted from the data by hand: the engine and the page must agree with this
const THRESHOLDS = [null, 0.9, 0.6, 0.5, 0.3, 0.1];
const INJECTION = [
  ...SUITE.attacks.filter(a => a.kind === 'injection').map(a => a.email),
  ...SUITE.customers.map(c => c.email),
];
const heldAt = (t: number | null) => {
  const q = (ids: string[]) => ids.filter(id => t !== null && INBOX.find(e => e.id === id)!.score >= t).length;
  const atk = INJECTION.filter(id => INBOX.find(e => e.id === id)!.attack),
    cus = INJECTION.filter(id => !INBOX.find(e => e.id === id)!.attack);
  return `${q(atk)} of ${atk.length} attacks quarantined, ${q(cus)} of ${cus.length} customers quarantined`;
};

test('chapter 2: at every threshold the counts match the data, and no threshold holds every attack and no customer', async ({
  page,
}) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page),
    slider = c.getByRole('slider');
  // predict first: no slider and no scores until the pick
  await expect(slider).toHaveCount(0);
  await c.getByRole('radio', { name: /^Yes: attacks read like attacks/ }).click();
  // every stop; after two the step says no threshold wins, and the last stop (the highest that holds every attack) moves on
  for (const i of [0, 1, 2, 3, 5, 4]) {
    const t = THRESHOLDS[i];
    await slider.fill(String(i));
    await expect(c.locator('[data-counts]')).toHaveText(`${heldAt(t)}.`);
    await expect(slider).toHaveAttribute('aria-valuetext', `${t ?? 'off'}: ${heldAt(t)}`);
    if (i === 5) {
      await expect(c).toContainText('NOT WHAT YOU PREDICTED');
      await expect(c).toContainText('No threshold wins');
    }
  }
  expect(THRESHOLDS.map(heldAt).some(h => /^(\d) of \1 attacks quarantined, 0 of/.test(h))).toBe(false);
  await expect(c).toContainText('Step 4 of');
  await c.getByRole('button', { name: /refund email$/ }).click();
  await expect(c.getByRole('link', { name: 'The Evals module' })).toHaveAttribute('href', '/evals/');
});

test('chapter 3: with the allow-list on the mail log has no outside address; the filter strips the link', async ({
  page,
}) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page),
    log = c.locator('[data-log]');
  await c.getByRole('button', { name: 'Run the forwarded invoice' }).click();
  await expect(log.locator('[data-out="1"]')).toContainText('audit@example.net');
  await c.getByRole('radio', { name: /^The send goes through/ }).click();
  await c.getByRole('button', { name: 'Allow-list: on' }).click();
  await expect(log.locator('[data-out]')).toHaveCount(1);
  await expect(log.locator('[data-out="1"]')).toHaveCount(0);
  await expect(log).not.toContainText('example.net');
  await expect(c).toContainText('The barrier held');
  await c.getByRole('radio', { name: /^Yes: the allow-list guards/ }).click();
  await c.getByRole('button', { name: /^Run .*’s email$/ }).click();
  await expect(log).toContainText('https://verify.example.net');
  await c.getByRole('button', { name: 'Output filter: on' }).click();
  const filtered = c.locator('[data-filtered]');
  await expect(filtered).toContainText('[link removed by the output filter]');
  await expect(filtered).not.toContainText('example.net');
});

test('chapter 4: removing untrusted text or private data leaves the case undone; the way out or the taint rule stops the attack and still answers', async ({
  page,
}) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page),
    verdict = c.locator('.tc-status');
  await c.getByRole('radio', { name: /^None: support needs all three/ }).click();
  await c.getByRole('button', { name: 'Remove untrusted text' }).click();
  await expect(verdict).toContainText('BROKEN');
  await expect(verdict).toContainText('The attack failed. Nobody read the email');
  await c.getByRole('button', { name: 'Remove private data' }).click();
  await expect(verdict).toContainText('BROKEN');
  await expect(verdict).toContainText('question went unanswered');
  await c.getByRole('button', { name: 'Keep all three' }).click();
  await expect(verdict).toContainText('The attack worked');
  // three misses: the hint shows; Show me sets the way out and advances
  await expect(c.locator('.hint')).toBeVisible();
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 3 of');
  await c.getByRole('button', { name: 'Taint rule: on' }).click();
  const rows = c.locator('table.tc-ledger tbody tr');
  await expect(rows.filter({ hasText: 'Remove the way out' })).toContainText(/NoYes$/);
  await expect(rows.filter({ hasText: 'taint rule on' })).toContainText(/NoYes$/);
  await expect(rows.filter({ hasText: 'Remove untrusted text' })).toContainText(/NoNo$/);
  await expect(rows.filter({ hasText: 'Remove private data' })).toContainText(/NoNo$/);
});

test('chapter 5: each defence alone leaves a cell wrong; three misses bring the hint, Show me stacks two layers; the rates link to Evals', async ({
  page,
}) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH5);
  const c = card(page),
    status = c.locator('.tc-status[data-succeeded]');
  await c.getByRole('radio', { name: /^Yes: the taint rule/ }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  // every single-defence row has at least one cell gone wrong; each cell is named in full for screen readers
  for (const name of ['Prompt rule', 'Taint rule', 'Allow-list', 'Output filter'])
    await expect(c.locator(`tr[data-row="${name}"] td[data-bad="1"]`)).not.toHaveCount(0);
  await expect(c.locator('tr[data-row^="Input filter"] td[data-bad="1"]')).toHaveCount(1);
  await expect(c.locator('tr[data-row="Prompt rule"] td[data-case="invoice"]')).toHaveAttribute(
    'aria-label',
    /^Prompt rule, attack .*: Worked$/,
  );
  await expect(status).toHaveAttribute('data-succeeded', '3');
  for (const b of ['Taint rule: off', 'Allow-list: off', 'Allow-list: on'])
    await c.getByRole('button', { name: b }).click();
  await expect(status).toContainText('BROKEN');
  await expect(c.locator('.hint')).toBeVisible();
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 3 of');
  await expect(c.locator('tr[data-row="Your set"] td[data-bad="1"]')).toHaveCount(0);
  await expect(c.locator('[data-eval]').getByRole('link', { name: 'The Evals module' })).toHaveAttribute(
    'href',
    '/evals/',
  );
  await axe(page);
});

test('chapter 6: the output check stops the discount, the input check turns the favour away, and strict’s refused refund is counted as a false block', async ({
  page,
}) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH6);
  const c = card(page),
    status = c.locator('[role="status"][data-case]');
  await expect(page.locator('.tc-caption')).toBeVisible();
  await c.getByRole('radio', { name: /^The input filter/ }).click();
  await expect(status).toHaveAttribute('data-met', '1');
  await c.getByRole('button', { name: 'Output policy check: on' }).click();
  await expect(status).toHaveAttribute('data-met', '0');
  await expect(status).toContainText('The output policy check stopped this refund');
  await c.getByRole('button', { name: /^Open .*’s email$/ }).click();
  await expect(status).toHaveAttribute('data-met', '1');
  await c.getByRole('button', { name: 'Input policy check: on' }).click();
  await expect(status).toContainText('turned the email away');
  await c.getByRole('radio', { name: /^It is paid/ }).click();
  await expect(status).toHaveAttribute('data-done', '1');
  await c.getByRole('button', { name: 'Strict: every refund to a person' }).click();
  await expect(c.locator('[data-cost] tr[data-policy="strict"]')).toHaveAttribute('data-blocked', '1');
  await expect(c.locator('[data-cost] tr[data-policy="on"]')).toHaveAttribute('data-blocked', '0');
  await expect(c).toContainText('a false block that counts like any other');
});

test('chapter 7: by keyboard, a set that leaks and a clean one; the bench, the stage case and the tab survive a reload', async ({
  page,
}) => {
  const w = guardWalker(page, 'keyboard');
  await w.open(CH7);
  const c = card(page),
    out = c.locator('[role="status"][data-asr]');
  const press = (name: string) => c.getByRole('button', { name, exact: true }).press('Enter');
  await expect(out).toHaveAttribute('data-asr', '5');
  await press('Allow-list: on');
  await expect(c).toContainText('Step 2 of');
  await expect(out).toHaveAttribute('data-clean', '0');
  await expect(c.locator('[data-verdict]')).toContainText('Not safe to ship');
  for (const b of ['Prompt rule: on', 'Input policy check: on', 'Output check: on']) await press(b);
  await expect(out).toHaveAttribute('data-clean', '1');
  await expect(c).toContainText('Step 3 of');
  await expect(c.locator('[data-gate]').getByRole('link', { name: 'Evals’ release gate' })).toHaveAttribute(
    'href',
    '/evals/07-release-day/',
  );
  await press('Output check: strict');
  await expect(out).toHaveAttribute('data-fbr', '1');
  await press('Refund (customer)');
  await page
    .locator('.tc-tabs')
    .getByRole('button', { name: /^Steps/ })
    .press('Enter');
  await expect(page.locator('.stage g.card.blocked').first()).toBeVisible();
  await axe(page); // the Steps tab with a blocked refund: card names hold their visible text, lane text has contrast
  await page.reload();
  await page.locator('astro-island:not([ssr])').waitFor();
  await page.getByRole('button', { name: /^Continue at step 3/ }).press('Enter');
  for (const b of ['Allow-list: on', 'Prompt rule: on', 'Output check: strict', 'Refund (customer)'])
    await expect(c.getByRole('button', { name: b, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(out).toHaveAttribute('data-fbr', '1');
  await expect(page.locator('.tc-tabs').getByRole('button', { name: /^Steps/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('chapters 2–7: “I’m not sure” on each checkpoint reveals the answer and is no miss', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  for (const [id, play] of [
    [CH2, w.ch2],
    [CH3, w.ch3],
    [CH4, w.ch4],
    [CH5, w.ch5],
    [CH6, w.ch6],
    [CH7, w.ch7],
  ] as const) {
    await w.open(id);
    await play(undefined, 'I’m not sure');
    const fb = card(page).locator('.quiz .feedback');
    await expect(fb).toContainText('The answer:');
    await expect(fb).not.toContainText('NOT QUITE');
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapter still plays through', async ({ page }) => {
    const w = guardWalker(page, 'mouse', async p => {
      await expect
        .poll(() =>
          p.evaluate(
            () =>
              document
                .querySelector('.stage')!
                .getAnimations({ subtree: true })
                .filter(a => a.playState === 'running').length,
          ),
        )
        .toBe(0);
    });
    await w.open(CH1);
    await w.ch1();
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = guardWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/guardrails/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('guardrails-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start chapter 1 →' })).toHaveAttribute('href', `/guardrails/${CH1}/`);
});

test('the warm-up shows on the intro 21 hours after a chapter, with a skip link; not 2 hours after', async ({
  page,
}) => {
  const seed = async (hours: number) => {
    await page.goto('/');
    await page.evaluate(
      ({ done, at }) =>
        localStorage.setItem(
          'guardrails-progress-v1',
          JSON.stringify({ done, saved: {}, at: Object.fromEntries(done.map(id => [id, at])) }),
        ),
      { done: [CH1], at: Date.now() - hours * 3600_000 },
    );
    await page.goto('/guardrails/');
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
  };
  await seed(21);
  await expect(page.locator('.warmup')).toContainText('from chapters you finished');
  await expect(page.getByRole('link', { name: 'Skip to chapter 2 →' })).toHaveAttribute('href', `/guardrails/${CH2}/`);
  await axe(page);
  await seed(2);
  await expect(page.locator('.warmup')).toHaveCount(0);
});

test('the intro reads as pictures by default; Words unfolds the longer text', async ({ page }) => {
  await page.goto('/guardrails/');
  const more = page.locator('#idea ~ .versus .mail.more').first();
  await expect(more).toBeHidden();
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(more).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and every chapter plays through there with axe clean', async ({ page }) => {
    for (const p of ['/guardrails/', ...M.chapters.map(c => `/guardrails/${c.id}/`), '/guardrails/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAll(
      guardWalker(page, 'mouse', async p => {
        await layoutHolds(p);
        await axe(p);
      }),
    );
  });
});
