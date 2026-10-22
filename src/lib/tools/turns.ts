// Pre-recorded model turns keyed by what the model could see (KTD10, R18). One reviewed file per scenario,
// so a chapter can import just its own JSON; RECORDINGS collects them all for the workbench and tests.
export interface Call {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
/** One model turn: `calls` proposes tool calls (several = parallel); no calls means `text` is the final answer. */
export interface Turn {
  text: string;
  calls?: Call[];
}
export interface Recording {
  /** what the Larkspur employee asks */
  ask: string;
  /** the customer the employee is serving (used by the ownership check) */
  customer?: string;
  /** tools the host offers, in display order */
  tools: string[];
  turns: Record<string, Turn>;
}
export type Desc = 'clear' | 'vague';
/** Everything the model can see. Host-only decisions (call cap, permissions, validation) are left out on purpose. */
export interface Seen {
  tools: string[];
  desc: Desc;
  gate: boolean;
  /** the latest turn's results in call order, each `name[:order_id]:ok|error|invalid|denied` */
  last: string[];
  injection: boolean;
}

const files = import.meta.glob<Recording>('/data/tool-calling/turns/*.json', { eager: true, import: 'default' });
export const RECORDINGS: Record<string, Recording> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);

export const NORECORD = 'norecord';

/** Sorted `field=value` pairs joined by `|`, e.g. `desc=clear|gate=off|inj=no|last=get_order:1042:ok|tools=get_order`. */
export function signature(s: Seen): string {
  return [
    `desc=${s.desc}`,
    `gate=${s.gate ? 'on' : 'off'}`,
    `inj=${s.injection ? 'yes' : 'no'}`,
    `last=${s.last.join(',')}`,
    `tools=${[...s.tools].sort().join(',')}`,
  ].join('|');
}

/** The recorded turn for this signature, or `norecord` so the host can say none exists. */
export function lookup(rec: Recording, sig: string): Turn | typeof NORECORD {
  return rec.turns[sig] ?? NORECORD;
}
