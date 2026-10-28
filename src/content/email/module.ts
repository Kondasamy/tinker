// How email arrives: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-envelope-and-letter',
    title: 'An envelope and a letter',
    short: 'Envelope',
    intro: {
      story:
        'Larkspur emails every customer an order confirmation. Hollis Builders says theirs land in junk, while a fake Larkspur invoice reached their inbox.',
      goal: 'What does a mail server read, and what does a person read?',
      learn: [
        'The envelope is what servers deliver by',
        'The headers are what your mail app shows',
        'Nothing makes the two match',
      ],
      terms: [
        ['Envelope', 'The sender and recipient addresses mail servers deliver by, kept apart from the letter.'],
        ['Header', 'A line at the top of the letter, like From or Subject, that your mail app shows.'],
      ],
    },
  },
  {
    id: '02-who-takes-it-next',
    title: 'Who takes it next',
    short: 'Hops',
    intro: {
      story:
        'The confirmation left Larkspur’s app and reached Hollis’s mailbox. On the way, servers handed it on, and each one stamped it.',
      goal: 'Which servers carried the message, and in what order?',
      learn: [
        'An MX record names the server that takes a domain’s mail',
        'Each server adds a postmark on top',
        'Read bottom-up, the postmarks give the route',
      ],
      terms: [
        [
          'Postmark',
          'A Received header: each server that takes the message adds one on top, with its name and the time.',
        ],
        ['Hop', 'One handover from one mail server to the next.'],
        ['MX record', 'The DNS record naming the server that accepts mail for a domain.'],
      ],
    },
  },
  {
    id: '03-anyone-can-write-from',
    title: 'Anyone can write From',
    short: 'Forged From',
    intro: {
      story: 'A Hollis clerk nearly paid a Larkspur invoice into a new bank account. Larkspur never sent it.',
      goal: 'How can a stranger send mail that says it is from Larkspur?',
      learn: [
        'SMTP takes any From line the sender writes',
        'A fake can look exactly like the real thing',
        'Its envelope and postmarks still show where it started',
      ],
      terms: [
        ['SMTP', 'The protocol mail servers speak to hand a message on.'],
        ['Spoofing', 'Writing someone else’s address in a message’s From line.'],
      ],
    },
  },
  {
    id: '04-allowed-senders',
    title: 'The list of allowed senders',
    short: 'SPF',
    intro: {
      story: 'Larkspur decides to publish, in DNS, which servers may send its mail, so receivers can check.',
      goal: 'Does a list of allowed senders stop the fake invoice?',
      learn: [
        'SPF lists the servers allowed to send for a domain',
        'It checks the envelope’s domain, not the From line',
        'A forger with its own domain passes its own SPF',
      ],
      terms: [
        ['SPF', 'A DNS record listing the servers allowed to send mail for a domain.'],
        ['Include', 'Part of an SPF record that adds another domain’s list, such as a mail vendor’s.'],
      ],
    },
  },
  {
    id: '05-a-seal-on-the-letter',
    title: 'A seal on the letter',
    short: 'DKIM',
    intro: {
      story:
        'SPF vouches for the server, never the words, and a message could be changed on the way. Larkspur now seals what it sends.',
      goal: 'Can a seal show that nobody changed the message?',
      learn: [
        'DKIM signs chosen headers and the body',
        'The public key sits in the sender’s DNS',
        'One changed character fails; extra spaces don’t',
      ],
      terms: [
        ['DKIM', 'A signature over a message’s headers and body, checked with a public key from the sender’s DNS.'],
        [
          'Relaxed',
          'DKIM’s tidy-up before checking: runs of spaces become one, so harmless re-spacing doesn’t break the seal.',
        ],
      ],
    },
  },
  {
    id: '06-what-to-do-with-a-failure',
    title: 'What to do with a failure',
    short: 'DMARC',
    intro: {
      story:
        'SPF and DKIM both run now, yet the fake invoice still passes SPF, for its own domain, and lands in the inbox.',
      goal: 'How does a receiver know which pass speaks for the From line?',
      learn: [
        'DMARC wants a pass whose domain matches From',
        'The policy says none, quarantine or reject',
        'Forwarding breaks SPF; the DKIM seal survives',
      ],
      terms: [
        ['DMARC', 'A DNS record telling receivers what to do when no pass matches the From line’s domain.'],
        ['Alignment', 'A pass counts for DMARC only when its domain matches the From line’s.'],
        ['Spam score', 'The filter’s chance that a message is junk, read from the words in it.'],
      ],
    },
  },
  {
    id: '07-mail-records',
    title: 'Set the mail records',
    short: 'Mail records',
    intro: {
      story:
        'Tomorrow brings a normal day of Larkspur mail: confirmations, invoices, a forward, the newsletter, and two kinds of fake.',
      goal: 'Which records deliver every real message and stop every fake?',
      learn: [
        'Each real route needs a pass that aligns',
        'Reject stops fakes; quarantine only hides them',
        'Why ~all and -all tie once DMARC rejects',
      ],
      terms: [['Workbench', 'Every record at once, run over a whole day of mail, checked against the owner’s rule.']],
    },
  },
];

export const EMAIL_MODULE: Module = {
  id: 'email',
  title: 'How email arrives',
  description:
    'How a message crosses the internet: mail servers that pass it on, SPF and DKIM that vouch for it, and spam.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['web-requests'],
  story:
    'Larkspur Supply Co.’s order confirmations land in junk while a fake Larkspur invoice reaches a customer’s inbox; the team learns that anyone can write any From line, and SPF, DKIM and DMARC are how the receiver checks it.',
  chapters: CHAPTERS,
  recall: RECALL,
};
