// Watch mode's UI rules that are plain logic (U3): which reader input pauses Watch.
import { describe, expect, it } from 'vitest';
import type { Step } from '../../src/components/story/steps';
import { interrupts, type Phase } from '../../src/components/story/watch';

const base = { narration: 'n', visibleControls: [], predicate: () => true };
const played: Step<number> = { ...base, id: 'demo', demo: s => s + 1 };
const puzzle: Step<number> = { ...base, id: 'puzzle', solution: s => s + 1 };
const waiting: Step<number> = { ...base, id: 'predict' };
const PHASES: Phase[] = ['idle', 'speaking', 'applying', 'settling', 'waiting', 'reveal', 'paused', 'done'];

describe('reader input pauses Watch only while a demo plays (R3)', () => {
  it('pauses on a demo or puzzle step while it speaks, applies or settles', () => {
    for (const step of [played, puzzle])
      expect(PHASES.filter(p => interrupts(p, step))).toEqual(['speaking', 'applying', 'settling']);
  });
  it('never pauses on a waiting step: the answer is what Watch waits for', () => {
    expect(PHASES.filter(p => interrupts(p, waiting))).toEqual([]);
  });
});
