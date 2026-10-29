import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  OFFICE_BOARD,
  OFFICE_PARTS,
  officeScene,
  officeState,
  officeLabel,
  type OfficeOpts,
} from '../../src/components/scenes/officeScene';
import type { Msg } from '../../src/lib/iso/flat';
import { MCP_BOARD, connectScene, countScene } from '../../src/components/scenes/mcpScene';

const ask: Msg = { from: 'emp', to: 'host', kind: 'request', text: 'Where is order 1042?' };
const send: Msg = { from: 'host', to: 'model', kind: 'request', text: 'question + 1 tool' };
const bad: Msg = { from: 'model', to: 'host', kind: 'request', text: 'get_order(order_id: "1042")', stamp: 'INVALID' };
const call = (id: number, batch?: number): Msg => ({
  from: 'host',
  to: 'orders',
  kind: 'request',
  text: `get_order(order_id: ${id})`,
  batch,
});
const gate = (stamp: Msg['stamp']): Msg => ({
  from: 'host',
  to: 'emp',
  kind: 'request',
  text: 'Approve issue_refund?',
  stamp,
});

describe('officeState', () => {
  it('puts the last message on its belt and lights its receiver', () => {
    const s = officeState({ msgs: [ask, send], tools: 1 });
    expect(s.flying.map(f => f.m)).toEqual([send]);
    expect(s.busy).toBe('model');
    expect(s.screen).toBeUndefined(); // the model is still reading
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
    expect(officeState({ msgs: [ask, send, guess, { ...guess, from: 'host', to: 'emp' }], tools: 0 }).screen).toBe(
      'warn',
    );
  });
  it('the barrier: down while waiting, raised once approved, down when denied; never raised without a gate', () => {
    expect(officeState({ msgs: [ask, gate('WAITING')], tools: 2, gate: true })).toMatchObject({
      waiting: true,
      up: false,
    });
    expect(officeState({ msgs: [ask, gate('APPROVED'), call(1042)], tools: 2, gate: true })).toMatchObject({
      waiting: false,
      up: true,
    });
    expect(officeState({ msgs: [ask, gate('DENIED')], tools: 2, gate: true }).up).toBe(false);
    expect(officeState({ msgs: [ask, gate('APPROVED')], tools: 2 }).up).toBe(false);
  });
});

describe('officeScene', () => {
  it('renders every station and check, escapes message text, and says it in words', () => {
    const msgs: Msg[] = [ask, { ...send, text: '<b>hi</b>' }];
    const svg = renderToString(
      createElement(IsoStage, {
        board: OFFICE_BOARD,
        scene: officeScene({ msgs, tools: 1, schema: true, owner: true, gate: true }),
        label: '',
      }),
    );
    for (const w of [
      'EMPLOYEE',
      'HOST APP',
      'MODEL · 1 TOOL',
      'ORDER SYSTEM',
      'SCHEMA CHECK',
      'OWNERSHIP CHECK',
      'APPROVAL · CLOSED',
    ])
      expect(svg).toContain(w);
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('class="capsule"');
    expect(officeLabel({ msgs: [], tools: 0 })).toMatch(/nothing joining it to the host.*Nothing sent yet/);
  });
});

const draw = (o: OfficeOpts) =>
  renderToString(createElement(IsoStage, { board: OFFICE_BOARD, scene: officeScene(o), label: '' }));

describe('office callouts', () => {
  const callouts = (svg: string) => svg.split('<g class="callout"').length - 1;
  const full = (_: string): OfficeOpts => ({ msgs: [ask, send], tools: 1, schema: true, owner: true, gate: true });
  it('a callout over each part draws one lit pill with its words', () => {
    for (const block of OFFICE_PARTS) {
      const svg = draw({ ...full(block), say: { block, text: 'LOOK HERE' } });
      expect(callouts(svg), block).toBe(1);
      expect(svg.slice(svg.indexOf('<g class="callout"'))).toContain('LOOK HERE');
    }
  });
  it('an unknown part draws no callout, and the picture is as without one', () => {
    const svg = draw({ ...full('model'), say: { block: 'nowhere', text: 'LOOK HERE' } });
    expect(callouts(svg)).toBe(0);
    expect(svg).toBe(draw(full('model')));
  });
  it('phones drop a callout over 16 characters and keep one of 16', () => {
    const phone = (text: string) => callouts(draw({ ...full('model'), scale: 1.8, say: { block: 'model', text } }));
    expect(phone('A'.repeat(17))).toBe(0);
    expect(phone('A'.repeat(16))).toBe(1);
  });
});

describe('the office machines', () => {
  const draw = (scene: ReturnType<typeof officeScene>, board = OFFICE_BOARD) =>
    renderToString(createElement(IsoStage, { board, scene, label: '' }));
  it('draws the employee as a person, the host as a sorting machine and stock beside a potted plant', () => {
    const svg = draw(officeScene({ msgs: [], tools: 1 }));
    expect(svg).toContain('data-look="employee"');
    expect(svg).toContain('class="sorter"');
    expect(svg).toContain('class="plant"');
    expect(svg).toContain('data-kit="model"');
    expect(svg).not.toContain('NaN');
    // the hero leaves the stock out but keeps the employee
    const bare = draw(officeScene({ msgs: [], tools: 1, names: false }));
    expect(bare).toContain('data-look="employee"');
    expect(bare).not.toContain('class="plant"');
  });
  it("MCP's scenes reuse the sorter for apps and the cabinet for servers", () => {
    const svg = draw(
      connectScene({
        servers: [
          { name: 'A<b>', connected: true },
          { name: 'B', connected: false },
        ],
      }),
      MCP_BOARD,
    );
    expect(svg.split('class="sorter"').length - 1).toBe(1);
    expect(svg).toContain('A&lt;b&gt;');
    expect(svg).not.toContain('NaN');
    const count = draw(countScene({ apps: 3, systems: 2, mcp: true }), MCP_BOARD);
    expect(count.split('class="sorter"').length - 1).toBe(3);
  });
});
