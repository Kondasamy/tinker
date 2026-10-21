// Module 13's precise view (the Timeline tab): one lane per request, time running right. Each lane shows the wait in the
// queue (a dashed line), the prefill block (reading the prompt, ending at the first token) and the decode block (writing
// the reply). Optional target lines mark the first-token target. Pure layout, so the tests check it without drawing; the
// kit draws it as React SVG (text nodes only).
import { PALS, METAL } from '../../lib/iso/core.js';
import type { Result, Served } from '../../lib/inference/server';

export const PHASE_PAL = { queue: METAL, prefill: PALS.mustard, decode: PALS.mint };
// room right of the lanes for a "late" mark
const LATE = 24;
const DESK = { w: 600, pad: 14, label: 34, row: 13, gap: 3, axis: 26, fs: 10 }, PHONE = { w: 320, pad: 8, label: 28, row: 13, gap: 3, axis: 26, fs: 10 };

export interface Lane {
  i: number; id: string; y: number; h: number;
  queue: { x: number; w: number }; prefill: { x: number; w: number }; decode: { x: number; w: number };
  served: Served;
}
export interface TimelineOpts { phone?: boolean; ttftTarget?: number }

const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
export const ms = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)} µs` : v < 1000 ? `${v.toFixed(v < 10 ? 1 : 0)} ms` : secs(v));

/** The timeline's layout. The time scale fits the last finish, so every run of the trace is drawn whole. */
export function serverTimeline(r: Result, { phone = false }: TimelineOpts = {}) {
  const L = phone ? PHONE : DESK, x0 = L.pad + L.label, span = Math.max(1, r.makespan), k = (L.w - L.pad - x0 - LATE) / span;
  const X = (t: number) => x0 + t * k, top = L.pad;
  const lanes: Lane[] = r.served.map((s, i) => ({
    i, id: s.id, y: top + i * (L.row + L.gap), h: L.row, served: s,
    queue: { x: X(s.at), w: (s.admitted - s.at) * k }, prefill: { x: X(s.admitted), w: (s.first - s.admitted) * k }, decode: { x: X(s.first), w: (s.finish - s.first) * k },
  }));
  const h = top + lanes.length * (L.row + L.gap) + L.axis;
  // a tick every whole second (every 2 s past 12 s), labelled in seconds
  const step = span > 12_000 ? 2000 : 1000, ticks: { x: number; label: string }[] = [];
  for (let t = 0; t <= span; t += step) ticks.push({ x: X(t), label: `${t / 1000}` });
  return { lanes, w: L.w, h, x0, fs: L.fs, axisY: h - L.axis + 6, ticks, X, label: L.label };
}
export type Timeline = ReturnType<typeof serverTimeline>;

/** A lane's name, for the list and the read-out line: wait to first token and finish time. */
export const laneName = (l: Lane, n: number) => {
  const s = l.served;
  return `Request ${l.i + 1} of ${n} (${s.prompt} prompt tokens, ${s.reply} reply tokens): arrived at ${secs(s.at)}, `
    + `waited ${ms(s.ttft)} for its first token, then ${ms(s.tpot)} per token; finished at ${secs(s.finish)}`;
};

/** The timeline in words, for its label. */
export const timelineLabel = (r: Result) =>
  `Server timeline, one lane per request: ${r.served.length} requests, ${r.settings.mode} batching, batch cap ${r.settings.cap}. `
  + `The last reply finished at ${secs(r.makespan)}; the longest wait for a first token was ${ms(r.worstTtft)}.`;
