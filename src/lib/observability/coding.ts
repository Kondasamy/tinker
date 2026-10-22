// Open and axial coding (KTD8). Notes are the reader's own words, kept in progress and never graded; this file only caps
// their length and offers suggestions from a finite list. A grouping is checked against the reference modes whatever the
// groups are called: it passes when traces share a group exactly when they share a mode. Counts and the harm-weighted
// ranking are computed from the traces' labels.
import { FAILED, MODES, MODE_IDS, modeOf, type ModeId, type Trace } from './traces';

/** chapter 3: how many failed traces the reader notes before moving on, and the longest note kept */
export const NEEDED_NOTES = 5;
export const MAX_NOTE = 140;
export const clampNote = (s: string) => s.slice(0, MAX_NOTE);
/** the trace ids with a note that isn't blank */
export const notedIds = (notes: Record<string, string>) => Object.keys(notes).filter(id => notes[id]?.trim());

/** every suggested note, in trace order (each failed trace carries one) */
export const SUGGESTIONS = FAILED.map(t => t.note!);
/** Three suggestion chips for a trace: its own note and the next two in the list, its own placed by its index so the
 * right one isn't always first. Any chip may be picked: notes are never graded. */
export function suggestionsFor(t: Trace): string[] {
  const i = SUGGESTIONS.indexOf(t.note!),
    n = SUGGESTIONS.length;
  const others = [SUGGESTIONS[(i + 1) % n], SUGGESTIONS[(i + 2) % n]];
  others.splice(i % 3, 0, t.note!);
  return others;
}

/** chapter 4: a group number per trace (0 … GROUPS - 1), or missing when not yet sorted */
export type Grouping = Record<string, number>;
export const GROUPS = MODES.length;
export const REFERENCE_GROUPING: Grouping = Object.fromEntries(FAILED.map(t => [t.id, MODE_IDS.indexOf(t.mode!)]));

/** Every trace is sorted, and two traces share a group exactly when they share a reference mode. */
export function groupingMatches(g: Grouping, traces: Trace[] = FAILED): boolean {
  if (!traces.every(t => Number.isInteger(g[t.id]))) return false;
  return traces.every(a => traces.every(b => (g[a.id] === g[b.id]) === (a.mode === b.mode)));
}
/** The reference mode a group holds, when every trace in it shares one. */
export function modeOfGroup(g: Grouping, group: number, traces: Trace[] = FAILED): ModeId | null {
  const ms = new Set(traces.filter(t => g[t.id] === group).map(t => t.mode));
  return ms.size === 1 ? [...ms][0]! : null;
}

/** How many traces carry each mode under `label` (the reference, by default). Zero for a mode nobody has. */
export function counts(
  traces: Trace[] = FAILED,
  label: (t: Trace) => ModeId | '' | undefined = t => t.mode,
): Record<ModeId, number> {
  const c = Object.fromEntries(MODE_IDS.map(m => [m, 0])) as Record<ModeId, number>;
  for (const t of traces) {
    const m = label(t);
    if (m) c[m]++;
  }
  return c;
}
export interface Ranked {
  mode: ModeId;
  count: number;
  harm: number;
  score: number;
}
/** Modes by count × harm, highest first; ties keep the modes' order. */
export function ranked(c: Record<ModeId, number>): Ranked[] {
  return MODE_IDS.map(mode => ({
    mode,
    count: c[mode],
    harm: modeOf(mode).harm,
    score: c[mode] * modeOf(mode).harm,
  })).sort((a, b) => b.score - a.score);
}
/** The modes tied for the most harm removed: what to fix first. */
export const fixFirst = (c: Record<ModeId, number>): ModeId[] => {
  const r = ranked(c),
    best = r[0]?.score ?? 0;
  return r.filter(x => x.score === best).map(x => x.mode);
};
/** The mode seen most often (the tempting wrong pick in chapter 5). */
export const mostFrequent = (c: Record<ModeId, number>): ModeId => MODE_IDS.reduce((a, b) => (c[b] > c[a] ? b : a));
/** Day 1's answers. */
export const DAY1_COUNTS = counts();
export const TOP = fixFirst(DAY1_COUNTS);
