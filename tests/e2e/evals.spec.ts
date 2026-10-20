// Module 4, Evals: the intro, chapters 1 to 4 played by mouse and by keyboard only, its own progress key, "I'm not sure",
// reduced motion, the suite's Preparing state, the recap, home's live card and Continue, axe and phone width.
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import ch3 from '../../data/questions/ch3.json' with { type: 'json' };
import ch4 from '../../data/questions/ch4.json' with { type: 'json' };
import ch5 from '../../data/questions/ch5.json' with { type: 'json' };
import ch6 from '../../data/questions/ch6.json' with { type: 'json' };

// the test set in suite order (src/lib/evals/suite.ts QUESTIONS; that module needs Vite, so the specs read the files)
const QUESTIONS = [...ch3, ...ch4, ...ch5, ...ch6];
import { brokenQ, evalWalker, sortLog, CANDIDATES } from './evals-flow';
import references from '../../data/evals/references.json' with { type: 'json' };
import judge from '../../data/evals/judge.json' with { type: 'json' };
import labels from '../../data/evals/labels.json' with { type: 'json' };
import { serious, layoutHolds, PHONE } from './helpers';

const M = moduleOf('evals'), [CH1, CH2, CH3, CH4] = M.chapters.map(c => c.id);
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);

const at = (text: string) => QUESTIONS.findIndex(q => text.includes(q.query));

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/evals/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'RAG', exact: true })).toHaveAttribute('href', '/rag/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://explain.kondasamy.com/og/evals.jpg');
  await axe(page);
});

test('home lists Evals under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const live = page.locator('[data-level="Intermediate"] .module[data-module="evals"]');
  await expect(live.getByRole('link', { name: /Evals/ }).first()).toHaveAttribute('href', '/evals/');
  await expect(page.locator('.roadmap[data-module="evals"]')).toHaveCount(0);
});

test('chapters 1 to 4 play by mouse in a row, following Next, with axe clean at each check', async ({ page }) => {
  const w = evalWalker(page, 'mouse', axe);
  await w.open(CH1);
  await w.ch1(new RegExp(`/evals/${CH2}/$`));
  await w.ch2(new RegExp(`/evals/${CH3}/$`));
  await w.ch3(new RegExp(`/evals/${CH4}/$`));
  await w.ch4();
});

test('chapters 1 to 4 play by keyboard only; progress lands in evals-progress-v1 and RAG’s key is untouched', async ({ page }) => {
  await page.goto('/');
  const RAG = JSON.stringify({ done: ['01-history'], saved: {} });
  await page.evaluate(v => localStorage.setItem('rag-progress-v1', v), RAG);
  const w = evalWalker(page, 'keyboard');
  await w.open(CH1);
  await w.ch1(new RegExp(`/evals/${CH2}/$`));
  await w.ch2(new RegExp(`/evals/${CH3}/$`));
  await w.ch3(new RegExp(`/evals/${CH4}/$`));
  await w.ch4();
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['evals-progress-v1']).done).toEqual([CH1, CH2, CH3, CH4]);
  expect(store['rag-progress-v1']).toBe(RAG);
  expect(store['tinker-last-module']).toBe('evals');
});

test('home Continue resumes Evals once it was played last', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('evals-progress-v1', JSON.stringify({ done: [], saved: {} })); localStorage.setItem('tinker-last-module', 'evals'); });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/evals\//);
});

test('the stage says Preparing until the suite loads, then shows the bench', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(r => { release = r; });
  await page.route('**/data/index/**', async route => { await held; await route.continue(); });
  await page.goto(`/evals/${CH1}/`);
  await page.locator('astro-island:not([ssr])').waitFor();
  await expect(page.locator('.ev-wait[data-state="preparing"]')).toBeVisible();
  await expect(card(page).getByRole('button', { name: /^Try:/ })).toHaveCount(0);
  release();
  await expect(page.locator('.ev-wait')).toHaveCount(0);
  await expect(page.locator('.stage svg').first()).toBeVisible();
  await expect(card(page).getByRole('button', { name: /^Try:/ })).toHaveCount(2);
});

test('the tried questions are ones v2 fixes; the regression shows only after the whole set runs', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page), caption = page.locator('.tc-caption');
  const tries = c.getByRole('button', { name: /^Try:/ });
  const tried = [at((await tries.nth(0).textContent())!), at((await tries.nth(1).textContent())!)];
  await tries.nth(0).click();
  await tries.nth(1).click();
  await expect(caption).toContainText('2 of 2 passed');
  await page.getByRole('button', { name: /^Results/ }).click();
  await expect(page.locator('.ev-grid .cell')).toHaveCount(0);
  await c.getByRole('radio', { name: /^Better on every question/ }).click();
  await c.getByRole('button', { name: /^Run all/ }).click();
  const grid = page.locator('.ev-grid-wide');
  await expect(grid.locator('.cell')).toHaveCount(QUESTIONS.length * 2);
  // both tried questions failed on v1 and pass on v2
  for (const q of tried) await expect(grid.locator(`.cell[aria-label="Q${q + 1}, v2: passed, was failing"]`)).toHaveCount(1);
  // the caption's scores are the grid's
  const label = (await grid.getAttribute('aria-label'))!;
  const [, a, b] = /v1 passed (\d+), v2 passed (\d+)/.exec(label)!;
  await expect(caption).toContainText(`v1 passed ${a}; v2 passed ${b}`);
  const broken = await brokenQ(page);
  expect(tried).not.toContain(broken);
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  // a fixed question is not the answer; three misses bring the hint, and Show me finds it
  const fix = tried[0];
  for (let i = 0; i < 3; i++) await c.getByRole('button', { name: `Q${fix + 1}: ${QUESTIONS[fix].query}` }).click();
  await expect(c.locator('.tc-status')).toContainText('a fix, not a regression');
  await expect(c.locator('.hint')).toBeVisible();
  await c.getByRole('button', { name: 'Show me' }).click();
  await expect(c).toContainText('Step 5 of');
  await expect(c).toContainText(QUESTIONS[broken].query);
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: Run the whole test set');
  await expect(fb).not.toContainText('NOT QUITE');
  await expect(card(page).locator('.hint')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture holds still and the chapter still plays through', async ({ page }) => {
    const w = evalWalker(page, 'mouse', async p => {
      // a 0.01 ms transition on a just-pressed tab can still be in its first frame: poll until it settles
      await expect.poll(() => p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await w.open(CH1);
    await w.ch1();
    for (const [id, play] of [[CH2, w.ch2], [CH3, w.ch3], [CH4, w.ch4]] as const) { await w.open(id); await play(); }
  });
});

test('the recap asks from the finished chapter; with none done it says so', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1();
  await page.goto('/evals/recap/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
  await page.evaluate(() => localStorage.removeItem('evals-progress-v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finish a chapter first' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start chapter 1 →' })).toHaveAttribute('href', `/evals/${CH1}/`);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and chapters 1 to 4 play through there with axe clean', async ({ page }) => {
    for (const p of ['/evals/', `/evals/${CH1}/`, `/evals/${CH2}/`, `/evals/${CH3}/`, `/evals/${CH4}/`, '/evals/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    const w = evalWalker(page, 'mouse', async p => { await layoutHolds(p); await axe(p); });
    await w.open(CH1);
    await w.ch1();
    for (const [id, play] of [[CH2, w.ch2], [CH3, w.ch3], [CH4, w.ch4]] as const) { await w.open(id); await play(); }
  });
});

// ---- chapters 2 to 4 ----

/** Every wrong checkpoint option shows its own why; the right one stamps RIGHT. */
async function everyWhy(page: Page) {
  const c = card(page), quiz = c.locator('.quiz'), fb = quiz.locator('.feedback');
  const radios = quiz.getByRole('radio');
  const n = await radios.count(), seen = new Set<string>();
  for (let i = 0; i < n - 1; i++) {   // the last is "I'm not sure"
    await radios.nth(i).click();
    const text = (await fb.textContent())!;
    if (/RIGHT/.test(text)) break;
    expect(text).toContain('NOT QUITE');
    expect(seen.has(text), `option ${i} repeats another's why`).toBe(false);
    seen.add(text);
  }
}

test('chapter 2: dropping every ask the documents can’t answer makes the reveal name that gap', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page);
  // unsorted cards say so, and a kept card with no reference is flagged
  const first = c.locator('.ev-case').first();
  await expect(first).toContainText('not sorted');
  await first.getByRole('button', { name: 'Keep' }).click();
  await expect(first).toHaveAttribute('data-state', 'flag');
  await expect(first).toContainText('needs a reference answer');
  await sortLog(page, 'mouse', x => x.keep && x.kind !== 'not in the documents');
  await expect(c).toContainText('Step 2 of');
  await c.getByRole('radio', { name: /^Yes: my set has a case/ }).click();
  await expect(c.locator('.feedback', { hasText: 'You predicted' })).toContainText('What happened: No: nothing in my set checks');
  const cov = c.locator('.ev-coverage');
  await expect(cov).toHaveAttribute('data-gaps', 'not in the documents');
  await expect(cov).toContainText('Gap: Nothing asks what the documents can’t answer');
  // keeping the set with the gap is a miss; filling it passes
  await c.getByRole('button', { name: 'Keep this set' }).click();
  await expect(c).toContainText('Step 3 of');
  const gap = c.locator(`.ev-case[data-id="${CANDIDATES.find(x => x.kind === 'not in the documents')!.id}"]`);
  await gap.getByRole('button', { name: 'Keep' }).click();
  await gap.getByRole('combobox').selectOption({ label: (await gap.locator('option', { hasText: /^No document answers/ }).textContent())! });
  await expect(c).toContainText('Step 4 of');
  await everyWhy(page);
});

test('chapter 2: “I’m not sure” reveals the answer without a miss', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH2);
  await w.ch2(undefined, 'I’m not sure');
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: Real questions from the log');
  await expect(fb).not.toContainText('NOT QUITE');
});

// the code graders, re-derived from the data files (graders.ts needs Vite)
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!]$/, '');
const REFS = references as Record<string, { answer: string; facts: Record<string, string[]> }>;
const answerOf = (q: string, sig: string) => JSON.parse(readFileSync(`data/answers/${q}.json`, 'utf8'))[sig] as { text: string; citation: string | null; verdict: string };

test('chapter 3: every matrix cell equals the grader’s result for that answer, and the predictions lock beside the outcomes', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH3);
  await w.ch3();
  const c = card(page);
  const outs = c.locator('.feedback', { hasText: 'You predicted' });
  await expect(outs).toHaveCount(1);
  await expect(outs.first()).toContainText('You predicted: Has a citation');
  const matrix = c.locator('.ev-matrix');
  for (let i = 0; i < 3; i++) {
    const head = matrix.locator(`thead th[data-case="${i}"]`);
    const q = (await head.getAttribute('data-question'))!, sig = (await head.getAttribute('data-signature'))!;
    const a = answerOf(q, sig);
    const want = {
      exact: norm(a.text) === norm(REFS[q].answer),
      fact: Object.values(REFS[q].facts).every(ps => ps.some(p => norm(a.text).includes(norm(p)))),
      citation: a.citation !== null,
      judge: (judge.single as Record<string, { r1: { pass: boolean } }>)[`${q}|${sig}`].r1.pass,
      person: (labels as Record<string, { pass: boolean }>)[`${q}|${sig}`].pass,
    };
    for (const [g, ok] of Object.entries(want)) {
      const cell = matrix.locator(`tr[data-grader="${g}"] td[data-case="${i}"]`);
      await expect(cell, `${q} ${g}`).toHaveAttribute('data-pass', ok ? '1' : '0');
      if (ok !== (a.verdict === 'correct')) await expect(cell).toHaveAttribute('data-wrong', '');
      else await expect(cell).not.toHaveAttribute('data-wrong');
    }
  }
  await everyWhy(page);
});

test('chapter 4: r1 → r2 raises the agreement, and the shown percentage is the engine’s', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  const LABELS = labels as Record<string, { pass: boolean }>, SINGLE = judge.single as Record<string, Record<'r1' | 'r2', { pass: boolean }>>;
  const pct = (rb: 'r1' | 'r2') => { const ks = Object.keys(LABELS); return `${Math.round((100 * ks.filter(k => SINGLE[k][rb].pass === LABELS[k].pass).length) / ks.length)}%`; };
  await c.getByRole('radio', { name: /^Nearly always/ }).click();
  await c.getByRole('button', { name: /^Run the judge/ }).click();
  await expect(c.locator('tr[data-rubric="r1"] [data-agreement]')).toHaveText(pct('r1'));
  await expect(page.locator('.tc-caption')).toContainText(`(${pct('r1')})`);
  await c.getByRole('button', { name: 'Rubric r2' }).click();
  await expect(c.locator('tr[data-rubric="r2"] [data-agreement]')).toHaveText(pct('r2'));
  expect(parseInt(pct('r2'))).toBeGreaterThan(parseInt(pct('r1')));
  await expect(page.locator('.tc-caption')).toContainText(`(${pct('r2')})`);
});

test('chapter 4: the swapped pair shows a different winner, with the prediction locked beside it', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  await w.open(CH4);
  const c = card(page);
  await c.getByRole('radio', { name: /^About half the time/ }).click();
  await c.getByRole('button', { name: /^Run the judge/ }).click();
  await c.getByRole('button', { name: 'Rubric r2' }).click();
  // a person-was-wrong pick says so and counts as a miss; Show me finds the judge's mistake
  await c.getByRole('button', { name: /Person: PASS.*Judge: FAIL/ }).first().click();
  await expect(c.locator('.tc-status')).toContainText('Here the person was wrong');
  await c.getByRole('button', { name: /Person: FAIL.*Judge: PASS/ }).click();
  await expect(c).toContainText('Step 5 of');
  await c.getByRole('radio', { name: /^The same answer as before/ }).click();
  await expect(c.getByRole('radio', { name: /^The other answer/ })).toHaveAttribute('aria-disabled', 'true');
  await c.getByRole('button', { name: /^Swap the order/ }).click();
  const pair = c.locator('.ev-pair').last();
  const ab = (await pair.locator('[data-order="ab"]').textContent())!, ba = (await pair.locator('[data-order="ba"]').textContent())!;
  const winner = (t: string) => /picks (A|B)/.exec(t)![1];
  expect(winner(ab)).not.toBe(winner(ba));
  const out = c.locator('.feedback', { hasText: 'You predicted' }).last();
  await expect(out).toContainText('You predicted: The same answer as before');
  await expect(out).toContainText('What happened: The other answer');
  await expect(out).toContainText('NOT WHAT YOU PREDICTED');
  await everyWhy(page);
});

test('chapters 3 and 4: “I’m not sure” reveals the answer without a miss', async ({ page }) => {
  const w = evalWalker(page, 'mouse');
  for (const [id, play, answer] of [[CH3, w.ch3, 'A model judge with a rubric'], [CH4, w.ch4, 'Judge every pair again']] as const) {
    await w.open(id);
    await play(undefined, 'I’m not sure');
    const fb = card(page).locator('.quiz .feedback');
    await expect(fb).toContainText(`The answer: ${answer}`);
    await expect(fb).not.toContainText('NOT QUITE');
  }
});
