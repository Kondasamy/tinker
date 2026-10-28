// Logins chapter 7's workbench (KTD11): a store for every password, and a second factor and a session length for each
// account type, against four attackers (data/logins/workbench.json, planning numbers):
// - a breach dump, cracked on the benchmark GPU until the breach is found (the race's own maths);
// - a guesser at the sign-in form, held to NIST's 100 failed tries per account;
// - a cookie thief, replaying a stolen staff cookie a few hours later;
// - a phishing page that relays the password and the one-time code in real time, so TOTP never stops it (the fix is a
//   phishing-resistant passkey, a cited fact outside the bench).
// TOTP's secret sits in the same database, so it does not save a cracked password from the breach either.
// WINNERS (fewest break-ins, then least friction) are pinned in data/logins/pinned.json and recomputed by
// tests/unit/logins-workbench.test.ts (KTD10).
import bench from '../../../data/logins/workbench.json' with { type: 'json' };
import pinned from '../../../data/logins/pinned.json' with { type: 'json' };
import { fact } from './facts';
import { ACCOUNTS, TYPES, type TypeId } from './store';
import { crackSeconds, guessesFor, WORK, type Form } from './race';
import { COOKIE_VICTIM } from './story';

export const ATTACKERS = bench.attackers;
export type AttackerId = 'breach' | 'guesser' | 'cookie' | 'phish';
export const SESSIONS = bench.sessions;
export type SessionId = 'hour' | 'day' | 'month';
export type Factor = 'none' | 'totp';
export const FACTORS: Factor[] = ['none', 'totp'];
export const FACTOR_NAME: Record<Factor, string> = { none: 'Password only', totp: 'Password and TOTP code' };

export const STORES: { id: string; name: string; form: Form; work: number }[] = [
  { id: 'plain', name: 'As written', form: 'plain', work: 1 },
  { id: 'sha256', name: 'SHA-256', form: 'sha256', work: 1 },
  { id: 'salted', name: 'Salted SHA-256', form: 'salted', work: 1 },
  ...WORK.map(n => ({
    id: `pbkdf2-${n}`,
    name: `PBKDF2, ${n.toLocaleString('en-GB')} rounds`,
    form: 'pbkdf2' as Form,
    work: n,
  })),
];

export interface Plan {
  store: string;
  builder2fa: Factor;
  builderSession: SessionId;
  staff2fa: Factor;
  staffSession: SessionId;
}
const factorOf = (p: Plan, t: TypeId) => (t === 'builder' ? p.builder2fa : p.staff2fa);
const sessionOf = (p: Plan, t: TypeId) =>
  SESSIONS.find(s => s.id === (t === 'builder' ? p.builderSession : p.staffSession))!;
const storeOf = (p: Plan) => STORES.find(s => s.id === p.store)!;

const LIMIT = Number(fact('nist-rate-limit').value),
  HORIZON = bench.breachDays * 86_400;

export interface BreakIn {
  attacker: AttackerId;
  account: string;
}

/** Every attacker's way in, one per account it reaches. */
export function breakIns(p: Plan): BreakIn[] {
  const st = storeOf(p),
    victim = ACCOUNTS.find(a => a.id === COOKIE_VICTIM)!;
  return [
    ...ACCOUNTS.filter(a => crackSeconds(a, st.form, st.work) <= HORIZON).map(a => ({
      attacker: 'breach' as const,
      account: a.id,
    })),
    ...ACCOUNTS.filter(a => factorOf(p, a.type) === 'none' && guessesFor(a.password) <= LIMIT).map(a => ({
      attacker: 'guesser' as const,
      account: a.id,
    })),
    ...(sessionOf(p, victim.type).hours > bench.cookieHours
      ? [{ attacker: 'cookie' as const, account: victim.id }]
      : []),
    ...bench.phished.map(id => ({ attacker: 'phish' as const, account: id })),
  ];
}

/** Sign-in steps a month across every account: sign-ins for its session length, twice over with a code. */
export const frictionOf = (p: Plan) =>
  ACCOUNTS.reduce((n, a) => n + sessionOf(p, a.type).signIns * (factorOf(p, a.type) === 'totp' ? 2 : 1), 0);

const KEYS = ['store', 'builder2fa', 'builderSession', 'staff2fa', 'staffSession'] as const;
const OPTIONS: Record<(typeof KEYS)[number], readonly string[]> = {
  store: STORES.map(s => s.id),
  builder2fa: FACTORS,
  builderSession: SESSIONS.map(s => s.id),
  staff2fa: FACTORS,
  staffSession: SESSIONS.map(s => s.id),
};
export const PLANS: Plan[] = KEYS.reduce<Plan[]>(
  (ps, k) => ps.flatMap(p => OPTIONS[k].map(v => ({ ...p, [k]: v }))),
  [{} as Plan],
);

/** Fewest break-ins, then least friction, over the whole domain (the test checks the pin). */
export function solve(): Plan[] {
  const least = Math.min(...PLANS.map(p => breakIns(p).length)),
    fewest = PLANS.filter(p => breakIns(p).length === least),
    calm = Math.min(...fewest.map(frictionOf));
  return fewest.filter(p => frictionOf(p) === calm);
}

export const planKey = (p: Plan) => KEYS.map(k => `${k}:${p[k]}`).join(',');
export const WINNERS: Plan[] = pinned.winners.map(k => Object.fromEntries(k.split(',').map(x => x.split(':'))) as Plan);
const WIN = new Set(pinned.winners);
export const wins = (p: Plan) => WIN.has(planKey(p));
export const BEST = { breakIns: breakIns(WINNERS[0] ?? PLANS[0]).length, friction: frictionOf(WINNERS[0] ?? PLANS[0]) };

/** Where the bench starts: passwords as written, no code, month-long sessions. */
export const START: Plan = {
  store: 'plain',
  builder2fa: 'none',
  builderSession: 'month',
  staff2fa: 'none',
  staffSession: 'month',
};
/** The plan in a saved run's state; anything unknown falls back to START's. */
export const benchPlan = (s: Partial<Plan>): Plan =>
  Object.fromEntries(KEYS.map(k => [k, OPTIONS[k].includes(s[k] as string) ? s[k] : START[k]])) as unknown as Plan;

export const typeName = (t: TypeId) => TYPES.find(x => x.id === t)!.name;
