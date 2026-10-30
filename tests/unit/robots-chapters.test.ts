// Robots that act's chapters against the engine and the pins (KTD7): every reveal says what the simulated bay shows,
// the predictions' outcomes are computed, Show me lands where the step passes, and chapter 7's Show me is in WINNERS.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/robots/pinned.json' with { type: 'json' };
import { NEW_BIN, RULE } from '../../src/lib/robots/rules';
import { play, W } from '../../src/lib/robots/world';
import { START, WINNERS, wins } from '../../src/lib/robots/workbench';
import { BAY, driveBin } from '../../src/content/robots/kit';
import * as ch1 from '../../src/content/robots/01-see-decide-move';
import * as ch2 from '../../src/content/robots/02-what-the-camera-gives';
import * as ch3 from '../../src/content/robots/03-rules-break';
import * as ch4 from '../../src/content/robots/04-show-it';
import * as ch5 from '../../src/content/robots/05-mistakes-snowball';
import * as ch6 from '../../src/content/robots/06-practice-in-a-game';
import * as ch7 from '../../src/content/robots/07-workbench';

const stepOf = <S>(steps: { id: string }[], id: string) =>
  steps.find(s => s.id === id) as unknown as {
    predicate: (s: S) => boolean;
    solution?: (s: S) => S;
  };

describe('the chapters’ reveals match the pins', () => {
  it('chapter 1: RT-1’s loop rate is the cited one, and Show me lands the part', () => {
    expect(ch1.RT1).toBe(3);
    expect(ch1.P1.options[ch1.OUTCOME]).toContain(String(ch1.RT1));
    const fin = stepOf<ch1.S>(ch1.STEPS, 'finish');
    const s = { bay: BAY, view: 'scene' as const, p1: 0, quiz: null };
    expect(fin.predicate(s)).toBe(false);
    expect(fin.predicate(fin.solution!(s))).toBe(true);
  });
  // chapters 1–2 keep the finished demo on show: it stays on its own bin, part in the tray
  it('chapter 1: after Show me the drive still shows the demo’s own bin, done', () => {
    const fin = stepOf<ch1.S>(ch1.STEPS, 'finish');
    const { bay } = fin.solution!({ bay: BAY, view: 'scene' as const, p1: 0, quiz: null });
    expect(driveBin(bay)).toBe(driveBin(BAY));
    expect(play(driveBin(bay), bay.drive).at(-1)!.end).toBe('done');
  });

  it('chapter 2: one press right puts the claw beside a crate', () => {
    expect(ch2.besideCrate(BAY)).toBe(false);
    expect(ch2.besideCrate({ ...BAY, drive: ['right'] })).toBe(true);
  });
  it('chapter 3: the rule clears bin A and leaves the grid on bin B, driving right past the edge', () => {
    expect(pinned.rule).toEqual({ bin: 'done', newBin: ch3.B_END });
    expect(ch3.OUTCOME).toBe(0);
    const states = play(NEW_BIN, RULE);
    expect(states.at(-1)!.end).toBe('off-grid');
    // it left by driving right past the bin's right wall, where bin A's tray was
    expect(states.at(-1)!.claw[0]).toBe(W - 1);
    expect(RULE[states.length - 2]).toBe('right');
  });
  it('chapter 4: four demos clear more fresh bins than one, as pinned', () => {
    expect(ch4.ONE.solved).toBe(pinned.clean[0].solved);
    expect(ch4.FOUR.solved).toBeGreaterThan(ch4.ONE.solved);
    expect(ch4.OUTCOME).toBe(0);
  });
  it('chapter 5: Show me’s corrections are the pinned ones, and the step passes', () => {
    expect(ch5.FIXES).toHaveLength(pinned.snowball.corrections);
    const again = stepOf<ch5.S>(ch5.STEPS, 'again');
    const s = {
      bay: { ...BAY, runs: 1, last: pinned.snowball.slipped as never },
      view: 'scene' as const,
      p1: 0,
      quiz: null,
    };
    expect(again.predicate(s)).toBe(false);
    expect(again.predicate(again.solution!(s))).toBe(true);
  });
  it('chapter 6: light helps more than slips, and the replayed bin is one plain practice fails', () => {
    expect(ch6.OUTCOME).toBe(0);
    expect(ch6.SCORE.both.solved).toBeGreaterThan(ch6.SCORE.plain.solved);
    expect(ch6.SHOWN).toBeGreaterThanOrEqual(0);
  });
});

describe('chapter 7’s workbench', () => {
  const blank = { ...START, view: 'scene' as const, quiz: null as number | null };
  const bench = stepOf<typeof blank>(ch7.STEPS, 'bench');
  it('Show me lands on a setup in WINNERS, and the step passes; the start does not', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ demos: shown.demos, rounds: shown.rounds, practice: shown.practice });
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
});
