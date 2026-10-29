// The prompt cards (KTD4): a docket of fixed slots, each card filling one. Order is never a free permutation: the
// slots sit in a set order, and only the rules card moves (first or last). Imports carry `.ts` so the recording
// script (scripts/record/prompts.mjs) can load this file in plain Node.
import data from '../../../data/prompts/tickets.json' with { type: 'json' };

export type Task = 'vague' | 'clear';
/** how many example tickets with replies; `2q` is two whose replies share a quirk */
export type Examples = 0 | 1 | 2 | '2q';
export type Format = 'none' | 'list' | 'json';
export type Rules = 'none' | 'first' | 'last';
/** main: the recording model; small: the second, smaller model (chapter 6 only) */
export type ModelId = 'main' | 'small';

/** What is clipped to the docket. The task slot is never empty: a docket needs an ask. */
export interface Docket {
  role: boolean;
  task: Task;
  examples: Examples;
  format: Format;
  rules: Rules;
}
/** A docket sent for one ticket to one model: everything a reply is keyed by. */
export interface Setup extends Docket {
  ticket: string;
  model: ModelId;
}
export type Slot = keyof Docket;

export interface Ticket {
  id: string;
  ref: string;
  customer: string;
  email: string;
  text: string;
  note: string;
  source: string;
}
export const TICKETS: Ticket[] = data.tickets;
export const ticketOf = (id: string) => {
  const t = TICKETS.find(t => t.id === id);
  if (!t) throw new Error(`unknown ticket: ${id}`);
  return t;
};
export const AGENT = data.agent;
export const SIGNOFF = data.signoff;
export const QUIRK = data.quirk;
export const EXAMPLES = data.examples;
/** The reply a model gives when the ask says nothing it can use (the simulator's vague reply, KTD13). */
export const GENERIC = data.generic;

export interface Card {
  id: string;
  slot: Slot;
  /** the value clipping this card sets */
  value: Docket[Slot];
  /** the card's face, a few words */
  label: string;
}
export const CARDS: Card[] = [
  { id: 'role', slot: 'role', value: true, label: 'Who you are' },
  { id: 'vague', slot: 'task', value: 'vague', label: 'Vague task' },
  { id: 'clear', slot: 'task', value: 'clear', label: 'Clear task' },
  { id: 'one-example', slot: 'examples', value: 1, label: 'One example' },
  { id: 'two-examples', slot: 'examples', value: 2, label: 'Two examples' },
  { id: 'quirky-examples', slot: 'examples', value: '2q', label: 'Two quirky examples' },
  { id: 'list', slot: 'format', value: 'list', label: 'Three-line list' },
  { id: 'json', slot: 'format', value: 'json', label: 'JSON for the router' },
  { id: 'rules', slot: 'rules', value: 'last', label: 'House rule' },
];
export const cardOf = (id: string) => {
  const c = CARDS.find(c => c.id === id);
  if (!c) throw new Error(`unknown card: ${id}`);
  return c;
};
/** An empty slot's value (the task slot has none: it always holds a task). */
export const EMPTY: Omit<Docket, 'task'> = { role: false, examples: 0, format: 'none', rules: 'none' };

/** The teams a JSON reply can route to; references.json names each ticket's. */
export const TEAMS = ['billing', 'shipping', 'warranty', 'portal'];

// The text each card puts in the prompt. Larkspur's own words; the ticket's policy line comes from tickets.json.
export const TEXT = {
  role: 'You write replies for the support desk at Larkspur Supply Co., a hardware supplier.',
  vague: 'Reply to this customer.',
  clear: (t: Ticket) =>
    `Answer the customer's question in at most three sentences. Use this Larkspur policy and state its exact number or step: ${t.note}`,
  example: (i: number, quirk: boolean) =>
    `Example ticket: ${EXAMPLES[i].ticket}\nExample reply: ${quirk ? `${QUIRK} ` : ''}${EXAMPLES[i].reply} ${SIGNOFF}`,
  list: 'Format: exactly three lines, each starting with "- ", and nothing else.',
  json: `Format: reply with JSON only, no other text: {"team": ${TEAMS.map(t => `"${t}"`).join(' | ')}, "reply": "<your reply>"}`,
  rules: 'House rule: end every reply with the ticket reference in square brackets, like [LS-0000].',
  ticket: (t: Ticket) => `Ticket ${t.ref} from ${t.customer} <${t.email}>:\n${t.text}`,
};
