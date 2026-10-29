// The simulated model labeller (KTD13): stands in for a recorded one only where data/labelling/model-labels.json has
// no label (a norecord). Rule: it slips on a seeded share of tickets, and a slip lands on the ticket's plausible
// misreading when it has one, as people's slips do. Its labels are true by this rule, not measured; Gilardi et al.
// (2023, the `model-labellers` fact) measured real model labellers near crowd workers' accuracy, which the rate follows.
import { shuffled } from '../recall';
import type { Intent, Ticket } from './story';

export const SIMULATED = { version: 1, slip: 0.2, seed: 7 };

/** The simulated labeller's intent for each ticket, by id. */
export function simulateLabels(tickets: readonly Ticket[], intents: readonly Intent[], s = SIMULATED) {
  const slips = new Set(shuffled(tickets, s.seed).slice(0, Math.round(tickets.length * s.slip)));
  return Object.fromEntries(
    tickets.map(t => [t.id, slips.has(t) ? (t.decoy ?? intents.find(i => i !== t.intent)!) : t.intent]),
  ) as Record<string, Intent>;
}
