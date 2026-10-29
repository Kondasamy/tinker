// Many chips, one model's chapters against the engine and the pins (KTD9): every reveal says what the simulated cluster
// shows, the predictions' outcomes are computed, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/parallel-training/pinned.json' with { type: 'json' };
import { CHIP } from '../../src/lib/parallel-training/facts';
import { START, WINNERS, wins } from '../../src/lib/parallel-training/workbench';
import * as ch1 from '../../src/content/parallel-training/01-wont-fit';
import * as ch2 from '../../src/content/parallel-training/02-copies';
import * as ch3 from '../../src/content/parallel-training/03-sharding';
import * as ch4 from '../../src/content/parallel-training/04-pipeline';
import * as ch5 from '../../src/content/parallel-training/05-inside-a-layer';
import * as ch6 from '../../src/content/parallel-training/06-checkpoints';
import * as ch7 from '../../src/content/parallel-training/07-workbench';

const close = (a: number, b: number) => expect(Number(a.toPrecision(6))).toBe(b);

describe('the chapters’ reveals match the pins', () => {
  it('chapter 1: the training state needs the pinned number of chips', () => {
    expect(ch1.STATE).toBe(pinned.fit.state);
    expect(ch1.P1.options[ch1.OUTCOME]).toBe(`${pinned.fit.chipsAtLeast} chips`);
    expect(ch1.WEIGHTS).toBeGreaterThan(CHIP.memory);
  });
  it('chapter 2: the ring ends on the pinned mean, and eight chips send under twice their gradient', () => {
    expect(ch2.MEAN).toBe(pinned.ring.mean.join(', '));
    expect(ch2.RATIO).toBeLessThan(2);
    expect(ch2.OUTCOME).toBe(0);
    const pass = ch2.STEPS.find(s => s.id === 'pass')!;
    expect(pass.predicate({ pass: { mode: 'ring', n: 4, k: pinned.ring.hops - 1, m: 4 }, p1: null, quiz: null })).toBe(
      false,
    );
    expect(pass.predicate({ pass: { mode: 'ring', n: 4, k: pinned.ring.hops, m: 4 }, p1: null, quiz: null })).toBe(
      true,
    );
  });
  it('chapter 3: each ZeRO stage is pinned, stage 1 saves over half, and stage 3 is still over a chip', () => {
    for (const row of pinned.zero) expect(ch3.memOf(row.zero as 0 | 1 | 2 | 3).total).toBe(row.total);
    expect(ch3.SAVED).toBeGreaterThan(0.5);
    expect(ch3.OUTCOME).toBe(1);
    expect(ch3.memOf(3).total).toBeGreaterThan(CHIP.memory);
  });
  it('chapter 4: the bubble at one micro-batch is pinned and shrinks, but stays, at the reader’s count', () => {
    expect(ch4.ONE.idle).toBe(pinned.bubble[0].idle);
    close(ch4.B1, pinned.bubble[0].bubble);
    expect(ch4.BM).toBeLessThan(ch4.B1);
    expect(ch4.BM).toBeGreaterThan(0);
    expect(ch4.OUTCOME).toBe(1);
  });
  it('chapter 5: the two layouts are the pinned ones, and across boxes is more than twice as slow', () => {
    const { inBox, acrossBoxes } = pinned.tensor;
    expect(ch5.LAYOUTS.inside).toEqual({ tp: inBox.tp, pp: inBox.pp, dp: inBox.dp, zero: inBox.zero });
    expect(ch5.LAYOUTS.between).toEqual({ tp: acrossBoxes.tp, pp: acrossBoxes.pp, dp: acrossBoxes.dp, zero: 1 });
    close(ch5.STEP.inside.total, inBox.step);
    close(ch5.STEP.between.total, acrossBoxes.step);
    close(ch5.HOP.inside, pinned.tensor.hopInside);
    expect(ch5.OUTCOME).toBe(2);
  });
  it('chapter 6: the intervals and their runs are the pinned ones, and the searched best finishes first', () => {
    expect(ch6.BEST).toBe(pinned.failures.best);
    close(ch6.MTBF, pinned.failures.mtbf);
    for (const r of pinned.failures.runs) {
      expect(ch6.RUNS[r.interval].saves).toBe(r.saves);
      expect(ch6.RUNS[r.interval].hits).toBe(r.hits);
      close(ch6.RUNS[r.interval].wall, r.wall);
    }
    expect(ch6.INTERVALS[ch6.OUTCOME]).toBe(ch6.BEST);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a layout in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ tp: shown.tp, pp: shown.pp, zero: shown.zero, interval: shown.interval });
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
});
