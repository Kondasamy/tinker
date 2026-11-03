// Approvals and permissions' engine (KTD3): a hand-written week of mail (data/action-approvals/week.json) through
// Larkspur's refund office. Every refund the assistant writes reaches a toll booth: a day's running total may stop it,
// a pass (a person's earlier yes for that order, for a while) may wave it through, or it waits for a person's yes.
// Dye marks what came from text the assistant read; a hand-set approver reads the first few prompts of a day closely
// and then clicks yes. Every taught effect is pinned in data/action-approvals/pinned.json.
import WEEK_DATA from '../../../data/action-approvals/week.json' with { type: 'json' };

export interface Letter {
  id: string;
  day: number;
  /** hours since Monday 00:00 */
  hour: number;
  /** rosa: a request from staff, not mail; anyone else's text is outside text */
  who: 'rosa' | 'customer' | 'stranger';
  from: string;
  text: string;
  order: number;
  amount: number;
  /** the refund does harm (hand-written truth) */
  harm: boolean;
  /** a person reading the prompt closely would spot it */
  obvious: boolean;
}
export const WEEK = WEEK_DATA.letters as Letter[];
/** how many approvals Rosa clicks a day (hand-set, for chapter 1) */
export const PROMPTS_PER_DAY = WEEK_DATA.promptsPerDay;
/** the hand-set approver reads this many prompts a day closely, then clicks yes */
export const FATIGUE = WEEK_DATA.fatigue;
export const PRICES = WEEK_DATA.prices as Record<string, number>;
export const letterOf = (id: string) => {
  const l = WEEK.find(x => x.id === id);
  if (!l) throw new Error(`unknown letter: ${id}`);
  return l;
};
/** Text from anyone but Rosa is outside text: what the assistant writes after reading it carries its dye. */
export const dyedLetter = (l: Letter) => l.who !== 'rosa';

export type Ask = 'none' | 'dyed' | 'all';
export type Expiry = 'forever' | 'hour';
export interface Policy {
  /** which refunds wait for a person: none, those carrying dye, or all */
  ask: Ask;
  /** the most refunds may pay out in a day (£), or no limit */
  budget: number | null;
  /** how long a yes lasts */
  expiry: Expiry;
}
export const ASKS: Ask[] = ['none', 'dyed', 'all'];
export const BUDGETS: (number | null)[] = [null, 100, 150, 300];
export const EXPIRIES: Expiry[] = ['forever', 'hour'];
/** a pass lasts this many hours under the hour rule */
export const PASS_HOURS = 1;

export interface Pass {
  order: number;
  /** the hour the yes was given */
  at: number;
}
export type Fate = 'gate' | 'paid' | 'stopped';
export interface Slip {
  id: string;
  order: number;
  amount: number;
  day: number;
  dyed: boolean;
  /** gate: waiting at the barrier for a yes */
  fate: Fate;
  why?: 'budget' | 'refused';
  /** a person was asked */
  asked: boolean;
  /** waved through by an earlier yes */
  byPass?: boolean;
}
export interface Desk {
  now: number;
  slips: Slip[];
  passes: Pass[];
  /** paid out per day */
  spent: Record<number, number>;
  /** prompts shown per day */
  prompts: Record<number, number>;
}
export const EMPTY: Desk = { now: 0, slips: [], passes: [], spent: {}, prompts: {} };

/** Whether an earlier yes covers this order now: ok, ran out, only other orders' passes, or none at all. */
export function passFor(passes: Pass[], order: number, now: number, expiry: Expiry) {
  const mine = passes.filter(p => p.order === order);
  if (mine.some(p => expiry === 'forever' || now - p.at < PASS_HOURS)) return 'ok';
  if (mine.length) return 'expired';
  return passes.length ? 'other-order' : 'none';
}
export const needsYes = (p: Policy, dyed: boolean) => p.ask === 'all' || (p.ask === 'dyed' && dyed);
export const waiting = (d: Desk) => d.slips.find(s => s.fate === 'gate');

/** The assistant reads a letter and writes its refund, which goes to the booth at hour `at`. */
export function arrive(d: Desk, l: Letter, p: Policy, at = Math.max(d.now, l.hour)): Desk {
  const spent = d.spent[l.day] ?? 0,
    dyed = dyedLetter(l);
  const slip: Slip = { id: l.id, order: l.order, amount: l.amount, day: l.day, dyed, fate: 'paid', asked: false };
  const next = { ...d, now: at };
  if (p.budget !== null && spent + l.amount > p.budget) slip.fate = 'stopped';
  if (slip.fate === 'stopped') slip.why = 'budget';
  else if (needsYes(p, dyed)) {
    if (passFor(d.passes, l.order, at, p.expiry) === 'ok') slip.byPass = true;
    else {
      slip.fate = 'gate';
      slip.asked = true;
      next.prompts = { ...d.prompts, [l.day]: (d.prompts[l.day] ?? 0) + 1 };
    }
  }
  if (slip.fate === 'paid') next.spent = { ...d.spent, [l.day]: spent + l.amount };
  return { ...next, slips: [...d.slips, slip] };
}

/** A person's yes or no for the refund waiting at the barrier; a yes leaves a pass for that order. */
export function decide(d: Desk, yes: boolean): Desk {
  const w = waiting(d);
  if (!w) return d;
  const slips = d.slips.map(s =>
    s === w ? { ...s, fate: (yes ? 'paid' : 'stopped') as Fate, ...(yes ? {} : { why: 'refused' as const }) } : s,
  );
  if (!yes) return { ...d, slips };
  return {
    ...d,
    slips,
    passes: [...d.passes, { order: w.order, at: d.now }],
    spent: { ...d.spent, [w.day]: (d.spent[w.day] ?? 0) + w.amount },
  };
}

export const wait = (d: Desk, hours: number): Desk => ({ ...d, now: d.now + hours });

/** The hand-set approver: reads the first FATIGUE prompts of a day closely and refuses an obvious harm; after that,
 * clicks yes without reading. */
const approverSays = (l: Letter, promptsToday: number) => promptsToday > FATIGUE || !(l.harm && l.obvious);

/** The week under one policy, the approver deciding: harm stopped, good refunds paid and prompts shown. */
export function simulate(p: Policy, letters = WEEK) {
  let d = EMPTY;
  for (const l of letters) {
    d = arrive(d, l, p);
    if (waiting(d)) d = decide(d, approverSays(l, d.prompts[l.day]));
  }
  const fate = (id: string) => d.slips.find(s => s.id === id)!.fate;
  const bad = letters.filter(l => l.harm),
    good = letters.filter(l => !l.harm);
  return {
    desk: d,
    harm: { stopped: bad.filter(l => fate(l.id) !== 'paid').length, total: bad.length },
    good: { paid: good.filter(l => fate(l.id) === 'paid').length, total: good.length },
    prompts: Object.values(d.prompts).reduce((a, b) => a + b, 0),
  };
}

/** Every policy the workbench offers. */
export const POLICIES: Policy[] = ASKS.flatMap(ask =>
  BUDGETS.flatMap(budget => EXPIRIES.map(expiry => ({ ask, budget, expiry }))),
);
const clean = (r: ReturnType<typeof simulate>) => r.harm.stopped === r.harm.total && r.good.paid === r.good.total;
const SCORES = POLICIES.map(p => ({ p, r: simulate(p) }));
const FEWEST = Math.min(...SCORES.filter(s => clean(s.r)).map(s => s.r.prompts));
/** The workbench's winners: all harm stopped, every good refund paid, with the fewest prompts (recomputed in tests). */
export const WINNERS = SCORES.filter(s => clean(s.r) && s.r.prompts === FEWEST).map(s => s.p);
export const policyOf = (p: Policy) =>
  POLICIES.find(q => q.ask === p.ask && q.budget === p.budget && q.expiry === p.expiry)!;
export const isWinner = (p: Policy) => WINNERS.includes(policyOf(p));
export const isClean = (p: Policy) => clean(simulate(p));

/** One task's turns: what the assistant read and wrote, in order (data/action-approvals/run.json). */
export type Turn = { read: string; text: string } | { write: string; kind: string; text: string; outside: boolean };
/** Only Rosa's own words are trusted. */
const trusted = (source: string) => source.startsWith('rosa');
/** Each written action's dye: every outside source read before it in the task (the model can't tell what came from
 * where, so all of it rides along). */
export function dyeOf(turns: Turn[]): Record<string, string[]> {
  const read: string[] = [],
    out: Record<string, string[]> = {};
  for (const t of turns) {
    if ('read' in t) {
      if (!trusted(t.read)) read.push(t.read);
    } else out[t.write] = [...read];
  }
  return out;
}

export interface Planned {
  id: string;
  kind: 'refund' | 'summary';
  order?: number;
  dyed: boolean;
  /** gate: a refund to the booth; rosa: words handed to Rosa */
  to: 'gate' | 'rosa';
}
/** One mind reads the mail and acts on it; two minds: a planner sets the steps from Rosa's request alone ("summarise
 * the supplier mail") and a reader with no tools turns the mail into a summary, which goes to Rosa dyed. */
export function minds(mode: 'one' | 'two', letters: Letter[]): Planned[] {
  if (mode === 'one')
    return letters.map(l => ({ id: l.id, kind: 'refund', order: l.order, dyed: dyedLetter(l), to: 'gate' }));
  return [{ id: 'summary', kind: 'summary', dyed: letters.some(dyedLetter), to: 'rosa' }];
}
