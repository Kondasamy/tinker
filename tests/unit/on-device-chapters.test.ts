// On-device's chapters against the engine and the pins: every prediction's outcome is computed and says what the
// pins show, each step's predicate holds on the action it asks for, and chapter 7's Show me lands in WINNERS.
import { describe, expect, it } from 'vitest';
import { fits, sizeOf } from '../../src/lib/on-device/memory';
import { START, WINNERS, wins } from '../../src/lib/on-device/workbench';
import pinned from '../../data/on-device/pinned.json' with { type: 'json' };
import * as ch1 from '../../src/content/on-device/01-will-it-fit';
import * as ch2 from '../../src/content/on-device/02-smaller-numbers';
import * as ch3 from '../../src/content/on-device/03-working-memory';
import * as ch4 from '../../src/content/on-device/04-battery-tank';
import * as ch5 from '../../src/content/on-device/05-heat-and-speed';
import * as ch6 from '../../src/content/on-device/06-what-never-leaves';
import * as ch7 from '../../src/content/on-device/07-workbench';

const step = <S>(steps: { id: string; predicate: (s: S) => boolean }[], id: string) =>
  steps.find(s => s.id === id)!.predicate;

describe('the chapters’ reveals match the engine', () => {
  it('chapter 1: the 3B at 16 bits fills about three crates', () => {
    expect(ch1.CRATES).toBe(3);
    expect(ch1.P1.options[ch1.OUTCOME]).toBe('About three');
    expect(step(ch1.STEPS, 'one-b')({ size: '1b', p1: null, quiz: null })).toBe(true);
  });
  it('chapter 2: 8 bits keeps the pinned words', () => {
    expect(pinned.replies.at[1].text).toBe(pinned.replies.at[0].text);
    expect(ch2.P1.options[ch2.OUTCOME]).toBe('The same words');
    expect(step(ch2.STEPS, 'lower')({ bits: 2, asked: [16, 8, 4, 2], p1: 0, quiz: null })).toBe(true);
  });
  it('chapter 3: the 3B at 4 bits first spills at 4,000 tokens', () => {
    expect(ch3.FIRST_SPILL).toBe(4000);
    expect(ch3.P1.options[ch3.OUTCOME]).toBe('At 4,000 tokens');
    expect(step(ch3.STEPS, 'raise')({ tokens: 2000, p1: 0, quiz: null })).toBe(false);
    expect(step(ch3.STEPS, 'raise')({ tokens: 4000, p1: 0, quiz: null })).toBe(true);
    expect(fits(sizeOf('3b'), 4, 2000)).toBe(true);
  });
  it('chapter 4: long replies run dry before the shift; an hour drains part of the tank', () => {
    expect(ch4.P1.options[ch4.OUTCOME]).toBe('It runs dry before the shift ends');
    expect(ch4.levelOf('long', 8)).toBe(0);
    expect(ch4.levelOf('long', 1)).toBeGreaterThan(0.5);
    expect(ch4.levelOf('short', 8)).toBeGreaterThan(0);
  });
  it('chapter 5: long replies throttle, short ones stay cool, as pinned', () => {
    expect({ length: 'long', ...ch5.rushOf('long') }).toEqual(pinned.battery.rush.find(r => r.length === 'long'));
    expect(ch5.rushOf('short').hot).toBe(false);
    expect(ch5.P1.options[ch5.OUTCOME]).toBe('No: the work ends before it heats up');
  });
  it('chapter 6: only the cloud and fallback routes leave the handheld; the longest context needs the fallback', () => {
    expect(ch6.leaves('device')).toBe(false);
    expect(ch6.leaves('cloud')).toBe(true);
    expect(ch6.leaves('fallback')).toBe(true);
    expect(fits(sizeOf('3b'), 4, 8000)).toBe(false);
  });
});

describe('chapter 7’s workbench', () => {
  const bench = ch7.STEPS.find(s => s.id === 'bench')!;
  const blank = { ...START, quiz: null };
  it('Show me lands on a plan in WINNERS, and the step passes', () => {
    const shown = bench.solution!(blank);
    expect(bench.predicate(shown)).toBe(true);
    expect(WINNERS).toContainEqual({ size: shown.size, bits: shown.bits, length: shown.length });
  });
  it('the start is not a winner', () => {
    expect(bench.predicate(blank)).toBe(false);
    expect(wins(START)).toBe(false);
  });
});
