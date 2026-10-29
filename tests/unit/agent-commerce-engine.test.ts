import { describe, expect, it } from 'vitest';
import pinned from '../../data/agent-commerce/pinned.json' with { type: 'json' };
import { CARD, parseCard, parseCatalogue, READ_ITEMS, readShop } from '../../src/lib/agent-commerce/card';
import { ACCESSED, FACTS } from '../../src/lib/agent-commerce/facts';
import { mandateOf, type Slip, sign, verify } from '../../src/lib/agent-commerce/mandate';
import { checkOrder, checkTerms, FIELDS, type Order, orderOf } from '../../src/lib/agent-commerce/shop';
import { RULES, simBuyer, simRead, simSeller } from '../../src/lib/agent-commerce/simulate';
import { CARD_JSON, CATALOGUE, SELLERS, SLIPS, sellerOf, TODAY } from '../../src/lib/agent-commerce/story';
import { isEnd, move, NEXT, runTask, STATES, type TaskState } from '../../src/lib/agent-commerce/task';
import { chargeOf, issue, redeem } from '../../src/lib/agent-commerce/token';
import {
  MENU_TURNS,
  OFFER_TURNS,
  offerSig,
  PAGE_TURNS,
  type Recording,
  type SellerTurn,
  TASK_TURNS,
} from '../../src/lib/agent-commerce/turns';
import { BEST, solve, WINNERS } from '../../src/lib/agent-commerce/workbench';

const larkspur = orderOf(sellerOf('larkspur'), 'order-1');
const slipFor = (terms = SLIPS.larkspur, nonce = 'n-1') => sign(mandateOf(terms, nonce));
const failedOf = async (m: Slip | Promise<Slip>, o: Order, spent: string[] = []) => {
  const v = await checkOrder(await m, o, spent);
  return v.checks.filter(c => !c.pass).map(c => c.field);
};

/** Every verdict a chapter teaches (pinned.json `verdicts`), each recomputed live. */
async function verdicts() {
  const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const good = await slipFor();
  const tampered = { ...good, mandate: { ...good.mandate, cap: 150000 } };
  return {
    valid: await failedOf(good, larkspur),
    'other-key': await failedOf(sign(good.mandate, other.privateKey), larkspur),
    'tampered-cap': await failedOf(tampered, larkspur),
    'over-cap': await failedOf(good, { ...larkspur, lines: [{ sku: 'screws-5x60', qty: 50, unit: 1420 }] }),
    expired: await failedOf(good, orderOf(sellerOf('backorder'))),
    'out-of-scope': await failedOf(good, { ...larkspur, lines: sellerOf('ridgeback').lines }),
    'wrong-merchant': await failedOf(good, orderOf(sellerOf('lookalike'))),
    'reused-nonce': await failedOf(good, larkspur, ['n-1']),
    'other-currency': await failedOf(good, { ...larkspur, currency: 'EUR' }),
    'limit-raised': await failedOf(slipFor(SLIPS['shop-around']), orderOf(sellerOf('quarrylane'))),
  };
}

function tokens() {
  const t = issue(larkspur);
  const first = redeem(t, chargeOf(larkspur), []);
  const second = orderOf(sellerOf('fernway'), 'order-2');
  return {
    first: first.ok,
    replay: redeem(t, chargeOf(larkspur), first.spent),
    'other-order': redeem(t, { ...chargeOf(larkspur), order: 'order-2' }, []),
    'other-shop': redeem(t, { ...chargeOf(larkspur), merchant: second.merchant }, []),
    'other-amount': redeem(t, { ...chargeOf(larkspur), amount: chargeOf(larkspur).amount + 100 }, []),
  };
}
const why = (r: ReturnType<typeof redeem>) => (r.ok ? 'ok' : r.why);

describe('agent card and catalogue (chapter 2)', () => {
  it('Larkspur’s card parses, its address is the first interface', () => {
    expect(CARD.url).toBe('https://larkspur.example/a2a');
    expect(CARD.skills.map(s => s.id)).toEqual(['quote', 'order']);
  });
  it('a card missing fields names each one', () => {
    const { name: _n, skills: _s, ...rest } = CARD_JSON as Record<string, unknown>;
    expect(parseCard(rest)).toEqual({ ok: false, missing: ['name', 'skills'] });
    expect(parseCard('not a card')).toEqual({ ok: false, missing: ['card'] });
  });
  it('the catalogue parses; a bad row is named', () => {
    expect(parseCatalogue(CATALOGUE).ok).toBe(true);
    expect(parseCatalogue([{ ...CATALOGUE[0], price: 9.5 }])).toEqual({ ok: false, missing: ['row 1 price'] });
  });
  it('every domain is fictional', () => {
    expect(CARD.url).toMatch(/\.example\//);
    for (const s of SELLERS) expect(s.domain).toMatch(/\.example$/);
  });
});

describe('reading the shop (chapters 1–2)', () => {
  it('pinned readings: the agent’s total against the catalogue’s', () => {
    const now = Object.fromEntries(
      (['page', 'menu'] as const).flatMap(view =>
        READ_ITEMS.map(sku => {
          const r = readShop(view === 'page' ? PAGE_TURNS : MENU_TURNS, view, sku);
          return [`${view}:${sku}`, { total: r.turn?.total, truth: r.truth, right: r.right }];
        }),
      ),
    );
    expect(now).toEqual(pinned.reads);
  });
});

describe('task lifecycle (chapter 3)', () => {
  it('the states are A2A’s, and only the three ends go nowhere', () => {
    expect(Object.keys(NEXT).sort()).toEqual([...STATES].sort());
    expect(STATES.filter(isEnd).sort()).toEqual(['canceled', 'completed', 'failed']);
  });
  it('an illegal move throws', () => {
    expect(() => move('completed', 'working')).toThrow(/illegal/);
    expect(() => move('submitted', 'completed')).toThrow(/illegal/);
    expect(() => move('canceled', 'failed')).toThrow(/illegal/);
    expect(move('input-required', 'working')).toBe('working');
  });
  it('pinned runs; every path moves legally', () => {
    const now = Object.fromEntries(
      (['clear', 'vague'] as const).flatMap(request =>
        [false, true].map(cancel => {
          const r = runTask(TASK_TURNS, request, cancel);
          r.states.slice(1).forEach((s, n) => expect(move(r.states[n], s)).toBe(s));
          return [
            `${request}${cancel ? ':cancel' : ''}`,
            { states: r.states, status: r.status, order: r.order ?? null },
          ];
        }),
      ),
    );
    expect(now).toEqual(pinned.task);
  });
  it('a missing turn reports norecord', () => {
    expect(runTask({ meta: { model: '', accessed: '' }, turns: {} }, 'clear').status).toBe('norecord');
  });
});

describe('the signed slip (chapter 4)', () => {
  it('a slip signed live with the builder’s key verifies; any other key fails', async () => {
    const good = await slipFor();
    expect(await verify(good)).toBe(true);
    const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    expect(await verify(await sign(good.mandate, other.privateKey))).toBe(false);
    expect(await verify({ ...good, sig: 'zz' })).toBe(false);
  });
  it('the slip expires the given hours from now', async () => {
    expect((await slipFor()).mandate.expiry).toBe(new Date(Date.parse(TODAY) + 168 * 3600e3).toISOString());
  });
  it('pinned verdicts: each failure stops the order, each with its own field and reason', async () => {
    const v = await verdicts();
    expect(v).toEqual(pinned.verdicts);
    const good = await slipFor();
    const reasons = new Set(
      [
        await checkOrder({ ...good, mandate: { ...good.mandate, cap: 1 } }, larkspur, []),
        await checkOrder(good, orderOf(sellerOf('backorder')), []),
        await checkOrder(good, { ...larkspur, lines: sellerOf('ridgeback').lines }, []),
        await checkOrder(good, orderOf(sellerOf('lookalike')), []),
        await checkOrder(good, larkspur, ['n-1']),
      ].flatMap(x => x.checks.filter(c => !c.pass).map(c => c.reason)),
    );
    expect(reasons.size).toBeGreaterThanOrEqual(6);
  });
  it('checks every field, signature first, at most six', async () => {
    const v = await checkOrder(await slipFor(), larkspur, []);
    expect(v.checks.map(c => c.field)).toEqual([...FIELDS]);
    expect(v.ok).toBe(true);
  });
});

describe('a seller that talks back (chapter 5)', () => {
  it('“limit raised” changes no signed field: refused on the cap, whatever the agent’s turn says', async () => {
    // the shop takes only the slip and the order: no turn or message can reach its checks
    const slip = await slipFor(SLIPS['shop-around']);
    const order = orderOf(sellerOf('quarrylane'));
    const v = await checkOrder(slip, order, []);
    expect(v.ok).toBe(false);
    expect(v.checks.filter(c => !c.pass).map(c => c.field)).toEqual(['cap']);
    expect(checkTerms(slip.mandate, order, []).find(c => c.field === 'cap')?.reason).toMatch(/over the \$600\.00 cap/);
  });
  it('pinned buying-agent decisions', () => {
    expect(Object.fromEntries(SELLERS.map(s => [s.id, OFFER_TURNS.turns[offerSig(s.id)]?.accept]))).toEqual(
      pinned.offers,
    );
  });
});

describe('the one-order token (chapter 6)', () => {
  it('pinned: charges once, then refuses replay, another order, shop or amount', () => {
    const t = tokens();
    expect({
      first: t.first,
      replay: why(t.replay),
      'other-order': why(t['other-order']),
      'other-shop': why(t['other-shop']),
      'other-amount': why(t['other-amount']),
    }).toEqual(pinned.tokens);
  });
});

describe('simulated agents (KTD13)', () => {
  it('every rule cites a fact', () => {
    for (const r of RULES) expect(FACTS.some(f => f.id === r.fact)).toBe(true);
  });
  it('first-price: the page misreads every order; price-field: the catalogue reads every one right', () => {
    for (const sku of READ_ITEMS) {
      const truth = readShop({ meta: { model: '', accessed: '' }, turns: {} }, 'menu', sku).truth;
      expect(simRead('page', sku).total).not.toBe(truth);
      expect(simRead('menu', sku).total).toBe(truth);
    }
  });
  it('ask-back: a vague order gets a question, then completes', () => {
    const rec: Recording<SellerTurn> = {
      meta: { model: 'simulated', accessed: '' },
      turns: {
        'hist=|request=vague': simSeller('vague', []),
        'hist=asked|request=vague': simSeller('vague', ['asked']),
      },
    };
    expect(runTask(rec, 'vague').states).toEqual(['submitted', 'working', 'input-required', 'working', 'completed']);
  });
  it('obeys-seller: the simulated agent sends on the “limit raised” offer, and the shop still refuses it', async () => {
    expect(simBuyer('quarrylane').accept).toBe(true);
    expect((await checkOrder(await slipFor(SLIPS['shop-around']), orderOf(sellerOf('quarrylane')), [])).ok).toBe(false);
  });
});

describe('workbench (chapter 7)', () => {
  it('WINNERS recompute to their pin', () => {
    const s = solve();
    expect({ right: s.right, asked: s.asked }).toEqual(BEST);
    expect(s.winners).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
  });
});

describe('facts', () => {
  it('every fact has a source and the access date', () => {
    expect(ACCESSED).toBe('2026-10-29');
    for (const f of FACTS) expect(f.source).toMatch(/^https:\/\//);
  });
  it('the task states read from the A2A fact', () => {
    expect(STATES satisfies TaskState[]).toEqual([
      'submitted',
      'working',
      'input-required',
      'completed',
      'failed',
      'canceled',
    ]);
  });
});
