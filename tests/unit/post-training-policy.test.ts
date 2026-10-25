// Post-training's toy policy (KTD4): DPO's regularised optimum over the reader's pairs, and GRPO's group-graded, clipped
// step, both run live over the recorded candidates.
import { describe, expect, it } from 'vitest';
import {
  BETAS,
  ROUNDS,
  dpoLoss,
  dpoPolicy,
  fitRewards,
  grpoRound,
  grpoRun,
  kl,
  seedOf,
  winnerOf,
} from '../../src/lib/post-training/policy';
import { FULL, WEAK, bestOf, gamingOf, question, refOf, rewardsOf } from '../../src/lib/post-training/graders';
import { mulberry32 } from '../../src/lib/transformers/sample';

const sum = (p: number[]) => p.reduce((a, b) => a + b, 0);

describe('DPO on the reader’s pairs', () => {
  const ref = refOf('late-again');
  it('the preferred answer rises above the reference and the rejected one falls', () => {
    const r = fitRewards(ref.length, [[0, 2]]);
    for (const beta of BETAS) {
      const p = dpoPolicy(ref, r, beta);
      expect(sum(p)).toBeCloseTo(1, 12);
      expect(p[0]).toBeGreaterThan(ref[0]);
      expect(p[2]).toBeLessThan(ref[2]);
    }
  });

  it('over the β list, the distance from the reference falls strictly as β rises', () => {
    const r = fitRewards(ref.length, [
      [0, 1],
      [1, 2],
      [0, 3],
    ]);
    const kls = BETAS.map(b => kl(dpoPolicy(ref, r, b), ref));
    for (let i = 1; i < kls.length; i++) expect(kls[i]).toBeLessThan(kls[i - 1]);
  });

  it('the policy it targets has a lower DPO loss on the pairs than the reference', () => {
    const pairs: [number, number][] = [
      [0, 1],
      [0, 3],
    ];
    const r = fitRewards(ref.length, pairs);
    expect(dpoLoss(dpoPolicy(ref, r, 1), ref, pairs, 1)).toBeLessThan(dpoLoss(ref, ref, pairs, 1));
  });

  it('different picks move the policy differently', () => {
    const a = dpoPolicy(ref, fitRewards(ref.length, [[0, 1]]), 1),
      b = dpoPolicy(ref, fitRewards(ref.length, [[1, 0]]), 1);
    expect(winnerOf(a)).toBe(0);
    expect(winnerOf(b)).toBe(1);
  });
});

describe('GRPO, a group at a time', () => {
  const ref = refOf('k2-price');
  it('with every reward equal, the step changes nothing', () => {
    const r = grpoRound(ref, [1, 1, 1, 1], mulberry32(1));
    expect(r.advantages.every(a => a === 0)).toBe(true);
    expect(r.after).toEqual(ref);
  });

  it('with one high reward, that answer’s probability rises', () => {
    const r = grpoRound(ref, [0, 1, 0, 0], mulberry32(7));
    expect(r.group).toContain(1);
    expect(r.after[1]).toBeGreaterThan(ref[1]);
    expect(sum(r.after)).toBeCloseTo(1, 12);
  });

  it('advantage is reward minus the group mean, over the group spread', () => {
    const r = grpoRound(ref, [0, 1, 0, 1], mulberry32(3));
    const mean = sum(r.rewards) / r.rewards.length;
    for (const [i, a] of r.advantages.entries()) expect(Math.sign(a)).toBe(Math.sign(r.rewards[i] - mean));
  });

  it('the same seed gives the same group and the same update', () => {
    const a = grpoRun(ref, [0, 1, 0, 0], seedOf('k2-price'), 3),
      b = grpoRun(ref, [0, 1, 0, 0], seedOf('k2-price'), 3);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it('a tone question gives every draft the same reward, so nothing moves', () => {
    const run = grpoRun(refOf('late-again'), rewardsOf('late-again', FULL), seedOf('late-again'), ROUNDS);
    expect(run.at(-1)!.after).toEqual(refOf('late-again'));
  });

  it('under the weak grader the gaming answer rises and wins; under the full grader it falls', () => {
    const q = 'refund-window',
      g = gamingOf(q),
      ref0 = refOf(q);
    const weak = grpoRun(ref0, rewardsOf(q, WEAK), seedOf(q), ROUNDS).at(-1)!.after;
    const full = grpoRun(ref0, rewardsOf(q, FULL), seedOf(q), ROUNDS).at(-1)!.after;
    expect(weak[g]).toBeGreaterThan(ref0[g]);
    expect(winnerOf(weak)).toBe(g);
    expect(full[g]).toBeLessThan(ref0[g]);
    expect(winnerOf(full)).toBe(bestOf(q));
    expect(question(q).candidates[g].gaming).toBe(true);
  });
});
