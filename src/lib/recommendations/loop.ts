// The loop (KTD9): the shelf shapes the orders that train the shelf. A seeded simulator over the made-up orders,
// nothing measured. Each round every customer sees a shelf of SHELF products they haven't bought: the ranked slots by a
// blend of bestsellers and hidden tastes, then `explore` slots given to random products. With chance BUY (a stated
// planning number) they buy one shelf product from an aisle they buy from; otherwise nothing. The shop retrains on the
// last WINDOW rounds of orders, the made-up ones counting as round 0, so once those age out it learns only from what
// its own shelves sold: a product off every shelf gets no orders and loses its taste, its place on the map (coverage).
// A customer never buys their held-out last order in the loop; every round's shelves are scored on it (hit@5).
//
// Blend and exploration take a few fixed steps, so every run is finite: simulate() runs at test time and its results
// are pinned in data/recommendations/loop.json, which the browser replays (R3: nothing factorises in the browser).
import pinned from '../../../data/recommendations/loop.json' with { type: 'json' };
import { align, factorise, prng, type Factors, type Vec } from './factorise';
import { popularity, topOf } from './score';
import { CUSTOMERS, HELD_OUT, PRODUCTS, SHELF, TRAIN, productOf, type Aisle, type History } from './story';

/** Rounds of buying after the first shelf; a run records ROUNDS + 1 shelves. */
export const ROUNDS = 6;
/** The chance a customer buys from the shelf in a round: a stated planning number, not measured. */
export const BUY = 0.8;
/** The shop retrains on the orders of the last WINDOW rounds; the made-up orders count as round 0. */
export const WINDOW = 3;
/** The blend's steps: the share of the ranking from hidden tastes; the rest is bestsellers. */
export const BLENDS = [0, 0.25, 0.5, 0.75, 1];
/** Exploration's steps: shelf slots of SHELF given to random products. */
export const EXPLORES = [0, 1, 2];
/** The customer the chapters follow round by round. */
export const FOLLOW = 'c02';
const LOOP_SEED = 2018;
const ALL = PRODUCTS.map(p => p.id);

/** Each customer's own taste: how often they bought from each aisle, over all their orders. */
const TASTE: Record<string, Partial<Record<Aisle, number>>> = Object.fromEntries(
  CUSTOMERS.map(c => {
    const t: Partial<Record<Aisle, number>> = {};
    for (const p of c.orders) {
      const a = productOf(p).aisle;
      t[a] = (t[a] ?? 0) + 1;
    }
    return [c.id, t];
  }),
);

/** One draw for (round, customer, slot), the same whatever the policy (common random numbers). */
const draw = (round: number, who: number, slot: number) =>
  prng(LOOP_SEED * 1_000_003 + round * 7919 + who * 101 + slot)();
const round3 = (v: number) => Math.round(v * 1e3) / 1e3 || 0; // never -0, which JSON writes as 0

export interface Round {
  /** products with a taste: on the map, so the ranked slots can show them */
  coverage: number;
  /** customers whose held-out last order is on their shelf (hit@5) */
  hits: number;
  /** orders placed from the shelf this round (0 on the last, which only scores) */
  bought: number;
  /** the followed customer's shelf: ranked slots first, then explored */
  shelf: string[];
  /** the followed customer's taste; null when the shop no longer learns from any of their orders */
  you: Vec | null;
  /** every product's taste this round, to 3 places, in catalogue order; null for a product with no orders the shop
   * learns from */
  items: (Vec | null)[];
}
export interface Loop {
  blend: number;
  explore: number;
  rounds: Round[];
}

/** One customer's shelf under a policy: the blended ranking's slots, then random products in the rest. */
function shelfFor(
  own: string[],
  who: number,
  round: number,
  policy: { blend: number; explore: number },
  pop: Record<string, number>,
  items: Record<string, Vec | null>,
  user: Vec | null,
) {
  // a rank-based blend: each method's order gives a product 1 at the top down to 0 at the bottom
  const rankScore = (score: (p: string) => number | null) => {
    const order = topOf(score, own, ALL.length);
    return Object.fromEntries(order.map((p, i) => [p, 1 - i / Math.max(1, order.length - 1)]));
  };
  const byPop = rankScore(p => pop[p]);
  const byTaste = user ? rankScore(p => (items[p] ? items[p]![0] * user[0] + items[p]![1] * user[1] : null)) : byPop;
  const ranked = topOf(
    p => (1 - policy.blend) * (byPop[p] ?? 0) + policy.blend * (byTaste[p] ?? 0),
    own,
    SHELF - policy.explore,
  );
  const rest = ALL.filter(p => !own.includes(p) && !ranked.includes(p));
  const explored: string[] = [];
  for (let k = 0; k < policy.explore && rest.length; k++)
    explored.push(rest.splice(Math.floor(draw(round, who, k + 1) * rest.length), 1)[0]);
  return [...ranked, ...explored];
}

/** Runs the loop under a policy from the training orders: ROUNDS rounds of buying, ROUNDS + 1 shelves scored. */
export function simulate(blend: number, explore: number): Loop {
  // everything each customer has bought (never offered again), and the orders of each round, the made-up first
  const own: History = Object.fromEntries(Object.entries(TRAIN).map(([c, ps]) => [c, [...ps]]));
  const placed: History[] = [TRAIN];
  const rounds: Round[] = [];
  let ref: Factors['items'] | undefined;
  for (let r = 0; r <= ROUNDS; r++) {
    const learn: History = Object.fromEntries(
      CUSTOMERS.map(c => [c.id, placed.slice(Math.max(0, r + 1 - WINDOW), r + 1).flatMap(o => o[c.id] ?? [])]),
    );
    const f = factorise(learn, ALL),
      pop = popularity(learn);
    let hits = 0,
      follow: string[] = [];
    const now: History = {};
    CUSTOMERS.forEach((c, i) => {
      const shelf = shelfFor(own[c.id], i, r, { blend, explore }, pop, f.items, f.users[c.id] ?? null);
      if (shelf.includes(HELD_OUT[c.id])) hits++;
      if (c.id === FOLLOW) follow = shelf;
      if (r === ROUNDS || draw(r, i, 0) >= BUY) return;
      const t = TASTE[c.id];
      const liked = shelf.filter(p => p !== HELD_OUT[c.id] && (t[productOf(p).aisle] ?? 0) > 0);
      if (liked.length) now[c.id] = [liked[Math.floor(draw(r, i, 9) * liked.length)]];
    });
    for (const [c, ps] of Object.entries(now)) own[c].push(...ps);
    placed.push(now);
    // the map is drawn turned to round 0's, so it doesn't spin between refits; shelves used the tastes as fitted
    ref ??= f.items;
    const shown = align(f, ref),
      you = shown.users[FOLLOW];
    rounds.push({
      coverage: Object.values(f.items).filter(Boolean).length,
      hits,
      bought: Object.keys(now).length,
      shelf: follow,
      you: you ? (you.map(round3) as Vec) : null,
      items: ALL.map(p => (shown.items[p] ? (shown.items[p]!.map(round3) as Vec) : null)),
    });
  }
  return { blend, explore, rounds };
}

/** Every run the workbench's controls can reach. */
export const simulateAll = (): Loop[] => BLENDS.flatMap(b => EXPLORES.map(e => simulate(b, e)));

/** A round's tastes by product id, as the map and the shelf read them. */
export const itemsOf = (r: Round): Record<string, Vec | null> => Object.fromEntries(ALL.map((p, i) => [p, r.items[i]]));

/** A pinned run (loop.json, recomputed by tests/unit/recommendations-engine.test.ts). */
export function loopOf(blend: number, explore: number): Loop {
  const l = (pinned.runs as Loop[]).find(x => x.blend === blend && x.explore === explore);
  if (!l) throw new Error(`no pinned loop for blend ${blend}, explore ${explore}`);
  return l;
}
