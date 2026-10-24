// Pre-training's chapters against their data (U7): chapter 7's Show me is a winning plan and a losing plan's rows say
// why; each prediction's revealed outcome is the one the data shows.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCheckpoint } from '../../src/lib/lm/load';
import { CKPT, LAST, says } from '../../src/lib/pre-training/engine';
import { WINNERS, rows, solved } from '../../src/lib/pre-training/workbench';
import { PROMPT, P1 as P1_1 } from '../../src/content/pre-training/01-before-training';
import { OUTCOME as OUT3, P1 as P1_3 } from '../../src/content/pre-training/03-held-out';
import { OUTCOME as OUT5 } from '../../src/content/pre-training/05-a-leaked-test';
import { OUTCOME as OUT6 } from '../../src/content/pre-training/06-bigger-or-longer';
import { START, STEPS as CH7, planOf } from '../../src/content/pre-training/07-larkspurs-run';

const disk = (step: number) => {
  const b = readFileSync(`public/data/pre-training/ckpt-${step}.bin`);
  return parseCheckpoint(CKPT, step, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};

describe('chapter 7, the workbench', () => {
  const base = { ...START, view: 'scene' as const, quiz: null };

  it('starts unsolved, and Show me applies a plan in WINNERS', () => {
    expect(solved(START)).toBe(false);
    const shown = CH7[0].solution!(base);
    expect(WINNERS).toContainEqual(planOf(shown));
    expect(CH7[0].predicate(shown)).toBe(true);
  });

  it('a losing plan’s own row says why it lost', () => {
    const r = rows(START).find(x => x.chosen)!;
    expect(r.why).toMatch(/step \d+/);
    expect(rows({ mix: 'clean', stop: 1000 }).find(x => x.chosen)!.why).toMatch(/still falling/);
    expect(rows({ mix: 'duplicated', stop: 3000 }).find(x => x.chosen)!.why).toMatch(/memorising/);
  });

  it('a saved plan with an unknown mix or step falls back to the start', () => {
    expect(planOf({ mix: 'nope' as never, stop: 7 })).toEqual(START);
  });
});

describe('the predictions’ outcomes', () => {
  it('chapter 1: step 0 repeats the same few pieces', () => {
    const words = says(disk(0), PROMPT).trim().split(/\s+/);
    expect(new Set(words).size).toBeLessThan(words.length);
    expect(P1_1.options[1]).toMatch(/over and over/);
  });

  it('chapter 2: the last checkpoint writes something other than step 0', () => {
    expect(says(disk(LAST), PROMPT)).not.toEqual(says(disk(0), PROMPT));
  });

  it('chapters 3, 5 and 6 reveal the option the data supports', () => {
    expect(P1_3.options[OUT3]).toMatch(/gap between them grows/);
    expect(OUT5).toBe(1);
    expect(OUT6).toBe(1);
  });
});
