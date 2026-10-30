// Chapter 3's hand-written rule: the moves that worked on one bin, written down and played blind. It never looks at
// the camera, so it does the same thing on every bin (a fixed script, like a taught industrial arm's positions).
import { BINS, type Action, type Layout, layoutOf, play } from './world';
import { expertDemo } from './policy';

export const RULE_BIN = layoutOf(BINS.rule.bin);
export const NEW_BIN = layoutOf(BINS.rule.newBin);
/** The rule: the expert's moves on RULE_BIN, fixed. */
export const RULE: Action[] = expertDemo(RULE_BIN);
/** The rule played on a bin: its states, and how it ended (a script that runs out without the part in the tray is
 * stuck). */
export function runRule(l: Layout) {
  const states = play(l, RULE),
    last = states.at(-1)!;
  return { states, end: last.end ?? 'stuck', steps: last.steps };
}
