import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { flatScene } from '../../src/lib/iso/flat';
import {
  AGENT_BOARD,
  agentLabel,
  agentScene,
  agentState,
  type AgentOpts,
} from '../../src/components/scenes/agentScene';
import { agentLanes, agentMessages } from '../../src/components/scenes/agentSequence';
import { readouts } from '../../src/content/agents/kit';
import { CONTEXT, run, stepsOf, type Run } from '../../src/lib/agents/loop';
import { RECORDINGS as R } from '../../src/lib/agents/turns';

const draw = (o: AgentOpts) =>
  renderToString(createElement(IsoStage, { board: AGENT_BOARD, scene: agentScene(o), label: agentLabel(o) }));
const count = (svg: string, s: string) => svg.split(s).length - 1;
const at = (r: Run, pred: (k: string) => boolean) =>
  r.steps.findIndex(s => pred('key' in s ? `${s.kind}=${s.key}` : s.kind));

const PLAN = run(R['03-plans'], { case: 'damaged', stock: 'out', plan: true });
const LOOP = run(R['02-the-loop']);
const STUCK = run(R['04-budgets'], { repeat: null });
const SUMMARY = run(R['05-memory'], { mem: 'summary' });
const HELPERS = run(R['06-sub-agents'], { helpers: true });
const GAUGE = { steps: 12, context: CONTEXT };

describe('the clipboard', () => {
  it('one tick per finished plan item, none before the first', () => {
    const first = at(PLAN, k => k.startsWith('result='));
    const before = agentState({ run: PLAN, upTo: first });
    expect(before.plan).toMatchObject({ ticks: 0, items: stepsOf(PLAN, 'plan')[0].items.length });
    expect(draw({ run: PLAN, upTo: first, clipboard: true })).toContain('data-ticks="0"');
    expect(agentState({ run: PLAN, upTo: first + 1 }).plan!.ticks).toBe(1);
    // the stock is out, so the agent refunds instead: create_replacement is struck, the refund added after it and ticked
    const end = agentState({ run: PLAN }).plan!;
    expect(end.rows).toEqual([
      { item: 'get_order:1042', done: true, struck: false },
      { item: 'check_stock:1042', done: true, struck: false },
      { item: 'create_replacement:1042', done: false, struck: true },
      { item: 'issue_refund:1042', done: true, struck: false },
      { item: 'send_email:1042', done: true, struck: false },
    ]);
    expect(end).toMatchObject({ ticks: 4, items: 4 });
    expect(count(draw({ run: PLAN, clipboard: true }), 'class="struck"')).toBe(1);
    expect(count(draw({ run: PLAN, clipboard: true }), 'class="tick"')).toBe(end.ticks);
  });
  it('with no plan, no clipboard is drawn', () => {
    expect(agentState({ run: LOOP }).plan).toBeNull();
    expect(draw({ run: LOOP, clipboard: true })).not.toContain('data-prop="clipboard"');
  });
});

describe('the in-tray', () => {
  it('grows with the history, then becomes one binder after compaction, not N papers', () => {
    const c = at(SUMMARY, k => k === 'compact');
    const before = agentState({ run: SUMMARY, upTo: c });
    expect(before.tray.binder).toBe(false);
    expect(before.tray.papers).toBeGreaterThan(agentState({ run: SUMMARY, upTo: c - 4 }).tray.papers);
    const svg = draw({ run: SUMMARY, upTo: c + 1, tray: true });
    expect(count(svg, 'class="binder"')).toBe(1);
    expect(count(svg, 'class="paper"')).toBe(0);
    // the next turn and its result go on top of the binder
    expect(agentState({ run: SUMMARY, upTo: at(SUMMARY, k => k === 'result=send_email:2101:ok') + 1 }).tray).toEqual({
      papers: 2,
      binder: true,
    });
  });
});

describe('the gauge', () => {
  it('fills with turns ÷ step budget and context ÷ context budget, from the run', () => {
    for (const upTo of [5, 20, STUCK.steps.length]) {
      const st = agentState({ run: STUCK, upTo, gauge: GAUGE });
      const turn = stepsOf({ ...STUCK, steps: STUCK.steps.slice(0, upTo) }, 'proposal').at(-1)!.turn;
      expect(st.context).toBe(STUCK.meter[turn].input);
      expect(st.gauge).toEqual({ steps: Math.min(1, st.turns / 12), context: st.context / CONTEXT });
    }
    expect(agentState({ run: STUCK, gauge: GAUGE }).gauge!.steps).toBe(1);
  });
  it('a 0 budget draws empty, never divides by zero', () => {
    const o = { run: STUCK, upTo: 20, gauge: { steps: 0, context: 0 } };
    expect(agentState(o).gauge).toEqual({ steps: 0, context: 0 });
    const svg = draw(o);
    expect(svg).toContain('data-steps="0.000" data-context="0.000"');
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
  it('a context-budget stop: the turn that would go over, rebuilt by the loop’s rule, matches the host’s count', () => {
    const r = run(R['05-memory'], { mem: 'full', context: 1500 });
    const stop = r.steps.at(-1)!;
    expect(stop.kind).toBe('budget');
    const st = agentState({ run: r, gauge: { steps: 12, context: 1500 } });
    expect(st.over).toBe(true);
    expect(st.gauge!.context).toBe(1);
    expect(stop.kind === 'budget' && stop.text).toContain(`needs ${st.context} tokens`);
  });
});

describe('the helper desks', () => {
  it('appear only when the run delegates, one per delegated order (one desk and a count pill on phones)', () => {
    expect(count(draw({ run: HELPERS, helpers: true }), 'data-prop="helper"')).toBe(stepsOf(HELPERS, 'helper').length);
    expect(draw({ run: SUMMARY, helpers: true })).not.toContain('data-prop="helper"');
    expect(draw({ run: HELPERS })).not.toContain('data-prop="helper"');
    const phone = draw({ run: HELPERS, helpers: true, scale: 1.8 });
    expect(count(phone, 'data-prop="helper"')).toBe(1);
    expect(phone).toContain(`HELPERS ×${stepsOf(HELPERS, 'helper').length}`);
  });
});

describe('untrusted strings', () => {
  it('a note containing <script> renders escaped in both drawings', () => {
    const evil = '<script>alert(1)</script>';
    const r: Run = {
      ...PLAN,
      steps: PLAN.steps.map(s =>
        s.kind === 'answer' ? { ...s, text: evil } : s.kind === 'plan' ? { ...s, text: evil } : s,
      ),
    };
    const o = { run: r, host: evil, clipboard: true, gauge: GAUGE, tray: true };
    for (const svg of [
      draw(o),
      draw({ ...o, scale: 1.8 }),
      flatScene(agentLanes(r, evil), agentMessages(r)).svg,
      flatScene(agentLanes(r), agentMessages(r), { phone: true }).svg,
    ]) {
      expect(svg).not.toContain('<script');
    }
  });
});

describe('the Steps lanes', () => {
  it('one mark per run step, in order', () => {
    for (const r of [
      PLAN,
      LOOP,
      STUCK,
      SUMMARY,
      HELPERS,
      run(R['01-workflow-or-agent'], { case: 'damaged', mode: 'script', stock: 'out' }),
    ]) {
      const msgs = agentMessages(r),
        lanes = agentLanes(r);
      expect(msgs).toHaveLength(r.steps.length);
      for (const m of msgs) expect(lanes.map(l => l.id)).toEqual(expect.arrayContaining([m.from, m.to]));
      const marks = [...flatScene(lanes, msgs, { win: Infinity }).svg.matchAll(/data-msg="(\d+)"/g)].map(x => +x[1]);
      expect(marks).toEqual(r.steps.map((_, i) => i));
    }
    expect(agentLanes(HELPERS).map(l => l.id)).toEqual(['model', 'host', 'orders', 'helpers']);
    expect(agentLanes(LOOP).map(l => l.id)).toEqual(['model', 'host', 'orders']);
  });
});

describe('the caption', () => {
  it('repeats the props’ readouts: turn N of M, tokens, plan ticks', () => {
    const say = readouts({ run: PLAN, upTo: at(PLAN, k => k === 'answer'), clipboard: true, gauge: GAUGE });
    expect(say[0]).toMatch(/^Turn \d+ of 12$/);
    expect(say).toContain(`plan 4 of 4 done, 1 struck out`);
    expect(say.some(s => / tokens in all$/.test(s))).toBe(true);
  });
});
