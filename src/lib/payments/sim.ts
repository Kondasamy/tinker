// Payments' day simulator (KTD7): Larkspur's day of card orders (data/payments/day.json) run through authorise, capture,
// settle and dispute under a checkout policy, then counted. Money is whole cents throughout. The run's clock moves in
// ticks, two a day: the day (orders, holds, captures, refunds and chargebacks) and the night (settlement at the cut-off).
//
// - Authorise places a hold on the customer's money; the issuer (the customer's bank) says yes or no. 3-D Secure asks
//   the customer to prove it's them: `always` challenges every order, `risk` only those the issuer's risk check flags
//   (the rest pass without friction), `never` asks for an exemption, which the issuer grants only at or under the
//   low-value limit (fact `low-value`); above it the issuer asks for the challenge anyway. A challenged honest customer
//   may give up (`abandons`); a thief passes or fails (`fraud.passes`).
// - Capture turns a hold into a charge: at order (all of it, at once) or at shipment (each parcel, so a split order
//   captures only what shipped). A hold lapses after `holdDays`; a parcel shipped later needs a new authorisation.
// - Settlement runs every night: the customer pays the full amount; interchange goes to the issuer, the scheme fee to
//   the network, the acquirer's fee to the acquirer, and Larkspur gets the rest. Fees are kept on refunds and
//   chargebacks (Larkspur's assumption).
// - A request that times out is sent again. With an idempotency key the issuer sees one payment; without, two, and the
//   customer is charged twice until they dispute the duplicate.
// - A stolen card's real owner disputes it: the chargeback takes the money back from Larkspur, plus a fee, unless the
//   payment was authenticated with 3-D Secure, when the issuer bears the loss (fact `liability-shift`).
import day from '../../../data/payments/day.json' with { type: 'json' };
import data from '../../../data/payments/assumptions.json' with { type: 'json' };

export const ASSUMPTIONS = data;
export type Kind = 'small' | 'large' | 'split';
export type Party = 'customer' | 'issuer' | 'network' | 'acquirer' | 'merchant';
export type Sca = 'always' | 'risk' | 'never';
export type Capture = 'order' | 'shipment';
export type CardType = 'debit' | 'credit';
export const KINDS = day.kinds as Kind[];
export const PARTIES: Party[] = ['customer', 'issuer', 'network', 'acquirer', 'merchant'];
export const FEE_PARTIES = ['issuer', 'network', 'acquirer'] as const;
export type FeeParty = (typeof FEE_PARTIES)[number];
export const SCAS: Sca[] = ['always', 'risk', 'never'];
export const CAPTURES: Capture[] = ['order', 'shipment'];
export const DAYS = data.days;
/** two ticks a day: t = 2 × day (by day) and 2 × day + 1 (the night's settlement) */
export const TICKS = DAYS * 2;
export const HOLD_DAYS = data.holdDays;
export const LOW_VALUE = data.lowValueCents;
export const CB_FEE = data.chargebackFee;

export interface Order {
  id: string;
  who: string;
  kind: Kind;
  item: string;
  cents: number;
  card: { type: CardType; last4: string };
  hour: number;
  ships: { day: number; cents: number }[];
  cancelDay?: number;
  risky?: boolean;
  abandons?: boolean;
  timeout?: boolean;
  reauthDeclines?: boolean;
  fraud?: { passes: boolean; day: number };
}
export const ORDERS = day.orders as Order[];
export const orderOf = (id: string) => {
  const o = ORDERS.find(o => o.id === id);
  if (!o) throw new Error(`unknown order: ${id}`);
  return o;
};

/** A kind of order's checkout setting. */
export interface Setting {
  sca: Sca;
  capture: Capture;
  /** the till sends an idempotency key with every payment request */
  key: boolean;
}
export type Policy = Record<Kind, Setting>;
/** One setting for every kind of order. */
export const policyOf = (s: Setting): Policy =>
  Object.fromEntries(KINDS.map(k => [k, { ...s }])) as Record<Kind, Setting>;

export const isNight = (t: number) => t % 2 === 1;
export const dayOf = (t: number) => Math.floor(t / 2);
/** "Day 1, by day", "Day 1, night". */
export const clock = (t: number) => `Day ${dayOf(t) + 1}, ${isNight(t) ? `night (${data.cutoff})` : 'by day'}`;
/** €1,249.00 from cents. */
export const eur = (cents: number) =>
  `${cents < 0 ? '−' : ''}€${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The fees on a captured amount, in whole cents. Interchange is rounded down, so it never passes the cap. */
export function feesOn(cents: number, card: CardType): Record<FeeParty, number> {
  const bp = (b: number) => Math.round((cents * b) / 10000);
  return {
    issuer: Math.floor((cents * data.interchangeBp[card]) / 10000),
    network: bp(data.schemeFee.bp) + data.schemeFee.cents,
    acquirer: bp(data.acquirerFee.bp) + data.acquirerFee.cents,
  };
}

/** One thing that happened to an order. Money moves only in `entries`, which sum to zero. */
export type What =
  | 'auth'
  | 'challenge'
  | 'approved'
  | 'declined'
  | 'abandoned'
  | 'capture'
  | 'expire'
  | 'reauth'
  | 'settle'
  | 'refund'
  | 'chargeback'
  | 'issuer-pays';
export interface Ev {
  t: number;
  order: string;
  what: What;
  cents: number;
  /** the second copy of a payment the till sent twice */
  dup?: boolean;
  /** a challenge the issuer asked for after refusing the exemption */
  forced?: boolean;
  reason?: 'fraud' | 'duplicate';
  entries?: Partial<Record<Party, number>>;
}
/** How each order ended: exactly one of these. */
export type Final = 'settled' | 'refunded' | 'charged-back' | 'expired' | 'declined' | 'abandoned';
export interface OrderRun {
  order: Order;
  setting: Setting;
  final: Final;
  /** what was asked of the customer at checkout */
  sca: 'challenge' | 'frictionless' | 'exempt';
  /** the payment was authenticated, so the issuer bears fraud */
  authenticated: boolean;
  /** the customer was charged twice */
  doubleCharged: boolean;
  events: Ev[];
  /** each party's net, over the whole run; sums to zero */
  net: Record<Party, number>;
  fees: Record<FeeParty, number>;
  /** fraud money lost, by who bore it */
  fraudLoss: { merchant: number; issuer: number };
}
export interface Run {
  policy: Policy;
  orders: OrderRun[];
  events: Ev[];
  holds: number;
  expiries: number;
  doubleCharges: number;
  abandoned: number;
  declined: number;
  chargebacks: number;
  fraudLoss: { merchant: number; issuer: number };
  fees: Record<FeeParty, number>;
  /** what Larkspur keeps: settled money less refunds, chargebacks and their fees */
  net: number;
}

const zero = <K extends string>(ks: readonly K[]) => Object.fromEntries(ks.map(k => [k, 0])) as Record<K, number>;
const T = (d: number, night = false) => d * 2 + (night ? 1 : 0);

/** One order's life under its kind's setting. */
export function runOrder(o: Order, s: Setting): OrderRun {
  const ev: Ev[] = [],
    add = (e: Omit<Ev, 'order'>) => ev.push({ order: o.id, ...e });
  const copies = o.timeout && !s.key ? 2 : 1;
  // checkout: how the issuer meets the customer
  const exempt = s.sca === 'never' && o.cents <= LOW_VALUE;
  const sca = exempt ? 'exempt' : s.sca === 'risk' && !o.risky ? 'frictionless' : 'challenge';
  const forced = s.sca === 'never' && !exempt;
  const base: Omit<OrderRun, 'final' | 'events' | 'net' | 'fees' | 'fraudLoss' | 'doubleCharged'> = {
    order: o,
    setting: s,
    sca,
    authenticated: sca !== 'exempt',
  };
  const done = (final: Final): OrderRun => {
    const net = zero(PARTIES),
      fees = zero(FEE_PARTIES),
      fraudLoss = { merchant: 0, issuer: 0 };
    for (const e of ev) {
      for (const [p, c] of Object.entries(e.entries ?? {})) net[p as Party] += c;
      if (e.what === 'settle') for (const f of FEE_PARTIES) fees[f] += e.entries?.[f] ?? 0;
      if (e.what === 'chargeback' && e.reason === 'fraud') fraudLoss.merchant += -(e.entries?.merchant ?? 0);
      if (e.what === 'issuer-pays') fraudLoss.issuer += e.cents;
    }
    return {
      ...base,
      final,
      doubleCharged: ev.some(e => e.what === 'capture' && e.dup),
      events: ev.sort((a, b) => a.t - b.t),
      net,
      fees,
      fraudLoss,
    };
  };

  for (let c = 0; c < copies; c++) add({ t: 0, what: 'auth', cents: o.cents, ...(c ? { dup: true } : {}) });
  if (sca === 'challenge') {
    add({ t: 0, what: 'challenge', cents: o.cents, ...(forced ? { forced } : {}) });
    if (o.fraud && !o.fraud.passes) {
      add({ t: 0, what: 'declined', cents: o.cents });
      return done('declined');
    }
    if (!o.fraud && o.abandons) {
      add({ t: 0, what: 'abandoned', cents: o.cents });
      return done('abandoned');
    }
  }
  for (let c = 0; c < copies; c++) add({ t: 0, what: 'approved', cents: o.cents, ...(c ? { dup: true } : {}) });

  // captures: [day, cents]; a hold lapses at HOLD_DAYS, and a later parcel needs a new authorisation
  let captured = 0,
    lapsed = false;
  const parcels = s.capture === 'order' ? [{ day: 0, cents: o.cents }] : o.ships;
  const capture = (d: number, cents: number) => {
    for (let c = 0; c < copies; c++) {
      add({ t: T(d), what: 'capture', cents, ...(c ? { dup: true } : {}) });
      const f = feesOn(cents, o.card.type),
        all = f.issuer + f.network + f.acquirer;
      add({
        t: T(d, true),
        what: 'settle',
        cents,
        ...(c ? { dup: true } : {}),
        entries: { customer: -cents, ...f, merchant: cents - all },
      });
    }
    captured += cents;
  };
  for (const p of parcels) {
    if (p.day >= HOLD_DAYS) {
      if (!lapsed) {
        lapsed = true;
        for (let c = 0; c < copies; c++)
          add({ t: T(HOLD_DAYS), what: 'expire', cents: o.cents - captured, ...(c ? { dup: true } : {}) });
      }
      // a new authorisation for the parcel: a new hold, or a no
      for (let c = 0; c < (o.reauthDeclines ? 1 : copies); c++)
        add({
          t: T(p.day),
          what: o.reauthDeclines ? 'declined' : 'reauth',
          cents: p.cents,
          ...(c ? { dup: true } : {}),
        });
      if (o.reauthDeclines) continue;
    }
    capture(p.day, p.cents);
  }
  // a hold with money left on it lapses on its day
  if (!lapsed && captured < o.cents)
    for (let c = 0; c < copies; c++)
      add({ t: T(HOLD_DAYS), what: 'expire', cents: o.cents - captured, ...(c ? { dup: true } : {}) });
  if (!captured) return done('expired');

  // refunds: captured at order, parts that never shipped go back on the cancel day
  const shipped = o.ships.reduce((a, p) => a + p.cents, 0);
  if (s.capture === 'order' && shipped < o.cents) {
    const back = o.cents - shipped;
    for (let c = 0; c < copies; c++)
      add({
        t: T(o.cancelDay ?? 0),
        what: 'refund',
        cents: back,
        ...(c ? { dup: true } : {}),
        entries: { merchant: -back, customer: back },
      });
    if (!shipped) return done('refunded');
  }
  // the duplicate: the customer disputes it a few days after it was charged
  if (copies > 1) {
    const first = ev.find(e => e.what === 'capture' && e.dup)!;
    const sum = ev.filter(e => e.dup && e.what === 'capture').reduce((a, e) => a + e.cents, 0);
    const back = sum - (s.capture === 'order' ? o.cents - shipped : 0);
    add({
      t: T(dayOf(first.t) + data.noticeDays),
      what: 'chargeback',
      cents: back,
      reason: 'duplicate',
      entries: { merchant: -back - CB_FEE, acquirer: CB_FEE, customer: back },
    });
  }
  // a stolen card: the real owner disputes it
  if (o.fraud) {
    const back = captured - (s.capture === 'order' ? o.cents - shipped : 0);
    if (base.authenticated) {
      add({ t: T(o.fraud.day), what: 'issuer-pays', cents: back, entries: { issuer: -back, customer: back } });
    } else {
      add({
        t: T(o.fraud.day),
        what: 'chargeback',
        cents: back,
        reason: 'fraud',
        entries: { merchant: -back - CB_FEE, acquirer: CB_FEE, customer: back },
      });
      return done('charged-back');
    }
  }
  return done('settled');
}

/** Runs the day under a policy. */
export function simulate(policy: Policy, orders: Order[] = ORDERS): Run {
  const runs = orders.map(o => runOrder(o, policy[o.kind]));
  const fees = zero(FEE_PARTIES);
  for (const r of runs) for (const f of FEE_PARTIES) fees[f] += r.fees[f];
  const count = (f: (e: Ev) => boolean) => runs.reduce((a, r) => a + r.events.filter(f).length, 0);
  return {
    policy,
    orders: runs,
    events: runs.flatMap(r => r.events).sort((a, b) => a.t - b.t),
    holds: count(e => e.what === 'approved' || e.what === 'reauth'),
    expiries: count(e => e.what === 'expire'),
    doubleCharges: runs.filter(r => r.doubleCharged).length,
    abandoned: runs.filter(r => r.final === 'abandoned').length,
    declined: runs.filter(r => r.final === 'declined').length,
    chargebacks: count(e => e.what === 'chargeback'),
    fraudLoss: {
      merchant: runs.reduce((a, r) => a + r.fraudLoss.merchant, 0),
      issuer: runs.reduce((a, r) => a + r.fraudLoss.issuer, 0),
    },
    fees,
    net: runs.reduce((a, r) => a + r.net.merchant, 0),
  };
}
const runs = new Map<string, Run>();
/** A policy's run over the day, computed once per page. */
export function runOf(p: Policy): Run {
  const k = JSON.stringify(p);
  if (!runs.has(k)) runs.set(k, simulate(p));
  return runs.get(k)!;
}

/** What one order (or every order) had held and charged on the customer's card by the end of tick t. */
export function cardAt(r: Run, t: number, ids?: string[]) {
  const ev = r.events.filter(e => e.t <= t && (!ids || ids.includes(e.order)));
  const sum = (w: What) => ev.filter(e => e.what === w).reduce((a, e) => a + e.cents, 0);
  const placed = sum('approved') + sum('reauth');
  const charged = sum('capture');
  const held = Math.max(0, placed - charged - sum('expire'));
  const back = sum('refund') + sum('chargeback') + sum('issuer-pays');
  return { held, charged, back, paid: charged - back };
}

export const PARTY_NAME: Record<Party, string> = {
  customer: 'Customer',
  issuer: 'Issuer',
  network: 'Card network',
  acquirer: 'Acquirer',
  merchant: 'Larkspur',
};
export const SCA_NAME: Record<Sca, string> = {
  always: 'Always',
  risk: 'When the bank sees risk',
  never: 'Never (ask for an exemption)',
};
export const CAPTURE_NAME: Record<Capture, string> = { order: 'At order', shipment: 'At shipment' };
export const KIND_NAME: Record<Kind, string> = {
  small: 'Small orders',
  large: 'Drill presses',
  split: 'Split baskets',
};
export const FINAL_NAME: Record<Final, string> = {
  settled: 'paid',
  refunded: 'refunded',
  'charged-back': 'charged back',
  expired: 'hold lapsed',
  declined: 'declined',
  abandoned: 'gave up',
};
