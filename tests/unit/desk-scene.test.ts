// The agent's desk (U22): every part a callout may name is drawn, the lamps read the live test result of the hunks a
// reviewer kept, code renders as text (a `<` stays a `<`), and the hunk checkboxes come before Run tests.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  DESK_BOARD,
  DESK_PARTS,
  agentDeskPlot,
  beatsOf,
  deskAt,
  deskCard,
  deskLabel,
  deskScene,
  type DeskOpts,
} from '../../src/components/scenes/deskScene';
import { patchPanel } from '../../src/components/scenes/codePanel';
import { CodeView, play } from '../../src/content/coding-agents/kit';
import { runTests } from '../../src/lib/coding-agents/tests';

const draw = (o: DeskOpts) =>
  renderToString(createElement(IsoStage, { board: DESK_BOARD, scene: deskScene(o), label: deskLabel(o) }));

describe('the agent’s desk', () => {
  it('draws every part a callout may name', () => {
    const svg = draw(deskCard());
    for (const p of DESK_PARTS) expect(svg, p).toContain(`data-part="${p}"`);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])('the lamps match the live result of the hunks kept (mask %i)', mask => {
    const r = play({ case: 'bulk', review: mask }),
      o = deskAt(r, beatsOf(r).length),
      live = runTests(r.code);
    expect(o.lamps).toEqual(live.map(t => (t.pass ? 'pass' : 'fail')));
    const svg = draw(o);
    for (const t of live) expect(svg).toContain(`data-lamp="${t.id}" data-state="${t.pass ? 'pass' : 'fail'}"`);
    expect(o.hunks).toEqual([0, 1, 2].map(i => Boolean((mask >> i) & 1)));
  });

  it('a search lights its drawers, a read opens one, protection padlocks the tests', () => {
    const r = play({ case: 'cheat', protect: true });
    expect(deskAt(r, 2).drawers).toContain('open');
    expect(draw(deskAt(r, 2))).toContain('data-lock="1"');
    const s = play({ case: 'bulk' });
    expect(deskAt(s, 1).drawers!.filter(d => d === 'hit').length).toBeGreaterThan(0);
  });

  it('a refused edit stamps the patch, and the phone keeps names only', () => {
    const r = play({ case: 'cheat', protect: true }),
      i = beatsOf(r).findIndex(b => b.kind === 'edit' && b.outcome === 'refused');
    const o = deskAt(r, i + 1);
    expect(o.refused).toBe(true);
    expect(draw(o)).toContain('data-refused="1"');
    expect(draw({ ...o, scale: 2 })).not.toContain('TOKENS READ');
  });

  it('the hero plot draws', () => {
    expect(agentDeskPlot(30, 25, [])).toContain('<path');
  });
});

describe('the code panel', () => {
  it('renders code as text: a `<` stays literal', () => {
    const html = renderToString(
      createElement(CodeView, { title: 'x.ts', rows: [{ op: 'same', text: 'if (a < b) return "<b>";', hunk: -1 }] }),
    );
    expect(html).toContain('a &lt; b');
    expect(html).not.toContain('<b>');
  });

  it('puts a checkbox before each hunk, in order, then Run tests', () => {
    const p = patchPanel('fix');
    const html = renderToString(
      createElement(CodeView, {
        title: p.title,
        rows: p.rows,
        review: { mask: 7, onMask: () => {}, onRun: () => {}, ran: false },
      }),
    );
    const at = (s: string) => html.search(new RegExp(s.replace(/ (\d)$/, ' (<!-- -->)?$1')));
    expect(p.hunks).toBe(3);
    expect(at('Keep hunk 1')).toBeGreaterThan(-1);
    expect(at('Keep hunk 1')).toBeLessThan(at('Keep hunk 2'));
    expect(at('Keep hunk 2')).toBeLessThan(at('Keep hunk 3'));
    expect(at('Keep hunk 3')).toBeLessThan(at('Run tests'));
  });
});
