// The office family's people and heroes (agents, guardrails, sandboxing, evals), and the layer helpers they compose with.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import type { Board, SceneCtx } from '../../src/lib/iso/IsoStage';
import { SHADOW } from '../../src/lib/iso/core.js';
import { OFFICE_BOARD, officeScene } from '../../src/components/scenes/officeScene';
import { officeLayers, withoutPerson } from '../../src/components/scenes/officeLayers';
import { AGENT_BOARD, agentScene } from '../../src/components/scenes/agentScene';
import { GUARD_BOARD, guardScene } from '../../src/components/scenes/guardScene';
import { SANDBOX_BOARD, sandboxScene } from '../../src/components/scenes/sandboxScene';
import { EVAL_BOARD, evalScene } from '../../src/components/scenes/evalScene';
import { run as agentRun } from '../../src/lib/agents/loop';
import { RECORDINGS } from '../../src/lib/agents/turns';
import { run as guardRun } from '../../src/lib/guardrails/loop';
import { RECORDING as GUARD } from '../../src/lib/guardrails/turns';
import { run as sandboxRun } from '../../src/lib/sandboxing/loop';
import { RECORDING as SANDBOX } from '../../src/lib/sandboxing/turns';

const draw = (board: Board, scene: (ctx: SceneCtx) => string) =>
  renderToString(createElement(IsoStage, { board, scene, label: '' }));
const people = (svg: string) => [...svg.matchAll(/<g class="person" data-look="([^"]+)"/g)].map(m => m[1]);

describe('office layers', () => {
  it('split the office into its shadow floor and its art, and cut a person out whole', () => {
    let s = '';
    draw(OFFICE_BOARD, ctx => (s = officeScene({ msgs: [], tools: 1 })(ctx)));
    const { floor, art } = officeLayers(s);
    // the floor is shadows only (several), and the art starts after the last of them
    expect(new Set(floor.match(/fill="[^"]+"/g))).toEqual(new Set([`fill="${SHADOW}"`]));
    expect(floor.match(/fill=/g)?.length).toBeGreaterThan(3);
    expect(art.startsWith('<path') && art.slice(0, 400).includes(`fill="${SHADOW}"`)).toBe(false);
    // the employee comes out whole, nested groups and all
    const cut = withoutPerson(s, 'employee'),
      open = (x: string) => x.split('<g').length - x.split('</g>').length;
    expect(cut).not.toContain('data-look="employee"');
    expect(open(cut)).toBe(open(s));
    expect(withoutPerson(s, 'nobody')).toBe(s);
  });
});

describe('the office family heroes and people', () => {
  it('agents: the support lead holds the case at the counter, in the employee’s place', () => {
    const svg = draw(
      AGENT_BOARD,
      agentScene({ run: agentRun(RECORDINGS['01-workflow-or-agent'], { case: 'refund' }) }),
    );
    expect(people(svg)).toEqual(['supportLead']);
    expect(svg).toContain('data-prop="case"');
  });
  it('agents: with helpers on, the case lies on the counter and a clerk sits at the working desk', () => {
    const r = agentRun(RECORDINGS['06-sub-agents'], { helpers: true }),
      busy = r.steps.findIndex(s => s.kind === 'helper') + 1;
    const svg = draw(AGENT_BOARD, agentScene({ run: r, upTo: busy, helpers: true }));
    expect(svg).toContain('data-prop="case"');
    expect(people(svg)).toEqual(['custom']);
    expect(people(draw(AGENT_BOARD, agentScene({ run: r, helpers: true })))).toEqual([]);
  });
  it('guardrails: a guard by the screening arch, the mail-room clerk at the counter', () => {
    const svg = draw(GUARD_BOARD, guardScene({ run: guardRun(GUARD, { case: 'invoice' }), screen: true }));
    expect(people(svg).sort()).toEqual(['custom', 'employee']);
    expect(svg).toContain('data-prop="arch"');
    expect(svg).toContain('data-prop="postbox"');
  });
  it('sandboxing: the operator stands outside the glass room, in the employee’s place', () => {
    const r = sandboxRun(SANDBOX, {
      case: 'report',
      sandbox: true,
      files: 'scoped',
      egress: 'allowlist',
      secret: 'proxy',
    });
    const svg = draw(SANDBOX_BOARD, sandboxScene({ run: r, wall: true, proxy: true }));
    expect(people(svg)).toEqual(['operator']);
    expect(svg).toContain('data-prop="wall" data-near="1"');
  });
  it('evals: the grader stands behind the desk with its big stamp and inked pad', () => {
    const svg = draw(EVAL_BOARD, evalScene({ results: [true, false], graded: 1 }));
    expect(people(svg)).toEqual(['custom']);
    for (const p of ['stamp', 'ink-pad', 'scoreboard']) expect(svg).toContain(`data-prop="${p}"`);
  });
});
