// Where the effort goes: per-request routing over a hand-written example day (data/adaptive-compute/day.json). Each
// request kind has one rule: the effort option its valve sends it to. A request is answered while the day's budget
// lasts (in the day's order; the first that doesn't fit ends the day), and answered right when its kind's hand-set
// outcomes say that option gets it right. Costs are toy units of effort, not real prices.
import DAY from '../../../data/adaptive-compute/day.json' with { type: 'json' };

export type Kind = 'everyday' | 'puzzle' | 'stock' | 'total' | 'warranty';
/** Where a valve sends a kind: straight to the assistant, one mill, or every mill at once (maximum effort). */
export type Opt = 'straight' | 'think' | 'lookup' | 'check' | 'big' | 'all';
/** The four mills, each one way to spend more effort on an answer. */
export type MillId = 'think' | 'lookup' | 'check' | 'big';
export type Rules = Record<Kind, Opt>;

export const OPTS: Opt[] = ['straight', 'think', 'lookup', 'check', 'big', 'all'];
export const MILLS: MillId[] = ['think', 'lookup', 'check', 'big'];
export const KINDS = DAY.kinds.map(k => ({ ...k, id: k.id as Kind, right: k.right as Opt[] }));
export const KIND_IDS = KINDS.map(k => k.id);
export const REQUESTS = DAY.requests.map(r => ({ ...r, kind: r.kind as Kind }));
export const COSTS = DAY.costs as Record<Opt, number>;
/** The day's budget in effort units (a toy number). */
export const BUDGET = DAY.budget;
export const RUN_LABEL = DAY.label;
export const kindOf = (k: Kind) => KINDS.find(x => x.id === k)!;
export const countOf = (k: Kind) => REQUESTS.filter(r => r.kind === k).length;

/** The option's name, as the valve's twin and the table say it. */
export const OPT_NAME: Record<Opt, string> = {
  straight: 'Answer straight',
  think: 'Think longer',
  lookup: 'Look it up',
  check: 'Check the work',
  big: 'Bigger model',
  all: 'Every mill',
};
/** The mills an option sends water to. */
export const millsOf = (o: Opt): MillId[] => (o === 'all' ? MILLS : o === 'straight' ? [] : [o]);

export const rulesOf = (o: Opt): Rules => ({ everyday: o, puzzle: o, stock: o, total: o, warranty: o });
/** Maximum effort on every question (chapter 1). */
export const MAX = rulesOf('all');
/** No extra effort anywhere. */
export const PLAIN = rulesOf('straight');
/** Each kind to the one option that gets it right, cheapest first (chapters 5 and 6). */
export const ROUTED: Rules = {
  everyday: 'straight',
  puzzle: 'think',
  stock: 'lookup',
  total: 'check',
  warranty: 'big',
};

/** Whether this option answers a request of this kind right (hand-set). */
export const rightBy = (k: Kind, o: Opt) => kindOf(k).right.includes(o);

export interface KindScore {
  asked: number;
  answered: number;
  right: number;
  spent: number;
}
export interface DayResult {
  answered: number;
  right: number;
  spent: number;
  /** the budget ran out before the day ended */
  dry: boolean;
  by: Record<Kind, KindScore>;
}

/** Run the day under these rules and this budget (Infinity: no limit). */
export function runDay(rules: Rules, budget = BUDGET): DayResult {
  const by = Object.fromEntries(KIND_IDS.map(k => [k, { asked: 0, answered: 0, right: 0, spent: 0 }])) as Record<
    Kind,
    KindScore
  >;
  let spent = 0,
    dry = false;
  for (const r of REQUESTS) {
    const o = rules[r.kind],
      c = COSTS[o],
      b = by[r.kind];
    b.asked++;
    if (dry || spent + c > budget) {
      dry = true;
      continue;
    }
    spent += c;
    b.spent += c;
    b.answered++;
    if (rightBy(r.kind, o)) b.right++;
  }
  const sum = (f: keyof KindScore) => KIND_IDS.reduce((n, k) => n + by[k][f], 0);
  return { answered: sum('answered'), right: sum('right'), spent, dry, by };
}

/** Every setting of the five valves. */
export function allRules(): Rules[] {
  let out: Rules[] = [{} as Rules];
  for (const k of KIND_IDS) out = out.flatMap(r => OPTS.map(o => ({ ...r, [k]: o })));
  return out;
}
/** The workbench's goal: every question right, within the budget. */
export const isWin = (r: Rules) => {
  const d = runDay(r);
  return d.right === REQUESTS.length && !d.dry;
};
