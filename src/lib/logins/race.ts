// The cracking race (KTD3): a pure function of the leaked list, the stored form and the guess rate, so the board at any
// tick is computable and testable. Rates are one benchmark's figures (data/logins/facts.json: one RTX 4090, hashcat
// 6.2.6, October 2022); PBKDF2's is scaled from its 999-iteration figure to the chosen work factor.
// shortcut: a password off the list costs the whole list and then its brute-force space (every string of its length
// over the character kinds it uses). Real attackers guess smarter; the copy labels this a planning estimate.
import { fact } from './facts';
import { ACCOUNTS, LEAKED, type Account } from './store';

export type Form = 'plain' | 'sha256' | 'salted' | 'pbkdf2';
export const FORMS: Form[] = ['plain', 'sha256', 'salted', 'pbkdf2'];
export const FORM_NAME: Record<Form, string> = {
  plain: 'As written',
  sha256: 'SHA-256',
  salted: 'Salted SHA-256',
  pbkdf2: 'Salted PBKDF2',
};
/** PBKDF2 work factors: NIST's 2010 floor, a middle step, OWASP's recommendation. */
export const WORK = [Number(fact('sp800-132').value), 100_000, Number(fact('owasp-pbkdf2').value)];

const SHA = Number(fact('gpu-sha256').value),
  PBKDF2 = Number(fact('gpu-pbkdf2').value),
  PBKDF2_AT = 999;

/** Guesses a second on the benchmark GPU against one stored form. */
export function rateOf(form: Form, work: number): number {
  if (form === 'plain') return Number.POSITIVE_INFINITY;
  return form === 'pbkdf2' ? (PBKDF2 * PBKDF2_AT) / work : SHA;
}

/** Every string of the password's length over the character kinds it uses. */
export function spaceOf(pw: string): number {
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/],
    sizes = [26, 26, 10, 33];
  return kinds.reduce((n, re, i) => n + (re.test(pw) ? sizes[i] : 0), 0) ** pw.length;
}

/** Guesses until a password falls: its place on the leaked list, or the whole list and then its space. */
export const guessesFor = (pw: string) => {
  const i = LEAKED.indexOf(pw);
  return i >= 0 ? i + 1 : LEAKED.length + spaceOf(pw);
};

/** Seconds until an account cracks. Unsalted, one guess checks every account at once; salted, each guess works on
 * one account, so the GPU's rate is shared across them all. */
export function crackSeconds(a: Account, form: Form, work: number, n = ACCOUNTS.length): number {
  if (form === 'plain') return 0;
  return (guessesFor(a.password) * (form === 'sha256' ? 1 : n)) / rateOf(form, work);
}

const DAY = 86_400;
export const TICKS = [
  { label: '1 second', seconds: 1 },
  { label: '1 minute', seconds: 60 },
  { label: '1 hour', seconds: 3_600 },
  { label: '1 day', seconds: DAY },
  { label: '1 week', seconds: 7 * DAY },
  { label: '1 month', seconds: 30 * DAY },
  { label: '1 year', seconds: 365 * DAY },
];
export const LAST = TICKS.length - 1;

/** The board after a tick: the accounts cracked so far (in account order) and the guesses made. */
export function boardAt(form: Form, work: number, tick: number) {
  const t = TICKS[Math.max(0, Math.min(LAST, tick))].seconds;
  return {
    cracked: ACCOUNTS.filter(a => crackSeconds(a, form, work) <= t).map(a => a.id),
    guesses: form === 'plain' ? 0 : rateOf(form, work) * t,
  };
}
