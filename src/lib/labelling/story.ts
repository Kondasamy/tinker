// Tickets, labellers and labels for Who labels the data (R13): every name and ticket is read from data/labelling/,
// never typed into copy. The tickets are hand-written stand-ins; the people's labels come from seeded profiles
// (scripts/make-labels.mjs) and the model labels from one recorded run (scripts/record/labelling.mjs), both labelled so.
import labels from '../../../data/labelling/labels.json' with { type: 'json' };
import model from '../../../data/labelling/model-labels.json' with { type: 'json' };
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import data from '../../../data/labelling/tickets.json' with { type: 'json' };

export type Intent = 'refund' | 'return' | 'delivery' | 'product' | 'account';
export interface Ticket {
  id: string;
  text: string;
  /** the answer under chapter 3's guideline */
  intent: Intent;
  /** the plausible misreading a slip lands on (the label generator's input) */
  decoy?: Intent;
  /** checked by the support lead: the gold tickets of chapter 4 */
  gold?: boolean;
}
export type LabellerId = 'rosa' | 'mira' | 'tom';
export interface Labeller {
  id: LabellerId;
  name: string;
  /** the CAST figure that draws them */
  look: string;
  kind: string;
}

/** The five pigeonholes, in rack order (keys 1–5). */
export const INTENTS = data.intents as { id: Intent; name: string }[];
export const INTENT_IDS = INTENTS.map(i => i.id);
export const nameOf = (i: Intent) => INTENTS.find(x => x.id === i)!.name;
/** Chapter 3's written rule, one line per intent. */
export const GUIDELINE = data.guideline as Record<Intent, string>;
export const TICKETS = data.tickets as Ticket[];
/** The tickets the team labels; the rest are held out to test the triage model. */
export const POOL = TICKETS.slice(0, data.pool);
export const HELD_OUT = TICKETS.slice(data.pool);
export const GOLD = POOL.filter(t => t.gold);
/** The pool without its gold tickets: what the workbench labels and chapter 6 ranks. */
export const UNCHECKED = POOL.filter(t => !t.gold);
export const indexOf = (id: string) => TICKETS.findIndex(t => t.id === id);
export const ticketOf = (id: string) => TICKETS[indexOf(id)];
/** The answer for every ticket, in ticket order. */
export const TRUTH = TICKETS.map(t => t.intent);

export const LABELLERS = labels.labellers as Labeller[];
export const labellerOf = (id: LabellerId) => LABELLERS.find(l => l.id === id)!;
/** A labeller's label for every ticket, in ticket order: before chapter 3's guideline, or after it (the default). */
export const labelsOf = (id: LabellerId, guided = true): Intent[] =>
  ((guided && (labels.guided as Partial<Record<LabellerId, string[]>>)[id]) || labels.labels[id]) as Intent[];

/** Chapter 6's twenty tickets the triage model is least sure of (pinned; the engine test ranks them again). */
export const HARD = pinned.hard as string[];
export type ModelKey = 'main' | 'check';
/** The recorded model labellers: the main one and the smaller cross-check, with the model's name and the run's date. */
export const MODEL_RUN = model.meta;
export const MODELS = model.models as Record<ModelKey, { id: string; labels: Record<string, Intent> }>;
