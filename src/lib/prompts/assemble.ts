// Assembling a docket into the prompt the model reads, its signature, and each chapter's finite domain (KTD4).
// A chapter opens only the slots its lesson needs, so the docket can reach only recorded combinations.
import { CARDS, EMPTY, TEXT, ticketOf, TICKETS, type Card, type Docket, type Setup, type Slot } from './cards.ts';

export interface Part {
  /** the slot, or `ticket` for the customer's ticket (always clipped, never a card) */
  slot: Slot | 'ticket';
  text: string;
}

/** The docket's parts in the order the model reads them: the rules card first or last, the rest in slot order. */
export function partsOf(s: Pick<Setup, keyof Docket | 'ticket'>): Part[] {
  const t = ticketOf(s.ticket),
    rules: Part = { slot: 'rules', text: TEXT.rules };
  const n = s.examples === '2q' ? 2 : s.examples;
  return [
    ...(s.rules === 'first' ? [rules] : []),
    ...(s.role ? [{ slot: 'role' as const, text: TEXT.role }] : []),
    { slot: 'task', text: s.task === 'clear' ? TEXT.clear(t) : TEXT.vague },
    ...(n
      ? [
          {
            slot: 'examples' as const,
            text: [...Array(n).keys()].map(i => TEXT.example(i, s.examples === '2q')).join('\n\n'),
          },
        ]
      : []),
    ...(s.format === 'none' ? [] : [{ slot: 'format' as const, text: TEXT[s.format] }]),
    { slot: 'ticket', text: TEXT.ticket(t) },
    ...(s.rules === 'last' ? [rules] : []),
  ];
}
/** The prompt as one message: the parts, a blank line apart. */
export const assemble = (s: Pick<Setup, keyof Docket | 'ticket'>) =>
  partsOf(s)
    .map(p => p.text)
    .join('\n\n');

/** Sorted `field=value` pairs joined by `|`, read off the docket alone, so clip history never changes it. */
export const signature = (s: Setup) =>
  [
    `ex=${s.examples}`,
    `fmt=${s.format}`,
    `model=${s.model}`,
    `role=${s.role ? 'on' : 'off'}`,
    `rules=${s.rules}`,
    `task=${s.task}`,
    `ticket=${s.ticket}`,
  ].join('|');

// ---- domains ----
export type Domain = { [K in keyof Setup]: Setup[K][] };
export const CHAPTERS = [
  '01-it-only-continues',
  '02-say-what-you-want',
  '03-show-dont-tell',
  '04-put-it-in-a-shape',
  '05-order-and-emphasis',
  '06-test-it-like-code',
  '07-workbench',
] as const;
/** The ticket chapters 2 to 5 send. */
export const CHAPTER_TICKET = 'outage';
const ALL = TICKETS.map(t => t.id);
const one = (d: Partial<Domain>): Domain => ({
  ticket: [CHAPTER_TICKET],
  model: ['main'],
  role: [true],
  task: ['clear'],
  examples: [0],
  format: ['none'],
  rules: ['none'],
  ...d,
});
/** The workbench: Larkspur's six tickets, against quality and prompt length. */
export const WORKBENCH_DOMAINS: Domain = one({
  ticket: ALL,
  task: ['vague', 'clear'],
  examples: [0, 1, 2],
  format: ['none', 'json'],
  rules: ['first', 'last'],
});
/** Every recorded chapter's finite controls. Chapter 1 runs Larkspur mini live and has none. */
export const DOMAINS: Record<string, Domain> = {
  '02-say-what-you-want': one({ role: [false, true], task: ['vague', 'clear'] }),
  '03-show-dont-tell': one({ examples: [0, 1, 2, '2q'] }),
  '04-put-it-in-a-shape': one({ format: ['none', 'list', 'json'] }),
  '05-order-and-emphasis': one({ examples: [2], rules: ['none', 'first', 'last'] }),
  // the question set: the prompt before and after a change, then the same prompt on a smaller model
  '06-test-it-like-code': one({
    ticket: ALL,
    model: ['main', 'small'],
    task: ['vague', 'clear'],
    format: ['json'],
    rules: ['last'],
  }),
  '07-workbench': WORKBENCH_DOMAINS,
};
/** Each chapter's docket on arrival. */
export const START: Record<string, Docket> = {
  '02-say-what-you-want': { ...EMPTY, task: 'vague' },
  '03-show-dont-tell': { ...EMPTY, role: true, task: 'clear' },
  '04-put-it-in-a-shape': { ...EMPTY, role: true, task: 'clear' },
  '05-order-and-emphasis': { ...EMPTY, role: true, task: 'clear', examples: 2, rules: 'first' },
  '06-test-it-like-code': { ...EMPTY, role: true, task: 'vague', format: 'json', rules: 'last' },
  '07-workbench': { ...EMPTY, role: true, task: 'vague', rules: 'first' },
};

/** Every combination of a domain's values. (Tool calling's combosOf, restated: this file loads in plain Node.) */
export function combos(d: Domain): Setup[] {
  return Object.entries(d).reduce<Record<string, unknown>[]>(
    (acc, [k, vals]) => acc.flatMap(s => (vals as unknown[]).map(v => ({ ...s, [k]: v }))),
    [{}],
  ) as unknown as Setup[];
}

// ---- clipping ----
const opens = (chapter: string, slot: Slot, value: Docket[Slot]) =>
  (DOMAINS[chapter]?.[slot] as Docket[Slot][] | undefined)?.includes(value) ?? false;
/** The first chapter where a card can be clipped, for the reason a closed card gives. */
const firstOpen = (c: Card) =>
  Object.keys(DOMAINS).find(ch => (c.slot === 'rules' ? canHoldRules(ch) : opens(ch, c.slot, c.value)));
const canHoldRules = (ch: string) => opens(ch, 'rules', 'last') || opens(ch, 'rules', 'first');
/** Why a card can't be clipped in this chapter, or null when it can. */
export function blocked(chapter: string, cardId: string): string | null {
  const c = CARDS.find(c => c.id === cardId);
  if (!c) return 'No such card.';
  // the rules card clips in whichever place the chapter opens
  if (c.slot === 'rules') return canHoldRules(chapter) ? null : closed(chapter, c);
  return opens(chapter, c.slot, c.value) ? null : closed(chapter, c);
}
const closed = (chapter: string, c: Card) => {
  const ch = firstOpen(c);
  return ch && ch > chapter ? `Opens in chapter ${Number(ch.slice(0, 2))}.` : 'Not used in this chapter.';
};
/** The docket with a card clipped, or unchanged when the chapter keeps that card closed. */
export function clip(chapter: string, d: Docket, cardId: string): Docket {
  if (blocked(chapter, cardId)) return d;
  const c = CARDS.find(c => c.id === cardId)!;
  const value = c.slot === 'rules' ? (opens(chapter, 'rules', 'last') ? 'last' : 'first') : c.value;
  return { ...d, [c.slot]: value };
}
/** Why a slot can't be emptied here, or null when it can. The task slot never empties. */
export function unclipBlocked(chapter: string, slot: Slot): string | null {
  if (slot === 'task') return 'A docket always needs a task.';
  return opens(chapter, slot, EMPTY[slot]) ? null : 'This chapter keeps it clipped.';
}
export const unclip = (chapter: string, d: Docket, slot: Slot): Docket =>
  unclipBlocked(chapter, slot) ? d : { ...d, [slot]: EMPTY[slot as keyof typeof EMPTY] };
/** Whether this chapter opens the toggle that moves the rules card first or last. */
export const canMoveRules = (chapter: string) => opens(chapter, 'rules', 'first') && opens(chapter, 'rules', 'last');
export const moveRules = (chapter: string, d: Docket): Docket =>
  canMoveRules(chapter) && d.rules !== 'none' ? { ...d, rules: d.rules === 'first' ? 'last' : 'first' } : d;
