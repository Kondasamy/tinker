// Load balancing's rules (KTD7): how the balancer picks a server for each request, from the servers still in rotation.
// Each rule is a small stateful picker; the simulator makes one per run, so a run is deterministic from its seed.
import { mulberry32 } from '../transformers/sample';

export const RULES = ['round-robin', 'least', 'two', 'weighted'] as const;
export type Rule = (typeof RULES)[number];
export const RULE_NAME: Record<Rule, string> = {
  'round-robin': 'Round robin',
  least: 'Least outstanding',
  two: 'Power of two choices',
  weighted: 'Weighted round robin',
};

/** Picks a server index from `candidates` (indexes into the server list, never empty), given each server's
 * outstanding requests: sent and not yet answered or given up on. */
export type Picker = (candidates: number[], outstanding: number[]) => number;

export function picker(rule: Rule, weights: number[], seed: number): Picker {
  const n = weights.length;
  let next = 0;
  // the first candidate at or after the turn pointer, which then moves past it
  const turn = (ok: (s: number) => boolean) => {
    for (let k = 0; k < n; k++) {
      const s = (next + k) % n;
      if (ok(s)) {
        next = s + 1;
        return s;
      }
    }
    throw new Error('no candidate');
  };
  if (rule === 'round-robin') return c => turn(s => c.includes(s));
  // ties go round in turn, so no server is favoured for its place in the list
  if (rule === 'least')
    return (c, out) => {
      const least = Math.min(...c.map(s => out[s]));
      return turn(s => c.includes(s) && out[s] === least);
    };
  if (rule === 'two') {
    const rand = mulberry32(seed);
    return (c, out) => {
      if (c.length === 1) return c[0];
      const a = c[Math.floor(rand() * c.length)],
        rest = c.filter(s => s !== a),
        b = rest[Math.floor(rand() * rest.length)];
      return out[b] < out[a] ? b : a;
    };
  }
  // smooth weighted round robin: each pick adds every candidate's weight, takes the largest, and charges it the total
  const current = weights.map(() => 0);
  return c => {
    let best = c[0],
      total = 0;
    for (const s of c) {
      current[s] += weights[s];
      total += weights[s];
      if (current[s] > current[best]) best = s;
    }
    current[best] -= total;
    return best;
  };
}
