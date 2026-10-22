// Voice's engine (KTD11). Live: the end-of-turn detector over the committed envelopes (turns.ts), the latency sums
// (latency.ts), and the counts of cut-offs, dead air and errors per call. Recorded (data/voice/transcripts.json, written
// for this site): what speech-to-text wrote and how the assistant answered, keyed by call and by what the model heard.
// A key nobody recorded throws; the coverage test proves no chapter control or workbench plan reaches one.
import calls from '../../../data/voice/calls.json' with { type: 'json' };
import transcripts from '../../../data/voice/transcripts.json' with { type: 'json' };
import { DEFAULT_DETECTOR, SILENCES, THRESHOLDS, clipOf, detect, type Detected, type Detector } from './turns';
import { HOST, latency, type Latency } from './latency';

export type CallId = 'status' | 'hesitant' | 'noisy' | 'slots' | 'mishear';
export interface Call {
  id: CallId;
  caller: string;
  title: string;
  opening: string;
  about: string;
  interrupt?: string;
  reply?: string;
  unsure?: boolean;
}
export const CALLS = calls.calls as Call[];
export const callOf = (id: string) => {
  const c = CALLS.find(x => x.id === id);
  if (!c) throw new Error(`no call ${id}`);
  return c;
};

export type Verdict = 'ok' | 'cut-off' | 'wrong' | 'talked-over';
export interface Turn {
  clip: string;
  text?: string;
  kept?: number;
  lost?: boolean;
  unsure?: string;
}
export interface Recorded {
  turns: Turn[];
  verdict: Verdict;
  note: string;
}
const TURNS = transcripts.turns as Record<string, Recorded>;
/** Every recorded key: the coverage test proves each is reachable. */
export const RECORDED = Object.keys(TURNS);

/** The recording for a key; throws on a missing one. */
export function recorded(key: string): Recorded {
  const r = TURNS[key];
  if (!r) throw new Error(`no recording for ${key}`);
  return r;
}

/** Where the caller cuts in during the slot reply: during its part 2 (Wednesday) or part 3 (Friday). */
export const POINTS = ['stop-2', 'stop-3'] as const;
export type Point = (typeof POINTS)[number];
export const partOf = (p: Point) => Number(p.slice(5));

/** The line's settings: the detector, and three host rules. */
export interface Line extends Detector {
  /** speak the first sentence while the model writes the rest */
  streaming: boolean;
  /** stop speaking when the caller talks over the reply */
  bargeIn: boolean;
  /** read back a number speech-to-text is unsure of before acting on it */
  readBack: boolean;
  /** where the caller cuts in on the slots call */
  point: Point;
}
export const DEFAULT_LINE: Line = {
  ...DEFAULT_DETECTOR,
  streaming: false,
  bargeIn: false,
  readBack: false,
  point: 'stop-3',
};

/** What the model heard on a call, as a recording key. */
export function keyOf(call: CallId, line: Line, d = detect(callOf(call).opening, line)): string {
  const c = callOf(call),
    base = `${call}|${d.heard}`;
  if (c.interrupt) return `${base}|${line.bargeIn ? line.point : 'talked-over'}`;
  if (c.unsure) return `${base}|${line.readBack ? 'confirm' : 'direct'}`;
  return base;
}

/** When the caller cuts in on the slots reply (ms from the reply's start): the middle of the part they talk over. */
export function interruptAt(p: Point) {
  const part = clipOf(callOf('slots').reply!).parts[partOf(p)];
  return Math.round((part.start + part.end) / 2);
}

export interface CallRun {
  call: Call;
  key: string;
  detected: Detected;
  recording: Recorded;
  /** the first reply's latency, from the end of the turn */
  latency: Latency;
  /** from the caller's last word to the first sound of the reply; null when the turn was cut off */
  wait: number | null;
  deadAir: boolean;
  /** what went wrong on the call, if anything */
  problem: 'cut-off' | 'dead air' | 'wrong' | 'talked-over' | null;
}

/** One call through the line: the detector live, the recording for what it heard, the wait summed live. */
export function runCall(call: CallId, line: Line): CallRun {
  const c = callOf(call),
    detected = detect(c.opening, line),
    key = keyOf(call, line, detected),
    recording = recorded(key);
  const reply = recording.turns.find((t, i) => i > 0 && !t.text && !t.lost)!.clip;
  const lat = latency(reply, line.streaming);
  const wait = detected.cut ? null : detected.fire - detected.lastWord + lat.firstSound;
  const deadAir = wait !== null && wait > HOST.deadAirMs;
  const problem = detected.cut
    ? 'cut-off'
    : recording.verdict === 'wrong'
      ? 'wrong'
      : recording.verdict === 'talked-over'
        ? 'talked-over'
        : deadAir
          ? 'dead air'
          : null;
  return { call: c, key, detected, recording, latency: lat, wait, deadAir, problem };
}

// ---- coverage domains (KTD12): what each chapter's controls can reach ----

export interface Domain {
  calls: CallId[];
  thresholds: readonly number[];
  silences: readonly number[];
  bargeIn: boolean[];
  readBack: boolean[];
  points: readonly Point[];
}
const one = (calls: CallId[], d: Partial<Domain> = {}): Domain => ({
  calls,
  thresholds: [DEFAULT_DETECTOR.threshold],
  silences: [DEFAULT_DETECTOR.silence],
  bargeIn: [false],
  readBack: [false],
  points: [DEFAULT_LINE.point],
  ...d,
});
export const DOMAINS: Record<string, Domain> = {
  '01-larkspurs-phone-line': one(['status']),
  '02-the-latency-budget': one(['status']),
  '03-whose-turn-is-it': one(['hesitant'], { silences: SILENCES }),
  '03-whose-turn-is-it/noisy': one(['noisy'], { thresholds: THRESHOLDS, silences: [800] }),
  '04-being-interrupted': one(['slots'], { bargeIn: [false, true], points: POINTS }),
  '05-mishearing': one(['mishear'], { readBack: [false, true] }),
};
/** Chapter 7: every call under every line the bench can set. */
export const WORKBENCH_DOMAINS: Domain = {
  calls: CALLS.map(c => c.id),
  thresholds: THRESHOLDS,
  silences: SILENCES,
  bargeIn: [false, true],
  readBack: [false, true],
  points: ['stop-3'],
};
/** Every (call, line) a domain reaches. */
export const combos = (d: Domain): [CallId, Line][] =>
  d.calls.flatMap(call =>
    d.thresholds.flatMap(threshold =>
      d.silences.flatMap(silence =>
        d.bargeIn.flatMap(bargeIn =>
          d.readBack.flatMap(readBack =>
            d.points.map(
              point =>
                [call, { threshold, silence, bargeIn, readBack, point, streaming: false } as Line] as [CallId, Line],
            ),
          ),
        ),
      ),
    ),
  );
