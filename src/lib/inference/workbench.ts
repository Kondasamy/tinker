// Inference chapter 7's workbench: a serving policy is a batching mode, a batch cap and the KV room the server keeps,
// each over its finite list (2 × 5 × 3 policies). The simulated server runs the trace; a request passes when its first
// token comes within the first-token target and its reply keeps the per-token target. The puzzle accepts every policy
// tied for the most requests served on target (WINNERS), not one hand-picked answer.
import data from '../../../data/inference/workbench.json' with { type: 'json' };
import { CAPS, MEMORY, MODES, OPEN, serve, type Result, type Served, type Settings } from './server';

export const TARGETS = { ttftMs: data.ttftMs, tpotMs: data.tpotMs };

export interface Verdict { id: string; ok: boolean; ttftOk: boolean; tpotOk: boolean; served: Served }
/** Each request against the targets. */
export const verdicts = (r: Result): Verdict[] => r.served.map(s => {
  const ttftOk = s.ttft <= TARGETS.ttftMs, tpotOk = s.tpot <= TARGETS.tpotMs;
  return { id: s.id, ok: ttftOk && tpotOk, ttftOk, tpotOk, served: s };
});

const runs = new Map<string, Result>();
/** One policy's run, computed once. */
export function runOf(p: Settings): Result {
  const k = `${p.mode}/${p.cap}/${p.kvRoomGB}`;
  if (!runs.has(k)) runs.set(k, serve(OPEN, p));
  return runs.get(k)!;
}
export const scoreOf = (p: Settings) => verdicts(runOf(p)).filter(v => v.ok).length;

/** Every policy the controls can make. */
export const POLICIES: Settings[] = MODES.flatMap(mode => CAPS.flatMap(cap => MEMORY.map(kvRoomGB => ({ mode, cap, kvRoomGB }))));
export const BEST = Math.max(...POLICIES.map(scoreOf));
export const WINNERS = POLICIES.filter(p => scoreOf(p) === BEST);
export const wins = (p: Settings) => scoreOf(p) === BEST;
