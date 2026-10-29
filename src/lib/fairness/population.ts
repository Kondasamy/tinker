// Fairness's applicants (KTD6, R6, R13): 400 builders asking Larkspur for a trade account, hand-made by a seeded
// generator, never data about real people. data/fairness/applicants.json is its output; tests/unit/fairness-engine
// regenerates it and fails on drift (WRITE_PINNED=1 rewrites it).
//
// The generator, in words chapter copy can quote:
// - Two neutral, made-up regions. Every fourth applicant is from region B, so B is a quarter of the sample (the thin
//   sample): 300 from A, 100 from B.
// - Postcode: 9 in 10 of region A have a hill postcode (HL1, HL2), and 9 in 10 of region B a river postcode (RV1, RV2).
//   So the postcode tells you the region most of the time (the proxy).
// - Years trading (about 10, give or take 5), late payments last year (about 1) and monthly order value (about $8k,
//   give or take $3k) are drawn the same way in both regions.
// - Whether the account was repaid is drawn from the odds of a stated rule (RULE): more years, fewer late payments and
//   bigger orders help, and a river postcode lowers the odds (a slower local market in the record). The rule never
//   reads the region; but most of B has river postcodes, so fewer of B's accounts were repaid: the different base rate.
import { mulberry32 } from '../transformers/sample';

export type Region = 'A' | 'B';
export interface Applicant {
  id: string;
  /** a made-up trading name */
  name: string;
  region: Region;
  postcode: string;
  /** years trading */
  years: number;
  /** late payments in the last year */
  late: number;
  /** monthly order value, $k */
  orders: number;
  /** 1 if the account was repaid on time (the outcome the check tries to predict) */
  repaid: 0 | 1;
}

export const SEED = 49;
export const COUNT = 400;
/** One in four applicants is from region B. */
export const B_EVERY = 4;
export const HILL = ['HL1', 'HL2'];
export const RIVER = ['RV1', 'RV2'];
/** How often an applicant's postcode matches their region's side. */
export const POSTCODE_MATCH = 0.9;
/** The rule's log-odds of repaying: intercept, per year trading, per late payment, per $k of orders, a river postcode. */
export const RULE = { base: -0.4, years: 0.12, late: -0.9, orders: 0.15, river: -1.2 };

const FIRST = ['Ash', 'Birch', 'Cedar', 'Elm', 'Fern', 'Hazel', 'Juniper', 'Larch', 'Maple', 'Oak', 'Rowan', 'Willow'];
const TRADE = ['Builders', 'Joinery', 'Roofing', 'Plumbing', 'Brickwork', 'Carpentry', 'Tiling', 'Renovations'];

/** The rule's log-odds for one applicant's fields. */
export const ruleLogit = (a: Pick<Applicant, 'postcode' | 'years' | 'late' | 'orders'>) =>
  RULE.base +
  RULE.years * a.years +
  RULE.late * a.late +
  RULE.orders * a.orders +
  (RIVER.includes(a.postcode) ? RULE.river : 0);

/** Every applicant, from the seed alone. */
export function generate(seed = SEED, count = COUNT): Applicant[] {
  const rand = mulberry32(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Applicant[] = [];
  for (let i = 0; i < count; i++) {
    const region: Region = i % B_EVERY === B_EVERY - 1 ? 'B' : 'A';
    const home = region === 'A' ? HILL : RIVER,
      away = region === 'A' ? RIVER : HILL;
    const postcode = pick(rand() < POSTCODE_MATCH ? home : away);
    const years = Math.max(0, Math.min(30, Math.round(10 + 5 * normal())));
    // late payments: count the draws under 0.25 in four tries (about 1 a year)
    let late = 0;
    for (let k = 0; k < 4; k++) if (rand() < 0.25) late++;
    const orders = Math.max(1, Math.round(8 + 3 * normal()));
    const a = { postcode, years, late, orders };
    const repaid = rand() < 1 / (1 + Math.exp(-ruleLogit(a))) ? 1 : 0;
    const name = `${pick(FIRST)} ${pick(TRADE)}`;
    out.push({ id: `t${String(i + 1).padStart(3, '0')}`, name, region, postcode, years, late, orders, repaid });
  }
  return out;
}
