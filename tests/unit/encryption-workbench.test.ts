// Locks and keys chapter 7's workbench (KTD12): the pinned WINNERS are every plan that loses nothing over the whole
// domain, and the lessons the bench rests on hold.
import { describe, expect, it } from 'vitest';
import {
  CHOICES,
  PLANS,
  START,
  WINNERS,
  benchPlan,
  lossesOf,
  lostBy,
  planKey,
  solve,
  wins,
} from '../../src/lib/encryption/workbench';

describe('chapter 7’s workbench', () => {
  it('has 256 plans: four ways for each of four messages', () => {
    expect(PLANS).toHaveLength(256);
    expect(new Set(PLANS.map(planKey)).size).toBe(256);
  });
  it('WINNERS equals the pin: every plan that loses nothing', () => {
    expect(solve().map(planKey)).toEqual(WINNERS.map(planKey));
    for (const p of WINNERS) expect(lostBy(p)).toBe(0);
    expect(WINNERS.length).toBeGreaterThan(1);
  });
  it('a lock alone never stops a tamperer or an impostor', () => {
    expect(lossesOf('bank', 'lock')).toEqual(['Tamperer changes it', 'Impostor fakes it']);
  });
  it('a public price list can’t be locked', () => {
    expect(lossesOf('prices', 'both')).toContain('Other shops can’t open it');
    for (const p of WINNERS) expect(p.prices).toBe('sign');
  });
  it('the start loses, and saved states read back into plans', () => {
    expect(wins(START)).toBe(false);
    expect(planKey(benchPlan({}))).toBe(planKey(START));
    expect(benchPlan({ bank: 'shred' as never }).bank).toBe('none');
    for (const c of CHOICES) expect(benchPlan({ bank: c }).bank).toBe(c);
  });
});
