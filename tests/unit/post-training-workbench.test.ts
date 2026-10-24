// What the Post-training chapters say holds: each chapter's prediction outcome is read off the same code the chapter
// runs, chapter 6's weak grader is gamed by the last round, and chapter 7's Show me is one of WINNERS.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { replyOf } from '../../src/lib/fine-tuning/engine';
import { moduleOf } from '../../src/lib/modules';
import { REFUND, TONE, gamingOf, refOf } from '../../src/lib/post-training/graders';
import { winnerOf } from '../../src/lib/post-training/policy';
import { RULE_SETS, WINNERS, solved } from '../../src/lib/post-training/workbench';
import { PROMPT, outcome as ch1 } from '../../src/content/post-training/01-base-or-assistant';
import { PAIRS, outcome as ch2 } from '../../src/content/post-training/02-which-is-better';
import { outcome as ch3, policyOf } from '../../src/content/post-training/03-learning-from-preferences';
import { outcome as ch4 } from '../../src/content/post-training/04-grade-dont-judge';
import { outcome as ch5 } from '../../src/content/post-training/05-only-what-you-can-check';
import { WEAK_RUN, outcome as ch6 } from '../../src/content/post-training/06-you-get-what-you-check';
import { START, STEPS, rulesOf } from '../../src/content/post-training/07-build-a-grader';

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
/** every way to pick in chapter 2's three pairs */
const ALL_PICKS = PAIRS.reduce<number[][]>(
  (acc, [a, b]) =>
    acc.flatMap(p => [
      [...p, a],
      [...p, b],
    ]),
  [[]],
);

describe('post-training chapters', () => {
  it('is live, Advanced, after Fine-tuning and Evals, with seven chapters and three recall items each, one pinned', () => {
    const m = moduleOf('post-training');
    expect(m).toMatchObject({ status: 'live', level: 'Advanced', prereqs: ['fine-tuning', 'evals'] });
    expect(m.chapters).toHaveLength(7);
    for (const c of m.chapters)
      expect(m.recall!.filter(i => i.chapter === c.id).length, c.id).toBeGreaterThanOrEqual(3);
    expect(m.recall!.filter(i => i.pin)).toHaveLength(1);
  });

  it('chapter 1: the fine-tuned Larkspur mini signs off live and the base does not', () => {
    const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
    const base = parseModel(meta, disk('model.bin')),
      tuned = parseModel(meta, disk('finetuned.bin'), 'finetuned.bin');
    expect(ch1(replyOf(base, PROMPT), replyOf(tuned, PROMPT))).toBe(0);
  });

  it('chapters 2 and 3: for every set of picks, the top score won all its pairs and the favourite rose, then fell back as β rose', () => {
    expect(ALL_PICKS).toHaveLength(8);
    for (const picks of ALL_PICKS) {
      expect(ch2(picks), picks.join()).toBe(0);
      const p = policyOf(picks, 1);
      expect(p[winnerOf(p)]).toBeGreaterThan(refOf(TONE)[winnerOf(p)]);
      expect(ch3(picks), picks.join()).toBe(0);
    }
  });

  it('chapter 3: different picks give different favourites', () => {
    const favs = new Set(ALL_PICKS.map(p => winnerOf(policyOf(p, 1))));
    expect(favs.size).toBeGreaterThan(1);
  });

  it('chapter 4: passing drafts rise; chapter 5: nothing moves', () => {
    expect(ch4()).toBe(0);
    expect(ch5()).toBe(0);
  });

  it('chapter 6: the weak grader’s run shows the gaming answer winning by the last round', () => {
    expect(winnerOf(WEAK_RUN.at(-1)!.after)).toBe(gamingOf(REFUND));
    expect(ch6()).toBe(1);
  });

  it('chapter 7: starts unsolved; Show me applies one of WINNERS; every winner is solved', () => {
    expect(solved(START)).toBe(false);
    const shown = STEPS[0].solution!({ rules: START, view: 'scene', quiz: null });
    expect(WINNERS).toContainEqual(rulesOf(shown));
    expect(RULE_SETS.filter(solved)).toEqual(WINNERS);
    expect(rulesOf({ rules: ['fact', 'bogus'] })).toEqual(['fact']);
  });
});
