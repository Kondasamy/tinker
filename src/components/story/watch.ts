// Watch mode (KTD3, KTD6): a chapter plays itself. Per step: speak the narration (a recorded clip through the shared
// player, or a word-count timer when there is none, it fails, it's stale or the sound is off), dispatch `watch`, then
// wait for the run to move on. A step with neither `demo` nor `solution` waits for the reader, then holds a dwell on
// the reveal. The scheduler is plain code over injected parts; `useWatch` only wires it to React.
import { useEffect, useRef, useState } from 'react';
import { type ClipEnd, playClip, stopClip } from '../../lib/voice/audio';
import type { Action, Run, Step } from './steps';

export type Phase = 'idle' | 'speaking' | 'applying' | 'settling' | 'waiting' | 'reveal' | 'paused' | 'done';

/** A step's recorded narration and the text it was recorded from (a clip whose text differs is stale). */
export interface Clip {
  url: string;
  text: string;
}

const WORDS_PER_S = 2.6;
const MIN_MS = 1500;
/** How long a step may take to move on after its demo (an async verdict) before Watch hands over to the reader. */
export const CAP_MS = 8000;
/** The shortest hold on a reveal after the reader commits. */
export const DWELL_MS = 4000;

export const wordsMs = (text: string) =>
  Math.max(MIN_MS, Math.round((text.split(/\s+/).filter(Boolean).length / WORDS_PER_S) * 1000));

const waits = <S>(step: Step<S>) => !step.demo && !step.solution;

/** What Watch says on a step: the narration, plus `act` only where the reader really has to do it. */
export const spokenText = <S>(step: Step<S>) =>
  waits(step) && step.act ? `${step.narration} ${step.act}` : step.narration;

// --- sound: one toggle for voice and music, remembered per viewer ---

const SOUND_KEY = 'tinker-watch-sound';
let sound = true; // what the toggle says when storage can't

export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return sound;
  }
}

export function setSound(on: boolean) {
  sound = on;
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {}
  if (!on) {
    stopClip();
    bed()?.stop();
  } else if (bedWanted) bed()?.play();
}

// --- music: a quiet loop through a Web Audio gain (iOS ignores HTMLMediaElement.volume), ducked under the voice ---

export interface Music {
  play(): void;
  stop(): void;
  duck(on: boolean): void;
}

const MUSIC_URL = '/data/watch/music.mp3';
const DUCK = 0.35;

function webMusic(): Music | null {
  const AC =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AC) return null;
  const ctx = new AC(),
    el = new Audio(MUSIC_URL),
    gain = ctx.createGain();
  el.loop = true;
  ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
  return {
    play() {
      ctx.resume().catch(() => {});
      el.play().catch(() => {});
    },
    stop: () => el.pause(),
    duck: on => gain.gain.setTargetAtTime(on ? DUCK : 1, ctx.currentTime, 0.1),
  };
}

let makeMusic: () => Music | null = webMusic;
let music: Music | null | undefined;
let bedWanted = false;

// made on the first Watch press (a gesture, so autoplay rules are met), once: an element takes one media source
function bed(): Music | null {
  if (music === undefined) {
    try {
      music = makeMusic();
    } catch {
      music = null;
    }
  }
  return music;
}

function startMusic() {
  bedWanted = true;
  if (soundOn()) bed()?.play();
}

function stopMusic() {
  bedWanted = false;
  music?.stop();
}

/** Tests: swap the music bed for a fake (or a factory that throws, like a browser without Web Audio). */
export function setMusicFactory(f: () => Music | null) {
  makeMusic = f;
  music = undefined;
  bedWanted = false;
}

// --- the scheduler ---

export interface WatchParts<S> {
  steps: Step<S>[];
  /** the latest run (the reducer's, not a snapshot) */
  run: () => Run<S>;
  dispatch: (a: Action<S>) => void;
  clipFor: (stepIndex: number) => Clip | null;
  onPhase?: (p: Phase) => void;
}

export interface Watch<S> {
  start(): void;
  pause(): void;
  skipDwell(): void;
  /** call on every new run: Watch moves on when its index or `done` changes */
  update(run: Run<S>): void;
  phase(): Phase;
}

export function createWatch<S>({ steps, run, dispatch, clipFor, onPhase }: WatchParts<S>): Watch<S> {
  let phase: Phase = 'idle',
    token = 0, // bumped on start and pause: an older await that wakes up finds it changed and stops
    at = -1, // the index Watch is playing
    wasDone = false,
    timer: ReturnType<typeof setTimeout> | undefined,
    cap: ReturnType<typeof setTimeout> | undefined,
    wake: (() => void) | null = null;

  const set = (p: Phase) => {
    phase = p;
    onPhase?.(p);
  };
  const clear = () => {
    clearTimeout(timer);
    clearTimeout(cap);
    wake = null;
  };
  const sleep = (ms: number) =>
    new Promise<void>(r => {
      wake = r;
      timer = setTimeout(r, ms);
    });

  function finish() {
    token++;
    clear();
    stopMusic();
    set('done');
  }

  async function speak(i: number) {
    const mine = token,
      step = steps[i],
      text = spokenText(step),
      clip = clipFor(i);
    at = i;
    wasDone = run().done;
    set('speaking');
    let end: ClipEnd | 'timed' = 'timed';
    if (soundOn() && clip && clip.text === text) {
      bed()?.duck(true);
      end = await playClip(clip.url);
      if (token === mine) bed()?.duck(false);
    }
    if (token !== mine) return;
    if (end !== 'ended') await sleep(wordsMs(text)); // no clip, a failed one, or the sound turned off mid-clip
    if (token !== mine) return;
    if (waits(step)) return set('waiting');
    set('applying');
    cap = setTimeout(pause, CAP_MS);
    dispatch({ type: 'watch' });
    if (phase === 'applying') set('settling');
  }

  async function reveal() {
    const mine = token;
    stopClip();
    set('reveal');
    await sleep(DWELL_MS);
    if (token === mine) next();
  }

  function next() {
    clear();
    const r = run();
    if (r.done) finish();
    else void speak(r.index);
  }

  function pause() {
    if (phase === 'idle' || phase === 'paused' || phase === 'done') return;
    token++;
    clear();
    stopClip();
    stopMusic();
    set('paused');
  }

  return {
    start() {
      token++;
      clear();
      if (run().done) return finish();
      startMusic();
      void speak(run().index);
    },
    pause,
    skipDwell() {
      if (phase === 'reveal') wake?.();
    },
    update(r) {
      if (r.index === at && r.done === wasDone) return;
      if (phase === 'waiting' || (phase === 'speaking' && waits(steps[at]))) {
        token++; // the reader answered: stop asking, show the reveal
        clear();
        void reveal();
      } else if (phase === 'speaking' || phase === 'applying' || phase === 'settling') {
        token++; // the demo landed (or the run moved under Watch): play the step it's on now
        next();
      }
    },
    phase: () => phase,
  };
}

/** Watch wired to a StepRunner: pass the reducer's run and dispatch, and the chapter's narration lookup. */
export function useWatch<S>(
  run: Run<S>,
  steps: Step<S>[],
  dispatch: (a: Action<S>) => void,
  clipFor: (stepIndex: number) => Clip | null,
) {
  const [phase, setPhase] = useState<Phase>('idle');
  const latest = useRef({ run, dispatch, clipFor });
  latest.current = { run, dispatch, clipFor };
  const ref = useRef<Watch<S> | null>(null);
  ref.current ??= createWatch<S>({
    steps,
    run: () => latest.current.run,
    dispatch: a => latest.current.dispatch(a),
    clipFor: i => latest.current.clipFor(i),
    onPhase: setPhase,
  });
  const w = ref.current;
  useEffect(() => w.update(run), [w, run]);
  useEffect(() => () => w.pause(), [w]);
  return { phase, start: w.start, pause: w.pause, skipDwell: w.skipDwell };
}
