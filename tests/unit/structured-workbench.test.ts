import { describe, expect, it } from 'vitest';
import { diskModel } from '../../src/lib/transformers/diskModel';
import {
  FIELDS,
  ORDERS,
  POLICIES,
  SOLVED,
  WINNERS,
  bench,
  schemaFor,
  type Policy,
} from '../../src/lib/structured-outputs/workbench';
import { checkText } from '../../src/lib/structured-outputs/grammar';

const model = diskModel();
const key = (p: Policy) => FIELDS.map(f => p[f.id]).join('/');

describe('chapter 7 workbench', () => {
  it('walks every policy the controls can make', () => {
    expect(POLICIES).toHaveLength(FIELDS.reduce((n, f) => n * f.choices.length, 1));
    expect(new Set(POLICIES.map(key)).size).toBe(POLICIES.length);
  });

  it('WINNERS is non-empty, and every member gives valid, right output for every order', () => {
    const winners = WINNERS(model);
    expect(winners.length).toBeGreaterThan(0);
    for (const p of winners) {
      const b = bench(model, p);
      expect(b.score).toBe(ORDERS.length);
      for (const r of b.rows) {
        expect(r.valid && r.right, `${key(p)} order ${r.order.id}: ${r.reason}`).toBe(true);
        const s = schemaFor(p);
        if (s) expect(checkText(s, r.output).ok).toBe(true);
      }
    }
  }, 60_000);

  it('SOLVED, which the chapter uses so it never decodes every policy in the browser, equals WINNERS on the committed weights', () => {
    expect(SOLVED).toEqual(WINNERS(model));
  }, 60_000);

  it('the lessons hold: a free string is never right, a schema too long for the window is cut off, the model can’t know an order', () => {
    const b = (p: Policy) => bench(model, p);
    const free = b({ team: 'free', status: 'system', days: 'system' });
    expect(free.rows.every(r => r.valid && !r.right)).toBe(true);
    const long = b({ team: 'list', status: 'list', days: 'number' });
    expect(long.rows.every(r => r.status === 'cut-off' && !r.valid)).toBe(true);
    const guess = b({ team: 'system', status: 'list', days: 'system' });
    expect(guess.rows.some(r => !r.right)).toBe(true);
  }, 60_000);

  it('no policy beats the best: the score is out of the orders', () => {
    for (const p of POLICIES) expect(bench(model, p).score).toBeLessThanOrEqual(ORDERS.length);
  }, 120_000);
});
