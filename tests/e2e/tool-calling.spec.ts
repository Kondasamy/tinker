// U8: module 2's intro (R7, R16, R17, R27) and its place in the catalogue.
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { moduleOf } from '../../src/lib/modules';
import { toolWalker, walkToolCalling } from './tool-calling-flow';
import { serious } from './helpers';
import { RECALL } from '../../src/content/tool-calling/recall';
import REFUND_GATE from '../../data/tool-calling/turns/refund-gate.json' with { type: 'json' };

const M = moduleOf('tool-calling');

test('the intro renders with its level, prerequisite and author from the registry', async ({ page }) => {
  const res = await page.goto('/tool-calling/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const meta = page.locator('.hero .module-meta');
  await expect(meta.locator('.level')).toHaveText('Intermediate');
  await expect(meta.getByRole('link', { name: 'RAG', exact: true })).toHaveAttribute('href', '/rag/');
  await expect(meta).toContainText('RAG recommended');
  await expect(meta.getByRole('link', { name: M.author.name })).toHaveAttribute('href', M.author.url);
  await expect(page.locator('footer.credits')).toContainText('Colorfigures');
  await expect(page.locator('footer.credits').getByRole('link', { name: 'April Zhu' })).toBeVisible();
  await expect(page.locator('footer.credits').getByRole('link', { name: 'Kondasamy Jayaraman' })).toHaveAttribute('href', 'https://kondasamy.com');
  await expect(page.locator('.hero-pic svg[role="img"]').first()).toBeVisible();
});

test('the chapter path follows the registry', async ({ page }) => {
  await page.goto('/tool-calling/');
  await expect(page.locator('#path .path li')).toHaveCount(M.chapters.length);
  if (!M.chapters.length) await expect(page.locator('#path')).toContainText('Chapters arrive soon');
});

test('the intro fits a 390px phone without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tool-calling/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('the intro has its own share image', async ({ page, request }) => {
  await page.goto('/tool-calling/');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toBe('https://explain.kondasamy.com/og/tool-calling.jpg');
  expect((await request.get('/og/tool-calling.jpg')).status()).toBe(200);
});

test('home lists the module under Intermediate as a live card linking to its intro', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-level="Intermediate"] .module[data-module="tool-calling"]');
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: /Tool calling/ }).first()).toHaveAttribute('href', '/tool-calling/');
  await expect(card.locator('.level')).toHaveText('Intermediate');
  await expect(page.locator('[data-level="Intermediate"] .coming')).toHaveCount(0);
});

// U9: chapters 1–3.
const card = (page: Page) => page.getByRole('region', { name: 'Next step' });
const wide = (page: Page) => page.locator('.stage svg.flat-wide');
/** chapters 1–4 and 6 open on the back-office picture; their message sequence is the second tab */
const seq = (page: Page) => page.locator('.tc-tabs').getByRole('button', { name: /^Messages/ }).click();
const drawer = (page: Page) => page.getByRole('complementary');
const player = (page: Page) => card(page).getByRole('button', { name: /^Run the request|^Next message/ });
const playAll = async (page: Page) => { while (await player(page).count()) await player(page).click(); };

test('chapter 1: the outcome stays hidden until the reveal, then shows beside the prediction', async ({ page }) => {
  await toolWalker(page, 'mouse').open('01-answers-arent-actions');
  await seq(page);
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(wide(page).locator('.card')).toHaveCount(2);      // question in, nothing back yet
  await card(page).getByRole('radio', { name: /looks the order up/ }).click();
  await expect(wide(page).locator('.card')).toHaveCount(2);
  await card(page).getByRole('button', { name: 'Show the model’s reply' }).click();
  await expect(card(page)).toContainText('NOT WHAT YOU PREDICTED');
  await expect(card(page)).toContainText('You predicted: Yes: it looks the order up');
  await expect(card(page)).toContainText('What happened: No: it can only write a reply, so it guesses');
  await expect(wide(page).locator('.card')).toHaveCount(4);
  await expect(wide(page).locator('[data-lane="orders"]')).toBeVisible();
  await expect(wide(page).locator('.arrow[data-to="orders"]')).toHaveCount(0);   // the order system is never reached
  await expect(drawer(page)).toContainText('most likely on its way');
});

test('chapter 2: the vague description gets no call and a guess; the clear one gets get_order and a grounded answer', async ({ page }) => {
  await toolWalker(page, 'mouse').open('02-first-tool');
  await seq(page);
  await card(page).getByRole('button', { name: /^Open the get_order/ }).click();
  await expect(drawer(page)).toContainText('Gets data.');
  await card(page).getByRole('radio', { name: /calls no tool/ }).click();
  await card(page).getByRole('button', { name: 'Run the request' }).click();
  await expect(card(page)).toContainText('Step 4 of');
  await expect(wide(page)).not.toContainText('get_order(');
  await expect(wide(page)).toHaveAttribute('aria-label', /probably shipped/);
  await card(page).getByLabel(/Look up one Larkspur order/).check();
  await expect(drawer(page)).toContainText('Look up one Larkspur order');   // the definition follows the pick
  await expect(wide(page).locator('.card')).toHaveCount(0);
  for (let i = 0; i < 3; i++) await player(page).click();
  await expect(wide(page)).toContainText('get_order(order_id: 1042)');
  await playAll(page);
  await expect(card(page)).toContainText('Step 5 of');
  await expect(wide(page).locator('.arrow[data-to="orders"]')).toHaveCount(1);
  await expect(wide(page)).toContainText('order 1042: delivered');
  await expect(card(page)).toContainText('delivered on 14 October 2026');
});

test('chapter 3: INVALID and an error result; then a valid wrong id passes the schema and fails the ownership check', async ({ page }) => {
  await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
  await seq(page);
  await card(page).getByRole('radio', { name: /Rejects it/ }).click();
  for (let i = 0; i < 4; i++) await player(page).click();   // up to the error going back, while it is in the window
  await expect(wide(page).locator('.stamp')).toHaveText('INVALID');
  await expect(wide(page).locator('.card.error')).toHaveCount(1);
  await playAll(page);
  // the run outgrows the figure's window; the label and the drawer keep every message
  await expect(wide(page)).toHaveAttribute('aria-label', /stamped invalid/);
  await expect(drawer(page).locator('li[data-kind="error"]')).toHaveCount(1);
  await expect(drawer(page)).toContainText('isError: true');
  await expect(card(page)).toContainText('AS YOU PREDICTED');

  await card(page).getByRole('button', { name: 'Try a harder mistake →' }).click();
  await card(page).getByRole('radio', { name: /^Yes: the validator/ }).click();
  await playAll(page);
  await expect(card(page)).toContainText('Step 6 of');
  await expect(wide(page).locator('.stamp, .card.error')).toHaveCount(0);   // valid: no stamp, no error
  await expect(card(page)).toContainText('NOT WHAT YOU PREDICTED');
  await expect(wide(page)).toContainText('order 1024: delivered');
  await card(page).getByLabel(/Ownership check/).check();
  await playAll(page);
  await expect(card(page)).toContainText('Step 7 of');
  await expect(wide(page).locator('.card.error')).not.toHaveCount(0);
  await expect(wide(page)).toHaveAttribute('aria-label', /error, "Order 1024 belongs to another customer/);
  await expect(wide(page)).toContainText('order 1042: delivered');
});

test('every chapter completes by mouse, and the recap then asks only module 2 items', async ({ page }) => {
  test.setTimeout(120_000);
  await walkToolCalling(page, 'mouse');
  // the walk ends on the recap, through chapter 7's closing link
  const asked: string[] = [];
  const next = page.getByRole('button', { name: /^(Next question|See how you did) →$/ });
  for (let i = 0; i < RECALL.length; i++) {
    const q = (await page.locator('.recap legend').textContent())!;
    asked.push(q);
    await page.locator('.recap').getByRole('radio').first().click();
    await next.click();
  }
  await expect(page.locator('.recap legend')).toHaveCount(0);   // the summary: every question asked once
  const bank = RECALL.map(i => i.question), rag = moduleOf('rag').recall!.map(i => i.question);
  for (const q of asked) {
    expect(bank.some(b => q.includes(b)), q).toBe(true);
    expect(rag.some(b => q.includes(b)), q).toBe(false);
  }
  expect(new Set(asked).size).toBe(RECALL.length);
});

test('chapter 7: the workbench rejects the refund with the gate off and says why; the right setup passes', async ({ page }) => {
  await toolWalker(page, 'mouse').open('07-workbench');
  await card(page).getByLabel(/^Larkspur orders/).check();
  await step(page, 2);
  await btn(page, 'Request 3');
  await expect(card(page).locator('.tc-ask')).toContainText(REFUND_GATE.ask);
  await btn(page, '− Lower');
  await btn(page, /^Try this setup/);
  const fb = card(page).locator('.feedback');
  await expect(fb.locator('.stamp')).toHaveText('NOT QUITE');
  await expect(fb).toContainText('moves real money. With the gate off nobody sees the call before it runs');
  // three misses bring the hint
  await btn(page, /^Try this setup/);
  await btn(page, /^Try this setup/);
  await expect(card(page).locator('.hint')).toContainText('keep the gate on');
  await card(page).getByLabel(/Approval gate/).check();
  await btn(page, /^Try this setup/);
  await expect(fb.locator('.stamp')).toHaveText('RIGHT');
  await expect(card(page).getByRole('button', { name: 'Request 3, done' })).toBeVisible();
  // the picture follows the setup; the messages view shows what connecting sent
  await expect(page.locator('.stage svg[role="img"]')).toHaveAttribute('aria-label', /gate on, refund limit \$500\.00\. Connected: Larkspur orders\./);
  await page.locator('.tc-tabs').getByRole('button', { name: /^Messages/ }).click();
  await expect(wide(page)).toHaveAttribute('aria-label', /tools\/list/);
  // Show me solves the request in view
  await btn(page, 'Request 2');
  await btn(page, 'Show me');
  await expect(card(page).getByRole('button', { name: 'Request 2, done' })).toBeVisible();
});

test('every chapter completes by keyboard only', async ({ page }) => {
  test.setTimeout(120_000);
  await walkToolCalling(page, 'keyboard');
});

// message travel in the picture (button hover transitions elsewhere are not motion in the figure)
const running = (page: Page) => page.evaluate(() => document.querySelector('.stage')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('messages appear without travel and the steps still advance', async ({ page }) => {
    await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
    await seq(page);
    await card(page).getByRole('radio', { name: /Rejects it/ }).click();
    while (await player(page).count()) { await player(page).click(); expect(await running(page)).toBe(0); }
    await expect(card(page)).toContainText('Step 3 of');
  });
});

test('without reduced motion the newest message does travel (control for the test above)', async ({ page }) => {
  await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
  await seq(page);
  await card(page).getByRole('radio', { name: /Rejects it/ }).click();
  await player(page).click();
  expect(await running(page)).toBeGreaterThan(0);
});

// U10: chapters 4–6, and the figure's windowing and message drawer.
const NOTE: string = JSON.parse(readFileSync('data/tool-calling/orders.json', 'utf8')).find((o: { injected?: boolean }) => o.injected).note;
const btn = (page: Page, name: string | RegExp) => card(page).getByRole('button', { name }).click();
const step = (page: Page, n: number) => expect(card(page)).toContainText(`Step ${n} of`);
const label = (page: Page) => wide(page).getAttribute('aria-label').then(l => l ?? '');

test('chapter 3: the last run shows its latest 7 messages at a readable size, all of them in the drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const w = toolWalker(page, 'mouse');
  await w.open('03-valid-isnt-correct');
  await seq(page);
  await w.ch3();
  await expect(wide(page).locator('.card')).toHaveCount(7);
  await expect(wide(page).locator('.earlier')).toContainText('earlier messages');
  // rendered card text: font-size in the figure times the svg's scale on screen
  const px = await wide(page).evaluate((svg: SVGSVGElement) => {
    const t = svg.querySelector('.card text')!;
    return +t.getAttribute('font-size')! * svg.getScreenCTM()!.a;
  });
  expect(px).toBeGreaterThanOrEqual(12);
  await card(page).getByRole('button', { name: 'Inspect' }).click();
  await expect(drawer(page).locator('.tc-msgs li')).toHaveCount(12);
});

test('a message card opens the drawer on that message; Escape and × close it and focus returns to the card', async ({ page }) => {
  await toolWalker(page, 'mouse').open('02-first-tool');
  await seq(page);
  await card(page).getByRole('button', { name: /^Open the get_order/ }).click();
  await card(page).getByRole('radio', { name: /calls no tool/ }).click();
  await card(page).getByRole('button', { name: 'Run the request' }).click();
  const second = wide(page).getByRole('button', { name: /^Message 2, Host app to Model/ });
  await second.click();
  await expect(drawer(page).getByRole('heading', { name: 'Messages' })).toBeFocused();
  await expect(drawer(page).locator('li[data-picked]')).toContainText('2. Host app → Model');
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toHaveCount(0);
  await expect(second).toBeFocused();
  // by keyboard: Enter on the focused card, then the close button
  await second.press('Enter');
  await expect(drawer(page).getByRole('heading', { name: 'Messages' })).toBeFocused();
  await drawer(page).getByRole('button', { name: 'Close Messages' }).click();
  await expect(drawer(page)).toHaveCount(0);
  await expect(second).toBeFocused();
});

test('on a phone the drawer opened from a card is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await toolWalker(page, 'mouse').open('01-answers-arent-actions');
  await seq(page);
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await page.locator('.stage svg.flat-phone [data-msg][role="button"]').click();
  const sheet = page.locator('.drawer.sheet');
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate(el => getComputedStyle(el).position)).toBe('fixed');
  const box = (await sheet.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(844);
  expect(await serious(page)).toEqual([]);
});

test('chapter 4: two lookups go out at once; the refund waits for the total; a lower cap stops the loop with a reason', async ({ page }) => {
  await toolWalker(page, 'mouse').open('04-many-steps');
  await seq(page);
  await card(page).getByRole('radio', { name: /Both calls in one turn/ }).click();
  await playAll(page);
  await step(page, 3);
  const batches = wide(page).locator('.batch');
  await expect(batches.first()).toBeVisible();
  expect(await batches.evaluateAll(bs => bs.map(b => b.getAttribute('data-n')))).toContain('2');
  expect(await label(page)).toMatch(/get_order\(order_id: 1042\)", sent at once.*get_order\(order_id: 1043\)", sent at once/);

  await btn(page, 'Now a refund →');
  await card(page).getByRole('radio', { name: /^Yes: both in one turn/ }).click();
  await playAll(page);
  await step(page, 6);
  await expect(card(page)).toContainText('NOT WHAT YOU PREDICTED');
  await expect(wide(page).locator('.batch')).toHaveCount(0);
  const l = await label(page);
  expect(l.indexOf('order 1042: delivered')).toBeGreaterThan(-1);
  expect(l.indexOf('issue_refund(')).toBeGreaterThan(l.indexOf('order 1042: delivered'));   // the refund comes after the total

  await btn(page, '− Fewer');
  await expect(card(page).locator('.tc-status')).toContainText('Finished');   // a cap of 2 still fits both calls
  await btn(page, '− Fewer');
  await step(page, 7);
  await expect(wide(page).locator('.stamp')).toContainText(['STOPPED']);
  await expect(wide(page)).toContainText('Stopped: cap of 1 call');
  await expect(card(page)).toContainText('too many calls');
  await expect(wide(page).locator('.arrow[data-to="orders"]')).toHaveCount(1);   // only the lookup ran
});

test('chapter 5: integration counts follow the numbers; connecting shows server/discover then tools/list, no initialize', async ({ page }) => {
  await toolWalker(page, 'mouse').open('05-mcp');
  const more = (g: string) => card(page).getByRole('group', { name: g }).getByRole('button', { name: '+ More' }).click();
  const count = (k: string) => card(page).locator(`[data-count="${k}"] b`);
  await expect(count('without')).toHaveText(String(1 * 2));
  await more('AI apps');
  await more('AI apps');
  await more('Systems with tools');
  await expect(count('without')).toHaveText(String(3 * 3));
  await more('Systems with tools');
  await step(page, 2);
  await expect(count('without')).toHaveText(String(3 * 4));
  await card(page).getByRole('radio', { name: /each app builds its MCP side once/ }).click();
  await card(page).getByLabel(/Use MCP/).click();
  await step(page, 4);
  await expect(count('with')).toHaveText(String(3 + 4));
  await expect(page.locator('.stage svg[role="img"]')).toHaveAttribute('aria-label', /one MCP plug on each, 7 integrations/);
  await expect(page.locator('.stage .tc-tabs').getByRole('button', { name: /^Messages/ })).toBeDisabled();   // the tabs stay put; nothing to list yet

  await btn(page, /^Connect the Larkspur orders server/);
  await step(page, 5);
  // the step switches to the messages; the reader may switch back
  await expect(wide(page)).toBeVisible();
  const l = await label(page);
  expect(l).toMatch(/1: Host app to Larkspur orders, request, "server\/discover"\. 2: .*3: Host app to Larkspur orders, request, "tools\/list"/);
  expect(l).not.toContain('initialize');
  await page.locator('.tc-tabs').getByRole('button', { name: 'Picture' }).click();
  await expect(page.locator('.stage svg[role="img"]')).toHaveAttribute('aria-label', /Connected: Larkspur orders\./);
  await expect(wide(page)).toHaveCount(0);
  await page.locator('.tc-tabs').getByRole('button', { name: /^Messages/ }).click();
  await btn(page, /^Connect the Larkspur calendar server/);
  await btn(page, /^Read the refund policy/);
  await btn(page, /^Get the refund_request prompt/);
  await step(page, 7);
  await expect(drawer(page)).toContainText('"method": "resources/read"');
  await expect(drawer(page)).toContainText('"method": "prompts/get"');
  await expect(drawer(page)).not.toContainText('initialize');
  expect(await serious(page)).toEqual([]);
});

test('chapter 6, AE5: denying the refund at the gate advances and the denied-call turn plays', async ({ page }) => {
  await toolWalker(page, 'mouse').open('06-when-tools-go-wrong');
  await seq(page);
  await playAll(page);
  await step(page, 2);
  await expect(wide(page).locator('.stamp')).toContainText(['WAITING']);
  await btn(page, 'Deny');
  await expect(wide(page).locator('.stamp')).toContainText(['DENIED']);
  await playAll(page);
  await step(page, 3);
  await expect(card(page)).toContainText('You denied it, and the assistant said: “I could not issue the refund. It was declined at approval');
  // least privilege: the narrowed tool refuses
  await btn(page, '− Lower');
  await expect(wide(page).locator('.stamp')).toHaveCount(0);   // $500 still fits the $310 refund
  await btn(page, '− Lower');
  await step(page, 4);
  await expect(wide(page).locator('.stamp')).toContainText(['REFUSED']);
  await expect(card(page)).toContainText('over this tool\'s limit of $100.00');
});

test('chapter 6, AE6: gate off, the planted note changes the ledger; gate on, it waits; approving shows the damage and does not advance', async ({ page }) => {
  await toolWalker(page, 'mouse').open('06-when-tools-go-wrong');
  await seq(page);
  await playAll(page);
  await btn(page, 'Approve');
  await playAll(page);
  await btn(page, '− Lower');
  await btn(page, '− Lower');
  await step(page, 4);
  await btn(page, 'Next request →');
  await step(page, 5);
  // the note is plain text: no element is made from it
  const quote = card(page).locator('[data-note]');
  await expect(quote).toHaveText(NOTE);
  expect(await quote.evaluate(el => el.children.length)).toBe(0);
  await card(page).getByRole('radio', { name: /The model can follow the note/ }).click();
  const row = page.locator('.tc-ledger tr[data-order="1047"]');
  await expect(row).not.toHaveAttribute('data-changed');
  await playAll(page);
  await step(page, 7);
  await expect(row).toHaveAttribute('data-changed', 'true');
  await expect(row.locator('td').last()).toContainText('$5,000.00');
  await expect(drawer(page).locator('pre').filter({ hasText: 'IMPORTANT SYSTEM MESSAGE' }).first()).toBeVisible();
  expect(await drawer(page).locator('pre').evaluateAll(ps => ps.reduce((n, p) => n + p.children.length, 0))).toBe(0);

  await card(page).getByLabel(/Approval gate/).check();
  await playAll(page);
  await step(page, 8);
  await expect(wide(page).locator('.stamp')).toContainText(['WAITING']);
  await expect(row).not.toHaveAttribute('data-changed');
  await btn(page, 'Approve');
  await playAll(page);
  await expect(row).toHaveAttribute('data-changed', 'true');
  await step(page, 8);   // approving does not advance
  await expect(card(page).locator('.hint')).toContainText('Deny it instead');
  await btn(page, 'Deny');
  await playAll(page);
  await step(page, 9);
  await expect(row).not.toHaveAttribute('data-changed');
});

// The back-office picture (the chapters' default view) follows the same run as the sequence.
const pic = (page: Page) => page.locator('.stage svg.office');

test('the picture follows the run: no belt to the orders in chapter 1; an INVALID call held at the schema check in chapter 3', async ({ page }) => {
  await toolWalker(page, 'mouse').open('01-answers-arent-actions');
  await expect(pic(page)).toHaveAttribute('aria-label', /nothing joining it to the host/);
  await card(page).getByRole('button', { name: /^Ask/ }).click();
  await expect(page.locator('.tc-caption')).toContainText('Assistant app → Model');
  await toolWalker(page, 'mouse').open('03-valid-isnt-correct');
  await card(page).getByRole('radio', { name: /Rejects it/ }).click();
  for (let i = 0; i < 3; i++) await player(page).click();
  await expect(pic(page)).toHaveAttribute('aria-label', /a schema check.*stamped invalid/);
  await expect(page.locator('.tc-caption .stamp')).toHaveText('INVALID');
  await seq(page);   // the same run as a sequence, a tab away
  await expect(wide(page).locator('.stamp')).toHaveText('INVALID');
});

test('chapter 6: the approval barrier stays down while it waits for a person, and rises on Approve', async ({ page }) => {
  await toolWalker(page, 'mouse').open('06-when-tools-go-wrong');
  await playAll(page);
  await expect(pic(page)).toHaveAttribute('aria-label', /approval barrier, down, waiting for a person/);
  await card(page).getByRole('button', { name: 'Approve' }).click();
  await expect(pic(page)).toHaveAttribute('aria-label', /approval barrier, raised/);
});

test('the chapter bar and the stage tabs sit in the same place on every chapter', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const spots = new Set<string>();
  for (const id of ['01-answers-arent-actions', '04-many-steps', '05-mcp', '06-when-tools-go-wrong', '07-workbench']) {
    await toolWalker(page, 'mouse').open(id);
    const bar = (await page.locator('header.top').boundingBox())!, tabs = (await page.locator('.tc-tabs').boundingBox())!;
    spots.add(`${Math.round(bar.height)}/${Math.round(tabs.y)}`);
  }
  expect([...spots]).toHaveLength(1);
});

test('a chapter played before opens on its intro, with a link on to the saved step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const w = toolWalker(page, 'mouse');
  await w.open('04-many-steps');
  await card(page).getByRole('radio', { name: /Both calls in one turn/ }).click();
  await playAll(page);
  await page.reload();
  await expect(card(page)).toContainText('Step 3 of');
  await page.waitForTimeout(300);   // past the first render, when a resumed run used to scroll to its step
  expect(await page.locator('.side').evaluate(el => el.scrollTop)).toBe(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await page.getByRole('button', { name: /^Continue at step 3/ }).click();
  await expect(card(page)).toBeInViewport();
});
