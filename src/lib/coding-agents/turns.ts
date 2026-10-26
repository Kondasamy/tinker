// Recorded agent turns for coding agents, keyed by what the agent saw (KTD8). One reviewed file per chapter scenario
// holds the turns that chapter first needs; a signature lives in exactly one file, and every run looks up the merged
// RECORDING, so later chapters and the workbench reuse earlier turns (as Computer use does). The turns were written for
// this site to show the lessons; they were not recorded from a real model, and the copy says so.
import { NORECORD } from '../tools/turns';
export { NORECORD };

/** What the agent asks the host to do; none means `text` is its closing note. */
export type Act = { search: string } | { read: string } | { edit: string } | { run: string };
export interface Turn {
  text: string;
  act?: Act;
  note: string;
}
export interface Recording {
  turns: Record<string, Turn>;
}

/** Everything the agent can see. Host-only stages (protected test files, the run allow-list, asking a person) stay
 * out: they reach the signature only through the outcomes in `hist`. A hunk review by a person reaches it the same way:
 * the outcome of the edit is `reviewed` and names the version the reviewer kept, so the next turn of the agent sees it. */
export interface Seen {
  case: string;
  /** every outcome so far: `search:<q>`, `read:<path>`, `edit:<path>:<outcome>[:<version>]`, `run:<cmd>:<outcome>` */
  hist: string[];
  /** the tools the agent is told it has */
  rules: string;
}

const files = import.meta.glob<Recording>('/data/coding-agents/turns/*.json', { eager: true, import: 'default' });
export const RECORDINGS: Record<string, Recording> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);
/** Every scenario's turns in one recording: what chapters and the workbench run against. */
export const RECORDING: Recording = { turns: Object.assign({}, ...Object.values(RECORDINGS).map(r => r.turns)) };

export const signature = (s: Seen) => [`case=${s.case}`, `hist=${s.hist.join(',')}`, `rules=${s.rules}`].join('|');

/** The recorded turn for this signature, or `norecord` so the host can say none exists. */
export function lookup(rec: Recording, sig: string): Turn | typeof NORECORD {
  return rec.turns[sig] ?? NORECORD;
}
