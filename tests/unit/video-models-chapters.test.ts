// Video and world models' chapters against the engine and the pins (KTD10): every reveal says what the toy shows, the
// predictions' outcomes are computed, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/video-models/pinned.json' with { type: 'json' };
import { diskNet } from '../../src/lib/video-models/diskModel';
import { crateCells, oneStep } from '../../src/lib/video-models/rollout';
import { START, WINNERS, passes, resultOf, wins } from '../../src/lib/video-models/workbench';
import { rollout } from '../../src/lib/video-models/world';
import * as ch1 from '../../src/content/video-models/01-many-pictures';
import * as ch3 from '../../src/content/video-models/03-one-frame-is-not-enough';
import * as ch5 from '../../src/content/video-models/05-drift';
import * as ch7 from '../../src/content/video-models/07-workbench';

describe('the chapters’ reveals match the toy and the facts', () => {
  it('chapter 1: a 1080p frame at Compression’s 3 bytes a pixel, 16 frames a second', () => {
    expect(ch1.PER_PIXEL).toBe(3);
    expect(ch1.FRAME_BYTES).toBe(1920 * 1080 * 3);
    expect(ch1.SECOND_BYTES).toBe(1920 * 1080 * 3 * 16);
    expect(ch1.P1.options[1]).toBe('99.5 MB');
  });
  it('chapter 3: the one-frame guess goes back toward the end, as the outcome says', () => {
    const r = rollout(pinned.seed, pinned.steps);
    const k1 = crateCells(oneStep(diskNet('k1'), r, pinned.bounce.t));
    expect(k1).toEqual(pinned.bounce.k1);
    expect(ch3.OUTCOME).toBe(1);
    // back toward x = 0, where it bounced
    expect(k1[0]).toBeLessThan(crateCells(r.frames[pinned.bounce.t])[0]);
  });
  it('chapter 5: the robot goes within the first half of the route', () => {
    expect(ch5.LOST).toBe(pinned.kept + 2);
    expect(ch5.OUTCOME).toBe(0);
    const scrub = ch5.STEPS.find(s => s.id === 'scrub')!;
    expect(scrub.predicate({ p1: 0, at: ch5.LOST - 1, every: 0, quiz: null })).toBe(false);
    expect(scrub.predicate({ p1: 0, at: ch5.LOST, every: 0, quiz: null })).toBe(true);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a plan in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ model: shown.model, every: shown.every });
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
  it('the quiz’s plan clears the bar too, with twice the real frames', () => {
    expect(passes(resultOf(ch7.OFTEN))).toBe(true);
    expect(wins(ch7.OFTEN)).toBe(false);
    expect(ch7.QUIZ.options[0]).toBe('It needs twice the real frames');
    expect(resultOf(ch7.OFTEN).passes).toBeLessThan(resultOf(WINNERS[0]).passes);
  });
});
