// Pre-recorded model turns for the Context module, keyed by what the model could see (KTD7). One reviewed file per
// chapter holds the turns that chapter first needs; a signature lives in exactly one file, and every run looks up the
// merged RECORDING, so later chapters and the workbench reuse earlier chapters' turns (as Guardrails does).
import { NORECORD } from '../tools/turns';
export { NORECORD };

/** A memory note the model chose to write (only when the memory tool is offered). */
export interface Memo {
  file: string;
  text: string;
}
/**
 * One model turn. `search` asks the host for documents (the turn's text is the lead-in); otherwise `text` is the answer.
 * Every turn carries `note`, one line on why it reads this way: illustrated, not measured (KTD8).
 */
export interface Turn {
  text: string;
  note: string;
  right?: boolean;
  search?: string;
  memo?: Memo;
}
export interface Recording {
  turns: Record<string, Turn>;
}
/** Everything the model can see. Host-only settings (budget, cache breakpoints and lifetime, prices) stay out. */
export interface Seen {
  case: string;
  system: 'plain' | 'dated';
  tools: string[];
  /** every document up front */
  stuff: boolean;
  /** this turn's retrieved documents, in window order (where the needed fact sits) */
  docs: string[];
  /** documents the model's search returned this turn */
  found: string[];
  /** earlier exchanges this session, each `case:carried` (carried: none, top, fetch, top-cleared, fetch-cleared), or one `summary:a+b` */
  history: string[];
  /** memory files read at the start of the session */
  memory: string[];
}

const files = import.meta.glob<Recording>('/data/context/turns/*.json', { eager: true, import: 'default' });
export const RECORDINGS: Record<string, Recording> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);
/** Every chapter's turns in one recording: what chapters and the workbench run against. */
export const RECORDING: Recording = { turns: Object.assign({}, ...Object.values(RECORDINGS).map(r => r.turns)) };

/** Fields in a fixed order, e.g. `case=free-shipping|docs=shipping-costs|found=|history=|memory=|stuff=off|system=plain|tools=`. */
export function signature(s: Seen): string {
  return [
    `case=${s.case}`,
    `docs=${s.docs.join(',')}`,
    `found=${s.found.join(',')}`,
    `history=${s.history.join(',')}`,
    `memory=${s.memory.join(',')}`,
    `stuff=${s.stuff ? 'on' : 'off'}`,
    `system=${s.system}`,
    `tools=${[...s.tools].sort().join(',')}`,
  ].join('|');
}

/** The recorded turn for this signature, or `norecord` so the host can say none exists. */
export function lookup(rec: Recording, sig: string): Turn | typeof NORECORD {
  return rec.turns[sig] ?? NORECORD;
}
