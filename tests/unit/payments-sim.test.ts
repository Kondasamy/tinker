// Payments' day simulator (U12): every order ends once, money is conserved to the cent, interchange stays under the EU
// caps, the retry key, holds, partial capture and the liability shift behave as the chapters teach, the cards are
// masked fixtures, and the reference day is pinned (KTD12).
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ASSUMPTIONS,
  CAPTURES,
  FEE_PARTIES,
  HOLD_DAYS,
  KINDS,
  ORDERS,
  PARTIES,
  SCAS,
  TICKS,
  cardAt,
  clock,
  eur,
  feesOn,
  orderOf,
  policyOf,
  runOrder,
  simulate,
  type Setting,
} from '../../src/lib/payments/sim';
import pinned from '../../data/payments/pinned.json' with { type: 'json' };
import day from '../../data/payments/day.json' with { type: 'json' };

const SETTINGS: Setting[] = SCAS.flatMap(sca =>
  CAPTURES.flatMap(capture => [true, false].map(key => ({ sca, capture, key }))),
);
const ALL = SETTINGS.map(s => simulate(policyOf(s)));
const REF: Setting = { sca: 'risk', capture: 'shipment', key: true };
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe('the day', () => {
  it('every order ends in exactly one final state, under every setting', () => {
    for (const r of ALL) {
      expect(r.orders).toHaveLength(ORDERS.length);
      for (const o of r.orders)
        expect(['settled', 'refunded', 'charged-back', 'expired', 'declined', 'abandoned']).toContain(o.final);
    }
  });

  it('money is conserved: each order’s ledger sums to zero, and customers pay Larkspur plus every fee', () => {
    for (const r of ALL)
      for (const o of r.orders) {
        expect(sum(o.net)).toBe(0);
        for (const e of o.events) if (e.entries) expect(sum(e.entries)).toBe(0);
        const settled = o.events.filter(e => e.what === 'settle');
        const paid = settled.reduce((a, e) => a - (e.entries?.customer ?? 0), 0);
        const got = settled.reduce((a, e) => a + (e.entries?.merchant ?? 0), 0);
        expect(paid).toBe(got + sum(o.fees));
      }
  });

  it('every amount is whole cents', () => {
    for (const r of ALL)
      for (const e of r.events)
        for (const c of [e.cents, ...Object.values(e.entries ?? {})]) expect(Number.isInteger(c)).toBe(true);
  });

  it('interchange never passes the EU caps: 0.2% on debit, 0.3% on credit', () => {
    for (const cents of [1, 99, 990, 2400, 124900, 999999]) {
      expect(feesOn(cents, 'debit').issuer).toBeLessThanOrEqual(cents * 0.002);
      expect(feesOn(cents, 'credit').issuer).toBeLessThanOrEqual(cents * 0.003);
    }
    for (const r of ALL)
      for (const o of r.orders)
        for (const e of o.events.filter(e => e.what === 'settle'))
          expect(e.entries!.issuer!).toBeLessThanOrEqual(e.cents * (o.order.card.type === 'debit' ? 0.002 : 0.003));
  });
});

describe('what the chapters teach', () => {
  it('a timeout retry without a key charges twice; with a key, once', () => {
    const ben = orderOf('B2');
    expect(ben.timeout).toBe(true);
    const twice = runOrder(ben, { ...REF, key: false }),
      once = runOrder(ben, REF);
    expect(twice.events.filter(e => e.what === 'capture')).toHaveLength(2);
    expect(twice.doubleCharged).toBe(true);
    expect(once.events.filter(e => e.what === 'capture')).toHaveLength(1);
    expect(once.doubleCharged).toBe(false);
    // the duplicate comes back as a chargeback, with its fee
    expect(twice.events.some(e => e.what === 'chargeback' && e.reason === 'duplicate')).toBe(true);
  });

  it('an uncaptured hold lapses on the assumed day and the money is free again', () => {
    const finn = orderOf('F6'),
      r = simulate(policyOf(REF)),
      run = r.orders.find(o => o.order.id === 'F6')!;
    expect(finn.ships).toEqual([]);
    expect(run.final).toBe('expired');
    const lapse = run.events.find(e => e.what === 'expire')!;
    expect(lapse.t).toBe(HOLD_DAYS * 2);
    expect(cardAt(r, lapse.t - 1, ['F6']).held).toBe(finn.cents);
    expect(cardAt(r, lapse.t, ['F6'])).toMatchObject({ held: 0, charged: 0 });
  });

  it('a partial shipment captures only the shipped amount', () => {
    const omar = orderOf('P16'),
      run = runOrder(omar, REF),
      caps = run.events.filter(e => e.what === 'capture');
    expect(caps.map(e => e.cents)).toEqual(omar.ships.map(s => s.cents));
    expect(caps.reduce((a, e) => a + e.cents, 0)).toBeLessThan(omar.cents);
    // captured at order instead, the part that never shipped is refunded
    const all = runOrder(omar, { ...REF, capture: 'order' });
    expect(all.events.find(e => e.what === 'refund')!.cents).toBe(omar.cents - omar.ships[0].cents);
  });

  it('a parcel shipped after the hold lapsed needs a new authorisation, which can fail', () => {
    const jonas = runOrder(orderOf('K11'), REF),
      gita = runOrder(orderOf('H8'), REF);
    expect(jonas.final).toBe('expired');
    expect(gita.events.some(e => e.what === 'reauth')).toBe(true);
    expect(gita.final).toBe('settled');
    expect(runOrder(orderOf('K11'), { ...REF, capture: 'order' }).final).toBe('settled');
  });

  it('under “never” the fraud loss falls on Larkspur; after a passed challenge, on the issuer', () => {
    const noor = orderOf('E5');
    expect(noor.cents).toBeLessThanOrEqual(ASSUMPTIONS.lowValueCents);
    const never = runOrder(noor, { ...REF, sca: 'never' });
    expect(never.sca).toBe('exempt');
    expect(never.final).toBe('charged-back');
    expect(never.fraudLoss.merchant).toBe(noor.cents + ASSUMPTIONS.chargebackFee);
    expect(never.fraudLoss.issuer).toBe(0);
    const kai = runOrder(orderOf('L12'), { ...REF, sca: 'always' });
    expect(kai.sca).toBe('challenge');
    expect(kai.final).toBe('settled');
    expect(kai.fraudLoss).toEqual({ merchant: 0, issuer: orderOf('L12').cents });
    // a thief who fails the challenge is declined
    expect(runOrder(noor, REF).final).toBe('declined');
  });

  it('“never” only skips the challenge at or under the low-value limit', () => {
    for (const o of ORDERS)
      expect(runOrder(o, { ...REF, sca: 'never' }).sca).toBe(
        o.cents <= ASSUMPTIONS.lowValueCents ? 'exempt' : 'challenge',
      );
  });

  it('an honest customer who would give up does so only when challenged', () => {
    const iris = orderOf('J10');
    expect(runOrder(iris, { ...REF, sca: 'always' }).final).toBe('abandoned');
    expect(runOrder(iris, REF).final).toBe('settled');
  });

  it('the clock has a day and a night per day', () => {
    expect(TICKS).toBe(ASSUMPTIONS.days * 2);
    expect(clock(0)).toBe('Day 1, by day');
    expect(clock(1)).toMatch(/^Day 1, night/);
    expect(eur(124900)).toBe('€1,249.00');
    expect(eur(-5)).toBe('−€0.05');
  });
});

describe('the data', () => {
  it('no card has an unmasked number: four digits behind dots, nothing longer anywhere', () => {
    for (const o of ORDERS) expect(o.card.last4).toMatch(/^•••• \d{4}$/);
    // amounts are numbers; no string anywhere in the day carries a run of five or more digits
    const strings = (x: unknown): string[] =>
      typeof x === 'string' ? [x] : x && typeof x === 'object' ? Object.values(x).flatMap(strings) : [];
    for (const s of strings(day)) expect(s).not.toMatch(/\d{5,}/);
  });
  it('each kind has a timeout order, so the key always matters', () => {
    for (const k of KINDS) expect(ORDERS.some(o => o.kind === k && o.timeout)).toBe(true);
  });
  it('every parcel ships no more than was ordered', () => {
    for (const o of ORDERS) expect(o.ships.reduce((a, s) => a + s.cents, 0)).toBeLessThanOrEqual(o.cents);
  });
});

/** The reference day the chapters show, pinned. WRITE_PINNED=1 rewrites data/payments/pinned.json's reference. */
function reference() {
  const r = simulate(policyOf(REF));
  return {
    setting: REF,
    fees: r.fees,
    net: r.net,
    holds: r.holds,
    expiries: r.expiries,
    abandoned: r.abandoned,
    declined: r.declined,
    chargebacks: r.chargebacks,
    doubleCharges: r.doubleCharges,
    fraudLoss: r.fraudLoss,
    finals: Object.fromEntries(r.orders.map(o => [o.order.id, o.final])),
  };
}

describe('pinned', () => {
  it('the reference day’s counts match the pin', () => {
    const now = reference();
    if (process.env.WRITE_PINNED)
      writeFileSync('data/payments/pinned.json', `${JSON.stringify({ ...pinned, reference: now }, null, 2)}\n`);
    else expect(now).toEqual(pinned.reference);
    expect(Object.keys(now.fees)).toEqual([...FEE_PARTIES]);
    expect(PARTIES).toContain('merchant');
  });
});
