// The one shared player behind every clip button (KTD11, R18). Nothing plays until a reader presses Play; starting a
// clip stops any other; the chapter stops it when the step changes or the page unmounts. A clip that can't load (no
// network, no audio support) settles on 'error' and the caption stands in for it. The audio element is made on the
// first press, so server rendering and the unit tests never touch one (tests pass a fake through setAudioFactory).
// Clips are keyed by URL: voice lines pass clipUrl(id), Watch mode its narration clips.
export type ClipState = 'idle' | 'loading' | 'playing' | 'error';
/** How a clip's play settled: it ran to the end, it couldn't load, or something stopped or replaced it. */
export type ClipEnd = 'ended' | 'error' | 'stopped';

/** The part of HTMLAudioElement the player uses. */
export interface AudioLike {
  src: string;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: 'playing' | 'ended' | 'error', f: () => void): void;
}

export const clipUrl = (id: string) => `/data/voice/${id}.mp3`;

let make: () => AudioLike = () => new Audio();
let el: AudioLike | null = null;
let current: string | null = null,
  state: ClipState = 'idle',
  token = 0,
  settle: ((e: ClipEnd) => void) | null = null;
const failed = new Set<string>();
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const set = (s: ClipState) => {
  state = s;
  emit();
};
const finish = (e: ClipEnd) => {
  const f = settle;
  settle = null;
  f?.(e);
};
const fail = (url: string) => {
  failed.add(url);
  if (current === url) {
    current = null;
    set('idle');
    finish('error');
  } else emit();
};

function audio(): AudioLike {
  if (el) return el;
  const a = make();
  // the element is shared: an event counts only while it still holds the current clip (the browser makes src absolute)
  const mine = () => current !== null && a.src.endsWith(current);
  a.addEventListener('playing', () => {
    if (mine() && state === 'loading') set('playing');
  });
  a.addEventListener('ended', () => {
    if (mine()) {
      current = null;
      set('idle');
      finish('ended');
    }
  });
  a.addEventListener('error', () => {
    if (mine()) fail(current!);
  });
  return (el = a);
}

/** Play a clip by URL (a reader pressed Play, or Watch speaks a step): stops whatever else was playing first.
 * Settles when the clip ends, fails, or is stopped. */
export function playClip(url: string): Promise<ClipEnd> {
  stopClip();
  const a = audio(),
    mine = ++token,
    done = new Promise<ClipEnd>(r => (settle = r));
  current = url;
  failed.delete(url);
  set('loading');
  a.src = url;
  a.play().catch(() => {
    if (token === mine && current === url) fail(url);
  });
  return done;
}

/** Stop whatever is playing (no-op when nothing is). */
export function stopClip() {
  if (current === null) return;
  token++;
  current = null;
  el?.pause();
  set('idle');
  finish('stopped');
}

/** A clip's state: loading or playing only while it is the current clip; error after its last try failed. */
export const clipStatus = (url: string): ClipState => (current === url ? state : failed.has(url) ? 'error' : 'idle');
export const playing = () => current;
export function subscribe(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

/** Tests: swap the audio element for a fake, and forget every state. */
export function setAudioFactory(f: () => AudioLike) {
  make = f;
  el = null;
  current = null;
  state = 'idle';
  settle = null;
  failed.clear();
  emit();
}
