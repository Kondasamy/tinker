// Locks and keys' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
// The pinned item is the module's one-line edge: anyone can close your padlock, only your key opens it, and a
// signature runs the other way.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-a-shared-secret',
  C2 = '02-mixing-paint',
  C3 = '03-the-open-padlock',
  C4 = '04-sealed-with-your-key',
  C5 = '05-a-fingerprint',
  C6 = '06-who-owns-this-padlock',
  C7 = '07-lock-sign-or-both';

export const RECALL: RecallItem[] = [
  {
    id: 'padlock-both-ways',
    chapter: C4,
    pin: true,
    question:
      'A clinic publishes its public key. Which can a stranger do with it, and which needs the clinic’s private key?',
    options: [
      'A stranger can lock a note to the clinic or check its signature; only the private key opens notes or signs',
      'A stranger can open the clinic’s notes; only the private key locks them',
      'Both keys do the same jobs, one is just kept safer',
    ],
    correct: 0,
    why: [
      'Right. Anyone can close the padlock and check a seal; only the private key opens the padlock and makes a seal.',
      'That is backwards: if the public key opened notes, every stranger could read them.',
      'The two keys do opposite halves of the job; that difference is the whole point.',
    ],
  },
  {
    id: 'shared-key-travels',
    chapter: C1,
    question:
      'Two branches share one key for their files and email it across before each sync. What is the weak point?',
    options: [
      'The email: whoever reads it has the key',
      'The files: locking them is easy to undo',
      'Nothing, if the key is long',
    ],
    correct: 0,
    why: [
      'Right: a shared key is only as safe as the route it travels.',
      'Without the key, locked files are noise; the lock itself is not the weak point.',
      'A long key resists guessing, not copying from an email.',
    ],
  },
  {
    id: 'ciphertext-noise',
    chapter: C1,
    question: 'Someone copies a locked backup off the line but has no key. What do they have?',
    options: ['Bytes that look random', 'A blurry version of the files', 'The file names, but not the contents'],
    correct: 0,
    why: [
      'Right: without the key, ciphertext looks like random bytes.',
      'Encryption does not blur; without the key there is no partial picture.',
      'Inside the lock, names are scrambled with everything else.',
    ],
  },
  {
    id: 'one-key-both-jobs',
    chapter: C1,
    question: 'In the first chapter’s crate, which key locked the order and which opened it?',
    options: [
      'The same key did both',
      'A public key locked it, a private one opened it',
      'No key: the crate locked itself',
    ],
    correct: 0,
    why: [
      'Right: with a shared key, one secret does both jobs, which is why it has to travel.',
      'That is the open padlock of chapter 3; a shared key is one key for both.',
      'Every lock needs a key; the question is only how it gets there.',
    ],
  },
  {
    id: 'unmixing-hard',
    chapter: C2,
    question: 'A spy records every number two servers swap while agreeing a key. Why can’t the spy make the same key?',
    options: [
      'Getting a secret back out of a public number takes too long',
      'The servers swapped only fake numbers',
      'The key itself crossed, but scrambled',
    ],
    correct: 0,
    why: [
      'Right: like unmixing paint, working a secret back out of a public number is the hard part.',
      'The numbers are real; they are safe to show because the secrets stay mixed in.',
      'The key never crosses: each side makes it at its own end.',
    ],
  },
  {
    id: 'mix-order',
    chapter: C2,
    question: 'One side adds its secret to the other’s mix; the other does the reverse. Why do they end up the same?',
    options: [
      'Both end with the base and both secrets in it',
      'They compare and copy the one that came out first',
      'They agreed the answer before they started',
    ],
    correct: 0,
    why: [
      'Right: the order of mixing never matters, so both pots hold the same three ingredients.',
      'Nothing secret is compared; they never send the result.',
      'They never met, so there was nothing to agree beforehand.',
    ],
  },
  {
    id: 'eve-mixes-two',
    chapter: C2,
    question: 'The eavesdropper mixes the two public pots she saw. What does she get?',
    options: [
      'The wrong colour: the base twice and no secret of her own to add',
      'The shared colour: she has every ingredient',
      'Nothing: public pots can’t be mixed',
    ],
    correct: 0,
    why: [
      'Right: her mix holds the base twice, so it never matches the shared colour.',
      'Each pot carries the base, so mixing the two doubles it; the shared colour has it once.',
      'She can mix them; it just doesn’t give the shared colour.',
    ],
  },
  {
    id: 'hand-out-padlock',
    chapter: C3,
    question: 'A bank wants customers to send it documents only the bank can read. What does it publish?',
    options: ['Its public key', 'Its private key', 'A password every customer shares'],
    correct: 0,
    why: [
      'Right: customers lock with the public key; only the bank’s private key opens it.',
      'Publishing the private key lets anyone open every document.',
      'A shared password is a shared key: anyone who learns it reads everything.',
    ],
  },
  {
    id: 'sender-cant-open',
    chapter: C3,
    question: 'You lock a file with a colleague’s public key, then lose the original. Can you open your locked copy?',
    options: [
      'No: only their private key opens it',
      'Yes: you locked it, so you can unlock it',
      'Yes, with the same public key',
    ],
    correct: 0,
    why: [
      'Right: snapping a padlock shut does not give you its key.',
      'Closing a padlock and opening it need different keys.',
      'The public key only closes; it can’t open what it closed.',
    ],
  },
  {
    id: 'build-your-own',
    chapter: C3,
    question: 'A developer wants to write their own RSA for a new app, since the maths fits on a page. Good idea?',
    options: [
      'No: use a vetted library; the danger is in details the page leaves out',
      'Yes, if they test that decrypt undoes encrypt',
      'Yes, with numbers as small as the toy’s',
    ],
    correct: 0,
    why: [
      'Right: real key sizes, padding and timing need care that vetted libraries already took.',
      'A round trip that works says nothing about whether an attacker can break it.',
      'Toy numbers can be broken by hand; real keys are thousands of bits.',
    ],
  },
  {
    id: 'signature-proves',
    chapter: C4,
    question:
      'A delivery note arrives with a signature that checks out with the warehouse’s public key. What does that prove?',
    options: [
      'The warehouse signed it and nobody changed it since',
      'Nobody else could read it on the way',
      'The delivery will arrive on time',
    ],
    correct: 0,
    why: [
      'Right: only the private key makes a seal that checks, and any change breaks it.',
      'A signature proves who and what, not secrecy; anyone could read an unlocked note.',
      'A signature vouches for the message, not for what happens next.',
    ],
  },
  {
    id: 'sign-private',
    chapter: C4,
    question: 'Which key does the supplier use to sign its invoice?',
    options: ['Its private key', 'Its public key', 'Larkspur’s public key'],
    correct: 0,
    why: [
      'Right: only the owner can make the seal, and anyone can check it with the public key.',
      'If the public key signed, anyone could forge the supplier’s seal.',
      'Larkspur’s key would lock a message to Larkspur, not prove who wrote it.',
    ],
  },
  {
    id: 'forger-new-seal',
    chapter: C4,
    question: 'A tamperer changes a signed order and wants it to pass. What would she need?',
    options: ['The signer’s private key, to make a new seal', 'The signer’s public key', 'A copy of the old seal'],
    correct: 0,
    why: [
      'Right: a seal that matches the new text needs the private key.',
      'Everyone has the public key; it only checks seals.',
      'The old seal matches the old text, so it fails on the new one.',
    ],
  },
  {
    id: 'hash-compare',
    chapter: C5,
    question: 'A download page lists the file’s SHA-256. What do you do with it?',
    options: ['Hash your download and compare', 'Decode it back into the file', 'Check the file size against it'],
    correct: 0,
    why: [
      'Right: the same bytes always give the same hash, and any change gives another.',
      'A hash runs only one way; there is no file inside it.',
      'A hash is not a size: two files of one size have different hashes.',
    ],
  },
  {
    id: 'avalanche',
    chapter: C5,
    question: 'Two contracts differ by one comma. How alike are their hashes?',
    options: [
      'Unrecognisably different: about half the bits differ',
      'One character apart',
      'The same, as the change is tiny',
    ],
    correct: 0,
    why: [
      'Right: one change anywhere flips about half the fingerprint.',
      'A hash does not change bit for bit with its input; it scrambles the whole.',
      'Any change at all gives a different hash.',
    ],
  },
  {
    id: 'sign-the-hash',
    chapter: C5,
    question: 'Why does a signature seal the message’s hash rather than the whole message?',
    options: [
      'The hash is short and stands for every byte',
      'The hash hides the message',
      'Signing a long text is not allowed',
    ],
    correct: 0,
    why: [
      'Right: a short fingerprint is quick to seal, and any change to the text changes it.',
      'A hash is not a lock: the message itself still travels in the open unless it is locked.',
      'Nothing forbids it; a hash is simply short and stands for the whole.',
    ],
  },
  {
    id: 'cert-name',
    chapter: C6,
    question:
      'A site’s certificate is in date and signed by a trusted root, but names another site. Should a browser trust it?',
    options: ['No: it vouches for someone else', 'Yes: a trusted root signed it', 'Yes, if the page looks right'],
    correct: 0,
    why: [
      'Right: the root vouched for that other name, not for the site you asked for.',
      'The signature is genuine, but it vouches for a different owner.',
      'Anyone can copy how a page looks; the checked name is what counts.',
    ],
  },
  {
    id: 'cert-root',
    chapter: C6,
    question:
      'Why does Larkspur trust a certificate signed by a root it already holds, but not one signed by a lookalike?',
    options: [
      'Only the trusted root’s public key checks the signature',
      'The lookalike’s name is spelled differently',
      'The lookalike’s card is older',
    ],
    correct: 0,
    why: [
      'Right: trust starts from keys you already hold; a stranger’s root proves nothing.',
      'A spelling can be copied exactly; what can’t be copied is the root’s private key.',
      'Dates are a separate check; the lookalike fails at the root.',
    ],
  },
  {
    id: 'cert-expired',
    chapter: C6,
    question: 'An impostor offers a real certificate for the right name, but its dates ended last year. What happens?',
    options: [
      'It fails the date check',
      'It passes: the name and the signature are right',
      'It passes until it is renewed',
    ],
    correct: 0,
    why: [
      'Right: every check must pass, and an expired card fails one.',
      'Each check stands alone; two passing do not cover a third failing.',
      'Out of date means out of date; renewal would be a new card.',
    ],
  },
  {
    id: 'lock-vs-sign',
    chapter: C7,
    question: 'Payroll sends staff their salaries. Which protection does each threat need?',
    options: [
      'Lock it against snoops, sign it against changes: both',
      'Lock it: a locked message can’t be changed',
      'Sign it: a signed message can’t be read',
    ],
    correct: 0,
    why: [
      'Right: a lock hides it, a signature proves it is genuine; salaries need both.',
      'Anyone can close a public padlock, so a lock alone can’t prove who sent it.',
      'A signature proves who wrote it; anyone can still read an unlocked message.',
    ],
  },
  {
    id: 'dont-lock-public',
    chapter: C7,
    question: 'A council posts a road-closure notice for everyone. Lock it, sign it or both?',
    options: ['Sign it only', 'Both', 'Lock it only'],
    correct: 0,
    why: [
      'Right: everyone must read it, so no lock, and a signature stops fake notices.',
      'A lock means one key opens it, and the notice is for everyone.',
      'A lock alone hides it from the public and still lets anyone forge one.',
    ],
  },
  {
    id: 'lock-alone-forgery',
    chapter: C7,
    question: 'A message is locked with Larkspur’s public key but not signed. Can an impostor send a fake one?',
    options: ['Yes: anyone can close Larkspur’s padlock', 'No: it is locked', 'Only if they know the old message'],
    correct: 0,
    why: [
      'Right: the padlock is public, so a lock says nothing about who sent the message.',
      'Locked means hidden, not genuine: anyone can lock a fake with the same padlock.',
      'The impostor writes their own message; they never need the old one.',
    ],
  },
];
