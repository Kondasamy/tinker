// Pre-recorded agent turns for the sandboxing module, keyed by what the agent could see (KTD9). One reviewed file per
// chapter scenario holds the turns that chapter first needs; a signature lives in exactly one file, and every run looks
// up the merged RECORDING, so later chapters and the red-team workbench reuse earlier turns (as Guardrails does).
import { NORECORD, type Call } from '../tools/turns';
export { NORECORD, type Call };

/** One agent turn: `calls` proposes a tool call; none means `text` is the agent's closing note and the run ends. */
export interface Turn {
  text: string;
  calls?: Call[];
  note?: string;
}
export interface Recording {
  turns: Record<string, Turn>;
}

/** Everything the agent can see. Host-only settings (approval, the prompt count) stay out: they change what the host
 * does, not what the agent is shown. Policy reaches the signature only through the outcomes in `hist`. */
export interface Seen {
  case: string;
  /** the tools the host offers, in display order */
  tools: string[];
  /** every outcome so far, each `tool[:path|:host]:<Outcome>` */
  hist: string[];
}

const files = import.meta.glob<Recording>('/data/sandboxing/turns/*.json', { eager: true, import: 'default' });
export const RECORDINGS: Record<string, Recording> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);
/** Every scenario's turns in one recording: what chapters and the workbench run against. */
export const RECORDING: Recording = { turns: Object.assign({}, ...Object.values(RECORDINGS).map(r => r.turns)) };

/** Sorted `field=value` pairs joined by `|`. */
export function signature(s: Seen): string {
  return [`case=${s.case}`, `hist=${s.hist.join(',')}`, `tools=${[...s.tools].sort().join(',')}`].join('|');
}

/** The recorded turn for this signature, or `norecord` so the host can say none exists. */
export function lookup(rec: Recording, sig: string): Turn | typeof NORECORD {
  return rec.turns[sig] ?? NORECORD;
}
