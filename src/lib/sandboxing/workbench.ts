// Chapter 7's red team (KTD9): the policy's dimensions as controls, over both suites. A winning policy stops every
// attack; the best winners also block the fewest ordinary tasks. WINNERS is every policy tied for that best, computed
// over the workbench domain, so the puzzle accepts "one of N that work" rather than one hand-picked answer.
import { combos, metrics, WORKBENCH_DOMAINS, type Defences, type Setup } from './loop';

export type Bench = Defences;
const KEYS: (keyof Bench)[] = ['sandbox', 'files', 'egress', 'secret', 'approval'];
export const benchOf = (s: Partial<Setup>): Bench => Object.fromEntries(KEYS.map((k) => [k, s[k]])) as Bench;
const eq = (a: Bench, b: Bench) => KEYS.every((k) => a[k] === b[k]);

/** Every policy the workbench controls can make (the case is set per run). */
export const POLICIES: Bench[] = (() => {
  const seen: Bench[] = [];
  for (const c of combos({ ...WORKBENCH_DOMAINS, case: ['report'] })) {
    const b = benchOf(c);
    if (!seen.some((x) => eq(x, b))) seen.push(b);
  }
  return seen;
})();

/** Every minimal winning policy: stops every attack (asr 0), at the fewest false blocks any such policy reaches. */
export const WINNERS: Bench[] = (() => {
  const safe = POLICIES.map((b) => ({ b, m: metrics(b) })).filter(({ m }) => m.succeeded === 0);
  if (!safe.length) return [];
  const best = Math.min(...safe.map(({ m }) => m.blocked));
  return safe.filter(({ m }) => m.blocked === best).map(({ b }) => b);
})();

export const isWinner = (s: Partial<Setup>) => WINNERS.some((w) => eq(w, benchOf(s)));
