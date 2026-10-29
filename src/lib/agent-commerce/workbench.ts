// Chapter 7's workbench (KTD9): Dana sets the slip's terms and when her agent must ask her first, and the bench runs
// every seller in sellers.json (hand-written, honest and not) against two buying agents: the recorded one, and a
// simulated one fooled by every seller (simulate.ts's obeys-seller rule), since the slip has to hold whichever agent
// carries it. For each, the agent's turn decides whether it sends the offer on; if the confirm rule asks, Dana approves
// only what she wants; then the shop checks the terms. Each slip is fresh and signed by Dana, so its signature and
// nonce pass and only the terms decide. Score: the orders that end as Dana wants, then the fewest times she was asked,
// over both agents. WINNERS are read from pinned.json;
// tests/unit/agent-commerce-engine.test.ts solves the bench again.
import pinned from '../../../data/agent-commerce/pinned.json' with { type: 'json' };
import bench from '../../../data/agent-commerce/workbench.json' with { type: 'json' };
import { mandateOf } from './mandate';
import { checkTerms, orderOf } from './shop';
import { SIMULATOR, simBuyer } from './simulate';
import { SELLERS, type Seller, totalOf } from './story';
import { type BuyerTurn, OFFER_TURNS, offerSig, type Recording } from './turns';

export const CAPS = bench.caps;
export const ITEMS = bench.items as Record<string, string[]>;
export const MERCHANTS = bench.merchants as Record<string, string[]>;
export const HOURS = bench.hours;
export const CONFIRM = bench.confirm as Record<string, number | null>;
export const RULE = bench.rule;

export interface Bench {
  cap: number;
  items: string;
  merchants: string;
  hours: number;
  confirm: string;
}
export type End = 'filled' | 'agent declined' | 'Dana declined' | 'shop refused';
/** the buying agents the bench runs: as recorded, and fooled by every seller (simulated, KTD13) */
export const AGENTS: Record<'recorded' | 'fooled', Recording<BuyerTurn>> = {
  recorded: OFFER_TURNS,
  fooled: {
    meta: { model: 'simulated', accessed: OFFER_TURNS.meta.accessed, simulator: SIMULATOR },
    turns: Object.fromEntries(SELLERS.map(s => [offerSig(s.id), simBuyer(s.id)])),
  },
};
export type Agent = keyof typeof AGENTS;

export interface Outcome {
  agent: Agent;
  seller: string;
  end: End;
  asked: boolean;
  /** the order ended as Dana wants */
  right: boolean;
  /** the shop's failed fields, when it refused */
  failed: string[];
}

export const mandateOfBench = (b: Bench, nonce: string) =>
  mandateOf({ merchants: MERCHANTS[b.merchants], items: ITEMS[b.items], cap: b.cap, hours: b.hours }, nonce);

export function outcomeOf(b: Bench, s: Seller, agent: Agent): Outcome {
  const turn = AGENTS[agent].turns[offerSig(s.id)];
  if (!turn) throw new Error(`no recorded turn for ${s.id}`);
  const done = (end: End, asked: boolean, failed: string[] = []): Outcome => ({
    agent,
    seller: s.id,
    end,
    asked,
    right: (end === 'filled') === s.wanted,
    failed,
  });
  if (!turn.accept) return done('agent declined', false);
  const bar = CONFIRM[b.confirm];
  const asked = bar !== null && totalOf(s.lines) > bar;
  if (asked && !s.wanted) return done('Dana declined', true);
  const failed = checkTerms(mandateOfBench(b, `bench-${s.id}`), orderOf(s), [])
    .filter(c => !c.pass)
    .map(c => c.field);
  return done(failed.length ? 'shop refused' : 'filled', asked, failed);
}

export function scoreOf(b: Bench) {
  const outcomes = (Object.keys(AGENTS) as Agent[]).flatMap(a => SELLERS.map(s => outcomeOf(b, s, a)));
  return {
    outcomes,
    right: outcomes.filter(o => o.right).length,
    asked: outcomes.filter(o => o.asked).length,
  };
}

/** Every bench the controls can make. */
export const BENCHES: Bench[] = CAPS.flatMap(cap =>
  Object.keys(ITEMS).flatMap(items =>
    Object.keys(MERCHANTS).flatMap(merchants =>
      HOURS.flatMap(hours => Object.keys(CONFIRM).map(confirm => ({ cap, items, merchants, hours, confirm }))),
    ),
  ),
);

/** Solves the bench from scratch: the most orders right, then the fewest asks. */
export function solve() {
  const scored = BENCHES.map(b => ({ b, ...scoreOf(b) }));
  const right = Math.max(...scored.map(s => s.right));
  const asked = Math.min(...scored.filter(s => s.right === right).map(s => s.asked));
  return { right, asked, winners: scored.filter(s => s.right === right && s.asked === asked).map(s => s.b) };
}

/** the pinned solution (KTD9): the test fails if solve() drifts from it */
export const BEST = pinned.workbench.best;
export const WINNERS = pinned.workbench.winners as Bench[];
const same = (a: Bench, b: Bench) =>
  a.cap === b.cap &&
  a.items === b.items &&
  a.merchants === b.merchants &&
  a.hours === b.hours &&
  a.confirm === b.confirm;
export const wins = (b: Bench) => WINNERS.some(w => same(w, b));

export const START = bench.start as Bench;
const pick = <T>(xs: T[], v: unknown, d: T) => (xs.includes(v as T) ? (v as T) : d);
/** The bench in a saved run's state; anything unknown falls back to START's. */
export const benchOf = (s: Partial<Bench>): Bench => ({
  cap: pick(CAPS, s.cap, START.cap),
  items: pick(Object.keys(ITEMS), s.items, START.items),
  merchants: pick(Object.keys(MERCHANTS), s.merchants, START.merchants),
  hours: pick(HOURS, s.hours, START.hours),
  confirm: pick(Object.keys(CONFIRM), s.confirm, START.confirm),
});
