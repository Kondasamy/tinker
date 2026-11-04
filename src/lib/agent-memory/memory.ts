// Memory you can trust: the engine (KTD3). A memory store over a hand-written month of Larkspur chats
// (data/agent-memory/month.json): every card names its source (a source paper, or the card it was learnt from), so
// undoing a source removes exactly the cards hanging from it. The keep rule drops small talk, the conflict rule keeps
// one card per customer and kind (the better source wins, then the newer), expiry drops a card after its kind's days,
// "forget me" removes every card about a customer, and a full board drops its oldest card. No model runs: the month is
// a hand-written example run, and which candidate is small talk is hand-set in the data.
import MONTH from '../../../data/agent-memory/month.json' with { type: 'json' };

export type Trust = 'staff' | 'customer' | 'web';
export interface Source {
  id: string;
  name: string;
  /** the pill on its paper */
  short: string;
  trust: Trust;
  day: number;
  /** a customer's own chats (forgotten with them) */
  customer?: string;
  /** planted by an attacker (the poison the workbench counts) */
  planted?: boolean;
}
export interface Card {
  id: string;
  /** a source id, or the id of the card it was learnt from */
  from: string;
  day: number;
  /** the customer it is about, or "store" */
  about: string;
  kind: string;
  label: string;
  text: string;
}
export interface Candidate {
  id: string;
  kind: string;
  label: string;
  text: string;
}
export interface Question {
  id: string;
  ask: string;
  about: string;
  kind: string;
  /** the card that answers it rightly, or null: no card should answer it */
  right: string | null;
}

export const SOURCES = MONTH.sources as Source[];
export const CARDS = MONTH.cards as Card[];
export const CANDIDATES = MONTH.candidates as Candidate[];
export const QUESTIONS = MONTH.questions as Question[];
export const RUN_LABEL = MONTH.label;
export const { capacity: CAPACITY, end: END } = MONTH.rules;
const LASTING = new Set(MONTH.rules.lasting);
const EXPIRY = MONTH.rules.expiry as Record<string, number>;
const RANK = MONTH.rules.rank as Record<Trust, number>;
/** kinds a customer has many of; every other kind holds one card per customer, so a new one conflicts */
const MANY = new Set(['action', 'smalltalk']);

export const sourceOf = (id: string) => {
  const s = SOURCES.find(x => x.id === id);
  if (!s) throw new Error(`unknown source: ${id}`);
  return s;
};
export const cardOf = (id: string) => {
  const c = CARDS.find(x => x.id === id) ?? CANDIDATES.find(x => x.id === id);
  if (!c) throw new Error(`unknown card: ${id}`);
  return c as Card;
};
/** The source a card hangs from in the end: up its threads to a paper. */
export function rootOf(card: Card): Source {
  let from = card.from;
  for (let i = 0; i < CARDS.length; i++) {
    const parent = CARDS.find(c => c.id === from);
    if (!parent) return sourceOf(from);
    from = parent.from;
  }
  throw new Error(`thread loop at ${card.id}`);
}
/** Whether a card hangs from `id` (a source or a card), directly or through other cards. */
export function hangsFrom(card: Card, id: string): boolean {
  let from = card.from;
  for (let i = 0; i <= CARDS.length; i++) {
    if (from === id) return true;
    const parent = CARDS.find(c => c.id === from);
    if (!parent) return false;
    from = parent.from;
  }
  return false;
}
export const rankOf = (card: Card) => RANK[rootOf(card).trust];
export const isLasting = (kind: string) => LASTING.has(kind);
/** days a card of this kind is kept, if it expires */
export const expiryOf = (kind: string): number | undefined => EXPIRY[kind];

export type Keep = 'all' | 'lasting';
export type Expiry = 'none' | 'by-kind';
/** newest wins; the better source wins, then the newer; ranked, and web pages are never kept without a check */
export type TrustRule = 'newest' | 'ranked' | 'checked';
export interface Rules {
  keep: Keep;
  expiry: Expiry;
  trust: TrustRule;
}
export const KEEPS: Keep[] = ['all', 'lasting'];
export const EXPIRIES: Expiry[] = ['none', 'by-kind'];
export const TRUSTS: TrustRule[] = ['newest', 'ranked', 'checked'];
/** the rules chapters 2 to 6 run with */
export const GOOD: Rules = { keep: 'lasting', expiry: 'by-kind', trust: 'ranked' };

/** Why a card is in the bin. */
export type Why = 'noise' | 'expired' | 'full' | 'replaced' | 'unchecked' | 'undone' | 'forgot';
export interface Memory {
  /** cards on the board, each in its slot (0 to CAPACITY - 1) */
  board: { id: string; slot: number }[];
  /** cards in the bin, in the order they fell */
  bin: { id: string; why: Why }[];
  /** source papers pulled off the board (undone or forgotten) */
  pulled: string[];
}
export interface When {
  /** the last day run (default: the month's end) */
  upTo?: number;
  /** the day expiry is checked at the end (default: upTo); later skips ahead with no new cards */
  today?: number;
  /** sources pulled at the end: every card hanging from them falls */
  undone?: string[];
  /** customers who asked to be forgotten at the end */
  forgot?: string[];
}

/** Which of two cards for the same customer and kind wins under the trust rule. */
export function wins(a: Card, b: Card, trust: TrustRule): Card {
  if (trust !== 'newest' && rankOf(a) !== rankOf(b)) return rankOf(a) > rankOf(b) ? a : b;
  return b.day >= a.day ? b : a;
}
const expired = (c: Card, day: number) => {
  const d = expiryOf(c.kind);
  return d !== undefined && day >= c.day + d;
};

/** The month run under these rules, day by day: the board and the bin at `upTo`, after any undo or forget. */
export function remember(rules: Rules, when: When = {}): Memory {
  const upTo = when.upTo ?? END;
  const board: { card: Card; slot: number }[] = [];
  const bin: Memory['bin'] = [];
  const drop = (c: Card, why: Why) => {
    board.splice(
      board.findIndex(b => b.card === c),
      1,
    );
    bin.push({ id: c.id, why });
  };
  const expire = (day: number) => {
    if (rules.expiry === 'by-kind') for (const b of [...board]) if (expired(b.card, day)) drop(b.card, 'expired');
  };
  const freeSlot = () => {
    for (let s = 0; s < CAPACITY; s++) if (!board.some(b => b.slot === s)) return s;
    return -1;
  };
  for (const c of [...CARDS].filter(c => c.day <= upTo).sort((a, b) => a.day - b.day)) {
    // a card learnt from another card exists only if that card is still up
    const parent = CARDS.find(p => p.id === c.from);
    if (parent && !board.some(b => b.card === parent)) continue;
    expire(c.day);
    if (rules.keep === 'lasting' && !isLasting(c.kind)) {
      bin.push({ id: c.id, why: 'noise' });
      continue;
    }
    if (rules.trust === 'checked' && rootOf(c).trust === 'web') {
      bin.push({ id: c.id, why: 'unchecked' });
      continue;
    }
    const rival = MANY.has(c.kind) ? undefined : board.find(b => b.card.about === c.about && b.card.kind === c.kind);
    if (rival && wins(rival.card, c, rules.trust) === rival.card) {
      bin.push({ id: c.id, why: 'replaced' });
      continue;
    }
    // the newcomer takes a free slot before the loser falls, so nothing jumps; a full board drops its oldest card
    if (freeSlot() < 0) {
      if (rival) drop(rival.card, 'replaced');
      else drop(board.reduce((o, b) => (b.card.day < o.card.day ? b : o)).card, 'full');
      board.push({ card: c, slot: freeSlot() });
      continue;
    }
    board.push({ card: c, slot: freeSlot() });
    if (rival) drop(rival.card, 'replaced');
  }
  expire(when.today ?? upTo);
  const pulled: string[] = [];
  for (const who of when.forgot ?? []) {
    for (const b of [...board]) if (b.card.about === who || rootOf(b.card).customer === who) drop(b.card, 'forgot');
    for (const s of SOURCES) if (s.customer === who && !pulled.includes(s.id)) pulled.push(s.id);
  }
  for (const id of when.undone ?? []) {
    for (const b of [...board]) if (hangsFrom(b.card, id)) drop(b.card, 'undone');
    if (!pulled.includes(id)) pulled.push(id);
  }
  return { board: board.map(b => ({ id: b.card.id, slot: b.slot })), bin, pulled };
}

/** The sources whose papers are pinned by `upTo`. */
export const sourcesBy = (upTo = END) => SOURCES.filter(s => s.day <= upTo).map(s => s.id);

/** The card on the board that answers a question, or null. */
export function answer(m: Memory, q: Question): string | null {
  return m.board.map(b => cardOf(b.id)).find(c => c.about === q.about && c.kind === q.kind)?.id ?? null;
}
/** Cards on the board that hang from a planted source. */
export const poisonOf = (m: Memory) => m.board.filter(b => rootOf(cardOf(b.id)).planted).map(b => b.id);

export interface Score {
  right: number;
  poison: number;
  answers: Record<string, string | null>;
}
export function scoreOf(rules: Rules, undone: string[] = []): Score {
  const m = remember(rules, { undone });
  const answers = Object.fromEntries(QUESTIONS.map(q => [q.id, answer(m, q)]));
  return {
    right: QUESTIONS.filter(q => answers[q.id] === q.right).length,
    poison: poisonOf(m).length,
    answers,
  };
}

/** The workbench's setup: three rules and the sources pulled after the month. */
export interface Setup extends Rules {
  undone: string[];
}
/** Every answer right and no poisoned card left. */
export const isWin = (s: Setup) => {
  const r = scoreOf(s, s.undone);
  return r.right === QUESTIONS.length && r.poison === 0;
};
/** Every setup the workbench offers (the rules, and any set of sources pulled, in the papers' order). */
export function allSetups(): Setup[] {
  const subsets = Array.from({ length: 1 << SOURCES.length }, (_, m) =>
    SOURCES.filter((_, i) => m & (1 << i)).map(s => s.id),
  );
  return KEEPS.flatMap(keep =>
    EXPIRIES.flatMap(expiry => TRUSTS.flatMap(trust => subsets.map(undone => ({ keep, expiry, trust, undone })))),
  );
}
/** ch. 1: Ada's chat sorted by the keep rule. */
export const kept = (keep: Keep) => CANDIDATES.filter(c => keep === 'all' || isLasting(c.kind)).map(c => c.id);
