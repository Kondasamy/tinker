// Locks and keys: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one. Names come from the data (data/encryption/story.json).
import type { Chapter, Module } from '../../lib/modules';
import { COMPANY, SUPPLIER } from '../../lib/encryption/story';
import { RECALL } from './recall';

const SHORT = SUPPLIER.short;

const CHAPTERS: Chapter[] = [
  {
    id: '01-a-shared-secret',
    title: 'A shared secret',
    short: 'Shared key',
    intro: {
      story: `${COMPANY} wants hinges from ${SUPPLIER.name}, a supplier it has never met. Every message crosses an open line.`,
      goal: 'How do you lock a message, and how does the key get there?',
      learn: [
        'One key locks and opens',
        'A locked message is noise to anyone else',
        'Sending the key sends the secret',
      ],
      terms: [
        ['Encryption', 'Turning a message into noise that only the right key turns back.'],
        ['Key', 'The secret that locks and opens a message; here one key does both.'],
        ['Ciphertext', 'The locked message: to anyone without the key it looks like random bytes.'],
      ],
    },
  },
  {
    id: '02-mixing-paint',
    title: 'Mixing paint',
    short: 'Paint',
    intro: {
      story: 'Sending the key lets anyone copy it. What if both ends could make the same key without it ever crossing?',
      goal: 'How can two strangers agree on a secret over an open line?',
      learn: [
        'Each side mixes its secret into a public base',
        'Swap the mixes, then add your secret again',
        'Unmixing is the hard part',
      ],
      terms: [
        [
          'Diffie–Hellman',
          'Each side mixes a secret into a public number, they swap, and both reach the same shared secret.',
        ],
        ['Public number', 'A mix anyone may see: the base with one side’s secret in it.'],
        ['Shared secret', 'The number both sides reach and the eavesdropper can’t.'],
      ],
    },
  },
  {
    id: '03-the-open-padlock',
    title: 'The open padlock',
    short: 'Padlock',
    intro: {
      story: `Mixing needs both ends online at once. ${SHORT} has a better idea: hand open padlocks to anyone who asks.`,
      goal: 'How can anyone lock a message that only one side can open?',
      learn: ['Anyone can close an open padlock', 'Only the private key opens it', 'Real keys are huge'],
      terms: [
        ['Public key', 'The open padlock: anyone may have it and snap it shut.'],
        ['Private key', 'The one key that opens the padlock; it never leaves its owner.'],
        ['RSA', 'A public-key method where locking and opening are powers of a number, mod n.'],
        ['Mod n', 'Divide by n and keep only the remainder, so every number stays below n.'],
      ],
    },
  },
  {
    id: '04-sealed-with-your-key',
    title: 'Sealed with your key',
    short: 'Signatures',
    intro: {
      story: `${SHORT}’s invoice arrives with bank details. Anyone can close its padlock, so who really wrote this?`,
      goal: 'How does a signature prove who wrote a message, and that nobody changed it?',
      learn: ['Sign with the private key', 'Anyone checks with the public key', 'One changed byte breaks the seal'],
      terms: [
        ['Signature', 'A seal only the private key can make, and anyone can check with the public key.'],
        ['Verify', 'Check a signature against the message and the signer’s public key.'],
      ],
    },
  },
  {
    id: '05-a-fingerprint',
    title: 'A fingerprint',
    short: 'Hashes',
    intro: {
      story: 'The toy seal signed one number made from the whole invoice. That number is a fingerprint.',
      goal: 'What is a hash, and why does one changed character change all of it?',
      learn: [
        'A hash is a short fingerprint of any message',
        'One changed character flips about half its bits',
        'You can’t run a hash backwards',
      ],
      terms: [
        ['Hash', 'A fixed-size fingerprint of any message; the same message always gives the same one.'],
        ['SHA-256', 'A hash whose fingerprint is 256 bits, written as 64 hex characters (0–9 and a–f).'],
      ],
    },
  },
  {
    id: '06-who-owns-this-padlock',
    title: 'Who owns this padlock?',
    short: 'Certificates',
    intro: {
      story: `An impostor could hand out padlocks in ${SHORT}’s name. Larkspur needs proof this padlock belongs to ${SUPPLIER.domain}.`,
      goal: 'How does a certificate prove who owns a public key?',
      learn: [
        'A certificate ties a name to a public key',
        'Someone you already trust signs it',
        'Check the root, the signature, the name and the dates',
      ],
      terms: [
        ['Certificate', 'A card naming the owner of a public key, signed by someone you already trust.'],
        ['Certificate authority', 'Who signs certificates, after checking the name belongs to the asker.'],
        ['Root', 'A certificate authority your computer trusts from the start.'],
      ],
    },
  },
  {
    id: '07-lock-sign-or-both',
    title: 'Lock, sign or both',
    short: 'Workbench',
    intro: {
      story: `${SHORT} is a trusted supplier now. Four of its messages cross the line, and three attackers wait on it.`,
      goal: 'Which messages need a lock, which a signature, and which both?',
      learn: ['Lock what must stay secret', 'Sign what must be genuine', 'Never lock what everyone must read'],
      terms: [['Attacker', 'Anyone on the line: one reads, one changes, one pretends to be the supplier.']],
    },
  },
];

export const ENCRYPTION_MODULE: Module = {
  id: 'encryption',
  title: 'Locks and keys',
  description:
    'How a stranger can send you a secret: a shared key, mixing paint, an open padlock anyone can close, signatures and the certificates that say whose they are.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story: `${COMPANY} orders from ${SUPPLIER.name}, a supplier it has never met; the team learns that anyone can close your padlock, only your key opens it, and a signature runs the other way.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
