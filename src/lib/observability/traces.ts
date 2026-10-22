// The Observability module's day of traffic (KTD8): about forty hand-written traces of Larkspur's assistant, each a span
// tree shaped like OpenTelemetry's GenAI conventions (an agent span over retrieval, model calls, tool calls and the
// reply). Nothing here was measured: the timings, the failures and their reference first spans and modes are written by
// hand, and the copy says so. `problems` validates a trace; the engine test runs it over every one.
import day1 from '../../../data/observability/traces.json' with { type: 'json' };
import day2 from '../../../data/observability/day2.json' with { type: 'json' };

export type SpanKind = 'agent' | 'retrieval' | 'chat' | 'tool' | 'reply';
export interface Span {
  id: string;
  parent: string | null;
  kind: SpanKind;
  name: string;
  /** milliseconds from the trace's start (hand-written) */
  start: number;
  end: number;
  /** what the span did, in words: the passages found, the call made, the reply sent */
  detail: string;
  /** attributes shaped like the GenAI conventions (gen_ai.operation.name, gen_ai.tool.name) */
  attrs: Record<string, string>;
}
export type ModeId = 'missed-doc' | 'stale-doc' | 'wrong-order' | 'ignored-result' | 'promised-refund';
export interface Mode {
  id: ModeId;
  name: string /** the team's harm rating, 1 (low) to 3 (high) */;
  harm: number;
  why: string;
}
export interface Trace {
  id: string;
  customer: string;
  question: string;
  ok: boolean;
  /** the passage the reply cites, if any */
  citation?: string;
  /** failed traces only: the reference failure mode, the first span that went wrong, and a suggested note */
  mode?: ModeId;
  first?: string;
  note?: string;
  spans: Span[];
}

export const MODES = day1.modes as Mode[];
export const MODE_IDS = MODES.map(m => m.id);
export const modeOf = (id: ModeId) => MODES.find(m => m.id === id)!;
/** day 1: the traces chapters 1–6 read */
export const TRACES = day1.traces as Trace[];
/** day 2: the thumbs-down queue the workbench triages */
export const DAY2 = day2.traces as Trace[];
export const FAILED = TRACES.filter(t => !t.ok);
export const DAYS = { one: day1.day, two: day2.day };

export function traceOf(id: string): Trace {
  const t = TRACES.find(t => t.id === id) ?? DAY2.find(t => t.id === id);
  if (!t) throw new Error(`unknown trace: ${id}`);
  return t;
}
export const spanOf = (t: Trace, id: string) => t.spans.find(s => s.id === id);
export const replyOf = (t: Trace) => t.spans.find(s => s.kind === 'reply')!.detail;
export const durationOf = (s: Span) => s.end - s.start;
export const rootOf = (t: Trace) => t.spans.find(s => s.parent === null)!;

/** The spans in reading order: depth first from the root, siblings by start time, each with its depth. */
export function ordered(t: Trace): { span: Span; depth: number }[] {
  const out: { span: Span; depth: number }[] = [];
  const walk = (s: Span, depth: number) => {
    out.push({ span: s, depth });
    t.spans
      .filter(c => c.parent === s.id)
      .sort((a, b) => a.start - b.start)
      .forEach(c => walk(c, depth + 1));
  };
  const root = rootOf(t);
  if (root) walk(root, 0);
  return out;
}

/** Everything wrong with a trace, one line each ([] when it is well formed): one tree, children inside their parent's
 * time, exactly one reply, and a failed trace's reference span present (an ok trace has none). */
export function problems(t: Trace): string[] {
  const out: string[] = [],
    ids = t.spans.map(s => s.id);
  if (new Set(ids).size !== ids.length) out.push(`${t.id}: repeated span ids`);
  const roots = t.spans.filter(s => s.parent === null);
  if (roots.length !== 1) out.push(`${t.id}: ${roots.length} roots`);
  for (const s of t.spans) {
    if (s.end < s.start) out.push(`${t.id}/${s.id}: ends before it starts`);
    if (s.parent === null) continue;
    const p = spanOf(t, s.parent);
    if (!p) out.push(`${t.id}/${s.id}: no parent ${s.parent}`);
    else if (s.start < p.start || s.end > p.end) out.push(`${t.id}/${s.id}: outside its parent's time`);
  }
  if (roots.length === 1 && ordered(t).length !== t.spans.length)
    out.push(`${t.id}: spans not reachable from the root`);
  if (t.spans.filter(s => s.kind === 'reply').length !== 1) out.push(`${t.id}: not exactly one reply`);
  if (t.ok && (t.mode || t.first)) out.push(`${t.id}: an ok trace with a failure`);
  if (!t.ok) {
    if (!t.mode || !MODE_IDS.includes(t.mode)) out.push(`${t.id}: no known failure mode`);
    if (!t.first || !spanOf(t, t.first)) out.push(`${t.id}: reference first span ${t.first} is missing`);
    if (!t.note?.trim()) out.push(`${t.id}: no suggested note`);
  }
  return out;
}

/** The finite things each chapter's controls can pick (KTD12); the coverage test walks every one. */
export const DOMAINS = {
  '01-what-it-did': { traces: ['t01'] },
  '02-first-failure': { traces: ['t23', 't34'] },
  '03-open-coding': { traces: FAILED.map(t => t.id) },
  '04-axial-coding': { traces: FAILED.map(t => t.id) },
  '05-what-matters': { modes: MODE_IDS },
  '06-trace-to-test': { traces: FAILED.map(t => t.id), versions: ['current', 'fixed'] as const },
};
