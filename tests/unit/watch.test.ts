// Watch mode's scheduler (U2): speak, apply the demo, wait for the run to move on, with fake timers, a fake audio
// element behind the shared clip player and a fake music bed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reduce, startRun, type Action, type Run, type Step } from '../../src/components/story/steps';
import {
  CAP_MS,
  DWELL_MS,
  createWatch,
  setMusicFactory,
  setSound,
  soundOn,
  spokenText,
  wordsMs,
  type Clip,
  type Phase,
} from '../../src/components/story/watch';
import { clipStatus, clipUrl, playClip, setAudioFactory, type AudioLike } from '../../src/lib/voice/audio';

class Fake implements AudioLike {
  src = '';
  played: string[] = [];
  paused = 0;
  fail = false;
  on: Record<string, () => void> = {};
  play() {
    this.played.push(this.src);
    return this.fail ? Promise.reject(new Error('no')) : Promise.resolve();
  }
  pause() {
    this.paused++;
  }
  addEventListener(t: string, f: () => void) {
    this.on[t] = f;
  }
}

const music = { plays: 0, stops: 0, ducked: [] as boolean[] };
let fake: Fake | undefined;

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}
const store = globalThis as { localStorage?: unknown };

beforeEach(() => {
  vi.useFakeTimers();
  fake = undefined;
  setAudioFactory(() => (fake = new Fake()));
  Object.assign(music, { plays: 0, stops: 0, ducked: [] });
  setMusicFactory(() => ({
    play: () => void music.plays++,
    stop: () => void music.stops++,
    duck: (on: boolean) => void music.ducked.push(on),
  }));
  store.localStorage = memoryStorage();
});
afterEach(() => {
  vi.useRealTimers();
  delete store.localStorage;
});

// a chapter over a number: step k passes once the state reaches k + 1
const demo = (id: string, k: number): Step<number> => ({
  id,
  narration: `Step ${id} moves the counter one place along.`,
  visibleControls: [],
  predicate: s => s > k,
  demo: () => k + 1,
});
const ask = (id: string, k: number): Step<number> => ({
  id,
  narration: `Step ${id} asks the reader.`,
  act: 'Pick one.',
  visibleControls: ['pick'],
  predicate: s => s > k,
});
const recorded = (steps: Step<number>[], i: number): Clip => ({
  url: `/data/watch/t/${steps[i].id}.mp3`,
  text: spokenText(steps[i]),
});

function harness(steps: Step<number>[], clips: (Clip | null)[] = []) {
  let run: Run<number> = startRun(steps, 0);
  const sent: Action<number>[] = [];
  const w = createWatch<number>({
    steps,
    run: () => run,
    dispatch: a => {
      sent.push(a);
      run = reduce(steps, run, a);
      w.update(run);
    },
    clipFor: i => clips[i] ?? null,
  });
  return {
    w,
    sent,
    run: () => run,
    /** the reader (or the stage) moving the run on */
    act: (a: Action<number>) => {
      run = reduce(steps, run, a);
      w.update(run);
    },
  };
}
const flush = () => vi.advanceTimersByTimeAsync(0);

describe('watch mode', () => {
  it('plays three demo steps in order with their clips, then stops at done', async () => {
    const steps = [demo('a', 0), demo('b', 1), demo('c', 2)];
    const h = harness(
      steps,
      [0, 1, 2].map(i => recorded(steps, i)),
    );
    h.w.start();
    await flush();
    expect(h.w.phase()).toBe<Phase>('speaking');
    expect(music.plays).toBe(1);
    for (const i of [0, 1, 2]) {
      expect(fake!.src).toBe(`/data/watch/t/${steps[i].id}.mp3`);
      expect(music.ducked.at(-1)).toBe(true);
      expect(h.run().index).toBe(i);
      fake!.on.ended();
      await flush();
    }
    expect(h.sent.map(a => a.type)).toEqual(['watch', 'watch', 'watch']);
    expect(h.run().done).toBe(true);
    expect(h.w.phase()).toBe<Phase>('done');
    expect(music.stops).toBe(1);
  });

  it('waits on a step with no demo, then dwells on the reveal and goes on', async () => {
    const steps = [demo('a', 0), ask('b', 1), demo('c', 2)];
    const h = harness(steps);
    expect(spokenText(steps[1])).toBe('Step b asks the reader. Pick one.');
    expect(spokenText(steps[0])).toBe(steps[0].narration);
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[0])));
    expect(h.run().index).toBe(1);
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[1])));
    expect(h.w.phase()).toBe<Phase>('waiting');
    await vi.advanceTimersByTimeAsync(60_000); // never capped: the reader takes their time
    expect(h.w.phase()).toBe<Phase>('waiting');
    expect(h.sent).toHaveLength(1);
    h.act({ type: 'apply', state: 2 });
    expect(h.w.phase()).toBe<Phase>('reveal');
    await vi.advanceTimersByTimeAsync(DWELL_MS - 1);
    expect(h.w.phase()).toBe<Phase>('reveal');
    await vi.advanceTimersByTimeAsync(1);
    expect(h.w.phase()).toBe<Phase>('speaking');
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[2])));
    expect(h.w.phase()).toBe<Phase>('done');
  });

  it('skipDwell ends the reveal dwell at once', async () => {
    const steps = [ask('a', 0), demo('b', 1)];
    const h = harness(steps);
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[0])));
    h.act({ type: 'apply', state: 1 });
    expect(h.w.phase()).toBe<Phase>('reveal');
    h.w.skipDwell();
    await flush();
    expect(h.w.phase()).toBe<Phase>('speaking');
    expect(h.run().index).toBe(1);
  });

  it('pause mid-clip stops the clip and the music, and nothing more is dispatched', async () => {
    const steps = [demo('a', 0), demo('b', 1)];
    const h = harness(steps, [recorded(steps, 0)]);
    h.w.start();
    await flush();
    h.w.pause();
    expect(h.w.phase()).toBe<Phase>('paused');
    expect(fake!.paused).toBe(1);
    expect(clipStatus('/data/watch/t/a.mp3')).toBe('idle');
    expect(music.stops).toBe(1);
    fake!.on.ended();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.sent).toHaveLength(0);
    expect(h.w.phase()).toBe<Phase>('paused');
  });

  it('starts again from the current step after a pause', async () => {
    const steps = [demo('a', 0), demo('b', 1)];
    const h = harness(steps);
    h.w.start();
    h.w.pause();
    h.act({ type: 'apply', state: 1 }); // the reader plays step a by hand
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[1])));
    expect(h.sent).toEqual([{ type: 'watch' }]);
    expect(h.w.phase()).toBe<Phase>('done');
  });

  it('a clip that errors falls back to the word-count timer and still advances', async () => {
    const steps = [demo('a', 0), demo('b', 1)];
    const h = harness(steps, [recorded(steps, 0)]);
    h.w.start();
    await flush();
    fake!.on.error();
    await flush();
    expect(h.sent).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[0])));
    expect(h.run().index).toBe(1);
  });

  it('a stale clip is not played: the step is timed by its words', async () => {
    const steps = [demo('a', 0), demo('b', 1)];
    const h = harness(steps, [{ url: '/data/watch/t/a.mp3', text: 'What the step used to say.' }]);
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[0])) - 1);
    expect(fake).toBeUndefined();
    expect(h.sent).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.run().index).toBe(1);
  });

  it('with the sound off, no clip or music plays and the steps are timed', async () => {
    setSound(false);
    const steps = [demo('a', 0)];
    const h = harness(steps, [recorded(steps, 0)]);
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[0])));
    expect(fake).toBeUndefined();
    expect(music.plays).toBe(0);
    expect(h.w.phase()).toBe<Phase>('done');
  });

  it('pauses when an async step never moves on within the cap', async () => {
    const slow: Step<number> = { ...demo('a', 0), demo: () => 0 }; // the verdict that would pass never arrives
    const h = harness([slow, demo('b', 1)]);
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(slow)));
    expect(h.sent).toHaveLength(1);
    expect(h.w.phase()).toBe<Phase>('settling');
    await vi.advanceTimersByTimeAsync(CAP_MS);
    expect(h.w.phase()).toBe<Phase>('paused');
    expect(music.stops).toBe(1);
    h.act({ type: 'sync', state: 1 }); // a late verdict: the reader has the controls now
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.sent).toHaveLength(1);
  });

  it('an async step that settles within the cap goes on', async () => {
    const slow: Step<number> = { ...demo('a', 0), demo: () => 0 };
    const h = harness([slow, demo('b', 1)]);
    h.w.start();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(slow)) + CAP_MS - 1);
    h.act({ type: 'sync', state: 1 });
    await vi.advanceTimersByTimeAsync(CAP_MS);
    expect(h.w.phase()).not.toBe('paused');
    expect(h.run().index).toBe(1);
  });

  it('missing Web Audio never throws: the music is skipped', async () => {
    setMusicFactory(() => {
      throw new Error('no AudioContext');
    });
    const steps = [demo('a', 0)];
    const h = harness(steps);
    expect(() => h.w.start()).not.toThrow();
    await vi.advanceTimersByTimeAsync(wordsMs(spokenText(steps[0])));
    expect(h.w.phase()).toBe<Phase>('done');
  });
});

describe('the sound toggle', () => {
  it('is on by default and remembered', () => {
    expect(soundOn()).toBe(true);
    setSound(false);
    expect(soundOn()).toBe(false);
    expect((store.localStorage as Storage).getItem('tinker-watch-sound')).toBe('off');
    setSound(true);
    expect(soundOn()).toBe(true);
  });

  it('works when localStorage throws', () => {
    store.localStorage = new Proxy(
      {},
      {
        get() {
          throw new Error('denied');
        },
      },
    );
    expect(() => setSound(false)).not.toThrow();
    expect(soundOn()).toBe(false); // remembered for the visit
    setSound(true);
    expect(soundOn()).toBe(true);
  });
});

describe('the shared clip player', () => {
  it('voice clips still play from /data/voice/<id>.mp3', () => {
    playClip(clipUrl('status-caller'));
    expect(fake!.src).toBe('/data/voice/status-caller.mp3');
  });

  it('settles when the clip ends, errors or is stopped', async () => {
    const ended = playClip('/data/watch/t/a.mp3');
    fake!.on.ended();
    await expect(ended).resolves.toBe('ended');
    const errored = playClip('/data/watch/t/b.mp3');
    fake!.on.error();
    await expect(errored).resolves.toBe('error');
    const stopped = playClip('/data/watch/t/c.mp3');
    playClip('/data/watch/t/d.mp3');
    await expect(stopped).resolves.toBe('stopped');
  });
});
