// The exam hall and the policy bars (U10): every callout part is drawn, phones keep short pills, stack and bar heights
// follow the policy, the gaming card is stamped when the weak grader rewards it, and the stage escapes its caption.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  EXAM_BOARD,
  EXAM_PARTS,
  STACK_H,
  examLabel,
  examScene,
  examState,
  type ExamOpts,
} from '../../src/components/scenes/examScene';
import { barWords, policyBars } from '../../src/components/scenes/policyBars';
import { PolicyChart, PostStage, barsOf, cardsOf } from '../../src/content/post-training/kit';
import { REFUND, WEAK, refOf, rewardsOf, gamingOf } from '../../src/lib/post-training/graders';
import { grpoRun, seedOf } from '../../src/lib/post-training/policy';

const draw = (o: ExamOpts) =>
  renderToString(createElement(IsoStage, { board: EXAM_BOARD, scene: examScene(o), label: examLabel(o) }));
const ref = refOf(REFUND),
  weak = rewardsOf(REFUND, WEAK);
const BASE: ExamOpts = {
  cards: cardsOf(REFUND, ref, weak),
  grader: 'NUMBER + SIGN-OFF',
  group: [true, false],
  board: 'ROUND 1',
};
const calls = (svg: string) => svg.split('class="callout"').length - 1;

describe('the exam hall', () => {
  it('draws one lit callout over each named part, none for an unknown one', () => {
    for (const block of EXAM_PARTS) {
      const svg = draw({ ...BASE, say: { block, text: 'LOOK HERE' } });
      expect(calls(svg), block).toBe(1);
    }
    expect(calls(draw({ ...BASE, say: { block: 'nowhere', text: 'LOOK HERE' } }))).toBe(0);
    expect(draw({ ...BASE, say: undefined })).toBe(draw(BASE));
  });

  it('stack heights follow the policy and sum to its total', () => {
    const st = examState(BASE);
    expect(st.stacks.reduce((a, s) => a + s.h, 0)).toBeCloseTo(STACK_H, 9);
    expect(st.stacks[st.top].p).toBe(Math.max(...ref));
  });

  it('the gaming card carries its stamp when the weak grader rewards it', () => {
    const svg = draw(BASE);
    expect(svg).toMatch(/data-mark="pass" data-gaming="1"/);
    expect(weak[gamingOf(REFUND)]).toBeGreaterThan(0);
  });

  it('desktop pills carry the numbers; phones keep only the letters and a short grader pill', () => {
    expect(draw({ ...BASE, scale: 1.3 })).toContain('E · 10%');
    const phone = draw({ ...BASE, scale: 2.2 });
    expect(phone).not.toContain('E · 10%');
    expect(phone).toContain('>E<');
    expect(phone).toContain('>GRADER<');
    expect(examLabel(BASE)).toContain('E 10%, rewarded');
  });
});

describe('the policy bars', () => {
  const after = grpoRun(ref, weak, seedOf(REFUND)).at(-1)!.after;
  const bars = barsOf(REFUND, ref, after, weak);
  it('after-bar heights sum to the policy’s total, one bar per answer', () => {
    const c = policyBars(bars);
    expect(c.bars).toHaveLength(ref.length);
    expect(c.bars.reduce((a, b) => a + b.h, 0)).toBeCloseTo(c.base - c.top, 6);
    expect(barWords(bars[gamingOf(REFUND)])).toMatch(
      /^Answer E: 10% before, \d+% after, reward 2 \(games the grader\)$/,
    );
  });

  it('renders a focusable marker per answer, the first current, with the read-out', () => {
    const html = renderToString(createElement(PolicyChart, { bars }));
    expect(html.match(/role="button"/g)).toHaveLength(ref.length);
    expect(html.match(/tabindex="0"/gi)).toHaveLength(1);
    expect(html).toContain('Answer A:');
  });

  it('the stage escapes its caption', () => {
    const html = renderToString(createElement(PostStage, { shown: { hall: BASE, bars, caption: '<b>x</b>' } }));
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
