// Opening a web page's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The
// pinned item is the module's one-line edge: every handshake costs a round trip, and distance multiplies it.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'round-trips-times-distance',
    chapter: '03-hello-hello-ready',
    pin: true,
    question:
      'A team moves its server from next door to another continent. The server is just as fast. Why does every page now open slower?',
    options: [
      'Every handshake and request is a round trip, and each round trip now crosses the continent',
      'The server has more customers to serve',
      'The pages got bigger when they moved',
    ],
    correct: 0,
    why: [
      'Right. A page needs several round trips before it is in, and distance multiplies each one.',
      'The server is as fast as before, and nothing says more customers arrived.',
      'The same pages moved; only the distance to them changed.',
    ],
  },
  // 1. A name to a number
  {
    id: 'dns-first-step',
    chapter: '01-a-name-to-a-number',
    question: 'Before a browser can open a connection to shop.example, what must it find out?',
    options: ['The shop’s IP address, through DNS', 'The shop’s certificate', 'Which files the page needs'],
    correct: 0,
    why: [
      'Right. A connection goes to an address, a number, and DNS turns the name into it.',
      'The certificate arrives during the TLS handshake, after the connection is open.',
      'The page lists its files, and the page can’t be fetched without the address.',
    ],
  },
  {
    id: 'referral',
    chapter: '01-a-name-to-a-number',
    question: 'A resolver asks the root about news.example. The root doesn’t know the address. What does it reply?',
    options: [
      'A referral: which office runs .example',
      'An error: the name doesn’t exist',
      'Its best guess at the address',
    ],
    correct: 0,
    why: [
      'Right. Each office knows the next one down, so the resolver follows the referrals.',
      'Not knowing the address isn’t the same as the name not existing; the root just hands it on.',
      'DNS offices never guess: they answer, or point to the office that can.',
    ],
  },
  {
    id: 'cold-lookup-cost',
    chapter: '01-a-name-to-a-number',
    question: 'Why can a first visit to a site be slower than the next one, before the site even answers?',
    options: [
      'The resolver has to ask several offices, each a round trip',
      'The site’s server warms up on the first visit',
      'The browser downloads DNS itself the first time',
    ],
    correct: 0,
    why: [
      'Right. A resolver that remembers nothing walks from the root down, one round trip per office.',
      'The difference is before the site is reached at all, in the lookup.',
      'DNS is a service the resolver asks, not something the browser downloads.',
    ],
  },
  // 2. The remembered answer
  {
    id: 'ttl-skip',
    chapter: '02-the-remembered-answer',
    question: 'A shop’s DNS TTL is one hour. A customer returns after 10 minutes. What happens to the lookup?',
    options: [
      'It is skipped: the resolver still remembers the answer',
      'It is repeated, since every visit looks the name up',
      'Only the root is asked again',
    ],
    correct: 0,
    why: [
      'Right. Within its TTL a cached answer is used without asking any office.',
      'A cache exists exactly so that repeat visits within the TTL don’t ask again.',
      'The root’s answer is remembered too; nothing needs asking within the TTL.',
    ],
  },
  {
    id: 'ttl-move',
    chapter: '02-the-remembered-answer',
    question:
      'A site sets a one-day TTL, then moves to a new server. Some visitors still reach the old one. For how long?',
    options: [
      'Up to a day, until their resolver’s copy expires',
      'Never: DNS tells resolvers about changes at once',
      'For ever, until they clear their browser',
    ],
    correct: 0,
    why: [
      'Right. A resolver uses its copy unchecked until the TTL runs out.',
      'Resolvers aren’t told about changes; they find out only when they ask again.',
      'The copy expires by itself when its TTL runs out.',
    ],
  },
  {
    id: 'ttl-choice',
    chapter: '02-the-remembered-answer',
    question: 'Which site should pick a short DNS TTL?',
    options: [
      'One about to move to a new host',
      'One whose address hasn’t changed in years',
      'One whose visitors are far away',
    ],
    correct: 0,
    why: [
      'Right. A short TTL lets the move be found quickly, at the cost of more lookups.',
      'A stable address gains nothing from asking again often.',
      'Distance makes each lookup dearer, which argues for remembering longer, not shorter.',
    ],
  },
  // 3. Hello, hello, ready
  {
    id: 'handshake-before-data',
    chapter: '03-hello-hello-ready',
    question: 'A browser has opened a TCP connection. When can it send its request?',
    options: [
      'Once the handshake’s round trip is done',
      'At once: the handshake runs alongside',
      'Only after the server sends the first file',
    ],
    correct: 0,
    why: [
      'Right. Hello, hello back, ready: the request waits for that round trip.',
      'TCP hands data over only once the connection is established.',
      'The server sends nothing until it is asked.',
    ],
  },
  {
    id: 'double-distance',
    chapter: '03-hello-hello-ready',
    question: 'Customer B is twice as far from a server as customer A. Roughly how does B’s handshake compare?',
    options: [
      'About twice as long, less the fixed part every trip pays',
      'The same: a handshake is three tiny messages',
      'Four times as long',
    ],
    correct: 0,
    why: [
      'Right. The distance part of a round trip grows in step with distance.',
      'Tiny messages still have to cross the whole distance and back.',
      'A round trip crosses the distance twice whatever it is, so it grows in step, not faster.',
    ],
  },
  // 4. Lost in the post
  {
    id: 'loss-timeout',
    chapter: '04-lost-in-the-post',
    question: 'How does a TCP sender find out a packet was lost?',
    options: ['No reply comes before the timeout', 'The receiver sends an error at once', 'The network tells it'],
    correct: 0,
    why: [
      'Right. Silence is the only sign, so the sender waits out the timeout, then sends again.',
      'The receiver can’t complain about a packet it never saw.',
      'The network drops packets silently.',
    ],
  },
  {
    id: 'loss-cost',
    chapter: '04-lost-in-the-post',
    question: 'Why can one lost packet cost more than all of a page’s round trips?',
    options: [
      'The timeout is set to be safe, often longer than many round trips',
      'Lost packets are resent slowly on purpose',
      'A loss makes the server rebuild the page',
    ],
    correct: 0,
    why: [
      'Right. The sender must wait long enough not to resend packets that were only slow.',
      'The resend itself is one ordinary round trip; the wait before it is the cost.',
      'The server doesn’t know about the loss; only the missing packet is sent again.',
    ],
  },
  {
    id: 'far-and-lossy',
    chapter: '04-lost-in-the-post',
    question: 'Two customers on lossy lines: one near the server, one far. Who suffers more from loss?',
    options: [
      'The far one: longer trips, and more packets in flight to lose',
      'The near one: their packets travel faster and drop more',
      'Both the same: a loss costs a timeout either way',
    ],
    correct: 0,
    why: [
      'Right. Far lines pay twice: each round trip is longer, and losses add a timeout on top.',
      'Speed on the wire doesn’t make packets drop more.',
      'The timeout is the same, but the far customer’s other waits are longer too.',
    ],
  },
  // 5. The sealed envelope
  {
    id: 'padlock-proves',
    chapter: '05-the-sealed-envelope',
    question: 'A phishing page at bank-login.example shows a padlock. What does the padlock prove?',
    options: [
      'The line is private and the page really is bank-login.example',
      'The page belongs to your bank',
      'The page is safe to type passwords into',
    ],
    correct: 0,
    why: [
      'Right. The certificate matches the name asked for; it says nothing about who is behind it.',
      'Anyone controlling bank-login.example can get a certificate for it.',
      'A private line to a dishonest page is still a dishonest page.',
    ],
  },
  {
    id: 'zero-rtt-get',
    chapter: '05-the-sealed-envelope',
    question: 'Why does a shop accept 0-RTT for viewing a page but not for paying?',
    options: [
      'Early data can be replayed, and a replayed payment would charge twice',
      'Payments are too large to fit in the first message',
      'Viewing pages needs no encryption',
    ],
    correct: 0,
    why: [
      'Right. Repeating a page view is harmless; repeating a payment is not.',
      'Size isn’t the issue; replay is.',
      '0-RTT data is encrypted too; the risk is it being sent again by someone else.',
    ],
  },
  {
    id: 'tls-cost',
    chapter: '05-the-sealed-envelope',
    question: 'What does TLS 1.3 add to a first visit’s wait?',
    options: ['One round trip, on top of TCP’s', 'Nothing: encryption is free', 'A round trip per file'],
    correct: 0,
    why: [
      'Right. Agreeing keys and showing the certificate takes one round trip before the request.',
      'Sealing the line needs messages exchanged first, which takes a round trip.',
      'The handshake happens once per connection, not per file.',
    ],
  },
  // 6. One line, many files
  {
    id: 'h1-queue',
    chapter: '06-one-line-many-files',
    question: 'Over HTTP/1.1, why does a page with many files open several connections?',
    options: [
      'Each connection carries one request at a time',
      'Each file needs its own certificate',
      'Servers refuse two requests from one connection',
    ],
    correct: 0,
    why: [
      'Right. More connections fetch more files at once, each paying its own handshakes.',
      'One certificate covers the whole site.',
      'A server answers many requests on one connection, just one after another.',
    ],
  },
  {
    id: 'h2-hol',
    chapter: '06-one-line-many-files',
    question: 'On HTTP/2, a packet of the logo is lost. What happens to the page’s text?',
    options: [
      'It waits too, behind the lost packet',
      'It arrives on time on its own stream',
      'It is sent again as well',
    ],
    correct: 0,
    why: [
      'Right. TCP hands bytes over in order, so every stream waits: head-of-line blocking.',
      'That is HTTP/3’s behaviour, over QUIC, not HTTP/2’s over TCP.',
      'Only the lost packet is sent again; the rest just wait for it.',
    ],
  },
  {
    id: 'h3-gain',
    chapter: '06-one-line-many-files',
    question: 'What does HTTP/3 save a first-time visitor, with no loss at all?',
    options: [
      'A round trip: QUIC sets up the connection and its seal in one handshake',
      'Nothing without loss',
      'Every round trip: it needs no handshake',
    ],
    correct: 0,
    why: [
      'Right. TCP then TLS takes two round trips; QUIC does both in one.',
      'The combined handshake saves a round trip even on a clean line.',
      'QUIC still needs one handshake before a first visit’s request.',
    ],
  },
  // 7. Make it fast
  {
    id: 'slowest-decides',
    chapter: '07-make-it-fast',
    question: 'A site must load within a budget for every customer. Which customer should you check first?',
    options: ['The farthest, on the worst line', 'The nearest', 'The one who visits most'],
    correct: 0,
    why: [
      'Right. Their round trips are longest and their losses dearest, so they decide.',
      'If the nearest is in budget, that says little about anyone farther away.',
      'Visit count doesn’t change how long one page takes.',
    ],
  },
  {
    id: 'ttl-trade',
    chapter: '07-make-it-fast',
    question: 'Why not set the DNS TTL to a year to skip every lookup?',
    options: [
      'A move would leave customers at the old address for up to a year',
      'Resolvers reject TTLs over a day',
      'Long TTLs make each lookup slower',
    ],
    correct: 0,
    why: [
      'Right. The saving is real, but the TTL caps how fast a change can reach everyone.',
      'The trade-off, not a resolver rule, is what rules it out here.',
      'A lookup costs the same whatever TTL its answer carries.',
    ],
  },
  {
    id: 'cut-trips',
    chapter: '07-make-it-fast',
    question: 'Which change does nothing for a returning customer whose resolver already remembers the address?',
    options: ['A longer DNS TTL', 'Session resumption', 'HTTP/3'],
    correct: 0,
    why: [
      'Right. Their lookup is already skipped, so a longer TTL saves them nothing.',
      'Resumption still saves them a round trip with 0-RTT.',
      'HTTP/3 still folds their two handshakes into one.',
    ],
  },
];
