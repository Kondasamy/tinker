// Chapter 7's workbench (KTD12): a recipe is one of the 18 grid runs trained offline (temperature × sieve × real share).
// Its score is the run's held-out loss and rare next-word accuracy, rounded as the chapter shows them. A recipe wins
// when no other is at least as good on both and better on one: the trade between the two. WINNERS is pinned and
// recomputed from runs.json by a test, never solved at import.
import { RUNS, type GridRun } from './runs';
import type { SieveKind } from './sieve';

export interface Recipe {
  temperature: number;
  sieve: SieveKind;
  realShare: 0 | 50;
}
export const TEMPERATURES = [...new Set(RUNS.grid.map(g => g.temperature))];
export const SIEVES: SieveKind[] = ['off', 'dedupe', 'facts'];
export const SHARES = [0, 50] as const;
export const RECIPES: Recipe[] = RUNS.grid.map(({ temperature, sieve, realShare }) => ({
  temperature,
  sieve,
  realShare,
}));
const same = (a: Recipe, b: Recipe) =>
  a.temperature === b.temperature && a.sieve === b.sieve && a.realShare === b.realShare;
export const runOf = (r: Recipe): GridRun => RUNS.grid.find(g => same(g, r))!;

/** Held-out loss to 2 decimals and rare words guessed in tenths of a percent, as the table shows them. */
export const scoreOf = (r: Recipe) => {
  const g = runOf(r);
  return { loss: Math.round(g.heldout * 100) / 100, rare: Math.round(g.rareTop5 * 1000) / 10 };
};
/** Another recipe at least as good on both, and better on one. */
export const beatenBy = (r: Recipe) => {
  const s = scoreOf(r);
  return RECIPES.find(o => {
    const t = scoreOf(o);
    return t.loss <= s.loss && t.rare >= s.rare && (t.loss < s.loss || t.rare > s.rare);
  });
};
export const solved = (r: Recipe) => !beatenBy(r);

/** Every recipe no other beats (pinned; tests/unit/synthetic-data-engine.test.ts recomputes it). */
export const WINNERS: Recipe[] = [
  { temperature: 1, sieve: 'off', realShare: 50 },
  { temperature: 1, sieve: 'dedupe', realShare: 50 },
  { temperature: 1.3, sieve: 'facts', realShare: 50 },
];
/** The bench opens on all model text, nothing sieved: Larkspur's first plan. */
export const START: Recipe = { temperature: 1, sieve: 'off', realShare: 0 };
export const isRecipe = (r: Partial<Recipe> | undefined): r is Recipe => !!r && RECIPES.some(x => same(x, r as Recipe));
