// What the voice chapters say about the line holds: each chapter's reveal is checked against the data it describes, the
// workbench accepts every best line and only those, and the registry entry is complete.
import { describe, expect, it } from 'vitest';
import { moduleOf } from '../../src/lib/modules';
import { outcome as latencyOutcome } from '../../src/content/voice/02-the-latency-budget';
import { NOISY_SILENCE, outcome as turnOutcome } from '../../src/content/voice/03-whose-turn-is-it';
import { outcome as bargeOutcome } from '../../src/content/voice/04-being-interrupted';
import { outcome as mishearOutcome } from '../../src/content/voice/05-mishearing';
import { START, planOf } from '../../src/content/voice/07-workbench';
import { FEWEST, PLANS, WINNERS, solved, totals } from '../../src/lib/voice/workbench';
import { DEFAULT_LINE, POINTS, runCall } from '../../src/lib/voice/engine';
import { SILENCES, THRESHOLDS } from '../../src/lib/voice/turns';

describe('voice chapters', () => {
  it('is live, Advanced, after Tool calling and Multimodal, with seven chapters and three recall items each, one pinned', () => {
    const m = moduleOf('voice');
    expect(m).toMatchObject({ status: 'live', level: 'Advanced', prereqs: ['tool-calling', 'multimodal'] });
    expect(m.chapters).toHaveLength(7);
    for (const c of m.chapters)
      expect(m.recall!.filter(i => i.chapter === c.id).length, c.id).toBeGreaterThanOrEqual(3);
    expect(m.recall!.filter(i => i.pin)).toHaveLength(1);
  });

  it('chapter 2: streaming brings the first sound forward and leaves the model’s finish where it was', () => {
    expect(latencyOutcome()).toBe(0);
  });

  it('chapter 3: the shortest silence cuts Ravi off; on the noisy call each threshold fails or works differently', () => {
    expect(turnOutcome()).toBe(1);
    // the silence Larkspur picks reads Gemini Live's default, and the recordings exist only for SILENCES
    expect(SILENCES).toContain(NOISY_SILENCE);
    const noisy = THRESHOLDS.map(threshold =>
      runCall('noisy', { ...DEFAULT_LINE, streaming: true, silence: 800, threshold }),
    );
    expect(noisy.map(r => [r.detected.gaveUp, r.detected.cut])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });

  it('chapter 4: with barge-in the history keeps only what was said, wherever Dana cuts in', () => {
    for (const p of POINTS) expect(bargeOutcome(p)).toBe(1);
  });

  it('chapter 5: reading back the unsure number turns a wrong answer right', () => {
    expect(mishearOutcome()).toBe(0);
  });

  it('chapter 7: the starting line is not best; every winner solves it with no problems', () => {
    expect(solved(START)).toBe(false);
    expect(FEWEST).toBe(0);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(totals(w).problems).toBe(0);
    expect(PLANS.filter(solved)).toEqual(WINNERS);
    expect(planOf({ threshold: 999 as never, silence: undefined })).toEqual(START);
  });
});
