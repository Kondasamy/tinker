import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { OFFICE_BOARD, officeScene, officeState, officeLabel } from '../../src/components/scenes/officeScene';
import type { Msg } from '../../src/lib/iso/flat';

const ask: Msg = { from: 'emp', to: 'host', kind: 'request', text: 'Where is order 1042?' };
const send: Msg = { from: 'host', to: 'model', kind: 'request', text: 'question + 1 tool' };
const bad: Msg = { from: 'model', to: 'host', kind: 'request', text: 'get_order(order_id: "1042")', stamp: 'INVALID' };
const call = (id: number, batch?: number): Msg => ({ from: 'host', to: 'orders', kind: 'request', text: `get_order(order_id: ${id})`, batch });
const gate = (stamp: Msg['stamp']): Msg => ({ from: 'host', to: 'emp', kind: 'request', text: 'Approve issue_refund?', stamp });

describe('officeState', () => {
  it('puts the last message on its belt and lights its receiver', () => {
    const s = officeState({ msgs: [ask, send], tools: 1 });
    expect(s.flying.map(f => f.m)).toEqual([send]);
    expect(s.busy).toBe('model');
    expect(s.screen).toBeUndefined();   // the model is still reading
  });
  it('a batch rides together; the drawer opens while the order system is called', () => {
    const s = officeState({ msgs: [ask, call(1042, 7), call(1043, 7)], tools: 1 });
    expect(s.flying).toHaveLength(2);
    expect(s.open).toBe(true);
    expect(s.calls).toBe(2);
  });
  it('the model screen: bad for an INVALID call, a guess without tools, and it keeps showing after the model is done', () => {
    expect(officeState({ msgs: [ask, send, bad], tools: 1 }).screen).toBe('bad');
    const guess: Msg = { from: 'model', to: 'host', kind: 'result', text: 'Probably shipped.' };
    expect(officeState({ msgs: [ask, send, guess, { ...guess, from: 'host', to: 'emp' }], tools: 0 }).screen).toBe('warn');
  });
  it('the barrier: down while waiting, raised once approved, down when denied; never raised without a gate', () => {
    expect(officeState({ msgs: [ask, gate('WAITING')], tools: 2, gate: true })).toMatchObject({ waiting: true, up: false });
    expect(officeState({ msgs: [ask, gate('APPROVED'), call(1042)], tools: 2, gate: true })).toMatchObject({ waiting: false, up: true });
    expect(officeState({ msgs: [ask, gate('DENIED')], tools: 2, gate: true }).up).toBe(false);
    expect(officeState({ msgs: [ask, gate('APPROVED')], tools: 2 }).up).toBe(false);
  });
});

describe('officeScene', () => {
  it('renders every station and check, escapes message text, and says it in words', () => {
    const msgs: Msg[] = [ask, { ...send, text: '<b>hi</b>' }];
    const svg = renderToString(createElement(IsoStage, { board: OFFICE_BOARD, scene: officeScene({ msgs, tools: 1, schema: true, owner: true, gate: true }), label: '' }));
    for (const w of ['EMPLOYEE', 'HOST APP', 'MODEL · 1 TOOL', 'ORDER SYSTEM', 'SCHEMA CHECK', 'OWNERSHIP CHECK', 'APPROVAL · CLOSED']) expect(svg).toContain(w);
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('class="capsule"');
    expect(officeLabel({ msgs: [], tools: 0 })).toMatch(/nothing joining it to the host.*Nothing sent yet/);
  });
});
