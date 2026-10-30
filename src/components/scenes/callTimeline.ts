// Module 17's precise view (the Timeline tab): the call as two lanes, the caller above and the assistant below, time
// running right. Each turn is its clip's energy envelope (mirrored, so speech reads as a waveform and pauses as a flat
// line), placed where it happens; marks show where the detector ended the caller's turn and where the host stopped
// speaking. Pure layout, so the tests check it without drawing; the kit draws it as React SVG (text nodes only).
import { PALS, METAL } from '../../lib/iso/core.js';
import { CLIPS, FRAME_MS } from '../../lib/voice/turns';

export type Lane = 'caller' | 'assistant';
export const LANE_PAL = { caller: PALS.cobalt, assistant: PALS.mint, lost: METAL };
export interface Segment {
  lane: Lane;
  clip: string;
  who: string;
  caption: string;
  /** when the clip starts, ms from the call's start */
  at: number;
  /** cut off this many ms into the clip (the host stopped speaking) */
  until?: number;
  /** the host never heard it (it was speaking over the caller) */
  lost?: boolean;
}
export interface Mark {
  at: number;
  kind: 'turn-end' | 'stop';
  label: string;
}

const DESK = { w: 600, pad: 12, label: 70, lane: 46, gap: 14, axis: 24, fs: 10 },
  PHONE = { w: 340, pad: 8, label: 52, lane: 40, gap: 12, axis: 24, fs: 10 };
export const secs = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

/** Where a segment's speech starts and ends, ms from the call's start (a cut-off segment ends where it was cut). */
export function spanOf(s: Segment) {
  const c = CLIPS[s.clip],
    start = s.at + c.parts[0].start;
  const end = s.at + Math.min(c.parts[c.parts.length - 1].end, s.until ?? Infinity);
  return { start, end };
}

/** The timeline's layout. The time scale fits the last sound, so the whole call is drawn. */
export function callTimeline(segments: Segment[], marks: Mark[], { phone = false } = {}) {
  const L = phone ? PHONE : DESK,
    x0 = L.pad + L.label;
  const span = Math.max(
    1,
    ...segments.map(s => s.at + Math.min(CLIPS[s.clip].ms, s.until ?? Infinity)),
    ...marks.map(m => m.at),
  );
  const k = (L.w - L.pad - x0) / span,
    X = (t: number) => x0 + t * k;
  const laneY: Record<Lane, number> = { caller: L.pad, assistant: L.pad + L.lane + L.gap };
  const lanes = (['caller', 'assistant'] as Lane[]).map(id => ({
    id,
    y: laneY[id],
    h: L.lane,
    label: id === 'caller' ? 'Caller' : 'Assistant',
  }));
  const segs = segments.map((s, i) => {
    const c = CLIPS[s.clip],
      n = Math.ceil(Math.min(c.ms, s.until ?? Infinity) / FRAME_MS),
      y = laneY[s.lane],
      mid = y + L.lane / 2;
    const amp = (v: number) => Math.min(1, v / 180) * (L.lane / 2 - 2);
    const xs = Array.from({ length: n }, (_, j) => X(s.at + j * FRAME_MS));
    const top = xs.map((x, j) => `${x.toFixed(1)} ${(mid - amp(c.env[j])).toFixed(1)}`),
      bot = xs.map((x, j) => `${x.toFixed(1)} ${(mid + amp(c.env[j])).toFixed(1)}`).reverse();
    const { start, end } = spanOf(s);
    return {
      i,
      lane: s.lane,
      x: X(s.at),
      w: n * FRAME_MS * k,
      y,
      h: L.lane,
      mid,
      d: `M${top.join('L')}L${bot.join('L')}Z`,
      sx: X(start),
      ex: X(end),
      seg: s,
    };
  });
  const h = laneY.assistant + L.lane + L.axis;
  const step = span > 12_000 ? 2000 : 1000,
    ticks: { x: number; label: string }[] = [];
  for (let t = 0; t <= span; t += step) ticks.push({ x: X(t), label: `${t / 1000}` });
  return {
    lanes,
    segs,
    marks: marks.map(m => ({ ...m, x: X(m.at) })),
    w: L.w,
    h,
    x0,
    fs: L.fs,
    axisY: h - L.axis + 6,
    ticks,
  };
}
export type Timeline = ReturnType<typeof callTimeline>;

const LANE_WORD: Record<Lane, string> = { caller: 'the caller’s', assistant: 'the assistant’s' };
/** A turn's name, for the list and the read-out: who, when, and the gap since the other voice's last word. */
export function segmentName(segments: Segment[], i: number) {
  const s = segments[i],
    { start, end } = spanOf(s);
  let out = `${s.who}${s.lost ? ' (never heard: the line was speaking)' : ''}, ${secs(start)} to ${secs(end)}${s.until !== undefined ? ', cut short' : ''}`;
  const prev = segments
    .slice(0, i)
    .reverse()
    .find(p => p.lane !== s.lane);
  if (prev) {
    const gap = start - spanOf(prev).end;
    out +=
      gap >= 0
        ? `: a gap of ${secs(gap)} after ${LANE_WORD[prev.lane]} last word`
        : `: starts ${secs(-gap)} before ${LANE_WORD[prev.lane]} last word, over it`;
  }
  return out;
}

/** The timeline in words, for its label. */
export const timelineLabel = (segments: Segment[], marks: Mark[]) =>
  `Call timeline, the caller above and the assistant below: ${segments.length} turns. ${marks.map(m => `${m.label} at ${secs(m.at)}`).join('; ')}.`;
