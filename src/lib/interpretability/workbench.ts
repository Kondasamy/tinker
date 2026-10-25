// Chapter 7's workbench: find the smallest set of Larkspur mini's parts that keeps a behaviour. A set keeps it when,
// with every fuse outside the set pulled, the behaviour's expected token is still the top guess. Six fuses make 64 sets;
// WINNERS (every smallest set that keeps it) is pinned in prompts.json so the chapter needs no search, and
// tests/unit/interpretability-engine.test.ts recomputes it.
import data from '../../../data/interpretability/prompts.json' with { type: 'json' };
import { encode } from '../lm/bpe';
import type { Model } from '../lm/model';
import { FUSES, rankOf, run, type Fuse } from './probe';

export const BEHAVIOURS = data.workbench.behaviours;
export type BehaviourId = string;
export const WINNERS: Record<string, Fuse[][]> = Object.fromEntries(BEHAVIOURS.map(b => [b.id, b.winners as Fuse[][]]));
const behaviour = (id: string) => BEHAVIOURS.find(b => b.id === id) ?? BEHAVIOURS[0];

/** Does keeping only these fuses in keep the behaviour's expected token on top? */
export function keeps(model: Model, id: BehaviourId, kept: readonly Fuse[]): boolean {
  const b = behaviour(id),
    pulled = FUSES.filter(f => !kept.includes(f));
  return rankOf(run(model, encode(b.text), pulled).logits.at(-1)!, encode(b.expected)[0]) === 0;
}

/** Every smallest set that keeps the behaviour, in FUSES order, found by trying all 64. */
export function winnersOf(model: Model, id: BehaviourId): Fuse[][] {
  const sets = Array.from({ length: 1 << FUSES.length }, (_, mask) => FUSES.filter((_, i) => mask & (1 << i)));
  const ok = sets.filter(s => keeps(model, id, s)),
    min = Math.min(...ok.map(s => s.length));
  return ok.filter(s => s.length === min);
}

/** A set the reader built is a right answer when it is one of the winners (order aside). */
export const isWinner = (id: BehaviourId, kept: readonly Fuse[]) =>
  WINNERS[id].some(w => w.length === kept.length && w.every(f => kept.includes(f)));
