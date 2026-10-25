// Capacity and dropped tokens (KTD4, chapter 5). Each expert takes at most ⌈factor × tokens × k / experts⌉ tokens of a
// batch (here, one prompt) per layer; earlier positions claim a seat first. A token turned away by a full expert
// loses that expert, and one turned away by both skips the layer's MLP (an empty route): the guess reruns without
// their work. Layers are capped in order, since a drop in layer 1 changes what layer 2's router sees.
import type { Model } from '../lm/model';
import { EXPERTS, LAYERS, TOP_K, loadOf, run, type Override, type Pass } from './routes';

/** The factors chapter 5's control steps over; null is no limit. */
export const FACTORS = [null, 2, 1.5, 1] as const;
export type Factor = (typeof FACTORS)[number];

export const capacityOf = (factor: number, tokens: number, k = TOP_K, experts = EXPERTS) =>
  Math.ceil((factor * tokens * k) / experts);

export interface Drop {
  layer: number;
  pos: number;
  expert: number;
}
export interface Capped {
  pass: Pass;
  /** seats per expert, or null with no limit */
  capacity: number | null;
  /** [layer][expert]: tokens the router sent, before the limit */
  asked: number[][];
  drops: Drop[];
  /** positions that lost at least one expert somewhere */
  dropped: number[];
}

// shortcut: a token that keeps one of its two experts gives it the whole weight (the route hook renormalises over the
// experts it runs); real systems keep the router's original weight. Upgrade with a weights field on the hook.
export function capped(model: Model, ids: number[], factor: Factor): Capped {
  if (factor === null) {
    const pass = run(model, ids);
    return {
      pass,
      capacity: null,
      asked: pass.routes.map((_, l) => loadOf(pass.routes, l)),
      drops: [],
      dropped: [],
    };
  }
  const cap = capacityOf(factor, ids.length);
  const forced: Record<number, Override> = {},
    asked: number[][] = [],
    drops: Drop[] = [];
  for (let l = 0; l < LAYERS; l++) {
    const routes = run(model, ids, {}, forced).routes;
    asked.push(loadOf(routes, l));
    const seats = new Array<number>(EXPERTS).fill(0),
      keep: Override = {};
    routes[l].forEach((r, pos) => {
      keep[pos] = r.experts.filter(expert => {
        if (seats[expert] < cap) return ++seats[expert];
        drops.push({ layer: l, pos, expert });
        return false;
      });
    });
    forced[l] = keep;
  }
  return {
    pass: run(model, ids, {}, forced),
    capacity: cap,
    asked,
    drops,
    dropped: [...new Set(drops.map(d => d.pos))].sort((a, b) => a - b),
  };
}
