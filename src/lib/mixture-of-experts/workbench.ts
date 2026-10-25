// Chapter 7's workbench (KTD11): pick a model shape (a dated card) and a precision for Larkspur's server. Total weights
// set the memory (Inference's maths); active weights set the work per word. A plan passes when it fits both of
// Larkspur's planning budgets (data/mixture-of-experts/workbench.json); the best plans hold the most total weights.
// WINNERS is pinned and recomputed by solve() in a test, never at import.
import { BITS, type Bits } from '../inference/quantize';
import budget from '../../../data/mixture-of-experts/workbench.json' with { type: 'json' };
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { CARDS, bytesAt, cardOf, gb, type CardId } from './cards';

export { BITS, type Bits };
export const BUDGET = budget;
export interface Plan {
  card: CardId;
  bits: Bits;
}
export const START = budget.start as Plan;
export const PLANS: Plan[] = CARDS.flatMap(c => BITS.map(bits => ({ card: c.id, bits })));

export function judge(p: Plan) {
  const c = cardOf(p.card),
    memory = bytesAt(c.total, p.bits);
  const fitsMemory = gb(memory) <= budget.memoryGB,
    fitsCompute = c.active / 1e9 <= budget.activeB;
  return { card: c, memory, fitsMemory, fitsCompute, ok: fitsMemory && fitsCompute };
}

/** Every passing plan with the most total weights. */
export function solve(): Plan[] {
  const ok = PLANS.filter(p => judge(p).ok);
  const best = Math.max(...ok.map(p => cardOf(p.card).total));
  return ok.filter(p => cardOf(p.card).total === best);
}

export const WINNERS = pinned.workbench.winners as Plan[];
export const wins = (p: Plan) => WINNERS.some(w => w.card === p.card && w.bits === p.bits);
