import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import CASES from '../../data/agents/cases.json';
import { AGENT_SERVERS, answerOf, CONTEXT, MEMORY_CONTEXT, run, stepsOf, tokens, totalTokens, type Run } from '../../src/lib/agents/loop';
import { RECORDINGS, signature } from '../../src/lib/agents/turns';
import { ACCESSED, FACTS, fact } from '../../src/lib/agents/facts';
import { BYTES_PER_TOKEN } from '../../src/lib/scale';
import { connect, createServer, SERVERS } from '../../src/lib/tools/server';

const R = RECORDINGS;
const called = (r: Run) => stepsOf(r, 'call').map((c) => c.call.name);
const refunds = (r: Run, id: number) => r.orders.find((o) => o.id === id)!.refunds;

describe('signature', () => {
  it('is sorted fields; tools sorted, history kept in order', () => {
    expect(signature({ case: 'damaged', tools: ['send_email', 'get_order'], plan: 'off', mem: 'full', hist: ['plan:approved', 'get_order:1042:ok'] }))
      .toBe('case=damaged|hist=plan:approved,get_order:1042:ok|mem=full|plan=off|tools=get_order,send_email');
  });
});

describe('the loop (chapters 1–2)', () => {
  it('damaged delivery, in stock: get_order → check_stock → create_replacement → send_email → answer', () => {
    const r = run(R['02-the-loop']);
    expect(r.status).toBe('done');
    expect(called(r)).toEqual(['get_order', 'check_stock', 'create_replacement', 'send_email']);
    expect(answerOf(r)).toMatch(/replacement/);
    expect(r.mail).toHaveLength(1);
  });

  it('out of stock: the agent switches to a refund and never calls create_replacement after the stock result', () => {
    const r = run(R['01-workflow-or-agent'], { case: 'damaged', stock: 'out' });
    expect(r.status).toBe('done');
    expect(called(r)).toEqual(['get_order', 'check_stock', 'issue_refund', 'send_email']);
    expect(refunds(r, 1042)).toEqual([{ amount: 310, reason: 'damaged' }]);
  });

  it('the script does the routine cases with no model turns, and fails on the case it did not foresee', () => {
    const refund = run(R['01-workflow-or-agent'], { case: 'refund', mode: 'script' });
    expect(refund.status).toBe('done');
    expect(refund.meter).toEqual([]);
    expect(refund.mail).toHaveLength(1);
    expect(run(R['01-workflow-or-agent'], { case: 'damaged', mode: 'script' }).status).toBe('done');
    const out = run(R['01-workflow-or-agent'], { case: 'damaged', mode: 'script', stock: 'out' });
    expect(out.status).toBe('failed');
    expect(out.steps.at(-1)).toMatchObject({ kind: 'halt', call: { name: 'create_replacement' } });
    expect(out.mail).toEqual([]);
    // the agent gets the same routine result, for tokens
    const agent = run(R['01-workflow-or-agent'], { case: 'refund' });
    expect(refunds(agent, 1024)).toEqual(refunds(refund, 1024).map((x) => ({ ...x, reason: 'customer_request' })));
    expect(totalTokens(agent)).toBeGreaterThan(0);
  });

  it('never mutates the fixture data across runs', () => {
    const disk = JSON.parse(readFileSync('data/agents/cases.json', 'utf8'));
    const a = run(R['05-memory']), b = run(R['05-memory']);
    expect(CASES).toEqual(disk);
    expect(stepsOf(b, 'result').filter((s) => s.key.startsWith('create_replacement')).every((s) => !s.result.isError)).toBe(true);
    expect(a.orders).not.toBe(b.orders);
  });
});

describe('plans and approval (chapter 3, KTD11)', () => {
  const plans = (r: Run) => stepsOf(r, 'plan').map((p) => p.items);

  it('[reject, approve]: the model sees the rejection and writes a different plan', () => {
    const r = run(R['03-plans'], { case: 'damaged', stock: 'out', plan: true, approval: 'plan', decide: ['reject', 'approve'] });
    expect(r.status).toBe('done');
    const [first, second] = plans(r);
    expect(second).not.toEqual(first);
    expect(r.signatures[1]).toContain('hist=plan:rejected');
    expect(r.signatures[1]).toContain('plan=rejected');
  });

  it('[reject, reject]: the run ends done with the hand-to-a-person answer, and no tool runs', () => {
    for (const c of ['damaged', 'planted']) {
      const r = run(R['03-plans'], { case: c, stock: 'out', plan: true, approval: 'plan', decide: ['reject', 'reject'] });
      expect(r.status).toBe('done');
      expect(stepsOf(r, 'call')).toEqual([]);
      expect(answerOf(r)).toMatch(/hand this case to a person/);
    }
  });

  it('a call outside the approved plan goes back to approval before it runs', () => {
    const base = { case: 'damaged', stock: 'out' as const, plan: true, approval: 'plan' as const };
    const r = run(R['03-plans'], { ...base, decide: ['approve'] });
    expect(r.status).toBe('waiting');
    expect(r.steps.at(-1)).toMatchObject({ kind: 'approval', items: ['issue_refund:1042'], decision: 'pending' });
    expect(called(r)).not.toContain('issue_refund');
    const yes = run(R['03-plans'], { ...base, decide: ['approve', 'approve'] });
    expect(refunds(yes, 1042)).toHaveLength(1);
    const no = run(R['03-plans'], { ...base, decide: ['approve', 'reject'] });
    expect(no.status).toBe('done');
    expect(refunds(no, 1042)).toEqual([]);
    expect(stepsOf(no, 'result').at(-1)!.key).toBe('issue_refund:1042:rejected');
    // with no approver, plans run as written and nothing waits
    expect(run(R['03-plans'], { ...base, approval: 'none' }).status).toBe('done');
  });

  it('the planted line: with no plan the agent refunds 1043; approving a plan lets a person drop that step', () => {
    expect(refunds(run(R['03-plans'], { case: 'planted' }), 1043)).toHaveLength(1);
    const r = run(R['03-plans'], { case: 'planted', plan: true, approval: 'plan', decide: ['reject', 'approve'] });
    expect(plans(r)[0]).toContain('issue_refund:1043');
    expect(plans(r)[1]).not.toContain('issue_refund:1043');
    expect(refunds(r, 1043)).toEqual([]);
    expect(refunds(r, 1042)).toHaveLength(1);
  });
});

describe('budgets and stuck loops (chapter 4, KTD5, KTD6)', () => {
  const timeout = R['04-budgets'];
  const tracks = (r: Run) => called(r).filter((n) => n === 'track_shipment').length;

  it('detector on (N=3): stuck after the third identical failure; the last turn emails "lookup failed"', () => {
    const r = run(timeout, { repeat: 3 });
    expect(r.status).toBe('stuck');
    expect(tracks(r)).toBe(3);
    expect(stepsOf(r, 'repeat')).toMatchObject([{ times: 3, call: { name: 'track_shipment' } }]);
    const at = r.steps.findIndex((s) => s.kind === 'repeat');
    expect(r.steps[at + 1]).toMatchObject({ kind: 'result', key: 'track_shipment:1051:stopped' });
    expect(r.signatures.at(-1)).toContain('track_shipment:1051:stopped');
    expect(called(r).at(-1)).toBe('send_email');
    expect(r.mail[0].body).toMatch(/could not get a tracking update/);
  });

  it('detector off, step budget 12: out of budget, with track_shipment called again and again', () => {
    const r = run(timeout, { repeat: null, steps: 12 });
    expect(r.status).toBe('out-of-budget');
    expect(tracks(r)).toBe(11);
    expect(r.meter).toHaveLength(12);
    expect(r.mail).toEqual([]);
    expect(r.steps.at(-1)).toMatchObject({ kind: 'budget' });
  });

  it('the step budget ends the run with no further turn, even before the detector fires', () => {
    const r = run(timeout, { repeat: 3, steps: 4 });
    expect(r.status).toBe('out-of-budget');
    expect(r.meter).toHaveLength(4);
  });

  it('token meter: each turn is its context and reply bytes ÷ BYTES_PER_TOKEN, re-sent every turn', () => {
    const r = run(timeout, { repeat: 3 });
    const bytes = (s: string) => new TextEncoder().encode(s).length;
    for (const m of r.meter) {
      expect(m.input).toBe(Math.ceil(bytes(m.context) / BYTES_PER_TOKEN));
      expect(m.output).toBe(Math.ceil(bytes(m.reply) / BYTES_PER_TOKEN));
      expect(m.context).toContain(R['04-budgets'].asks.timeout);
    }
    // the input grows each turn: every earlier reply and result is sent again
    expect(r.meter.every((m, i) => i === 0 || m.input > r.meter[i - 1].input)).toBe(true);
    expect(totalTokens(r)).toBe(r.meter.reduce((n, m) => n + m.input + m.output, 0));
    expect(tokens('abcd')).toBe(1);
  });
});

describe('memory (chapter 5, KTD12)', () => {
  const storm = R['05-memory'];
  const email2101 = (r: Run) => r.mail.find((m) => m.order_id === 2101)!.body;

  it('summary: compaction runs once over the threshold; later signatures carry the marker, not the dropped results', () => {
    const r = run(storm, { mem: 'summary' });
    expect(r.status).toBe('done');
    const [c] = stepsOf(r, 'compact');
    expect(stepsOf(r, 'compact')).toHaveLength(1);
    const at = r.signatures.findIndex((s) => s.includes('hist=summary'));
    expect(at).toBeGreaterThan(0);
    for (const s of r.signatures.slice(at)) for (const k of c.dropped) expect(s).not.toContain(k);
    expect(r.meter[at].input).toBeLessThan(run(storm).meter[at].input);
  });

  it('summary drops the "no phone calls" note and the email offers a call; pinned and full keep it', () => {
    const note = CASES.orders.find((o) => o.id === 2101)!.note!;
    const summary = run(storm, { mem: 'summary' }), pinned = run(storm, { mem: 'pinned' }), full = run(storm);
    expect(summary.meter.at(-1)!.context).not.toContain(note);
    expect(email2101(summary)).toMatch(/phone you/);
    expect(pinned.meter.at(-1)!.context).toContain(note);
    expect(stepsOf(pinned, 'compact')[0].pins.join()).toContain(note);
    for (const r of [pinned, full]) {
      expect(email2101(r)).not.toMatch(/phone you/);
      expect(email2101(r)).toMatch(/keep to email, as you asked/);
    }
  });

  it('full memory stays inside the host context budget; a smaller budget stops the run', () => {
    const full = run(storm);
    expect(Math.max(...full.meter.map((m) => m.input))).toBeLessThanOrEqual(CONTEXT);
    expect(run(storm, { context: 1500 })).toMatchObject({ status: 'out-of-budget' });
  });

  it('at chapter 5’s budget, full memory passes it on its last turn, before the agent reports done; summary and pinned fit', () => {
    const full = run(storm, { context: MEMORY_CONTEXT });
    expect(full.status).toBe('out-of-budget');
    expect(stepsOf(full, 'answer')).toHaveLength(0);
    expect(full.mail).toHaveLength(CASES.orders.length);
    for (const mem of ['summary', 'pinned'] as const) {
      const r = run(storm, { mem, context: MEMORY_CONTEXT });
      expect(r.status).toBe('done');
      expect(Math.max(...r.meter.map((m) => m.input))).toBeLessThanOrEqual(MEMORY_CONTEXT);
    }
  });
});

describe('sub-agents (chapter 6, KTD7)', () => {
  const r = run(R['06-sub-agents'], { helpers: true });
  const helpers = stepsOf(r, 'helper');

  it('each helper is a nested run with its own recording and history; the lead sees only its report', () => {
    expect(r.status).toBe('done');
    expect(helpers.map((h) => h.call.arguments.order_id)).toEqual([2101, 2102, 2103, 2104, 2105]);
    for (const h of helpers) {
      expect(h.run.status).toBe('done');
      for (const sig of h.run.signatures) expect(r.signatures).not.toContain(sig);
      for (const k of stepsOf(h.run, 'result').map((x) => x.key)) for (const s of r.signatures) expect(s).not.toContain(k);
    }
    expect(r.signatures[1]).toContain('hist=delegate:2101:ok,delegate:2102:ok,delegate:2103:ok,delegate:2104:ok,delegate:2105:ok|');
    expect(r.mail).toHaveLength(5);
    expect(stepsOf(r, 'call')).toEqual([]);
  });

  it('each helper starts clean, so its biggest context is smaller than the lone lead’s', () => {
    const alone = run(R['06-sub-agents']);
    expect(alone.status).toBe('done');
    const peak = (x: Run) => Math.max(...x.meter.map((m) => m.input));
    for (const h of helpers) expect(peak(h.run)).toBeLessThan(peak(alone));
    expect(totalTokens(r)).toBe(r.meter.reduce((n, m) => n + m.input + m.output, 0) + helpers.reduce((n, h) => n + totalTokens(h.run), 0));
  });
});

describe('servers (KTD2)', () => {
  it('the agent bundle serves its own servers; Tool calling’s server list does not grow', () => {
    expect(Object.keys(SERVERS)).toEqual(['orders', 'calendar']);
    expect(Object.keys(AGENT_SERVERS)).toEqual(['orders', 'warehouse', 'carrier', 'mail']);
    const r = run(R['04-budgets']);
    const lists = r.log.filter((l) => 'result' in l.message && Array.isArray(l.message.result.tools));
    expect(lists.flatMap((l) => ('result' in l.message ? (l.message.result.tools as { name: string }[]).map((t) => t.name) : [])))
      .toEqual(['get_order', 'issue_refund', 'track_shipment', 'send_email']);
    // the default bundle is still Tool calling's
    const res = connect(createServer('orders')).request('tools/list');
    expect('result' in res && (res.result.tools as { name: string }[]).map((t) => t.name)).toEqual(['get_order', 'list_orders_for_customer', 'issue_refund']);
  });
});

describe('facts (R8)', () => {
  it('every fact has a claim, a source URL and the access date', () => {
    expect(ACCESSED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(f.claim.trim(), f.id).not.toBe('');
      expect(f.source, f.id).toMatch(/^https:\/\//);
    }
    expect(() => fact('nope')).toThrow();
  });

  it('every fact id the agents chapters use exists', () => {
    const dir = 'src/content/agents';
    const files = existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(ts|tsx|astro)$/.test(f)) : [];
    for (const f of files)
      for (const [, id] of readFileSync(`${dir}/${f}`, 'utf8').matchAll(/\bfact\(\s*'([^']+)'/g)) expect(FACTS.map((x) => x.id), `${f}: ${id}`).toContain(id);
  });
});
