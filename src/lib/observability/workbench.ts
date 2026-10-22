// Chapter 7's workbench (KTD8): day 2's thumbs-down queue, triaged to one fix. The policy is a mode per trace (a select
// each) and the fix to ship. The tally counts the reader's labels; the harm a fix removes is counted from the reference
// modes, so a mislabelled queue can point at the wrong fix. A policy works when every label is right and the fix is one
// of the modes tied for the most harm removed (WINNERS).
import { DAY2, MODE_IDS, modeOf, type ModeId, type Trace } from './traces';
import { counts, fixFirst, ranked } from './coding';

export interface Policy {
  labels: Record<string, ModeId | ''>;
  fix: ModeId | '';
}
/** every control's finite values: a mode per trace, and the fix */
export const WORKBENCH_DOMAINS = { traces: DAY2.map(t => t.id), labels: MODE_IDS, fix: MODE_IDS };
export const EMPTY: Policy = { labels: {}, fix: '' };

const REF = counts(DAY2);
/** the fixes that remove the most harm on day 2, by the reference modes */
export const WINNERS: ModeId[] = fixFirst(REF);
const BEST = REF[WINNERS[0]] * modeOf(WINNERS[0]).harm;

export interface Row {
  trace: Trace;
  label: ModeId | '';
  right: boolean;
  reason: string;
}
export function rowsOf(p: Policy): Row[] {
  return DAY2.map(t => {
    const label = p.labels[t.id] ?? '',
      right = label === t.mode;
    const reason = !label
      ? 'Not labelled yet.'
      : right
        ? `Right: ${t.note}.`
        : `Not this one: ${t.note}, which is “${modeOf(t.mode!).name}”.`;
    return { trace: t, label, right, reason };
  });
}

export interface Score {
  sorted: number;
  of: number;
  tally: ReturnType<typeof ranked>;
  removed: number;
  best: number;
}
/** Labels right, the reader's tally by count × harm, and the harm (count × rating, by the reference) the fix removes. */
export function scoreOf(p: Policy): Score {
  const tally = ranked(counts(DAY2, t => p.labels[t.id]));
  const removed = p.fix ? REF[p.fix] * modeOf(p.fix).harm : 0;
  return { sorted: rowsOf(p).filter(r => r.right).length, of: DAY2.length, tally, removed, best: BEST };
}
export const solved = (p: Policy) => DAY2.every(t => p.labels[t.id] === t.mode) && !!p.fix && WINNERS.includes(p.fix);
/** "Show me": every trace labelled with its reference mode, and the first winning fix. */
export const solution = (): Policy => ({ labels: Object.fromEntries(DAY2.map(t => [t.id, t.mode!])), fix: WINNERS[0] });
