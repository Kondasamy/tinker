// Pre-recorded agent turns keyed by what the model could see (KTD3, KTD4). One reviewed file per scenario,
// named after the chapter that plays it; RECORDINGS collects them all for the workbench and tests.
import { NORECORD, type Call } from '../tools/turns';
export { NORECORD, type Call };

/** One model turn: `plan` writes (or rewrites) a plan; `calls` proposes tool calls (several = parallel); neither means `text` is the final answer. */
export interface Turn {
  text: string;
  plan?: string[];
  calls?: Call[];
}
export interface Recording {
  /** what the Larkspur employee asks, per case id; the case id is part of the signature */
  asks: Record<string, string>;
  /** tools the host offers, in display order (the host-defined `delegate` is appended when helpers are on) */
  tools: string[];
  turns: Record<string, Turn>;
}
export type Mem = 'full' | 'summary' | 'pinned';
/** off: no planning; on: planning, no plan decided yet; approved / rejected: the latest decision on a plan */
export type PlanState = 'off' | 'on' | 'approved' | 'rejected';
/** Everything the model can see. Host-only settings (step budget, repeat detector, approval mode, context budget) are left out on purpose. */
export interface Seen {
  case: string;
  tools: string[];
  plan: PlanState;
  mem: Mem;
  /** every outcome so far, each `name[:order_id]:outcome` or `plan:approved|rejected`; `summary` stands for compacted history */
  hist: string[];
}

const files = import.meta.glob<Recording>('/data/agents/turns/*.json', { eager: true, import: 'default' });
export const RECORDINGS: Record<string, Recording> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);

/** Sorted `field=value` pairs joined by `|`, e.g. `case=damaged|hist=get_order:1042:ok|mem=full|plan=off|tools=get_order,send_email`. */
export function signature(s: Seen): string {
  return [
    `case=${s.case}`,
    `hist=${s.hist.join(',')}`,
    `mem=${s.mem}`,
    `plan=${s.plan}`,
    `tools=${[...s.tools].sort().join(',')}`,
  ].join('|');
}

/** The recorded turn for this signature, or `norecord` so the host can say none exists. */
export function lookup(rec: Recording, sig: string): Turn | typeof NORECORD {
  return rec.turns[sig] ?? NORECORD;
}
