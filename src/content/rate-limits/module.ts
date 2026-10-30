// Rate limits: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-too-many-at-once',
    title: 'Too many at once',
    short: 'Too many',
    intro: {
      story:
        'Sale day at Larkspur Supply Co. Partners’ programs ask the stock API for prices all morning. Then Quickfix Depot’s script goes wrong and never stops.',
      goal: 'What happens to everyone when one partner floods the API?',
      learn: [
        'A server answers only so many a second',
        'Past that, it fails for everyone',
        'Why one client can hurt the rest',
      ],
      terms: [
        ['API', 'The door other programs send requests to: here, Larkspur’s stock lookups.'],
        ['Capacity', 'How many requests the server can answer in a second before it falls over.'],
      ],
    },
  },
  {
    id: '02-count-per-minute',
    title: 'Count per minute',
    short: 'Per minute',
    intro: {
      story:
        'The team adds a limit: Quickfix may send 40 requests a minute. A counter at the door tops the barrel up to 40 as each minute starts.',
      goal: 'Can a per-minute count still let a burst through?',
      learn: [
        'A rate limit caps requests per stretch of time',
        'A fixed window starts its count again each minute',
        'Two windows back to back let twice through',
      ],
      terms: [
        ['Rate limit', 'A cap on how many requests a client may send in a stretch of time.'],
        ['Fixed window', 'A count that starts again at each minute’s edge, with at most the limit in each.'],
      ],
    },
  },
  {
    id: '03-the-token-bucket',
    title: 'The token bucket',
    short: 'Token bucket',
    intro: {
      story:
        'The per-minute count let a double burst slip through at its edge. The team swaps it for a rain barrel of tokens that drips back in steadily.',
      goal: 'What do the barrel’s size and its drip each control?',
      learn: [
        'Each request spends one token',
        'The size sets the biggest burst',
        'The refill rate sets the steady pace',
      ],
      terms: [
        ['Token bucket', 'A barrel of tokens: each request spends one, and tokens drip back in at a steady pace.'],
        ['Burst', 'Many requests at once; the barrel’s size sets how many it serves together.'],
        ['Refill rate', 'How many tokens drip back in each second: the steady pace allowed.'],
      ],
    },
  },
  {
    id: '04-the-429-reply',
    title: 'The 429 reply',
    short: 'The 429',
    intro: {
      story:
        'Quickfix’s developers ask what their script should do when the barrel says no. The reply itself tells them.',
      goal: 'What does a 429 reply say, and what should a client do with it?',
      learn: [
        '429 means too many requests',
        'Retry-After says how long to wait',
        'Retrying sooner only earns more 429s',
      ],
      terms: [
        ['429', 'The number a reply starts with for Too Many Requests: the limit said no.'],
        ['Retry-After', 'A line on the reply saying how many seconds to wait before trying again.'],
      ],
    },
  },
  {
    id: '05-back-off-with-jitter',
    title: 'Back off with jitter',
    short: 'Jitter',
    intro: {
      story:
        'After a power cut, Larkspur’s 30 shop tablets reconnect at the same moment. The barrel holds 10, so 20 of them hear 429.',
      goal: 'How should many refused clients come back without crashing in together?',
      learn: [
        'Retrying together is a stampede',
        'Backoff waits longer after each refusal',
        'Jitter spreads the retries out',
      ],
      terms: [
        ['Stampede', 'Many refused clients retrying at the same moment.'],
        ['Backoff', 'Waiting longer after each refusal: 1 second, then 2, then 4.'],
        ['Jitter', 'A random part of each wait, so clients refused together don’t return together.'],
      ],
    },
  },
  {
    id: '06-who-gets-turned-away',
    title: 'Who gets turned away',
    short: 'Turned away',
    intro: {
      story:
        'Quickfix’s script runs away again. One shared barrel limits everyone together, so the other partners keep hearing 429 too.',
      goal: 'How can a limit stop one partner without punishing the rest?',
      learn: [
        'A shared limit is spent by whoever asks most',
        'An API key says who is asking',
        'One barrel per key keeps the others whole',
      ],
      terms: [
        ['API key', 'A secret string each partner sends with its requests, so the API knows who is asking.'],
        ['Per-key limit', 'One barrel for each API key, so each partner spends only its own tokens.'],
      ],
    },
  },
  {
    id: '07-set-the-limits',
    title: 'Set the limits',
    short: 'Set limits',
    intro: {
      story:
        'Everything is on the bench: barrel size, drip, and one barrel per key. Tomorrow’s sale brings every partner at once.',
      goal: 'Which limits keep the API up and every quiet partner whole?',
      learn: [
        'Size the barrel for honest bursts',
        'Set the drip for the busiest steady pace',
        'Why more than one setting can work',
      ],
      terms: [['Workbench', 'Every setting at once, run over the whole sale day, checked against the team’s rule.']],
    },
  },
];

export const RATE_LIMITS_MODULE: Module = {
  id: 'rate-limits',
  title: 'Rate limits',
  description:
    'Why a busy API says slow down: a bucket of tokens that refills at a steady pace, a 429 reply, and who gets turned away.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['web-requests'],
  story:
    'On sale day a partner’s runaway script floods Larkspur Supply Co.’s stock API; the team puts a rain barrel of tokens at the door, and learns to say 429 and when to come back.',
  chapters: CHAPTERS,
  recall: RECALL,
};
