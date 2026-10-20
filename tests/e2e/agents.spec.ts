// Module 3, AI agents: the intro, chapters 1 and 2 played by mouse and by keyboard only, its own progress key, "I'm not
// sure", reduced motion, the recap, axe and phone width.
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { agentWalker, walkAgents } from './agents-flow';
import { serious, layoutHolds, PHONE } from './helpers';
import LOOP from '../../data/agents/turns/02-the-loop.json' with { type: 'json' };
import PLANS from '../../data/agents/turns/03-plans.json' with { type: 'json' };

const M = moduleOf('agents'), CH1 = M.chapters[0].id, CH2 = M.chapters[1].id, CH3 = M.chapters[2].id;
// chapter 2's recording is one path, one recorded turn per model turn
const TURNS = Object.keys(LOOP.turns).length;
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const axe = async (page: Page) => expect(await serious(page)).toEqual([]);

test('the intro shows the level, the prerequisite, the author, the chapters and the Colorfigures credit', async ({ page }) => {
  await page.goto('/agents/');
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Advanced');
  await expect(meta.getByRole('link', { name: 'Tool calling & MCP', exact: true })).toHaveAttribute('href', '/tool-calling/');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Colorfigures' })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://explain.kondasamy.com/og/agents.jpg');
  await axe(page);
});

test('home lists AI agents under Advanced as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const live = page.locator('[data-level="Advanced"] .module[data-module="agents"]');
  await expect(live.getByRole('link', { name: /AI agents/ }).first()).toHaveAttribute('href', '/agents/');
  await expect(page.locator('.roadmap[data-module="agents"]')).toHaveCount(0);
});

test('the chapters play by mouse, with axe clean at each check', async ({ page }) => {
  await walkAgents(page, 'mouse', axe);
});

test('the chapters play by keyboard only; progress lands in agents-progress-v1 and no other module’s key', async ({ page }) => {
  await page.goto('/');
  const OTHERS = { 'rag-progress-v1': JSON.stringify({ done: ['01-history'], saved: {} }), 'tool-calling-progress-v1': JSON.stringify({ done: ['01-answers-arent-actions'], saved: {} }) };
  await page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, OTHERS);
  await walkAgents(page, 'keyboard');
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(store['agents-progress-v1']).done).toEqual([CH1, CH2, CH3]);
  for (const [k, v] of Object.entries(OTHERS)) expect(store[k]).toBe(v);
  expect(store['tinker-last-module']).toBe('agents');
});

test('home Continue resumes AI agents once it was played last', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('agents-progress-v1', JSON.stringify({ done: [], saved: {} })); localStorage.setItem('tinker-last-module', 'agents'); });
  await page.reload();
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', /^\/agents\//);
});

test('the reveals follow the runs: the refund ends the same both ways, the out-of-stock script stops', async ({ page }) => {
  const w = agentWalker(page, 'mouse');
  await w.open(CH1);
  const c = card(page);
  await c.getByRole('button', { name: 'Read the refund case' }).click();
  await c.getByRole('radio', { name: /agent does a better refund/ }).click();
  await c.getByRole('button', { name: 'Run as the script' }).click();
  await expect(page.locator('.tc-caption')).toContainText('Step 6 of 6');   // the script: three calls, three results
  await c.getByRole('button', { name: 'Run as an agent' }).click();
  await expect(c).toContainText('NOT WHAT YOU PREDICTED');
  await expect(c).toContainText('What happened: Same result; the script uses fewer model tokens');
  await expect(c.locator('table tbody tr')).toHaveCount(2);
  await c.getByRole('button', { name: /^Next case/ }).click();
  await c.getByRole('button', { name: 'Run as the script' }).click();
  await c.getByRole('button', { name: 'Run as an agent' }).click();
  await c.getByRole('radio', { name: /^Both: the script ships/ }).click();
  await c.getByRole('button', { name: 'Run as the script' }).click();
  await expect(c.getByRole('status')).toContainText('The script stopped');
  await expect(page.locator('.tc-caption .stamp')).toHaveText('STOPPED');
  await c.getByRole('button', { name: 'Run as an agent' }).click();
  await expect(c).toContainText('What happened: Only the agent: it sees the stock and changes course');
});

test('chapter 2: the turn counter matches the run, the predictions stay locked beside the outcome, and wrong picks say why', async ({ page }) => {
  const w = agentWalker(page, 'mouse');
  await w.open(CH2);
  const c = card(page), caption = page.locator('.tc-caption');
  await c.getByRole('radio', { name: /^One turn per tool call$/ }).click();
  await expect(c.getByRole('radio', { name: /^As many as the host allows/ })).toHaveAttribute('aria-disabled', 'true');
  await c.getByRole('button', { name: 'Start the run' }).click();
  await expect(caption).toContainText('Turn 1 of');
  for (let t = 2; t < TURNS; t++) { await c.getByRole('button', { name: /^Next turn/ }).click(); await expect(caption).toContainText(`Turn ${t} of`); }
  await c.getByRole('radio', { name: /^The host: the case’s last tool/ }).click();
  await c.getByRole('button', { name: /^Next turn/ }).click();
  await expect(caption).toContainText(`Turn ${TURNS} of`);
  await expect(c).toContainText('No call this time');
  await expect(c.getByRole('button', { name: /^Next turn/ })).toHaveCount(0);
  const outs = c.locator('.feedback', { hasText: 'You predicted' });
  await expect(outs.nth(0)).toContainText('You predicted: One turn per tool call');
  await expect(outs.nth(0)).toContainText('What happened: One turn per tool call, then one more to say it is done');
  await expect(outs.nth(1)).toContainText('What happened: The model: it answers without asking for a call');
  const fb = c.locator('.quiz .feedback');
  await c.getByRole('radio', { name: /until every tool has been used/ }).click();
  await expect(fb).toContainText('never waits for tools to run out');
  await c.getByRole('radio', { name: /step budget is spent/ }).click();
  await expect(fb).toContainText('backstop');
});

// chapter 3's first plan, as recorded: the damaged case with plan mode on
const PLAN = (Object.entries(PLANS.turns).find(([k]) => k.startsWith('case=damaged|hist=|') && k.includes('plan=on'))![1] as { plan: string[] }).plan;

test('chapter 3: plan off hides the clipboard; plan on shows the recorded plan; the stock-out strikes one item and adds one', async ({ page }) => {
  const w = agentWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page), clip = page.locator('.stage [data-prop="clipboard"]');
  await expect(page.locator('.stage svg').first()).toBeVisible();
  await expect(clip).toHaveCount(0);
  await c.getByRole('button', { name: 'Plan mode: on' }).click();
  await expect(clip).toHaveAttribute('data-rows', String(PLAN.length));
  await expect(clip.locator('.struck')).toHaveCount(0);
  await c.getByRole('radio', { name: /^Sticks to the plan/ }).click();
  await c.getByRole('button', { name: 'Run the plan' }).click();
  await expect(clip).toHaveAttribute('data-rows', String(PLAN.length + 1));
  await expect(clip.locator('.struck')).toHaveCount(1);
  await expect(c).toContainText('What happened: Changes the plan');
  // with approval on, the change goes back to the person before it runs
  await c.getByRole('radio', { name: /^The change just runs/ }).click();
  await c.getByRole('button', { name: 'Approve' }).click();
  await expect(c).toContainText('A change, waiting for you:');
  await expect(page.locator('.tc-caption .stamp')).toHaveText('WAITING');
  await expect(c).toContainText('What happened: The change comes back to the person');
});

test('chapter 3: the planted line. Rejecting leaves order 1043 unrefunded, approving refunds it, one click tries the other', async ({ page }) => {
  const w = agentWalker(page, 'mouse');
  await w.open(CH3);
  const c = card(page);
  await c.getByRole('button', { name: 'Plan mode: on' }).click();
  await c.getByRole('radio', { name: /^Changes the plan/ }).click();
  await c.getByRole('button', { name: 'Run the plan' }).click();
  await c.getByRole('radio', { name: /^The change comes back/ }).click();
  await c.getByRole('button', { name: 'Approve' }).click();
  await c.getByRole('button', { name: 'Reject' }).click();
  await c.getByRole('button', { name: /^Next case/ }).click();
  await c.getByRole('radio', { name: /host can tell the line came from the email/ }).click();
  await c.getByRole('button', { name: 'Reject' }).click();
  await expect(page.locator('.stage [data-prop="clipboard"] .struck')).toHaveCount(2);
  await c.getByRole('button', { name: 'Approve' }).click();
  const row = (id: number) => c.locator(`.tc-ledger tr[data-order="${id}"]`);
  const before = (id: number) => row(id).locator('td').nth(1), after = (id: number) => row(id).locator('td').nth(2);
  // rejected: the new plan refunds 1042 only
  await expect(row(1043)).not.toHaveAttribute('data-changed');
  await expect(after(1043)).toHaveText((await before(1043).textContent())!);
  await expect(row(1042)).toHaveAttribute('data-changed', 'true');
  await expect(c).toContainText('Approval helped only because a person read the plan');
  await expect(c).toContainText('What happened: It is refunded');
  // one click: the plan approved as written refunds 1043 in full
  await c.getByRole('button', { name: /^Try the other choice: approve/ }).click();
  await expect(row(1043)).toHaveAttribute('data-changed', 'true');
  await expect(after(1043)).not.toHaveText((await before(1043).textContent())!);
  await c.getByRole('button', { name: /^Try the other choice: reject/ }).click();
  await expect(row(1043)).not.toHaveAttribute('data-changed');
  // the injection step ends on the Guardrails roadmap card, not a page of its own
  const link = c.getByRole('link', { name: moduleOf('guardrails').title });
  await expect(link).toHaveAttribute('href', '/#module-guardrails');
  await link.click();
  await expect(page.locator('#module-guardrails.roadmap')).toBeVisible();
});

test('“I’m not sure” on the checkpoint reveals the answer, is no miss, and finishes the chapter', async ({ page }) => {
  const w = agentWalker(page, 'mouse');
  await w.open(CH1);
  await w.ch1(undefined, 'I’m not sure');
  const fb = card(page).locator('.quiz .feedback');
  await expect(fb).toContainText('The answer: A workflow');
  await expect(fb).not.toContainText('NOT QUITE');
  await expect(card(page).locator('.hint')).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the picture shows each run at once and the chapter still plays through', async ({ page }) => {
    const w = agentWalker(page, 'mouse', async p => {
      expect(await p.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    });
    await w.open(CH1);
    await w.ch1();
    await w.open(CH2);
    await w.ch2();
    await w.open(CH3);
    await w.ch3();
  });
});

test('the recap asks from the finished chapters', async ({ page }) => {
  await walkAgents(page, 'mouse');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await axe(page);
});

test.describe('phone', () => {
  test.use(PHONE);
  test('pages fit 390px wide, and the chapters play through there with axe clean', async ({ page }) => {
    for (const p of ['/agents/', `/agents/${CH1}/`, `/agents/${CH2}/`, `/agents/${CH3}/`, '/agents/recap/']) {
      await page.goto(p);
      await layoutHolds(page);
    }
    await walkAgents(page, 'mouse', async p => { await layoutHolds(p); await axe(p); });
  });
});
