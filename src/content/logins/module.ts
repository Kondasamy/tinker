// Logins and passwords: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one. Names come from the data (data/logins/).
import type { Chapter, Module } from '../../lib/modules';
import { ACCOUNTS, accountOf, firstName } from '../../lib/logins/store';
import { COMPANY, COOKIE_VICTIM, GUILD } from '../../lib/logins/story';
import { RECALL } from './recall';

/** The two accounts that chose the same password (chapter 3). */
export const TWINS = ACCOUNTS.filter(a => ACCOUNTS.some(b => b !== a && b.password === a.password));
const [A, B] = TWINS.map(firstName);
const JO = firstName(accountOf(COOKIE_VICTIM));

const CHAPTERS: Chapter[] = [
  {
    id: '01-the-sticky-note',
    title: 'The sticky note',
    short: 'Sticky note',
    intro: {
      story: `${COMPANY} opens trade accounts for its builders. The first build keeps every password in a table, just as it was typed.`,
      goal: 'What does a thief get when that table leaks?',
      learn: ['A stored table can leak', 'Passwords kept as written leak whole', 'People reuse passwords elsewhere'],
      terms: [
        ['Password', 'A secret only you should know, typed to prove an account is yours.'],
        ['Breach', 'When an attacker copies the data a site has stored.'],
      ],
    },
  },
  {
    id: '02-a-one-way-fingerprint',
    title: 'A one-way fingerprint',
    short: 'Hashing',
    intro: {
      story:
        'After the scare, the table keeps a fingerprint of each password instead. Sign-in fingerprints what you type and compares.',
      goal: 'Can a thief turn stolen fingerprints back into passwords?',
      learn: ['A hash runs one way', 'Attackers hash guesses and compare', 'Common passwords fall first'],
      terms: [
        [
          'Hash',
          'A fixed-size fingerprint of any text; the same text always gives the same one, and it can’t be reversed.',
        ],
        ['Leaked list', 'Passwords from past breaches, in the order people pick them; attackers try these first.'],
        ['Cracking', 'Finding a password by hashing guesses until one matches the stored fingerprint.'],
      ],
    },
  },
  {
    id: '03-a-pinch-of-salt',
    title: 'A pinch of salt',
    short: 'Salt',
    intro: {
      story: `${A} and ${B} chose the same password. In the table their fingerprints are identical, so one guess cracks both.`,
      goal: 'How does a pinch of salt keep two equal passwords apart?',
      learn: [
        'A salt is random, one per account',
        'Same password, different fingerprints',
        'Each guess now tests one account',
      ],
      terms: [['Salt', 'A random value kept beside each account and mixed into its password before hashing.']],
    },
  },
  {
    id: '04-slow-on-purpose',
    title: 'Slow on purpose',
    short: 'Slow hash',
    intro: {
      story:
        'Salted SHA-256 is still fast: one graphics card tries billions of guesses a second. The team makes every guess cost more.',
      goal: 'How much does a slow hash help, and what can’t it save?',
      learn: ['PBKDF2 hashes again and again', 'The work factor sets how slow', 'A leaked password falls anyway'],
      terms: [
        ['PBKDF2', 'A slow hash: it runs a salted hash many times over, so every guess costs that many rounds.'],
        ['Work factor', 'How many rounds a slow hash runs; more rounds, slower guessing.'],
      ],
    },
  },
  {
    id: '05-the-cloakroom-ticket',
    title: 'The cloakroom ticket',
    short: 'Cookies',
    intro: {
      story:
        'Typing a password on every page would drive builders away. After sign-in, the site hands the browser a ticket, like a cloakroom’s.',
      goal: `What proves it is ${JO} after sign-in, and what if someone copies it?`,
      learn: [
        'A session cookie stands in for the password',
        'Whoever shows it gets in',
        'Signing out makes the site forget it',
      ],
      terms: [
        [
          'Session cookie',
          'A random ticket the site gives your browser after sign-in; the browser shows it on every request.',
        ],
        ['Session', 'How long a session cookie stays good: from sign-in to sign-out or expiry.'],
        ['HttpOnly', 'A cookie setting that hides the cookie from scripts running on the page.'],
      ],
    },
  },
  {
    id: '06-sign-in-with-another-site',
    title: 'Sign in with another site',
    short: 'Sign in with',
    intro: {
      story: `Builders want to sign in with their ${GUILD.name} account. ${COMPANY.split(' ')[0]} never sees that password; the ${GUILD.short} vouches instead.`,
      goal: 'How does another site vouch for you, and what stops a thief faking it?',
      learn: [
        'A trip to the other site, a code and a signed token',
        'State and PKCE tie the code to you',
        'Check the signature and the audience',
      ],
      terms: [
        ['State', 'A random value sent out with the sign-in and checked when the browser comes back.'],
        ['PKCE', 'Proof Key for Code Exchange: only the site holding a secret verifier can swap the code.'],
        ['Authorisation code', 'A short-lived code the other site sends back, to swap for a token.'],
        ['ID token', 'A signed note from the other site: who signed in, and for which site.'],
        ['Audience', 'The part of an ID token that names the site it was made for.'],
      ],
    },
  },
  {
    id: '07-guard-every-account',
    title: 'Guard every account',
    short: 'Workbench',
    intro: {
      story: `${COMPANY.split(' ')[0]} has builders and staff, and four attackers wait: a breach, a guesser, a cookie thief and a phishing page.`,
      goal: 'Which store, second factor and session length lose the fewest accounts?',
      learn: ['Each defence stops a different attacker', 'Friction is a real cost', 'Phishing needs a different tool'],
      terms: [
        ['Second factor', 'Something besides the password; here a TOTP code from a phone app.'],
        ['TOTP', 'A time-based one-time password: a six-digit code from a shared secret and the clock.'],
        ['Phishing', 'A lookalike page that collects what you type and passes it on.'],
      ],
    },
  },
];

export const LOGINS_MODULE: Module = {
  id: 'logins',
  title: 'Logins and passwords',
  description:
    'How a site knows it is you: hashed and salted passwords, a session cookie, and signing in with another site.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['encryption'],
  story: `${COMPANY} opens trade accounts for its builders; the team learns a site never keeps your password, only a slow, salted fingerprint of it, and after sign-in a cookie is the key.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
