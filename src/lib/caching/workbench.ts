// Caching chapter 7's workbench: a cache policy is a TTL per kind of content, purge on change and versioned photo names,
// each over its finite list (5 × 5 × 5 × 2 × 2 policies). Coalescing stays on from chapter 5 and stale-while-revalidate
// off. The simulator runs the day; a policy passes when each kind's share of stale reads is within the team's limit
// (data/caching/workbench.json), and scores its hit rate. The puzzle accepts every passing policy tied for the best hit
// rate (WINNERS, pinned in the same file), not one hand-picked answer.
import data from '../../../data/caching/workbench.json' with { type: 'json' };
import { KINDS, TTLS, runOf, type Kind, type Policy } from './sim';

export const LIMITS = data.limits as Record<Kind, number>;
export const FIXED = { coalesce: true, swr: false } as const;

/** Each kind's share of reads served stale. */
export const staleShare = (p: Policy, k: Kind) => {
  const r = runOf(p);
  return r.readsBy[k] ? r.staleBy[k] / r.readsBy[k] : 0;
};
export const passes = (p: Policy, k: Kind) => staleShare(p, k) <= LIMITS[k];
export const meets = (p: Policy) => KINDS.every(k => passes(p, k));
export const scoreOf = (p: Policy) => runOf(p).hitRate;

/** Every policy the controls can make. */
export const POLICIES: Policy[] = TTLS.flatMap(price =>
  TTLS.flatMap(photo =>
    TTLS.flatMap(stock =>
      [false, true].flatMap(purge =>
        [false, true].map(versioned => ({ ttl: { price, photo, stock }, purge, versioned, ...FIXED })),
      ),
    ),
  ),
);
/** The best hit rate among passing policies, and every policy that reaches it, pinned: solving all 500 at import cost
 * the chapter about 0.4 s of main-thread work. tests/unit/caching-sim.test.ts keeps them equal to a fresh solve. */
export const BEST: number = data.solved.best;
export const WINNERS: Policy[] = data.solved.winners.map(w => ({ ...(w as Bench), ...FIXED }));
export const wins = (p: Policy) => meets(p) && scoreOf(p) === BEST;

/** What the bench's controls set. */
export type Bench = Pick<Policy, 'ttl' | 'purge' | 'versioned'>;
/** where the bench starts: every kind kept an hour, no purge, plain names */
export const START: Bench = { ttl: { price: TTLS[2], photo: TTLS[2], stock: TTLS[2] }, purge: false, versioned: false };
const isTtl = (x: unknown): x is number => (TTLS as readonly unknown[]).includes(x);
/** The policy in a saved run's state; anything unknown falls back to START's. */
export const benchPolicy = (s: Partial<Bench>): Policy => ({
  ttl: Object.fromEntries(KINDS.map(k => [k, isTtl(s.ttl?.[k]) ? s.ttl![k] : START.ttl[k]])) as Record<Kind, number>,
  purge: typeof s.purge === 'boolean' ? s.purge : START.purge,
  versioned: typeof s.versioned === 'boolean' ? s.versioned : START.versioned,
  ...FIXED,
});
