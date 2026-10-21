// The one shared player behind every clip button (KTD11, R18). Nothing plays until a reader presses Play; starting a
// clip stops any other; the chapter stops it when the step changes or the page unmounts. A clip that can't load (no
// network, no audio support) settles on 'error' and the caption stands in for it. The audio element is made on the
// first press, so server rendering and the unit tests never touch one (tests pass a fake through setAudioFactory).
export type ClipState = 'idle' | 'loading' | 'playing' | 'error';

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
let current: string | null = null, state: ClipState = 'idle', token = 0;
const failed = new Set<string>();
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const set = (s: ClipState) => { state = s; emit(); };
const fail = (id: string) => { failed.add(id); if (current === id) { current = null; set('idle'); } else emit(); };

function audio(): AudioLike {
  if (el) return el;
  const a = make();
  a.addEventListener('playing', () => { if (current) set('playing'); });
  a.addEventListener('ended', () => { current = null; set('idle'); });
  a.addEventListener('error', () => { if (current) fail(current); });
  return (el = a);
}

/** Play a clip (a reader pressed Play): stops whatever else was playing first. */
export function playClip(id: string) {
  stopClip();
  const a = audio(), mine = ++token;
  current = id;
  failed.delete(id);
  set('loading');
  a.src = clipUrl(id);
  a.play().catch(() => { if (token === mine && current === id) fail(id); });
}

/** Stop whatever is playing (no-op when nothing is). */
export function stopClip() {
  if (current === null) return;
  token++;
  current = null;
  el?.pause();
  set('idle');
}

/** A clip's state: loading or playing only while it is the current clip; error after its last try failed. */
export const clipStatus = (id: string): ClipState => (current === id ? state : failed.has(id) ? 'error' : 'idle');
export const playing = () => current;
export function subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

/** Tests: swap the audio element for a fake, and forget every state. */
export function setAudioFactory(f: () => AudioLike) {
  make = f; el = null; current = null; state = 'idle'; failed.clear(); emit();
}
