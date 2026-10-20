// Pre-recorded model turns for module 5, keyed by what the model could see (KTD8). One reviewed file per chapter
// scenario holds the turns that chapter first needs; a signature lives in exactly one file, and every run looks up
// the merged RECORDING, so later chapters and the red-team workbench reuse earlier chapters' turns.
import { NORECORD, type Call } from '../tools/turns';
export { NORECORD, type Call };

/** One model turn: `calls` proposes tool calls; none means `text` is the model's closing note and the run ends. */
export interface Turn { text: string; calls?: Call[] }
export interface Recording { turns: Record<string, Turn> }
/** full: the model can read the email; quarantined: the input filter held it; refused: the input policy check turned it away */
export type Form = 'full' | 'quarantined' | 'refused';
/** How a proposed call ended, as the model hears it: run (ok or error), failed its schema, or stopped by a host check or a person. */
export type Outcome = 'ok' | 'error' | 'invalid' | 'blocked' | 'denied';
/** Everything the model can see. Host-only settings (threshold, allow-list, output filter, output policy, approval) stay out. */
export interface Seen {
  case: string;
  /** the case's email and its visible form */
  mail: Form;
  /** the prompt rule is in the system text */
  rule: boolean;
  tools: string[];
  /** every outcome so far, each `name[:order_id]:<Outcome>` */
  hist: string[];
}

const files = import.meta.glob<Recording>('/data/guardrails/turns/*.json', { eager: true, import: 'default' });
export const RECORDINGS: Record<string, Recording> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);
/** Every scenario's turns in one recording: what chapters and the workbench run against. */
export const RECORDING: Recording = { turns: Object.assign({}, ...Object.values(RECORDINGS).map((r) => r.turns)) };

/** Sorted `field=value` pairs joined by `|`, e.g. `case=status|hist=read_inbox:ok|mail=status:full|rule=off|tools=get_order,read_inbox`. */
export function signature(s: Seen): string {
  return [`case=${s.case}`, `hist=${s.hist.join(',')}`, `mail=${s.case}:${s.mail}`, `rule=${s.rule ? 'on' : 'off'}`, `tools=${[...s.tools].sort().join(',')}`].join('|');
}

/** The recorded turn for this signature, or `norecord` so the host can say none exists. */
export function lookup(rec: Recording, sig: string): Turn | typeof NORECORD {
  return rec.turns[sig] ?? NORECORD;
}
