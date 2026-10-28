// Logins and passwords' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
// The pinned item is the module's edge: a site never keeps your password, only a slow, salted fingerprint of it.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-the-sticky-note',
  C2 = '02-a-one-way-fingerprint',
  C3 = '03-a-pinch-of-salt',
  C4 = '04-slow-on-purpose',
  C5 = '05-the-cloakroom-ticket',
  C6 = '06-sign-in-with-another-site',
  C7 = '07-guard-every-account';

export const RECALL: RecallItem[] = [
  {
    id: 'keep-a-slow-salted-fingerprint',
    chapter: C4,
    pin: true,
    question: 'A library builds sign-in for its members. What should it keep of each password?',
    options: [
      'A slow, salted fingerprint, never the password',
      'The password, locked with a key the library keeps',
      'A plain SHA-256 fingerprint',
    ],
    correct: 0,
    why: [
      'Right: a slow, salted fingerprint can be checked at sign-in, and every guess against it is slow.',
      'Whoever steals the table may steal the key too, and then every password reads in the clear.',
      'A fast fingerprint lets one graphics card test billions of guesses a second.',
    ],
  },
  {
    id: 'plain-table-reuse',
    chapter: C1,
    question: 'A forum stored passwords as typed, and its table leaked. What should its members do first?',
    options: [
      'Change that password everywhere they used it',
      'Nothing, if they never post on the forum again',
      'Change only their forum password',
    ],
    correct: 0,
    why: [
      'Right: the thief can read the password and will try it on other sites.',
      'The thief already has the password; leaving the forum doesn’t take it back.',
      'The same password still opens every other site where it was reused.',
    ],
  },
  {
    id: 'plain-table-who-reads',
    chapter: C1,
    question: 'A shop keeps passwords as typed. Who besides a thief could read them?',
    options: [
      'Anyone with access to the database, like staff or a backup',
      'Nobody: only the sign-in page sees the table',
      'Only the shop’s owner',
    ],
    correct: 0,
    why: [
      'Right: every copy of the table, every backup and every admin can read every password.',
      'The table lives in a database, and databases get copied, backed up and browsed.',
      'Anyone with database access, not just the owner, sees the same readable table.',
    ],
  },
  {
    id: 'plain-table-breach-size',
    chapter: C1,
    question: 'A breach copies a table of 5,000 passwords kept as typed. How many can the thief read?',
    options: ['All 5,000, at once', 'Only the short ones', 'None until she cracks them'],
    correct: 0,
    why: [
      'Right: nothing stands between the copy and the passwords.',
      'Length only matters when there is something to crack; here there is nothing.',
      'There is nothing to crack: each password is right there as typed.',
    ],
  },
  {
    id: 'hash-guess-forwards',
    chapter: C2,
    question: 'A thief has a table of unsalted SHA-256 fingerprints. How does she find the passwords?',
    options: [
      'Hash likely passwords and look for matching fingerprints',
      'Run SHA-256 backwards on each fingerprint',
      'She can’t: hashed passwords are safe',
    ],
    correct: 0,
    why: [
      'Right: a hash only runs forwards, so she runs guesses forwards and compares.',
      'There is no backwards: that is what one-way means.',
      'One way is not the same as safe; guessing forwards is fast.',
    ],
  },
  {
    id: 'hash-common-first',
    chapter: C2,
    question: 'Which password falls first when a fingerprint table leaks?',
    options: ['qwerty123', 'A 20-letter phrase nobody has used', 'Every one falls at the same speed'],
    correct: 0,
    why: [
      'Right: it is on every leaked list, so it is among the first guesses.',
      'No list holds it, and there are far too many such phrases to try them all.',
      'Guesses come in order, most common first, so common passwords fall first.',
    ],
  },
  {
    id: 'hash-compare-signin',
    chapter: C2,
    question: 'A site keeps only fingerprints. How does it check a password at sign-in?',
    options: [
      'It fingerprints what you type and compares',
      'It turns the stored fingerprint back into the password',
      'It sends the fingerprint to your browser to check',
    ],
    correct: 0,
    why: [
      'Right: the same password always gives the same fingerprint.',
      'A fingerprint can’t be turned back; the site never needs to.',
      'The check runs on the site; the browser never sees the table.',
    ],
  },
  {
    id: 'salt-twins',
    chapter: C3,
    question: 'Two staff at a bank pick the same password. With salt, what does a thief see?',
    options: ['Two different fingerprints', 'Two matching fingerprints', 'No fingerprints at all'],
    correct: 0,
    why: [
      'Right: each account’s own salt changes its fingerprint.',
      'That is what happens without salt, and it gives away the shared password.',
      'The table still holds a fingerprint per account, now each with its salt.',
    ],
  },
  {
    id: 'salt-not-secret',
    chapter: C3,
    question: 'The salts leak along with the fingerprints. Is the salt now useless?',
    options: [
      'No: each guess still has to be tried account by account',
      'Yes: a salt only works while it is secret',
      'Yes: the thief can now reverse the fingerprints',
    ],
    correct: 0,
    why: [
      'Right: salts are stored beside the fingerprint on purpose; they work without being secret.',
      'A salt is never meant to be secret; its job is to make each account’s fingerprint different.',
      'Knowing the salt reverses nothing; she still has to guess.',
    ],
  },
  {
    id: 'salt-common-still',
    chapter: C3,
    question: 'Salt is added to every account. Does a password on a leaked list become safe?',
    options: [
      'No: it is still among the first guesses',
      'Yes: salted fingerprints match no list',
      'Yes, once the salt is long enough',
    ],
    correct: 0,
    why: [
      'Right: the thief salts each guess with that account’s salt and it falls just as early.',
      'She adds the account’s salt to each guess, so the list still matches.',
      'Salt length doesn’t change how few guesses a common password needs.',
    ],
  },
  {
    id: 'slow-what-it-buys',
    chapter: C4,
    question: 'A site raises its work factor tenfold. What changes for a thief with the table?',
    options: [
      'Every guess costs ten times as much',
      'Every password becomes uncrackable',
      'Nothing: the work factor only slows sign-in',
    ],
    correct: 0,
    why: [
      'Right: she has to run every round for every guess, just as the site does.',
      'Common passwords need so few guesses that ten times slower is still quick.',
      'The rounds that slow sign-in slow every guess the thief makes, too.',
    ],
  },
  {
    id: 'slow-leaked-fix',
    chapter: C4,
    question: 'How do you protect a member whose chosen password is on a leaked list?',
    options: [
      'Refuse it when they choose it, and ask for another',
      'Raise the work factor until it is safe',
      'Add a second salt',
    ],
    correct: 0,
    why: [
      'Right: a password the thief tries first should never reach the table.',
      'A listed password needs only a handful of guesses, which stays quick at any work factor.',
      'Salt changes the fingerprint, not how early the thief guesses that password.',
    ],
  },
  {
    id: 'cookie-is-key',
    chapter: C5,
    question: 'A café laptop leaks your session cookie for a webmail site. What can the thief do?',
    options: [
      'Read your mail as you, until the session ends',
      'Nothing without your password',
      'Only see that you have an account',
    ],
    correct: 0,
    why: [
      'Right: after sign-in the cookie is the key; the site checks the ticket, not the person.',
      'The password was checked once, at sign-in; the cookie stands in for it since.',
      'The cookie is a full ticket to the account, not a name tag.',
    ],
  },
  {
    id: 'cookie-short-session',
    chapter: C5,
    question: 'Why might a bank end your session after ten idle minutes?',
    options: [
      'A stolen cookie stops working sooner',
      'To make the password harder to crack',
      'To save space on the bank’s servers',
    ],
    correct: 0,
    why: [
      'Right: a short session shrinks the window in which a copied ticket still works.',
      'The session length doesn’t touch how the password is stored.',
      'The point is the stolen ticket, not the storage.',
    ],
  },
  {
    id: 'cookie-httponly',
    chapter: C5,
    question: 'What does marking a session cookie HttpOnly stop?',
    options: [
      'Scripts on the page reading the cookie',
      'The cookie being sent over the network',
      'Thieves copying it from the laptop’s disk',
    ],
    correct: 0,
    why: [
      'Right: the browser keeps it from page scripts, so an injected script can’t steal it.',
      'It is still sent with every request; Secure is the flag about encrypted connections.',
      'Malware on the laptop can still copy it; HttpOnly is about page scripts.',
    ],
  },
  {
    id: 'oidc-never-sees',
    chapter: C6,
    question: 'You sign in to a recipe site with your email provider. Does the recipe site see your email password?',
    options: [
      'No: it gets a signed token saying who you are',
      'Yes: it passes the password on to check it',
      'Yes, but only its fingerprint',
    ],
    correct: 0,
    why: [
      'Right: you type the password at the provider, which vouches for you with a signed token.',
      'The password never leaves the provider’s page; that is the point of the redirect.',
      'It sees no part of the password, not even a fingerprint.',
    ],
  },
  {
    id: 'oidc-pkce',
    chapter: C6,
    question: 'A phone app’s sign-in code is grabbed by another app on the phone. What stops it being used?',
    options: [
      'PKCE: the code only works with the verifier the real app kept',
      'The state: it is checked on the code’s way back',
      'Nothing: whoever holds the code is signed in',
    ],
    correct: 0,
    why: [
      'Right: the code swaps for a token only alongside the secret whose hash went out at the start.',
      'The state stops a forged return; it doesn’t stop someone else redeeming a stolen code.',
      'Without PKCE that would be true; with it, the code alone is useless.',
    ],
  },
  {
    id: 'oidc-audience',
    chapter: C6,
    question: 'A site receives a correctly signed ID token whose audience is another app. What should it do?',
    options: ['Refuse it', 'Accept it: the signature is good', 'Accept it if it hasn’t expired'],
    correct: 0,
    why: [
      'Right: it was made for another app, so it is not a sign-in to this site.',
      'A good signature proves who issued it, not who it was for.',
      'Fresh or not, it still names the wrong site.',
    ],
  },
  {
    id: 'bench-totp-guesser',
    chapter: C7,
    question: 'Attackers try leaked passwords at a sign-in form. Which defence stops them?',
    options: ['A second factor, like a TOTP code', 'A slower password hash', 'A shorter session'],
    correct: 0,
    why: [
      'Right: a right password alone no longer gets them in.',
      'The hash protects a stolen table; at the form, the site checks every guess for them.',
      'Sessions matter after sign-in; these attackers never get that far.',
    ],
  },
  {
    id: 'bench-totp-phish',
    chapter: C7,
    question: 'A lookalike page asks for a password and then the code from your phone. Does the code save you?',
    options: [
      'No: the page passes the code on before it expires',
      'Yes: the code changes every 30 seconds',
      'Yes: the code only works on your phone',
    ],
    correct: 0,
    why: [
      'Right: the page relays it in real time, well inside its 30 seconds.',
      'Thirty seconds is plenty for a page relaying codes as they are typed.',
      'The code is just six digits; anyone who has it can type it in.',
    ],
  },
  {
    id: 'bench-friction',
    chapter: C7,
    question: 'Why not give every account a one-hour session and a code at every sign-in?',
    options: [
      'Friction: people sign in far more, and some give up',
      'It would weaken the password hash',
      'Codes stop working if used too often',
    ],
    correct: 0,
    why: [
      'Right: each defence has a cost, so match it to who the attackers target.',
      'Sessions and codes don’t touch how the password is stored.',
      'A code works every time it is fresh; the cost is the person typing it.',
    ],
  },
];
