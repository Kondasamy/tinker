// What each agent could see, and the signature its recorded turn is keyed by (KTD4, Agents' pattern). Host-only
// settings (the slip's terms, the confirm rule, the token) are left out on purpose: they never reach a model, so
// they never change its turn. No imports, so scripts/record/agent-commerce.mjs can load this file with plain node.

/** where the buying agent reads the shop: the page for people (chapter 1) or the catalogue for agents (chapter 2) */
export type View = 'page' | 'menu';
/** the order Reyes Decks sends Larkspur's sales agent (chapter 3) */
export type Request = 'clear' | 'vague';

/** The buying agent reads the shop and prices one order. */
export interface ReadTurn {
  text: string;
  /** the whole order's price as the agent read it, US cents */
  total: number;
  simulated?: true;
}
/** Larkspur's sales agent answers an A2A task: asks back, finishes with an order line, or fails. */
export interface SellerTurn {
  text: string;
  state: 'input-required' | 'completed' | 'failed';
  sku?: string | null;
  qty?: number | null;
  simulated?: true;
}
/** The buying agent decides whether to send a seller's offer on with the slip (chapter 5, the workbench). */
export interface BuyerTurn {
  text: string;
  accept: boolean;
  simulated?: true;
}
export interface Meta {
  /** the recording model's id, or "simulated" */
  model: string;
  accessed: string;
  settings?: Record<string, unknown>;
  /** the recording script's git hash */
  script?: string;
  /** scripts/record and simulate.ts's version, when any turn in the file is simulated */
  simulator?: string;
}
export interface Recording<T> {
  meta: Meta;
  turns: Record<string, T>;
}

/** chapter recordings, by file name */
export const FILES = {
  page: '01-a-page-for-people',
  menu: '02-a-menu-for-agents',
  task: '03-agent-to-agent',
  offer: '05-a-seller-that-talks-back',
} as const;

export const readSig = (view: View, item: string) => `item=${item}|view=${view}`;
/** `hist` holds one `asked` per question the seller already had answered. */
export const taskSig = (request: Request, hist: string[]) => `hist=${hist.join(',')}|request=${request}`;
export const offerSig = (seller: string) => `seller=${seller}`;
