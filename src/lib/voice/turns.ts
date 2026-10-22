// End-of-turn detection, live over the committed envelopes (KTD11). An envelope is a clip's energy, one number per 20 ms
// frame (RMS × 1000, written by scripts/record-voice.mjs). The detector is the simple kind voice APIs call server VAD:
// a frame at or above the energy threshold is speech; once the caller has spoken, a run of quiet frames as long as the
// silence setting ends the turn. Both settings step over finite lists, so every outcome is known ahead of time.
import envelopes from '../../../data/voice/envelopes.json' with { type: 'json' };
import calls from '../../../data/voice/calls.json' with { type: 'json' };

export interface Clip {
  ms: number;
  env: number[];
  parts: { start: number; end: number }[];
}
export const FRAME_MS = envelopes.frameMs;
export const CLIPS = envelopes.clips as Record<string, Clip>;
export const clipOf = (id: string): Clip => {
  const c = CLIPS[id];
  if (!c) throw new Error(`no clip ${id}`);
  return c;
};

/** Energy thresholds (envelope units), lowest first: a frame at or above one counts as speech. */
export const THRESHOLDS = [10, 30, 50] as const;
/** Silence settings in ms, shortest first: how long the line must be quiet before the turn ends. */
export const SILENCES = [300, 500, 800, 1200] as const;
export type Threshold = (typeof THRESHOLDS)[number];
export type Silence = (typeof SILENCES)[number];
export interface Detector {
  threshold: Threshold;
  silence: Silence;
}
export const DEFAULT_DETECTOR: Detector = { threshold: 30, silence: 500 };

/** Larkspur's host stops waiting this long after the clip ends, if the line never goes quiet (a host setting). */
export const GIVE_UP_MS = calls.host.giveUpMs;

export interface Detected {
  /** when the detector ended the turn, ms from the clip's start */
  fire: number;
  /** when the caller really stopped: the end of their last part's speech */
  lastWord: number;
  /** the detector ended the turn before the caller finished */
  cut: boolean;
  /** how many of the turn's parts were finished when it fired */
  heard: number;
  /** the line never went quiet: the host gave up waiting */
  gaveUp: boolean;
  /** the frame the silence run started on, ms (the detector's idea of the last word), or null when it gave up */
  quietFrom: number | null;
}

/** Run the detector over one clip. Past the clip's end the line keeps its last level (a hum stays a hum). */
export function detect(id: string, { threshold, silence }: Detector): Detected {
  const c = clipOf(id),
    need = Math.ceil(silence / FRAME_MS),
    last = c.env[c.env.length - 1];
  const lastWord = c.parts[c.parts.length - 1].end,
    limit = c.env.length + Math.ceil(GIVE_UP_MS / FRAME_MS);
  let spoke = false,
    quiet = 0,
    fire: number | null = null,
    quietFrom: number | null = null;
  for (let i = 0; i < limit && fire === null; i++) {
    const level = i < c.env.length ? c.env[i] : last;
    if (level >= threshold) {
      spoke = true;
      quiet = 0;
      continue;
    }
    if (!spoke) continue;
    if (++quiet >= need) {
      fire = (i + 1) * FRAME_MS;
      quietFrom = (i + 1 - need) * FRAME_MS;
    }
  }
  const gaveUp = fire === null;
  const at = fire ?? c.ms + GIVE_UP_MS;
  return { fire: at, lastWord, cut: at < lastWord, heard: c.parts.filter(p => p.end <= at).length, gaveUp, quietFrom };
}
