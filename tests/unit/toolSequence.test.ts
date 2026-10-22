import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Ledger, Messages } from '../../src/content/tool-calling/kit';
import { transcript, rpcMessages, toolLanes } from '../../src/components/scenes/toolSequence';
import { run } from '../../src/lib/tools/host';
import { RECORDINGS } from '../../src/lib/tools/turns';
import { connect, createServer, integrations, PROTOCOL_VERSION, type LogEntry } from '../../src/lib/tools/server';
import { flatScene, DESK, type Lane } from '../../src/lib/iso/flat';

const seq = (id: string, setup = {}) => transcript(RECORDINGS[id], run(RECORDINGS[id], setup));
const path = (ms: ReturnType<typeof seq>) => ms.map(m => `${m.from}>${m.to}:${m.kind}${m.stamp ? ':' + m.stamp : ''}`);

describe('transcript: a host run as message cards', () => {
  it('no tools: the question goes in, a guess comes out, the order system is never reached', () => {
    const ms = seq('no-tools');
    expect(path(ms)).toEqual(['emp>host:request', 'host>model:request', 'model>host:result', 'host>emp:result']);
    expect(ms[1].text).toBe('question, no tools');
    expect(ms.some(m => m.to === 'orders')).toBe(false);
  });

  it('a clear description: the model proposes get_order, the host runs it and forwards the result', () => {
    const ms = seq('order-status', { desc: 'clear' });
    expect(path(ms)).toEqual([
      'emp>host:request',
      'host>model:request',
      'model>host:request',
      'host>orders:request',
      'orders>host:result',
      'host>model:result',
      'model>host:result',
      'host>emp:result',
    ]);
    expect(ms[2].text).toBe('get_order(order_id: 1042)');
    expect(ms[4].text).toBe('order 1042: delivered');
  });

  it('a vague description: no call at all', () => {
    expect(seq('order-status', { desc: 'vague' }).some(m => m.from === 'model' && m.kind === 'request')).toBe(false);
  });

  it('a string id is stamped INVALID and its error goes straight back to the model, unrun', () => {
    const ms = seq('invalid-arg');
    expect(ms[2]).toMatchObject({ text: 'get_order(order_id: "1042")', stamp: 'INVALID' });
    expect(ms[3]).toMatchObject({ from: 'host', to: 'model', kind: 'error' });
    expect(ms[3].detail).toContain('isError: true');
    expect(ms.filter(m => m.to === 'orders')).toHaveLength(1); // only the retry runs
  });

  it('the ownership check turns a valid wrong id into an error result from the order system', () => {
    expect(seq('wrong-id', { check: false }).some(m => m.stamp || m.kind === 'error')).toBe(false);
    const checked = seq('wrong-id', { check: true });
    expect(checked.find(m => m.from === 'orders' && m.kind === 'error')?.text).toContain('belongs to another customer');
  });

  it('untrusted text stays text in the figure (KTD12)', () => {
    const lanes: Lane[] = [
      { id: 'emp', name: 'Employee' },
      { id: 'host', name: 'Host app' },
    ];
    const svg = flatScene(lanes, [
      { from: 'emp', to: 'host', kind: 'request', text: '<img src=x onerror=alert(1)>' },
    ]).svg;
    expect(svg).not.toContain('<img');
  });

  it('parallel calls from one turn are shown phase by phase, each phase one batch', () => {
    const ms = seq('parallel');
    expect(path(ms).slice(2, 10)).toEqual([
      'model>host:request',
      'model>host:request',
      'host>orders:request',
      'host>orders:request',
      'orders>host:result',
      'orders>host:result',
      'host>model:result',
      'host>model:result',
    ]);
    const b = ms.slice(2, 10).map(m => m.batch);
    expect(b.every(x => x !== undefined)).toBe(true);
    for (let i = 0; i < 8; i += 2) expect(b[i]).toBe(b[i + 1]); // pairs went out together
    expect(new Set(b).size).toBe(4); // and each phase is its own batch
    expect(ms.filter(m => m.batch !== undefined)).toHaveLength(8);
    // a sequence is never batched: the refund waits for the total
    expect(seq('refund-sequence').some(m => m.batch !== undefined)).toBe(false);
  });

  it('the call cap draws the stopped proposal and the reason', () => {
    const ms = seq('refund-sequence', { cap: 1 });
    expect(ms.at(-2)).toMatchObject({
      from: 'model',
      to: 'host',
      kind: 'blocked',
      stamp: 'STOPPED',
      text: expect.stringContaining('issue_refund'),
    });
    expect(ms.at(-1)).toMatchObject({ from: 'host', to: 'emp', kind: 'error', text: 'Stopped: cap of 1 call' });
    expect(ms.at(-1)!.detail).toMatch(/too many calls/);
    expect(ms.some(m => m.to === 'orders' && m.text.startsWith('issue_refund'))).toBe(false);
  });

  it('the approval gate: WAITING, then APPROVED or DENIED; a denied call never reaches the order system', () => {
    const wait = seq('refund-gate', { gate: true });
    expect(wait.at(-1)).toMatchObject({
      from: 'host',
      to: 'emp',
      stamp: 'WAITING',
      text: expect.stringMatching(/^Approve issue_refund/),
    });
    const ok = seq('refund-gate', { gate: true, decide: 'approve' }),
      no = seq('refund-gate', { gate: true, decide: 'deny' });
    expect(ok[wait.length - 1].stamp).toBe('APPROVED');
    expect(no[wait.length - 1]).toMatchObject({ stamp: 'DENIED', kind: 'blocked' });
    expect(path(no.slice(0, wait.length - 1))).toEqual(path(wait.slice(0, -1))); // same run up to the decision
    expect(ok.some(m => m.to === 'orders' && m.text.startsWith('issue_refund'))).toBe(true);
    expect(no.some(m => m.to === 'orders' && m.text.startsWith('issue_refund'))).toBe(false);
    expect(no[wait.length]).toMatchObject({ from: 'host', to: 'model', kind: 'error' });
  });

  it('a refund over the limit comes back REFUSED with isError', () => {
    const refused = seq('refund-gate', { limit: 100 }).find(m => m.stamp === 'REFUSED')!;
    expect(refused).toMatchObject({ from: 'orders', to: 'host', kind: 'error' });
    expect(refused.detail).toMatch(/^isError: true\n.*over this tool's limit/);
  });

  it('JSON-RPC log as cards: requests out to the server lane, replies back', () => {
    const log: LogEntry[] = [];
    const c = connect(createServer('orders'), log);
    c.request('server/discover');
    c.request('tools/list');
    c.request('nope/nothing');
    const ms = rpcMessages(log);
    expect(ms.map(m => `${m.from}>${m.to}:${m.kind}`)).toEqual([
      'host>larkspur-orders:request',
      'larkspur-orders>host:result',
      'host>larkspur-orders:request',
      'larkspur-orders>host:result',
      'host>larkspur-orders:request',
      'larkspur-orders>host:error',
    ]);
    expect(ms.map(m => m.text)).toEqual([
      'server/discover',
      `supports ${PROTOCOL_VERSION}`,
      'tools/list',
      '3 tools: get_order, list_orders_for_customer, issue_refund',
      'nope/nothing',
      'error -32601: Method not found: nope/nothing',
    ]);
    expect(JSON.parse(ms[0].detail).params._meta).toBeDefined();
  });
});

describe('windowing: a long run shows its latest rows, at a readable size', () => {
  const long = seq('wrong-id', { check: true }); // chapter 3's last run
  const cards = (svg: string) => [...svg.matchAll(/class="card \w+" data-msg="(\d+)"/g)].map(m => +m[1]);
  it('draws at most DESK.win cards, the latest ones, with a pill counting the earlier ones', () => {
    expect(long.length).toBeGreaterThan(DESK.win);
    const { svg } = flatScene(toolLanes(), long);
    expect(cards(svg)).toEqual(Array.from({ length: DESK.win }, (_, i) => long.length - DESK.win + i));
    expect(svg).toContain(`↑ ${long.length - DESK.win} earlier messages`);
    expect(flatScene(toolLanes(), long, { upTo: 3 }).svg).not.toContain('earlier');
  });
  it('keeps one frame for the whole run, small enough for 12px text on a 1440×900 screen', () => {
    const at = (upTo: number) => flatScene(toolLanes(), long, { upTo }).h;
    expect(new Set([1, 5, long.length].map(at)).size).toBe(1);
    // the stage's svg is capped at 900 - 220px tall and is about 840px wide at 1440
    const k = Math.min(840 / DESK.w, (900 - 220) / at(long.length));
    expect(DESK.fs * k).toBeGreaterThanOrEqual(12);
  });
  it('cards become buttons with names only when the stage asks', () => {
    expect(flatScene(toolLanes(), long).svg).not.toContain('role="button"');
    const { svg } = flatScene(toolLanes(), long, { pick: true });
    expect(svg).toMatch(
      /<g class="card \w+" data-msg="\d+" role="button" tabindex="0" aria-label="Message \d+, [^"]+\. Show it in full"/,
    );
  });
});

describe('the injected note stays text (KTD12)', () => {
  it('in the drawer, the figure and the ledger', () => {
    const ms = seq('injection', { gate: false });
    const evil = [{ ...ms[0], text: '<img src=x onerror=alert(1)>', detail: '<img src=x onerror=alert(1)>' }, ...ms];
    const html =
      renderToString(createElement(Messages, { lanes: toolLanes(), msgs: evil, upTo: evil.length })) +
      renderToString(createElement(Ledger, { after: run(RECORDINGS.injection, { gate: false }).orders, ids: [1047] }));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('IMPORTANT SYSTEM MESSAGE'); // the planted note, in the lookup result, as text
    expect(html).toMatch(/data-order="1047" data-changed="true"/);
  });
});

describe('integrations', () => {
  it('without MCP one per pair; with MCP one per app plus one per server', () => {
    expect(integrations(3, 4)).toEqual({ without: 12, with: 7 });
    expect(integrations(1, 2)).toEqual({ without: 2, with: 3 });
  });
});
