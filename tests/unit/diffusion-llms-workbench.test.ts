// Diffusion LMs' chapters against the engine (KTD12): the workbench's WINNERS equal its pin and solve(), the starting
// plan fails, Show me lands on a winner, and what each chapter's copy and Show me rely on is what the live model does.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/diffusion-llms/pinned.json' with { type: 'json' };
import { KS, decode, passesFor } from '../../src/lib/diffusion-llms/decode';
import { diskMlm } from '../../src/lib/diffusion-llms/diskModel';
import { BEST, KINDS, WINNERS, casesOf, passesOf, phrase, solve, solved } from '../../src/lib/diffusion-llms/workbench';
import {
  ASKED as ASKED4,
  PINNED_RUNS as RUNS4,
  SEED as SEED4,
} from '../../src/content/diffusion-llms/04-faster-and-worse';
import { LENGTHS, PINNED_RUNS as RUNS5, SEED as SEED5 } from '../../src/content/diffusion-llms/05-the-length-is-fixed';
import { CLAIM, NEED, RATE } from '../../src/content/diffusion-llms/06-reading-a-speed-claim';
import { START, STEPS as STEPS7, planOf } from '../../src/content/diffusion-llms/07-workbench';
import { SEED as SEED3 } from '../../src/content/diffusion-llms/03-sure-words-first';
import { guessBlank } from '../../src/content/diffusion-llms/02-fill-the-blanks';

const mlm = diskMlm();

describe('the workbench', () => {
  it('pins every plan with the fewest passes that clears every bar', () => {
    expect(solve()).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(solved(w)).toBe(true);
    expect(BEST).toBe(passesOf(WINNERS[0]));
  });

  it('reads replies the live model writes again', () => {
    for (const kind of KINDS)
      for (const x of casesOf(kind, WINNERS[0][kind.id])) {
        const c = WINNERS[0][kind.id];
        expect(decode(mlm, phrase(x.seed).ids, c.k, c.rule, x.seed).reply).toEqual(x.reply);
      }
  });

  it('every kind needs a different speed, and a faster setting fails it', () => {
    const speeds = KINDS.map(k => passesFor(WINNERS[0][k.id].k));
    expect(new Set(speeds).size).toBe(KINDS.length);
    for (const kind of KINDS) {
      const k = WINNERS[0][kind.id].k,
        faster = KS[KS.indexOf(k) + 1];
      if (faster)
        for (const rule of ['confidence', 'random'] as const) {
          expect(casesOf(kind, { k: faster, rule }).every(x => x.ok)).toBe(false);
        }
    }
  });

  it('starts from the vendor’s default, which fails; Show me applies a winner', () => {
    expect(solved(planOf(START))).toBe(false);
    const step = STEPS7.find(s => s.id === 'plan')!;
    const shown = step.solution!({ plan: START, show: 'answers', quiz: null });
    expect(WINNERS).toContainEqual(shown.plan);
    expect(step.predicate(shown)).toBe(true);
    expect(planOf({ answers: { k: 3 as never, rule: 'confidence' } }).answers).toEqual(START.answers);
  });
});

describe('the chapters', () => {
  it('chapter 2: the blank’s real token is among the five guesses', () => {
    const p = phrase(9);
    expect(guessBlank(mlm).map(g => g.tok)).toContain(p.expected);
  });

  it('chapter 3: surest first keeps closer to the careful fill than random on its phrase', () => {
    const p = phrase(SEED3),
      c = p.replies.confidence[4].agree,
      r = p.replies.random[4].agree;
    expect(c).toBeGreaterThan(r);
  });

  it('chapter 4: Show me is the live fills; the fastest drifts and stutters', () => {
    for (const k of ASKED4) expect(decode(mlm, phrase(SEED4).ids, k, 'confidence', SEED4).reply).toEqual(RUNS4[k].ids);
    const slow = RUNS4[ASKED4[0]],
      fast = RUNS4[ASKED4.at(-1)!];
    expect(fast.agree).toBeLessThan(slow.agree);
    expect(fast.repeat).toBeGreaterThan(slow.repeat);
    expect(fast.ids).not.toEqual(slow.ids);
  });

  it('chapter 5: every frame fills exactly, its last slot stamped before its first (pinned)', () => {
    for (const n of LENGTHS) {
      const f = decode(mlm, phrase(SEED5).ids, 1, 'confidence', SEED5, n);
      expect({ ids: f.reply, at: f.at }).toEqual(RUNS5[n]);
      expect(f.reply).toHaveLength(n);
      expect(f.at[n - 1]).toBeLessThan(f.at[0]);
    }
    expect(Object.keys(pinned.lengths).map(Number)).toEqual([...LENGTHS]);
  });

  it('chapter 6: the claim needs the first setting that reaches it', () => {
    expect(NEED * RATE).toBeGreaterThanOrEqual(CLAIM);
    expect(KS[KS.indexOf(NEED) - 1] * RATE).toBeLessThan(CLAIM);
  });
});
