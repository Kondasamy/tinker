// The scratchpad desk and the accuracy chart (U8): the pad follows the thinking tokens, no pad with no thinking, the
// dial names the effort, the clock the wait; the chart's levels step by arrow key and the read-out names accuracy and cost.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { MAX_SHEETS, THINK_BOARD, thinkLabel, thinkScene, thinkState, type ThinkOpts } from '../../src/components/scenes/thinkScene';
import { effortChart, effortLabel, levelWords } from '../../src/components/scenes/effortChart';
import { EffortChart, ReasoningStage, deskOf } from '../../src/content/reasoning/kit';
import { EFFORTS, ofKind, run, sweep } from '../../src/lib/reasoning/engine';

const draw = (o: ThinkOpts) => renderToString(createElement(IsoStage, { board: THINK_BOARD, scene: thinkScene(o), label: thinkLabel(o) }));
const Q = 'quote-split-lines';

describe('the scratchpad desk', () => {
  it('with none, no pad is drawn and the clock shows the answer-only wait', () => {
    const r = run(Q, 'none'), svg = draw(deskOf(r));
    expect(svg).not.toContain('class="pad"');
    expect(svg).toContain('NO THINKING');
    expect(svg).toContain(`${r.wait.toFixed(1)} s`);
    expect(thinkLabel(deskOf(r))).toContain('no thinking pad');
  });

  it('the pad grows with thinking tokens, up to a cap, and the dial names the effort', () => {
    const sheets = EFFORTS.map(e => thinkState(deskOf(run(Q, e))).sheets);
    for (let i = 1; i < sheets.length; i++) expect(sheets[i]).toBeGreaterThan(sheets[i - 1]);
    expect(thinkState({ effort: 'high', thinking: 10_000, wait: 1 }).sheets).toBe(MAX_SHEETS);
    const svg = draw(deskOf(run(Q, 'high')));
    expect(svg).toContain('data-effort="high"');
    expect(svg).toContain('EFFORT · HIGH');
    expect(svg).toContain(`${run(Q, 'high').thinkingTokens} THINKING TOKENS`);
  });

  it('phones keep short pills', () => {
    const svg = draw({ ...deskOf(run(Q, 'medium')), scale: 2.2 });
    expect(svg).toContain('>MEDIUM<');
    expect(svg).toContain(' TOK<');
  });
});

describe('the accuracy chart', () => {
  const series = [{ id: 'multistep', label: 'Multi-step', points: sweep(ofKind('multistep').map(q => q.id)) }];
  it('one level per effort, each read out with accuracy and cost', () => {
    const c = effortChart(series);
    expect(c.levels.map(l => l.effort)).toEqual([...EFFORTS]);
    expect(levelWords(c.levels[2])).toMatch(/^Effort medium: multi-step 5 of 6 right \(83%\), cost \d+ tokens$/);
    expect(effortLabel(series)).toContain('none 17%');
    expect(effortLabel([])).toContain('nothing run yet');
  });

  it('renders a focusable marker per level, the last one current, with the read-out', () => {
    const html = renderToString(createElement(EffortChart, { series }));
    expect(html.match(/role="button"/g)).toHaveLength(4);
    expect(html.match(/tabindex="0"/gi)).toHaveLength(1);
    expect(html).toContain('Effort high: multi-step');
  });

  it('the stage escapes its caption and shows the thinking as text', () => {
    const html = renderToString(createElement(ReasoningStage, { shown: { desk: deskOf(run(Q, 'low')), caption: '<b>x</b>', thinking: run(Q, 'low').thinking } }));
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('55 scanners in total');
  });
});
