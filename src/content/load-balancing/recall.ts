// Load balancing's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned
// item is the module's edge: a balancer only knows what it measures.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'knows-what-it-measures',
    chapter: '04-is-it-alive',
    pin: true,
    question:
      'A video site’s server starts taking ten seconds per video but still answers its health check. The balancer uses round robin. What happens?',
    options: [
      'It keeps its full share: the check passes, and round robin never looks at how slow it is',
      'The health check pulls it, since it is slow',
      'Round robin notices the slow answers and sends it less',
    ],
    correct: 0,
    why: [
      'Right. A balancer only knows what it measures; only a rule that counts waiting requests would steer around it.',
      'The check asks whether it answers, and it does, so it keeps getting requests.',
      'Round robin takes turns without measuring anything, so it never notices.',
    ],
  },
  // 1. One server's ceiling
  {
    id: 'queue-grows',
    chapter: '01-one-servers-ceiling',
    question:
      'A help desk answers 30 calls an hour. On launch day 40 calls an hour come in. What happens to the wait by the end of the day?',
    options: [
      'It keeps growing all day: ten more calls join the queue than leave it each hour',
      'It levels off at about a third longer',
      'It stays the same; the desk is just busier',
    ],
    correct: 0,
    why: [
      'Right: past capacity the queue gains every hour, so each new caller waits behind more people.',
      'A queue only levels off when arrivals fall back under capacity.',
      'A desk at capacity can’t take more; the extra calls wait.',
    ],
  },
  {
    id: 'p99-not-average',
    chapter: '01-one-servers-ceiling',
    question: 'A shop’s average page load is 80 ms, and its p99 is 2 seconds. What does that tell the team?',
    options: [
      'One request in a hundred takes 2 seconds or more: a real slice of customers waits a long time',
      'Almost every page is slow',
      'The 2 seconds is noise and can be ignored, since the average is fine',
    ],
    correct: 0,
    why: [
      'Right: p99 is the wait 99 in 100 requests beat, so the slowest 1% wait at least that long.',
      'The average is 80 ms, so most pages are fast; p99 describes the slowest edge.',
      'A busy shop serves thousands of pages, so 1% is many customers.',
    ],
  },
  {
    id: 'balancer-job',
    chapter: '01-one-servers-ceiling',
    question:
      'A team adds three servers beside its first, but customers still all reach the first one. What is missing?',
    options: [
      'A load balancer in front to pick a server for each request',
      'More memory on the first server',
      'Nothing: the new servers will take requests once they warm up',
    ],
    correct: 0,
    why: [
      'Right: servers don’t share work by themselves; something must send each request to one of them.',
      'More memory raises the first server’s ceiling a little, but the other three stay idle.',
      'A server only gets requests that are sent to it.',
    ],
  },
  // 2. Take turns
  {
    id: 'turns-equal',
    chapter: '02-take-turns',
    question: 'Three servers sit behind round robin. Over 300 requests, how many does each get?',
    options: ['About 100 each', 'More to whichever is fastest', 'All to the first, until it is full'],
    correct: 0,
    why: [
      'Right: round robin takes turns, so each gets the same count whatever its speed.',
      'Round robin never looks at speed; that needs a rule that measures.',
      'Round robin moves on after every request, full or not.',
    ],
  },
  {
    id: 'weights',
    chapter: '02-take-turns',
    question: 'One printer prints three times as fast as the other two. How should jobs be dealt out?',
    options: [
      'Give the fast printer weight 3, so it gets three jobs per round',
      'Deal one job to each in turn',
      'Send every job to the fast printer',
    ],
    correct: 0,
    why: [
      'Right: weights give a bigger machine turns in line with its size.',
      'Equal turns leave the fast printer idle while the slow ones queue.',
      'One printer has a ceiling; the other two would sit idle.',
    ],
  },
  {
    id: 'weights-fixed',
    chapter: '02-take-turns',
    question: 'A weighted balancer gives server A weight 2. Mid-sale, A starts struggling. What happens?',
    options: [
      'A keeps getting two turns per round: weights are fixed until someone changes them',
      'The balancer lowers A’s weight by itself',
      'A gets fewer requests, because weights follow speed',
    ],
    correct: 0,
    why: [
      'Right: a weight is a setting, not a measurement, so it doesn’t notice trouble.',
      'Plain weighted round robin measures nothing, so nothing lowers the weight.',
      'Weights are set by hand from what you expect, not from how the server does now.',
    ],
  },
  // 3. The least busy
  {
    id: 'least-steers',
    chapter: '03-the-least-busy',
    question:
      'Four checkout lanes; one cashier is new and slow. Shoppers always join the lane with the fewest people. What happens to the slow lane?',
    options: [
      'It gets fewer shoppers: its line stays long, so others look shorter',
      'It gets a quarter of the shoppers, like the rest',
      'It gets none, because shoppers know the cashier is new',
    ],
    correct: 0,
    why: [
      'Right: counting who is waiting steers people away from the lane that clears slowly.',
      'Taking turns would give it a quarter; counting the line does not.',
      'Shoppers only see line lengths; the slow lane still gets someone when its line is short.',
    ],
  },
  {
    id: 'two-choices',
    chapter: '03-the-least-busy',
    question:
      'A balancer in front of 1,000 servers can’t ask them all how busy they are for every request. What works nearly as well?',
    options: [
      'Ask two at random and pick the less busy',
      'Ask one at random and use it',
      'Ask all 1,000 anyway, once a minute',
    ],
    correct: 0,
    why: [
      'Right: comparing just two avoids the busiest servers, far better than picking one blind.',
      'One random pick ignores load, so it lands on busy servers as often as idle ones.',
      'A count a minute old is stale in a sale; servers fill and drain in milliseconds.',
    ],
  },
  {
    id: 'outstanding',
    chapter: '03-the-least-busy',
    question: 'What does “least outstanding” count for each server?',
    options: ['Requests sent to it and not yet answered', 'Requests it has answered today', 'Its processor’s speed'],
    correct: 0,
    why: [
      'Right: a slow server holds its requests longer, so its count stays high.',
      'Answered requests say how much it did, not how busy it is now.',
      'Speed is a fixed spec; outstanding requests show how it is doing right now.',
    ],
  },
  // 4. Is it alive?
  {
    id: 'dead-without-checks',
    chapter: '04-is-it-alive',
    question: 'A server behind round robin crashes, and there are no health checks. What do its customers see?',
    options: [
      'Every request sent its way waits, then fails',
      'The balancer skips it at once',
      'Its requests go to the next server after a short pause',
    ],
    correct: 0,
    why: [
      'Right: without a check, nothing tells the balancer, so its turns keep coming.',
      'The balancer only skips what it knows is down, and nothing told it.',
      'Without retries, a request sent to a dead server is simply lost.',
    ],
  },
  {
    id: 'miss-count',
    chapter: '04-is-it-alive',
    question: 'Pulling a server after 1 failed check instead of 3. What do you trade?',
    options: [
      'Faster removal of a dead server, but a single slow moment can pull a healthy one',
      'Nothing: one miss is always better',
      'More failed requests while it waits',
    ],
    correct: 0,
    why: [
      'Right: fewer misses react sooner, and also react to blips.',
      'One miss can be a hiccup, and pulling a healthy server costs capacity.',
      'Fewer misses means fewer failed requests, not more: the server is pulled sooner.',
    ],
  },
  // 5. Same customer, same server
  {
    id: 'sticky-why',
    chapter: '05-same-customer',
    question:
      'A site keeps each shopper’s basket in the memory of the server they first reached. Why turn on sticky sessions?',
    options: [
      'So their next request reaches the server holding their basket',
      'To spread load more evenly',
      'So a crash can’t lose a basket',
    ],
    correct: 0,
    why: [
      'Right: stickiness sends a customer back to where their session lives.',
      'Stickiness ties customers to servers, which tends to make load less even.',
      'A sticky basket lives on one server, so that server’s crash loses it.',
    ],
  },
  {
    id: 'sticky-dies',
    chapter: '05-same-customer',
    question: 'With sticky sessions, one of four servers dies mid-sale. Whose carts are lost?',
    options: ['Only those of customers tied to that server', 'Everyone’s', 'Nobody’s: the balancer moves the carts'],
    correct: 0,
    why: [
      'Right: each cart lives on one server, so only that server’s carts go.',
      'The other three servers keep their own carts.',
      'A balancer routes requests; it can’t copy memory off a dead machine.',
    ],
  },
  {
    id: 'shared-store',
    chapter: '05-same-customer',
    question: 'What lets any server answer any customer and survive a crash without losing carts?',
    options: ['Keeping carts in a shared store every server reads', 'Stickier sessions', 'More servers'],
    correct: 0,
    why: [
      'Right: when no server holds the cart alone, any can serve it and none takes it down.',
      'Stickiness ties a cart to one server, which is exactly what a crash breaks.',
      'More servers mean each holds fewer carts, but a crash still loses that server’s.',
    ],
  },
  // 6. The slow tail
  {
    id: 'p50-p99',
    chapter: '06-the-slow-tail',
    question: 'p50 is 40 ms and p99 is 600 ms. One server of twenty is slow. Which number does it move most?',
    options: [
      'p99: its few slow answers sit in the tail',
      'p50: every request slows a little',
      'Neither: one server in twenty is too few to matter',
    ],
    correct: 0,
    why: [
      'Right: one server in twenty serves about 5% of requests, all slow, so they fill the tail.',
      'The other nineteen are fine, so the middle wait (p50) barely moves.',
      'One percent of requests is all it takes to set p99.',
    ],
  },
  {
    id: 'hedge-wins',
    chapter: '06-the-slow-tail',
    question:
      'An app sends a copy of a request to a second server if the first hasn’t answered in 200 ms. Which answer does the customer get?',
    options: ['Whichever comes first', 'Always the first server’s', 'Both, merged'],
    correct: 0,
    why: [
      'Right: a hedge races two copies, and the first answer wins.',
      'Waiting for the first server would defeat the point of the copy.',
      'The two copies ask the same thing; one answer is enough.',
    ],
  },
  {
    id: 'hedge-early',
    chapter: '06-the-slow-tail',
    question: 'A team hedges every request after 5 ms, though most answers take 30 ms. What goes wrong?',
    options: [
      'Nearly every request is copied, so the servers do about twice the work',
      'Nothing: earlier hedges are always faster',
      'The copies never arrive',
    ],
    correct: 0,
    why: [
      'Right: a hedge before most requests finish copies ordinary ones, not just the stuck ones.',
      'The extra load makes every server slower, which can push the waits up.',
      'The copies arrive fine; there are just far too many of them.',
    ],
  },
  // 7. Route the sale
  {
    id: 'layers',
    chapter: '07-route-the-sale',
    question: 'A health check pulls dead servers. Why still pick a rule that counts waiting requests?',
    options: [
      'Checks miss a server that is slow but answering; counting steers around it',
      'Counting makes health checks unnecessary',
      'It doesn’t help once checks are on',
    ],
    correct: 0,
    why: [
      'Right: each part catches a different failure, and a slow server passes the check.',
      'A dead server’s count also goes up as requests hang, but checks pull it much sooner.',
      'With a slow-but-answering server, the checks do nothing and the rule does the work.',
    ],
  },
  {
    id: 'budget',
    chapter: '07-route-the-sale',
    question:
      'Setup A has p99 150 ms with 30% extra copies; setup B has 190 ms with 13%. The budget is 15%. Which ships?',
    options: ['B: it is the best that fits the budget', 'A: lower p99 always wins', 'Neither: both have a tail'],
    correct: 0,
    why: [
      'Right: a lower p99 that breaks the budget isn’t on the table.',
      'The budget exists because extra copies cost servers; A goes over it.',
      'Every real system has a tail; the job is the lowest one within budget.',
    ],
  },
  {
    id: 'ties',
    chapter: '07-route-the-sale',
    question: 'Two setups give the same p99 and both fit the budget. What does that tell you?',
    options: [
      'Either works; pick on something else, like which is simpler to run',
      'One must hide a failed request',
      'The simulation is broken',
    ],
    correct: 0,
    why: [
      'Right. Several setups can be equally good on the measure you chose.',
      'Both passed the same checks over the same sale, so neither hides one.',
      'Ties are normal when a setting, like an extra health-check miss, changes nothing that day.',
    ],
  },
];
