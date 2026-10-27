// Watch mode's UI rules that are plain logic (U3): which reader input pauses Watch, and the feedback question's memory.
import { afterEach, describe, expect, it } from 'vitest';
import type { Step } from '../../src/components/story/steps';
import { interrupts, type Phase } from '../../src/components/story/watch';
import { answered, keep } from '../../src/components/story/WatchFeedback';

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

describe('Watch feedback is asked once per chapter', () => {
  const store = globalThis as { localStorage?: unknown };
  afterEach(() => {
    delete store.localStorage;
  });

  it('remembers an answer per module and chapter', () => {
    const m = new Map<string, string>();
    store.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
    expect(answered('rag', '03-what-is-rag')).toBe(false);
    keep('rag', '03-what-is-rag', 'yes');
    keep('rag', '04-layers', 'no');
    expect(answered('rag', '03-what-is-rag')).toBe(true);
    expect(JSON.parse(m.get('tinker-watch-feedback')!)).toEqual({ 'rag/03-what-is-rag': 'yes', 'rag/04-layers': 'no' });
  });

  it('a throwing or corrupt storage never breaks it', () => {
    store.localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(answered('rag', '03-what-is-rag')).toBe(false);
    expect(() => keep('rag', '03-what-is-rag', 'yes')).not.toThrow();
    store.localStorage = { getItem: () => 'not json', setItem: () => {} };
    expect(answered('rag', '03-what-is-rag')).toBe(false);
  });
});
