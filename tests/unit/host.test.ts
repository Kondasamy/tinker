import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { combos, DOMAINS, run, type Step } from '../../src/lib/tools/host';
import { ORDERS } from '../../src/lib/tools/server';
import { RECORDINGS, signature } from '../../src/lib/tools/turns';

const kinds = (steps: Step[]) => steps.map((s) => s.kind);
const of = <K extends Step['kind']>(steps: Step[], kind: K) => steps.filter((s): s is Extract<Step, { kind: K }> => s.kind === kind);
const answer = (steps: Step[]) => of(steps, 'answer')[0]?.text;
const order = (orders: typeof ORDERS, id: number) => orders.find((o) => o.id === id)!;
const turnText = (id: string, last: string, gate = 'on') => RECORDINGS[id].turns[`desc=clear|gate=${gate}|inj=${id === 'injection' ? 'yes' : 'no'}|last=${last}|tools=get_order,issue_refund`].text;

describe('signature', () => {
  it('is sorted, joined fields; tools sorted, results kept in call order', () => {
    expect(signature({ tools: ['get_order', 'get_calendar'], desc: 'clear', gate: false, last: ['get_order:1043:ok', 'get_order:1042:ok'], injection: false }))
      .toBe('desc=clear|gate=off|inj=no|last=get_order:1043:ok,get_order:1042:ok|tools=get_calendar,get_order');
  });
});

describe('host loop', () => {
  it('a valid proposal with the gate off runs the tool and appends its result', () => {
    const r = run(RECORDINGS['order-status']);
    expect(r.status).toBe('done');
    expect(kinds(r.steps)).toEqual(['send', 'proposal', 'validation', 'call', 'result', 'answer']);
    expect(of(r.steps, 'validation')[0].errors).toEqual([]);
    expect(of(r.steps, 'result')[0].result).toMatchObject({ isError: false, structuredContent: { id: 1042 } });
    expect(of(r.steps, 'send')[0].tools.map((t) => t.name)).toEqual(['get_order', 'get_calendar']);
    expect(r.log.some((l) => 'method' in l.message && l.message.method === 'tools/call')).toBe(true);
  });

  it('no tools: the model can only guess', () => {
    const r = run(RECORDINGS['no-tools']);
    expect(kinds(r.steps)).toEqual(['send', 'answer']);
    expect(r.log).toEqual([]);
  });

  it('a vague description changes what the model sees, and so its turn', () => {
    const clear = run(RECORDINGS['order-status'], { desc: 'clear' }), vague = run(RECORDINGS['order-status'], { desc: 'vague' });
    expect(of(vague.steps, 'send')[0].tools[0].description).toBe('Gets data.');
    expect(of(vague.steps, 'call')).toEqual([]);
    expect(answer(vague.steps)).not.toBe(answer(clear.steps));
  });

  it('a string where an integer belongs is caught before the call; the model retries', () => {
    const r = run(RECORDINGS['invalid-arg']);
    const [bad, good] = of(r.steps, 'validation');
    expect(bad.errors).toEqual(['order_id must be an integer']);
    expect(good.errors).toEqual([]);
    expect(of(r.steps, 'call')).toHaveLength(1);
    expect(of(r.steps, 'result')[0].result).toMatchObject({ isError: true, content: [{ text: 'order_id must be an integer' }] });
    expect(r.status).toBe('done');
  });

  it('a valid but wrong order id passes the schema; only the ownership check catches it', () => {
    const off = run(RECORDINGS['wrong-id'], { check: false }), on = run(RECORDINGS['wrong-id'], { check: true });
    expect(of(off.steps, 'validation').every((v) => v.errors.length === 0)).toBe(true);
    expect(of(off.steps, 'result')[0].result.structuredContent).toMatchObject({ id: 1024, customer: 'Birch & Co' });
    expect(of(on.steps, 'result')[0].result.isError).toBe(true);
    expect(of(on.steps, 'call').map((c) => c.call.arguments.order_id)).toEqual([1024, 1042]);
  });

  it('independent lookups run in parallel from one turn', () => {
    const r = run(RECORDINGS.parallel);
    expect(of(r.steps, 'proposal').map((p) => p.turn)).toEqual([0, 0]);
    expect(of(r.steps, 'result')).toHaveLength(2);
    expect(r.status).toBe('done');
  });

  it('a refund that needs the total runs in sequence and refunds exactly that total', () => {
    const r = run(RECORDINGS['refund-sequence']);
    expect(of(r.steps, 'proposal').map((p) => [p.turn, p.call.name])).toEqual([[0, 'get_order'], [1, 'issue_refund']]);
    expect(of(r.steps, 'proposal')[1].call.arguments.amount).toBe(order(ORDERS, 1042).total);
    expect(order(r.orders, 1042).refunds).toEqual([{ amount: 310, reason: 'damaged' }]);
  });

  it('a run that hits the call cap stops with a "too many calls" step', () => {
    const r = run(RECORDINGS.parallel, { cap: 1 });
    expect(r.status).toBe('capped');
    const last = r.steps[r.steps.length - 1];
    expect(last).toMatchObject({ kind: 'cap', limit: 1 });
    expect(last.kind === 'cap' && last.text).toMatch(/too many calls/i);
    expect(of(r.steps, 'call')).toHaveLength(1);
  });

  it('AE5: gate on and deny chosen: no tool runs and the denied-call turn plays', () => {
    const r = run(RECORDINGS['refund-gate'], { gate: true, decide: 'deny' });
    expect(of(r.steps, 'gate')).toMatchObject([{ decision: 'deny', call: { name: 'issue_refund' } }]);
    expect(of(r.steps, 'call').map((c) => c.call.name)).toEqual(['get_order']);
    expect(order(r.orders, 1042).refunds).toEqual([]);
    expect(answer(r.steps)).toBe(turnText('refund-gate', 'issue_refund:1042:denied'));
    expect(answer(r.steps)).toMatch(/could not issue the refund/);
  });

  it('gate on and approve: the refund runs; read-only tools never wait at the gate', () => {
    const r = run(RECORDINGS['refund-gate'], { gate: true, decide: 'approve' });
    expect(of(r.steps, 'gate').map((g) => g.call.name)).toEqual(['issue_refund']);
    expect(order(r.orders, 1042).refunds).toEqual([{ amount: 310, reason: 'damaged' }]);
  });

  it('a refund limit refuses an over-limit refund (least privilege)', () => {
    const r = run(RECORDINGS['refund-gate'], { limit: 100 });
    expect(of(r.steps, 'result')[1].result.isError).toBe(true);
    expect(order(r.orders, 1042).refunds).toEqual([]);
    expect(answer(r.steps)).toBe(turnText('refund-gate', 'issue_refund:1042:error', 'off'));
  });

  it('AE6: an injected result with the gate off leads to an extra issue_refund proposal that runs', () => {
    const r = run(RECORDINGS.injection, { gate: false });
    const refund = of(r.steps, 'proposal').find((p) => p.call.name === 'issue_refund')!;
    expect(refund.call.arguments).toMatchObject({ order_id: 1047, amount: 5000 });
    expect(of(r.steps, 'call').map((c) => c.call.name)).toEqual(['get_order', 'issue_refund']);
    expect(order(r.orders, 1047).refunds).toEqual([{ amount: 5000, reason: 'customer_request' }]);
    expect(r.signatures.slice(1).every((s) => s.includes('inj=yes'))).toBe(true);
  });

  it('AE6: with the gate on, the extra proposal waits at approval', () => {
    const r = run(RECORDINGS.injection, { gate: true });
    expect(r.status).toBe('waiting');
    expect(r.steps[r.steps.length - 1]).toMatchObject({ kind: 'gate', decision: 'pending', call: { name: 'issue_refund' } });
    expect(order(r.orders, 1047).refunds).toEqual([]);
    const approved = run(RECORDINGS.injection, { gate: true, decide: (c) => (c.name === 'issue_refund' ? 'approve' : undefined) });
    expect(order(approved.orders, 1047).refunds).toHaveLength(1);
    const denied = run(RECORDINGS.injection, { gate: true, decide: 'deny' });
    expect(denied.status).toBe('done');
    expect(order(denied.orders, 1047).refunds).toEqual([]);
  });

  it('the injected note passes through as a plain, unaltered string', () => {
    const r = run(RECORDINGS.injection);
    const note = order(ORDERS, 1047).note!;
    const res = of(r.steps, 'result')[0].result;
    expect(typeof res.content[0].text).toBe('string');
    expect(JSON.parse(res.content[0].text).note).toBe(note);
    expect(res.structuredContent!.note).toBe(note);
    expect(res.structuredContent).not.toHaveProperty('injected');
  });

  it('an unknown signature returns norecord with a visible message, never a crash', () => {
    const r = run({ ...RECORDINGS['order-status'], turns: {} });
    expect(r.status).toBe('norecord');
    expect(r.steps[r.steps.length - 1]).toMatchObject({ kind: 'norecord', text: expect.stringMatching(/no recording/i) });
    expect(run(RECORDINGS.parallel, { desc: 'vague' }).status).toBe('norecord');
  });

  it('never mutates the fixture data across runs', () => {
    const disk = JSON.parse(readFileSync('data/tool-calling/orders.json', 'utf8'));
    const a = run(RECORDINGS.injection, { gate: false });
    const b = run(RECORDINGS.injection, { gate: false });
    expect(ORDERS).toEqual(disk);
    expect(order(b.orders, 1047).refunds).toHaveLength(1);
    expect(a.orders).not.toBe(b.orders);
  });
});

describe('coverage', () => {
  it('every recording has a control domain, and every domain a recording', () => {
    expect(Object.keys(DOMAINS).sort()).toEqual(Object.keys(RECORDINGS).sort());
  });

  it('every signature reachable from the chapter controls has a recorded turn, and every recorded turn is reachable', () => {
    for (const [id, rec] of Object.entries(RECORDINGS)) {
      const seen = new Set<string>();
      for (const setup of combos(id)) {
        const r = run(rec, setup);
        expect(r.status, `${id} ${JSON.stringify(setup)} → ${r.signatures.at(-1)}`).not.toBe('norecord');
        r.signatures.forEach((s) => seen.add(s));
      }
      expect([...seen].sort(), id).toEqual(Object.keys(rec.turns).sort());
    }
  });
});
