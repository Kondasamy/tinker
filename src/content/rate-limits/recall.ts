// The module's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

// written with the right answer first; `place` moves it to a spread of positions
const ITEMS: RecallItem[] = [
  // the module's single most important idea, pinned (first in the bank)
  {
    id: 'bucket-size-and-drip',
    chapter: '03-the-token-bucket',
    pin: true,
    question: 'A colleague asks what a token bucket’s two settings do. What do you tell them?',
    options: [
      'The size sets the biggest burst; the refill sets the steady pace',
      'The size sets the pace; the refill sets how long a 429 lasts',
      'Both set the same thing: requests per minute',
    ],
    correct: 0,
    why: [
      'Right: a full bucket serves its size at once, then only as fast as tokens drip back in.',
      'The pace is the refill rate; the wait in a 429 is the time to the next token.',
      'They differ: a big bucket with a slow drip allows rare big bursts, a small fast one a smooth stream.',
    ],
  },
  // 1. Too many at once
  {
    id: 'flood-hurts-everyone',
    chapter: '01-too-many-at-once',
    question: 'One customer’s broken app hammers your shop’s API. Why do other customers notice?',
    options: [
      'Past its capacity the server fails every request, theirs included',
      'The API answers the broken app first, by design',
      'They don’t: each customer has their own server',
    ],
    correct: 0,
    why: [
      'Right: a server past what it can answer falls over for everyone at once.',
      'Servers answer in arrival order; the flood simply leaves no room for anyone else.',
      'Customers share the same API servers unless something at the door separates them.',
    ],
  },
  {
    id: 'capacity',
    chapter: '01-too-many-at-once',
    question: 'An API can answer 50 requests a second. What happens at 80 a second, with no limit at the door?',
    options: [
      'It falls behind or falls over, and fails requests from everyone',
      'It answers 50 and quietly drops just the extra 30',
      'It speeds up to match',
    ],
    correct: 0,
    why: [
      'Right: past its capacity it can’t keep up, and without a limit nobody chooses which requests to refuse.',
      'Dropping just the extra is what a limit does; without one, the overload hits every request.',
      'A server’s capacity is fixed by its machines; more requests don’t make it faster.',
    ],
  },
  {
    id: 'why-limit',
    chapter: '01-too-many-at-once',
    question: 'Why put a limit at an API’s door at all?',
    options: [
      'So one client’s flood is refused before it takes the server down',
      'To make every request slower and fairer',
      'To charge clients for each refusal',
    ],
    correct: 0,
    why: [
      'Right: refusing the excess early keeps the server answering everyone else.',
      'A limit doesn’t slow requests it lets through; it refuses the ones past the limit.',
      'Some APIs bill by use, but a limit’s job is protecting the server.',
    ],
  },
  // 2. Count per minute
  {
    id: 'window-edge',
    chapter: '02-count-per-minute',
    question: 'An API allows 100 requests per clock minute. What is the most a client can send in two seconds?',
    options: ['200, across a minute’s edge', '100', 'About 3, the per-second average'],
    correct: 0,
    why: [
      'Right: 100 just before the minute turns and 100 just after both fit their windows.',
      'Each window is counted on its own, so the edge lets two full windows meet.',
      'A per-minute count doesn’t spread requests out; it only caps each minute’s total.',
    ],
  },
  {
    id: 'window-resets',
    chapter: '02-count-per-minute',
    question: 'What happens to a fixed window’s count at the start of each minute?',
    options: ['It starts again from zero', 'It keeps the last minute’s count', 'It halves'],
    correct: 0,
    why: [
      'Right: each window counts on its own, so the full limit is back at once.',
      'A fixed window carries nothing over: the new minute starts from zero.',
      'A fixed window doesn’t fade its count; it resets it whole.',
    ],
  },
  {
    id: 'window-burst-harm',
    chapter: '02-count-per-minute',
    question: 'Every minute stayed within its limit. Why can the server still struggle?',
    options: [
      'Two full minutes met at the edge, so twice the limit came in seconds',
      'The limit was counted wrong',
      'It can’t: within the limit is always safe',
    ],
    correct: 0,
    why: [
      'Right: per-minute counts say nothing about how bunched the requests are inside them.',
      'The count was right; the window shape allows the double burst.',
      'A limit per minute still lets a whole minute’s worth arrive in one second.',
    ],
  },
  // 3. The token bucket
  {
    id: 'bucket-empty',
    chapter: '03-the-token-bucket',
    question: 'A bucket is empty and refills 2 tokens a second. You send 10 at once. What happens?',
    options: ['Most get 429; one or two get through', 'All 10 wait, then go through', 'All 10 get through slowly'],
    correct: 0,
    why: [
      'Right: only tokens that have dripped in can be spent; the rest are refused now.',
      'A token bucket refuses rather than queues; the client decides whether to retry.',
      'There are no tokens for them, so they aren’t served, slowly or otherwise.',
    ],
  },
  {
    id: 'bucket-quiet',
    chapter: '03-the-token-bucket',
    question: 'Why does a token bucket allow a burst after a quiet spell?',
    options: [
      'Tokens build up while nobody spends them, up to the bucket’s size',
      'The refill speeds up after a quiet spell',
      'It doesn’t: it only allows the refill rate',
    ],
    correct: 0,
    why: [
      'Right: a quiet client’s bucket fills, so it can spend its whole size at once.',
      'The refill is steady; what grows is the stock of saved tokens.',
      'The saved tokens are exactly what allows a burst of up to the bucket’s size.',
    ],
  },
  // 4. The 429 reply
  {
    id: '429-means',
    chapter: '04-the-429-reply',
    question: 'An app gets HTTP status 429. What happened?',
    options: ['It sent too many requests in too short a time', 'The page was not found', 'The server crashed'],
    correct: 0,
    why: [
      'Right: 429 is Too Many Requests, the rate limit’s refusal.',
      'Not found is 404; 429 means the request was fine but came too soon.',
      'A crashed server sends an error in the 500s or nothing; 429 is a deliberate refusal.',
    ],
  },
  {
    id: 'retry-after',
    chapter: '04-the-429-reply',
    question: 'A 429 says Retry-After: 2. What should the client do?',
    options: ['Wait 2 seconds before trying again', 'Try again 2 times at once', 'Give up after 2 tries'],
    correct: 0,
    why: [
      'Right: Retry-After is how long to wait, here in seconds.',
      'It is a wait, not a count of tries.',
      'It says when to come back, not how many tries are left.',
    ],
  },
  {
    id: 'ignore-429',
    chapter: '04-the-429-reply',
    question: 'A script ignores 429s and retries every 0.2 seconds. What does it gain?',
    options: [
      'Nothing: the same requests served, many more refusals',
      'Its requests served sooner',
      'A bigger share of the barrel',
    ],
    correct: 0,
    why: [
      'Right: tokens drip in at the same pace however often it asks.',
      'No token arrives sooner for asking; the early retries are refused.',
      'The barrel refills at its own pace for everyone; pushing doesn’t enlarge it.',
    ],
  },
  // 5. Back off with jitter
  {
    id: 'stampede',
    chapter: '05-back-off-with-jitter',
    question: '500 clients are refused together and all retry exactly 1 second later. What happens?',
    options: ['They are mostly refused again, together', 'They are all served', 'They spread themselves out'],
    correct: 0,
    why: [
      'Right: a fixed wait sends them back as one wave, a stampede.',
      'The limit refills at its pace, not all at once for 500.',
      'Clients with the same wait return at the same moment unless something randomises it.',
    ],
  },
  {
    id: 'backoff-alone',
    chapter: '05-back-off-with-jitter',
    question: 'Clients double their wait after each refusal, with no randomness. What is left of the problem?',
    options: [
      'They still come back in clumps, just less often',
      'Nothing: doubling spreads them out',
      'They stop retrying',
    ],
    correct: 0,
    why: [
      'Right: everyone doubles the same waits, so they still return together.',
      'Doubling stretches the gaps but keeps everyone in step.',
      'Backoff keeps retrying, just more slowly.',
    ],
  },
  {
    id: 'jitter-cost',
    chapter: '05-back-off-with-jitter',
    question: 'What does adding jitter to backoff cost?',
    options: [
      'Some clients wait a little longer, in exchange for no stampede',
      'More refusals for every client',
      'Nothing at all',
    ],
    correct: 0,
    why: [
      'Right: spreading retries means some come back later than they might have.',
      'Jitter lowers the peak; the total refusals can go a little up or down.',
      'The randomness has a cost: the last client is served later.',
    ],
  },
  // 6. Who gets turned away
  {
    id: 'shared-limit',
    chapter: '06-who-gets-turned-away',
    question: 'Three partners share one limit. One floods it. Who hears 429?',
    options: ['All three, the quiet ones too', 'Only the one that floods', 'None of them'],
    correct: 0,
    why: [
      'Right: whoever asks most spends the shared tokens, and everyone is refused.',
      'Telling them apart needs a limit per key.',
      'A flooded limit refuses whoever arrives when it is empty.',
    ],
  },
  {
    id: 'api-key',
    chapter: '06-who-gets-turned-away',
    question: 'How does an API know which partner a request comes from?',
    options: ['The API key sent with the request', 'The request’s size', 'The time of day'],
    correct: 0,
    why: [
      'Right: each partner sends its own key, so its requests can spend its own barrel.',
      'Size says nothing about who sent it.',
      'Everyone sends at all hours; time can’t tell partners apart.',
    ],
  },
  {
    id: 'per-key-total',
    chapter: '06-who-gets-turned-away',
    question: 'Each of 10 partners gets a barrel dripping 10 a second. What must the server handle?',
    options: ['Up to 100 a second, plus bursts', 'Up to 10 a second', 'Exactly 10 bursts'],
    correct: 0,
    why: [
      'Right: per-key barrels add up, so the server must take all of them at once.',
      'Each partner may use its own 10 a second at the same time as the rest.',
      'Bursts depend on each barrel’s size, not on the number of partners alone.',
    ],
  },
  // 7. Set the limits
  {
    id: 'size-for-bursts',
    chapter: '07-set-the-limits',
    question: 'An honest partner sends orders in bursts of 15. How big should its barrel be?',
    options: ['At least 15 tokens', '5 tokens, to slow it down', 'As big as possible'],
    correct: 0,
    why: [
      'Right: a barrel smaller than an honest burst refuses part of it every time.',
      'Too small a barrel turns away requests the partner is allowed to make.',
      'Too big a barrel lets bursts through that the server can’t take.',
    ],
  },
  {
    id: 'drip-for-pace',
    chapter: '07-set-the-limits',
    question: 'A partner’s busiest steady pace is 10 a second. What drip does it need?',
    options: ['At least 10 a second', '5 a second, plus a big barrel', 'Any drip: the barrel covers it'],
    correct: 0,
    why: [
      'Right: a slower drip empties the barrel during a long busy spell.',
      'A big barrel only covers a short spell; a long one drains it at the drip’s pace.',
      'Over a long stretch, only the drip decides how much gets through.',
    ],
  },
  {
    id: 'many-answers',
    chapter: '07-set-the-limits',
    question: 'Two different limit settings both meet the rule. Which is right?',
    options: [
      'Either: the rule is met both ways',
      'Only the one with the biggest barrel',
      'Neither: only one can be right',
    ],
    correct: 0,
    why: [
      'Right: a rule leaves room; any setting that meets it works.',
      'A bigger barrel isn’t better if a smaller one meets the rule too.',
      'Limits are trade-offs; more than one setting can satisfy the same rule.',
    ],
  },
];

/** Moves item i's options round by i places, so the right answer isn't always first. */
const place = (it: RecallItem, i: number): RecallItem => {
  const n = it.options.length,
    k = i % n,
    turn = <T>(xs: T[]) => [...xs.slice(n - k), ...xs.slice(0, n - k)];
  return { ...it, options: turn(it.options), why: turn(it.why), correct: (it.correct + k) % n };
};
export const RECALL: RecallItem[] = ITEMS.map(place);
