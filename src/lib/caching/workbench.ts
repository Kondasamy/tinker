// Caching chapter 7's workbench: a cache policy is a TTL per kind of content, purge on change and versioned photo names,
// each over its finite list (5 × 5 × 5 × 2 × 2 policies). Coalescing stays on from chapter 5 and stale-while-revalidate
// off. The simulator runs the day; a policy passes when each kind's share of stale reads is within the team's limit
// (data/caching/workbench.json), and scores its hit rate. The puzzle accepts every passing policy tied for the best hit
// rate (WINNERS), not one hand-picked answer.
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
const passing = POLICIES.filter(meets);
export const BEST = Math.max(...passing.map(scoreOf));
export const WINNERS = passing.filter(p => scoreOf(p) === BEST);
export const wins = (p: Policy) => meets(p) && scoreOf(p) === BEST;
