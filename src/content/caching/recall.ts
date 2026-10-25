// Caching's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea in
// a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is the
// module's one-line edge: a copy nearby is fast because nobody asks the origin, which is exactly why it can be stale.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'fast-because-unchecked',
    chapter: '03-how-long-is-it-fresh',
    pin: true,
    question:
      'A colleague says: “Our cache checks with the origin on every request, so it can never serve anything out of date, and it is still fast.” What do you tell them?',
    options: [
      'A cache is fast because it doesn’t ask the origin; a fresh copy is served unchecked, so it can be stale until it expires or is purged',
      'Right: a cache always checks first, it just checks quickly',
      'Caches never go stale, because the origin pushes every change to them',
    ],
    correct: 0,
    why: [
      'Right. Skipping the trip is the saving, so between a change and the copy’s expiry or purge, the copy can be stale.',
      'A check is a trip to the origin, and a cache that made one on every request would save little of the wait.',
      'Nothing pushes changes by itself: without a purge, a cache learns of a change only when its copy expires.',
    ],
  },
  // 1. Far is slow
  {
    id: 'distance-floor',
    chapter: '01-far-is-slow',
    question:
      'A game’s login server is in Virginia. Players in Tokyo wait much longer to log in than players in New York, though the server is mostly idle. Why?',
    options: [
      'The round trip from Tokyo is far longer, and every login makes it',
      'The server is busy with Tokyo’s players',
      'Tokyo players’ passwords take longer to check',
    ],
    correct: 0,
    why: [
      'Right. With the server idle, the gap is the distance each request travels there and back.',
      'The server is mostly idle, so it isn’t the server’s work that grows.',
      'Checking a password takes the server the same time wherever the player is.',
    ],
  },
  {
    id: 'origin-load',
    chapter: '01-far-is-slow',
    question:
      'A shop with no copies anywhere sends a newsletter, and 10,000 customers open the same page within a minute. Where does every one of those requests go?',
    options: ['To the origin, one trip each', 'To the nearest copy', 'Only the first goes; the rest reuse it'],
    correct: 0,
    why: [
      'Right. With no copies, the origin is the only place that can answer, so it gets every request.',
      'There are no copies in this shop, so there is no nearer place to answer from.',
      'Reusing the first answer needs a copy kept somewhere, which this shop doesn’t have.',
    ],
  },
  {
    id: 'latency-word',
    chapter: '01-far-is-slow',
    question: 'Which of these is latency?',
    options: [
      'The time between a customer clicking and the reply arriving',
      'How many requests a server handles a second',
      'How big the page is',
    ],
    correct: 0,
    why: [
      'Right. Latency is the wait one request sees, trip and work together.',
      'That is throughput, a server’s capacity, not the wait one customer sees.',
      'A page’s size can add to the wait, but the size itself isn’t the wait.',
    ],
  },
  // 2. Keep a copy nearby
  {
    id: 'first-miss',
    chapter: '02-keep-a-copy',
    question:
      'A video site opens a new cache in Lagos at midnight. The first viewer there asks for a popular clip. What happens?',
    options: [
      'A miss: the clip is fetched from the origin and kept, so later viewers get hits',
      'A hit: popular clips are on every cache already',
      'The viewer is refused until the cache is filled',
    ],
    correct: 0,
    why: [
      'Right. A new cache starts empty and fills as people ask.',
      'An edge cache keeps what was asked for there, so a new one has nothing yet.',
      'A miss isn’t refused; it is answered from the origin, a little slower.',
    ],
  },
  {
    id: 'hit-rate',
    chapter: '02-keep-a-copy',
    question:
      'Two caches see 1,000 requests each. One answers 950 from its shelf, the other 600. Which takes more load off the origin?',
    options: [
      'The first: a 95% hit rate sends 50 trips, against 400',
      'The second: fewer hits leave more room on its shelf',
      'Neither: the origin gets every request either way',
    ],
    correct: 0,
    why: [
      'Right. Every hit is a trip saved, so the higher hit rate saves more.',
      'Room on the shelf doesn’t help the origin; trips do, and misses are trips.',
      'Hits never reach the origin, so the hit rate decides how much does.',
    ],
  },
  {
    id: 'edge-where',
    chapter: '02-keep-a-copy',
    question: 'Why does an edge cache sit near customers rather than next to the origin?',
    options: [
      'A hit then skips the long part of the trip',
      'The origin can’t keep copies of its own pages',
      'Customers can only reach caches, never origins',
    ],
    correct: 0,
    why: [
      'Right. Next to the origin a hit would still make most of the trip; near customers it skips it.',
      'An origin can keep copies too, but they’d still be far from the customer.',
      'A miss reaches the origin through the edge, so customers do reach it.',
    ],
  },
  // 3. How long is it fresh?
  {
    id: 'ttl-tradeoff',
    chapter: '03-how-long-is-it-fresh',
    question:
      'A weather site caches its forecast for 3 hours to save trips. Forecasts update hourly. What does it give up?',
    options: [
      'Readers may see a forecast up to 3 hours old',
      'Nothing: a cache refreshes whenever the forecast changes',
      'More trips to the origin',
    ],
    correct: 0,
    why: [
      'Right. A longer TTL saves trips, and the price is how old a copy may be.',
      'A fresh copy is served without asking, so the cache doesn’t know the forecast changed.',
      'A longer TTL means fewer trips, not more.',
    ],
  },
  {
    id: 'fresh-vs-current',
    chapter: '03-how-long-is-it-fresh',
    question: 'A copy is fresh. Does that mean it matches the origin?',
    options: [
      'No: fresh means within its TTL; the origin may have changed since',
      'Yes: fresh means the origin confirmed it',
      'Yes, unless the copy is damaged',
    ],
    correct: 0,
    why: [
      'Right. Freshness is about the copy’s age, not about the origin.',
      'A cache serves a fresh copy without asking the origin anything.',
      'An intact copy can still be out of date if the origin changed.',
    ],
  },
  {
    id: 'ttl-zero',
    chapter: '03-how-long-is-it-fresh',
    question: 'A team sets every TTL to zero so nothing is ever stale. What did they build?',
    options: [
      'A cache that sends every request to the origin, saving nothing',
      'A cache that is fast and always right',
      'A cache that keeps copies until a purge',
    ],
    correct: 0,
    why: [
      'Right. A copy that is never fresh is never served, so every request makes the trip.',
      'Never stale, yes, but never fast either: every request is a miss.',
      'With a zero TTL nothing is served from the shelf, purge or not.',
    ],
  },
  // 4. Take it back
  {
    id: 'purge-for-data',
    chapter: '04-take-it-back',
    question:
      'A shop edits a product’s price once a month and wants to cache it for a week. How can it never show an old price?',
    options: [
      'Purge the price everywhere when it changes',
      'Rename the price at every change, like price-2',
      'Shorten the TTL to an hour',
    ],
    correct: 0,
    why: [
      'Right. A purge drops the old copy the moment it changes, so the week-long TTL is safe.',
      'The page asks for the price by its one name; a new name only works for files a page links to.',
      'An hour still leaves up to an hour of old prices after each edit.',
    ],
  },
  {
    id: 'versioned-for-files',
    chapter: '04-take-it-back',
    question: 'Why can a file named style.3f9a.css be cached for a year?',
    options: [
      'Its name changes with its content, so a changed file is a new name no cache holds',
      'CSS files never change',
      'Caches keep CSS files fresher than other files',
    ],
    correct: 0,
    why: [
      'Right. A versioned name can’t be stale: a change gets a new name, fetched fresh.',
      'Stylesheets change all the time; the name changes with them.',
      'Caches treat every kind of file the same way; the name does the work.',
    ],
  },
  {
    id: 'no-purge',
    chapter: '04-take-it-back',
    question:
      'A page was cached for a day in caches you don’t control, and you can’t purge them. The page just changed. What happens?',
    options: [
      'Some visitors see the old page until their copy expires',
      'Every cache notices the change within a minute',
      'The old copies are deleted when the origin changes',
    ],
    correct: 0,
    why: [
      'Right. Without a purge, a copy lives out its TTL.',
      'Caches don’t watch the origin; they learn of changes on expiry or purge.',
      'Nothing deletes a copy when the origin changes, unless someone purges it.',
    ],
  },
  // 5. Everyone at once
  {
    id: 'stampede',
    chapter: '05-everyone-at-once',
    question:
      'A popular page’s copy expires during a traffic spike, and thousands of requests miss at the same moment. What is this called, and what does it do?',
    options: [
      'A stampede: every miss sends its own trip and swamps the origin',
      'A purge: the cache deletes the page',
      'A hit storm: the cache serves everyone at once',
    ],
    correct: 0,
    why: [
      'Right. Many misses for one item at once each make their own trip.',
      'A purge is a deliberate drop of a copy; this is an expiry under load.',
      'They are misses, not hits, so the cache can’t serve them.',
    ],
  },
  {
    id: 'coalescing',
    chapter: '05-everyone-at-once',
    question: 'With request coalescing, 500 requests miss on the same item in the same second. How many trips go out?',
    options: ['One, and the other 499 wait for its reply', '500, but faster', 'None: they all get the old copy'],
    correct: 0,
    why: [
      'Right. Coalescing shares one trip among everyone asking for the same item.',
      'Coalescing changes how many trips go out, not how fast each one is.',
      'Serving the old copy is stale-while-revalidate, a different setting.',
    ],
  },
  {
    id: 'swr-cost',
    chapter: '05-everyone-at-once',
    question: 'A team turns on stale-while-revalidate for live stock counts. Waits drop. What did they pay for it?',
    options: [
      'Some customers see a count older than the origin’s while the new one is fetched',
      'More trips to the origin',
      'Nothing: the copy served is always current',
    ],
    correct: 0,
    why: [
      'Right. It serves the expired copy instead of waiting, and an expired count may be out of date.',
      'It sends one background trip per expiry, the same trip a miss would make.',
      'The point is to serve the expired copy, which may no longer match the origin.',
    ],
  },
  // 6. The same trick everywhere
  {
    id: 'prompt-cache-prefix',
    chapter: '06-the-same-trick',
    question:
      'Two calls share a long instruction block, but one puts a customer’s name before it and one after. Which can reuse the other’s prompt cache?',
    options: [
      'Only when the name comes after the shared block, so their openings match',
      'Both, since they hold the same words',
      'Neither: prompt caches work only for identical calls',
    ],
    correct: 0,
    why: [
      'Right. A hit needs the prompt identical up to the cached point, so what varies goes last.',
      'The order matters: a different first line means the openings differ.',
      'The calls can differ after the cached point; only the opening must match.',
    ],
  },
  {
    id: 'kv-scope',
    chapter: '06-the-same-trick',
    question: 'A model server writes two replies, one for Ana and one for Ben. Can Ben’s reply reuse Ana’s KV cache?',
    options: [
      'No: each reply keeps keys and values for its own tokens',
      'Yes: the server shares one KV cache',
      'Yes, if they ask within five minutes',
    ],
    correct: 0,
    why: [
      'Right. A KV cache belongs to one request and grows and shrinks with it.',
      'Each request holds its own cache, which is why memory caps how many run at once.',
      'Five minutes is a provider’s prompt-cache lifetime, a different cache.',
    ],
  },
  {
    id: 'cache-questions',
    chapter: '06-the-same-trick',
    question: 'Which question do an edge cache, a prompt cache and a KV cache all answer?',
    options: ['When does a kept copy stop being usable?', 'Which vendor runs it?', 'How many users are logged in?'],
    correct: 0,
    why: [
      'Right. Every cache keeps work to skip it later, and each has a rule for when the copy goes bad.',
      'Who runs a cache doesn’t change how it works.',
      'Logins have nothing to do with how a cache decides a copy is usable.',
    ],
  },
  // 7. Set Larkspur's cache policy
  {
    id: 'per-kind',
    chapter: '07-cache-policy',
    question: 'Why does a good cache policy set a different TTL for each kind of content?',
    options: [
      'Kinds change at different rates and matter differently when stale',
      'Caches can only hold one kind per TTL',
      'One TTL for everything is against the rules',
    ],
    correct: 0,
    why: [
      'Right. A photo that never changes and a stock count that changes every minute need different rules.',
      'A cache holds any mix of kinds; the TTL is a choice, not a limit.',
      'Nothing forbids one TTL; it is just a poor fit for content that changes at different rates.',
    ],
  },
  {
    id: 'limit-first',
    chapter: '07-cache-policy',
    question:
      'Policy A has a 92% hit rate and a few stale prices. Policy B has 88% and none. The owner allows no stale prices. Which ships?',
    options: ['B: a policy over a limit fails however fast it is', 'A: the higher hit rate wins', 'Neither'],
    correct: 0,
    why: [
      'Right. Limits come first; hit rate only ranks the policies that pass.',
      'A stale price breaks the owner’s rule, which the hit rate can’t buy back.',
      'B passes every limit, so it can ship.',
    ],
  },
  {
    id: 'ties',
    chapter: '07-cache-policy',
    question: 'Two cache policies give the same hit rate and both pass every limit. What does that tell you?',
    options: [
      'Either works; pick on something else, like which is simpler to run',
      'One of them must have a hidden stale read',
      'The simulation is broken',
    ],
    correct: 0,
    why: [
      'Right. Several policies can be equally good on the measure you chose.',
      'Both passed the same checks over the same day, so neither hides one.',
      'Ties are normal when a setting, like versioned names here, adds nothing a purge didn’t already do.',
    ],
  },
];
