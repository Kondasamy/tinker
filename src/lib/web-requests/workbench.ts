// Opening a web page chapter 7's workbench: a DNS TTL, an HTTP version and TLS resumption (4 × 3 × 2 policies), run
// for every customer with packet loss on. A policy meets the owner's rules (data/web-requests/workbench.json) when every
// customer's page is in within the budget and the TTL lets a moved shop be found within the limit. The puzzle accepts
// every policy that meets them (WINNERS, pinned in the same file and recomputed by the unit test).
import data from '../../../data/web-requests/workbench.json' with { type: 'json' };
import { CUSTOMERS, HTTPS, TTLS, runOf, type Http, type Run } from './sim';

export const BUDGET = data.budgetMs;
export const MOVE = data.moveMinutes;
export const REASONS = data.reasons;

/** What the bench's controls set. */
export interface Bench {
  ttl: number;
  http: Http;
  resume: boolean;
}
export const loadOf = (b: Bench, id: Run['customer']['id']) => runOf(id, { ...b, loss: true, method: 'GET' });
export const slowest = (b: Bench) => Math.max(...CUSTOMERS.map(c => loadOf(b, c.id).total));
export const inBudget = (b: Bench, id: Run['customer']['id']) => loadOf(b, id).total <= BUDGET;
export const ttlOk = (b: Bench) => b.ttl <= MOVE;
export const meets = (b: Bench) => ttlOk(b) && CUSTOMERS.every(c => inBudget(b, c.id));

/** Every policy the controls can make. */
export const POLICIES: Bench[] = TTLS.flatMap(ttl =>
  HTTPS.flatMap(http => [false, true].map(resume => ({ ttl, http, resume }))),
);
/** Every policy that meets the rules, solved fresh (the test compares it with the pin). */
export const solve = () => POLICIES.filter(meets);
export const WINNERS: Bench[] = data.solved.winners as Bench[];
export const wins = meets;

/** where the bench starts: an hour's TTL, HTTP/1.1, no resumption */
export const START: Bench = { ttl: 60, http: '1.1', resume: false };
/** The policy in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  ttl: (TTLS as readonly unknown[]).includes(s.ttl) ? s.ttl! : START.ttl,
  http: HTTPS.includes(s.http as Http) ? s.http! : START.http,
  resume: typeof s.resume === 'boolean' ? s.resume : START.resume,
});
