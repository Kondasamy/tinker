// Logins chapter 7's workbench (KTD10, KTD11): the pinned WINNERS are every plan with the fewest break-ins and, among
// those, the least sign-in friction, over the whole domain; and the lessons the bench rests on hold.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/logins/pinned.json' with { type: 'json' };
import {
  PLANS,
  START,
  STORES,
  WINNERS,
  benchPlan,
  breakIns,
  frictionOf,
  planKey,
  solve,
  wins,
  type Plan,
} from '../../src/lib/logins/workbench';
import { ACCOUNTS, LEAKED } from '../../src/lib/logins/store';

const best = WINNERS[0];
const by = (p: Plan, attacker: string) => breakIns(p).filter(b => b.attacker === attacker);

describe('chapter 7’s workbench', () => {
  it('has 216 plans: six stores, and a second factor and a session length for each of two account types', () => {
    expect(PLANS).toHaveLength(216);
    expect(new Set(PLANS.map(planKey)).size).toBe(216);
  });
  it('WINNERS equals the pin: fewest break-ins, then least friction', () => {
    expect(WINNERS.map(planKey)).toEqual(pinned.winners);
    expect(solve().map(planKey)).toEqual(pinned.winners);
    expect(WINNERS.length).toBeGreaterThan(1);
    const least = Math.min(...PLANS.map(p => breakIns(p).length));
    for (const p of WINNERS) expect(breakIns(p)).toHaveLength(least);
  });
  it('no store saves a password on the leaked list from the breach', () => {
    const listed = ACCOUNTS.filter(a => LEAKED.includes(a.password)).map(a => a.id);
    for (const s of STORES) {
      const lost = by({ ...best, store: s.id }, 'breach').map(b => b.account);
      for (const id of listed) expect(lost).toContain(id);
    }
  });
  it('the phishing page relays one-time codes, so a second factor never stops it', () => {
    for (const p of PLANS) expect(by(p, 'phish')).toEqual(by(START, 'phish'));
    expect(by(best, 'phish').length).toBeGreaterThan(0);
  });
  it('a second factor stops the guesser; a short staff session stops the cookie thief', () => {
    expect(by({ ...best, builder2fa: 'none' }, 'guesser').length).toBeGreaterThan(0);
    expect(by(best, 'guesser')).toEqual([]);
    expect(by({ ...best, staffSession: 'day' }, 'cookie').length).toBe(1);
    expect(by(best, 'cookie')).toEqual([]);
  });
  it('shorter sessions and a second factor cost friction', () => {
    expect(frictionOf({ ...best, builderSession: 'hour' })).toBeGreaterThan(frictionOf(best));
    expect(frictionOf({ ...best, builder2fa: 'none' })).toBeLessThan(frictionOf(best));
  });
  it('the start loses, and saved states read back into plans', () => {
    expect(wins(START)).toBe(false);
    expect(planKey(benchPlan({}))).toBe(planKey(START));
    expect(benchPlan({ store: 'rot13' as never }).store).toBe(START.store);
    for (const p of WINNERS) expect(wins(benchPlan(p))).toBe(true);
  });
});
