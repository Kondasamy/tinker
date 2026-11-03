// The workbench (chapter 7): a hand-written week of Larkspur's requests while the servers change under it
// (data/tools-in-production/story.json). A policy says, per server, whether to trust it, pin its approved tools, and
// load its tools only when a search finds them. Each request is played for real against that week's definitions.
import STORY from '../../../data/tools-in-production/story.json' with { type: 'json' };
import {
  changed,
  drifted,
  type Change,
  poisoned,
  requestOf,
  SEARCH_TOKENS,
  search,
  SERVERS,
  type Tool,
  type ToolDef,
  TOOLS,
  toolOf,
} from './tools';

export interface Rule {
  trust: boolean;
  pin: boolean;
  /** load only when a search finds it (off: every definition, every request) */
  lazy: boolean;
}
export type Policy = Record<string, Rule>;
export interface Day {
  day: string;
  change?: Change;
  tasks: string[];
}
export const WEEK: Day[] = STORY.week.days as Day[];
export const TASKS = WEEK.reduce((n, d) => n + d.tasks.length, 0);

export interface Outcome {
  day: string;
  request: string;
  /** done: the right tool ran; held: a pin refused the changed tool; untrusted: its server is off; missed: not found */
  result: 'done' | 'held' | 'untrusted' | 'missed';
  /** a poisoned description was in the prompt */
  incident: boolean;
  tokens: number;
}
export interface Score {
  done: number;
  incidents: number;
  tokens: number;
  runs: Outcome[];
  /** servers whose poisoned tool reached the prompt, and tools a pin held */
  leaked: string[];
  held: string[];
}

/** The week under a policy. */
export function runWeek(p: Policy): Score {
  const today = new Map<string, ToolDef>(TOOLS.map(t => [t.id, t]));
  const runs: Outcome[] = [];
  const leaked = new Set<string>(),
    held = new Set<string>();
  for (const d of WEEK) {
    if (d.change) today.set(d.change.tool, changed(today.get(d.change.tool)!, d.change));
    // a pinned server's drifted tools never reach the prompt
    const ok = (t: Tool) => p[t.server].trust && !(p[t.server].pin && drifted(t, today.get(t.id)!));
    const eager = TOOLS.filter(t => ok(t) && !p[t.server].lazy),
      lazyPool = TOOLS.filter(t => ok(t) && p[t.server].lazy);
    for (const id of d.tasks) {
      const r = requestOf(id),
        need = toolOf(r.tool);
      const found = lazyPool.length ? search(r.text, lazyPool, t => today.get(t.id)!) : [];
      const loaded = [...eager.map(t => t.id), ...found];
      const tokens =
        eager.reduce((n, t) => n + t.tokens, 0) +
        (lazyPool.length ? SEARCH_TOKENS : 0) +
        found.reduce((n, f) => n + toolOf(f).tokens, 0);
      const bad = loaded.filter(t => poisoned(today.get(t)!));
      for (const t of bad) leaked.add(toolOf(t).server);
      const result = !p[need.server].trust
        ? 'untrusted'
        : !ok(need)
          ? 'held'
          : loaded.includes(need.id)
            ? 'done'
            : 'missed';
      if (result === 'held') held.add(need.id);
      runs.push({ day: d.day, request: id, result, incident: bad.length > 0, tokens });
    }
  }
  return {
    done: runs.filter(r => r.result === 'done').length,
    incidents: runs.filter(r => r.incident).length,
    tokens: runs.reduce((n, r) => n + r.tokens, 0),
    runs,
    leaked: [...leaked],
    held: [...held],
  };
}

/** Larkspur's rule for a week: no incidents first, then the most requests done, then the fewest tokens. */
export const better = (a: Score, b: Score) => a.incidents - b.incidents || b.done - a.done || a.tokens - b.tokens;

const IDS = SERVERS.map(s => s.id);
/** A policy as 12 switches, server by server: trust, pin, lazy. */
export const policyOf = (bits: number): Policy =>
  Object.fromEntries(
    IDS.map((id, i) => {
      const b = bits >> (3 * i);
      return [id, { trust: !!(b & 1), pin: !!(b & 2), lazy: !!(b & 4) }];
    }),
  );
export const bitsOf = (p: Policy) =>
  IDS.reduce((n, id, i) => n | ((+p[id].trust | (+p[id].pin << 1) | (+p[id].lazy << 2)) << (3 * i)), 0);

/** Every policy that scores best: the workbench accepts any of them (recomputed in tests/unit/tools-in-production). */
export function solve() {
  const all = Array.from({ length: 1 << (3 * IDS.length) }, (_, b) => ({ b, s: runWeek(policyOf(b)) }));
  const best = all.reduce((x, y) => (better(y.s, x.s) < 0 ? y : x)).s;
  return { best, winners: all.filter(x => better(x.s, best) === 0).map(x => x.b) };
}

/** The workbench's opening setup: every server trusted, nothing pinned, every tool loaded. */
export const OPENING: Policy = Object.fromEntries(IDS.map(id => [id, { trust: true, pin: false, lazy: false }]));
