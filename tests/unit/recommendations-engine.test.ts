// Recommendations' engine (U20, KTD9, KTD10): factorise() is seeded and fixed, and reproduces the pinned tastes; every
// method's hit@5 and coverage match their pins, and tastes beat bestsellers; cosine and the empty basket; cold start
// for a new shopper and a new product; the loop narrows coverage without exploration and holds it with the pinned
// share; loop.json is every run recomputed. WRITE_PINNED=1 rewrites factors.json, loop.json and pinned.json's methods.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AFTER_FIRST,
  BASE,
  align,
  dot,
  factorise,
  tasteOf,
  type Factors,
} from '../../src/lib/recommendations/factorise';
import { BLENDS, EXPLORES, ROUNDS, loopOf, simulate, simulateAll } from '../../src/lib/recommendations/loop';
import { SCORES, methodScores, popularShelf, shelfOf, shelvesOf, rankOf } from '../../src/lib/recommendations/score';
import { cosine, neighbours, userSimilarity } from '../../src/lib/recommendations/similar';
import {
  CUSTOMERS,
  FIRST_BUYERS,
  HELD_OUT,
  NEW_PRODUCT,
  PRODUCTS,
  TRAIN,
  TRAIN_FIRST,
  productOf,
} from '../../src/lib/recommendations/story';
import { COVERAGE_MIN, WINNERS } from '../../src/lib/recommendations/workbench';

const ALL = PRODUCTS.map(p => p.id);
const write = (file: string, x: unknown) => writeFileSync(file, `${JSON.stringify(x, null, 2)}\n`);
const close = (a: Factors, b: Factors) => {
  for (const side of ['users', 'items'] as const) {
    expect(Object.keys(a[side]).sort()).toEqual(Object.keys(b[side]).sort());
    for (const [k, v] of Object.entries(a[side])) {
      const w = b[side][k];
      if (v === null || w === null) expect([k, v]).toEqual([k, w]);
      else for (const i of [0, 1]) expect(Math.abs(v[i] - w[i])).toBeLessThan(1e-9);
    }
  }
};

describe('the orders', () => {
  it('60 customers, 40 products; every last order is new to its customer; the new product has no orders', () => {
    expect(CUSTOMERS).toHaveLength(60);
    expect(PRODUCTS).toHaveLength(40);
    for (const c of CUSTOMERS) {
      expect(TRAIN[c.id]).not.toContain(HELD_OUT[c.id]);
      for (const p of c.orders) productOf(p);
    }
    expect(CUSTOMERS.some(c => c.orders.includes(NEW_PRODUCT))).toBe(false);
  });
});

describe('factorise()', () => {
  it('reproduces factors.json within 1e-9, from the training orders and after the first order', () => {
    const base = factorise(TRAIN, ALL),
      after = factorise(TRAIN_FIRST, ALL);
    if (process.env.WRITE_PINNED) write('data/recommendations/factors.json', { base, afterFirst: after });
    close(base, BASE);
    close(after, AFTER_FIRST);
  });
  it('align() turns a refit onto the map without changing any score', () => {
    const other = factorise(TRAIN, ALL, 99),
      turned = align(other, BASE.items);
    for (const c of CUSTOMERS.slice(0, 10))
      for (const p of ['wood-glue', 'label-roll', 'hinge-pack'])
        expect(dot(turned.users[c.id]!, turned.items[p]!)).toBeCloseTo(dot(other.users[c.id]!, other.items[p]!), 9);
    const gap = (f: Factors) =>
      ALL.reduce(
        (e, p) =>
          e + (f.items[p] ? Math.hypot(f.items[p]![0] - BASE.items[p]![0], f.items[p]![1] - BASE.items[p]![1]) : 0),
        0,
      );
    expect(gap(turned)).toBeLessThanOrEqual(gap(other));
  });
  it('is seeded: the same seed gives the same tastes, another seed different ones', () => {
    expect(factorise(TRAIN, ALL)).toEqual(factorise(TRAIN, ALL));
    expect(factorise(TRAIN, ALL, 8).items['wood-glue']).not.toEqual(factorise(TRAIN, ALL).items['wood-glue']);
  });
});

describe('the methods', () => {
  it('each method’s hit@5 and coverage match the pins, and tastes beat bestsellers', () => {
    const s = methodScores(BASE);
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync('data/recommendations/pinned.json', 'utf8'));
      write('data/recommendations/pinned.json', { ...file, methods: s });
      return;
    }
    expect(s).toEqual(SCORES);
    expect(SCORES.factors.hits).toBeGreaterThan(SCORES.popular.hits);
    expect(SCORES.users.hits).toBeGreaterThan(SCORES.popular.hits);
    expect(SCORES.items.hits).toBeGreaterThan(SCORES.popular.hits);
  });
  it('the bestsellers shelf is the same for everyone, less what they own', () => {
    const shelves = shelvesOf('popular');
    const top = popularShelf(TRAIN);
    const fresh = CUSTOMERS.filter(c => !top.some(p => TRAIN[c.id].includes(p)));
    expect(fresh.length).toBeGreaterThan(1);
    for (const c of fresh) expect(shelves[c.id]).toEqual(top);
    expect(new Set(Object.values(shelves).flat()).size).toBe(SCORES.popular.coverage);
  });
  it('cosine of a customer with themself is 1; a customer with no orders gets the bestsellers', () => {
    for (const c of CUSTOMERS) expect(userSimilarity(TRAIN, c.id, c.id)).toBeCloseTo(1, 12);
    expect(cosine(['a', 'b'], ['b', 'c'])).toBeCloseTo(0.5, 12);
    const h = { ...TRAIN, nobody: [] };
    for (const m of ['users', 'items', 'factors'] as const)
      expect(shelfOf(m, h, 'nobody', BASE)).toEqual(popularShelf(h));
    expect(neighbours(h, 'nobody')).toEqual([]);
  });
  it('no shelf offers what the customer already bought', () => {
    for (const m of ['popular', 'users', 'items', 'factors'] as const) {
      const s = shelvesOf(m, BASE);
      for (const c of CUSTOMERS) {
        expect(s[c.id]).toHaveLength(5);
        for (const p of s[c.id]) expect(TRAIN[c.id]).not.toContain(p);
      }
    }
  });
});

describe('cold start', () => {
  it('a new shopper’s taste is the mean of the products they pick', () => {
    const t = tasteOf(BASE.items, ['wood-glue', 'hinge-pack'])!;
    expect(t[0]).toBeCloseTo((BASE.items['wood-glue']![0] + BASE.items['hinge-pack']![0]) / 2, 12);
    expect(tasteOf(BASE.items, [NEW_PRODUCT])).toBeNull();
  });
  it('a new product has no taste and is in no ranking until it has orders; three orders rank it, low', () => {
    expect(BASE.items[NEW_PRODUCT]).toBeNull();
    for (const c of CUSTOMERS) expect(rankOf(BASE.items, BASE.users[c.id]!, TRAIN[c.id], NEW_PRODUCT)).toBeNull();
    expect(AFTER_FIRST.items[NEW_PRODUCT]).not.toBeNull();
    const ranks = CUSTOMERS.filter(c => !FIRST_BUYERS.includes(c.id)).map(c =>
      rankOf(AFTER_FIRST.items, AFTER_FIRST.users[c.id]!, TRAIN[c.id], NEW_PRODUCT),
    );
    for (const r of ranks) expect(r).toBeGreaterThan(5);
  });
});

describe('the loop', () => {
  it('without exploration, coverage narrows round over round', () => {
    const cov = loopOf(1, 0).rounds.map(r => r.coverage);
    expect(cov).toHaveLength(ROUNDS + 1);
    for (let i = 1; i < cov.length; i++) expect(cov[i]).toBeLessThanOrEqual(cov[i - 1]);
    expect(cov.at(-1)!).toBeLessThan(COVERAGE_MIN);
  });
  it('at the winning exploration share, coverage holds at the rule’s floor', () => {
    for (const w of WINNERS) {
      expect(w.explore).toBeGreaterThan(0);
      expect(loopOf(w.blend, w.explore).rounds.at(-1)!.coverage).toBeGreaterThanOrEqual(COVERAGE_MIN);
    }
  });
  it('round 0 is the hand-written orders’ shelf: everything with an order is on the map', () => {
    expect(loopOf(1, 0).rounds[0].coverage).toBe(PRODUCTS.length - 1);
  });
  it('loop.json recomputes from factorise() for every blend and exploration step', () => {
    const runs = simulateAll();
    // one run per line, so the file stays small: the browser bundles it
    if (process.env.WRITE_PINNED)
      writeFileSync(
        'data/recommendations/loop.json',
        `{"runs": [\n${runs.map(r => JSON.stringify(r)).join(',\n')}\n]}\n`,
      );
    expect(runs).toHaveLength(BLENDS.length * EXPLORES.length);
    for (const r of runs) expect(loopOf(r.blend, r.explore)).toEqual(r);
    expect(simulate(1, 0)).toEqual(runs.find(r => r.blend === 1 && r.explore === 0));
  });
});
