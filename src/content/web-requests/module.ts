// Opening a web page: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one. Customers' names and towns come from data/web-requests/customers.json (R17).
import type { Chapter, Module } from '../../lib/modules';
import { SITE, customerOf } from '../../lib/web-requests/sim';
import { RECALL } from './recall';

const INES = customerOf('ines'),
  TOMAS = customerOf('tomas'),
  WEN = customerOf('wen');

const CHAPTERS: Chapter[] = [
  {
    id: '01-a-name-to-a-number',
    title: 'A name to a number',
    short: 'A name to a number',
    intro: {
      story: `${INES.name} in ${INES.town} opens Larkspur’s shop for the first time. Her browser knows the name, ${SITE}, but not where the shop is.`,
      goal: 'How does a browser turn a name into an address?',
      learn: [
        'DNS finds a name’s address, office by office',
        'Each office points to the next: a referral',
        'Every office asked is a round trip',
      ],
      terms: [
        ['IP address', 'The number that says where a computer is on the internet, like 203.0.113.10.'],
        ['DNS', 'The Domain Name System: the internet’s directory, which turns names into IP addresses.'],
        ['Resolver', 'The helper near you that asks DNS on your browser’s behalf and keeps the answers.'],
        ['Referral', 'An office’s reply that it doesn’t know the answer, but knows which office does.'],
      ],
    },
  },
  {
    id: '02-the-remembered-answer',
    title: 'The remembered answer',
    short: 'Remembered answer',
    intro: {
      story: `${TOMAS.name} in ${TOMAS.town} was on the shop ${TOMAS.lastVisitMin} minutes ago. His resolver may still remember where the shop is.`,
      goal: 'How long should an answer be remembered?',
      learn: [
        'A TTL says how long an answer may be kept',
        'A remembered answer skips the directory',
        'A long TTL keeps old addresses alive after a move',
      ],
      terms: [
        ['Cache', 'A store of answers already fetched, kept so the next request needn’t ask again.'],
        ['TTL', 'Time to live: how long a resolver may keep an answer before it must ask again.'],
      ],
    },
  },
  {
    id: '03-hello-hello-ready',
    title: 'Hello, hello, ready',
    short: 'Hello, hello, ready',
    intro: {
      story: 'The browser has the shop’s address. Before it can ask for the page, it has to open a line to the shop.',
      goal: 'What does opening a connection cost, and why does distance matter?',
      learn: [
        'TCP opens a connection with a handshake',
        'A handshake costs a round trip before any data',
        'Distance multiplies every round trip',
      ],
      terms: [
        ['TCP', 'The rules computers use to send data reliably, in order, over an open connection.'],
        ['Handshake', 'Messages two computers swap to set up a connection before any real data flows.'],
        ['Round trip', 'A message’s journey to the other side and the reply’s journey back.'],
      ],
    },
  },
  {
    id: '04-lost-in-the-post',
    title: 'Lost in the post',
    short: 'Lost in the post',
    intro: {
      story: `${WEN.name} in ${WEN.town} lives ${WEN.km.toLocaleString('en-US')} km from the shop, on a line that now and then loses a packet.`,
      goal: 'What does one lost packet cost?',
      learn: [
        'A lost packet is noticed only by a missing reply',
        'At worst it waits a timeout, then goes again',
        'Why one loss can cost more than every round trip',
      ],
      terms: [
        ['Packet', 'One small piece of data sent across the network on its own.'],
        ['Timeout', 'How long a sender waits for a reply before deciding the packet was lost.'],
      ],
    },
  },
  {
    id: '05-the-sealed-envelope',
    title: 'The sealed envelope',
    short: 'The sealed envelope',
    intro: {
      story: 'The line is open, but anyone along the way could read it. Larkspur’s page carries prices and orders.',
      goal: 'What does HTTPS add, what does it cost, and what does the padlock prove?',
      learn: [
        'TLS seals the line and checks the shop’s certificate',
        'Resuming a session saves a round trip, for safe requests only',
        'What the padlock proves, and what it doesn’t',
      ],
      terms: [
        ['TLS', 'Transport Layer Security: it encrypts the line and proves the server’s name.'],
        ['Certificate', 'A signed card that ties the shop’s name to its key.'],
        ['Certificate authority', 'The seal office: a body browsers trust to sign certificates.'],
        ['Session resumption', 'Reusing keys from an earlier visit, so a returning browser can start sooner.'],
        ['0-RTT', 'Zero round trips: a resumed browser sends its request with its very first message.'],
      ],
    },
  },
  {
    id: '06-one-line-many-files',
    title: 'One line, many files',
    short: 'One line, many files',
    intro: {
      story: 'The page arrives and names more files: styles, a script, a logo, two photos. Each one needs asking for.',
      goal: 'How do HTTP/1.1, 2 and 3 fetch many files, and what does a loss do to each?',
      learn: [
        'HTTP/1.1 asks one file at a time per connection',
        'HTTP/2 sends them all on one connection',
        'HTTP/3 keeps one loss from stalling the rest',
      ],
      terms: [
        ['HTTP', 'The language a browser and a site use to ask for and send files.'],
        ['Stream', 'One request and its reply, sharing a connection with others.'],
        ['Head-of-line blocking', 'A lost packet holding back everything behind it on the same connection.'],
        ['QUIC', 'The transport HTTP/3 runs on: one handshake for connection and seal, a loss per stream.'],
      ],
    },
  },
  {
    id: '07-make-it-fast',
    title: 'Make the page fast for everyone',
    short: 'Make it fast',
    intro: {
      story:
        'Everything is on the bench: the DNS TTL, the HTTP version and resumption. The owner has set a budget for every customer.',
      goal: 'Which settings get every customer’s page in on time, and let a move be found?',
      learn: [
        'How the round trips add up per customer',
        'Why the farthest customer decides',
        'Why more than one setting can work',
      ],
      terms: [['Budget', 'The longest the owner lets any customer’s page take.']],
    },
  },
];

export const WEB_REQUESTS_MODULE: Module = {
  id: 'web-requests',
  title: 'Opening a web page',
  description: 'What happens between a click and a page: DNS, handshakes, a lost packet, the padlock and HTTP/3.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s customers open its shop from near and far; the team follows each round trip from the name to the last photo, and makes the page fast for all of them.',
  chapters: CHAPTERS,
  recall: RECALL,
};
