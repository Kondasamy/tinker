// Load balancing: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one. Server names come from the traffic file.
import type { Chapter, Module } from '../../lib/modules';
import { SERVERS } from '../../lib/load-balancing/sim';
import { RECALL } from './recall';

const [ASH, BIRCH, CEDAR, DOG] = SERVERS.map(s => s.name);

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-servers-ceiling',
    title: 'One server’s ceiling',
    short: 'One server',
    intro: {
      story: `Larkspur’s shop runs on one server, ${ASH}. At one second in, a sale starts and requests arrive twice as fast.`,
      goal: 'What happens to the wait when requests arrive faster than one server can answer?',
      learn: [
        'A server answers only so many requests a second',
        'Past that, a queue grows and every wait with it',
        'Why p99 shows what the slowest customers feel',
      ],
      terms: [
        ['Capacity', 'The most requests a server can answer per second before a queue forms.'],
        ['Queue', 'Requests waiting for a free slot on a server.'],
        ['p99', 'The wait 99 of every 100 requests beat: the slow edge of what customers feel.'],
        ['Load balancer', 'The switch in front of several servers that picks which one gets each request.'],
      ],
    },
  },
  {
    id: '02-take-turns',
    title: 'Take turns',
    short: 'Take turns',
    intro: {
      story: `Four servers now share the sale: ${ASH} and three smaller ones. A load balancer in front picks one for every request.`,
      goal: 'What does taking turns do with servers of different sizes?',
      learn: [
        'Round robin sends each request to the next server in order',
        'Equal turns ignore how big each server is',
        'Weights give a bigger server more turns',
      ],
      terms: [
        ['Round robin', 'Sending each new request to the next server in a fixed order, round and round.'],
        ['Share', 'The part of all requests a server is sent.'],
        [
          'Weighted round robin',
          'Round robin where a server with weight 2 gets two turns for every one the others get.',
        ],
      ],
    },
  },
  {
    id: '03-the-least-busy',
    title: 'The least busy',
    short: 'The least busy',
    intro: {
      story: `Mid-sale, ${BIRCH} slows down: a backup job is eating its time. Round robin keeps sending it every fourth request.`,
      goal: 'How can a balancer steer around a server that has slowed down?',
      learn: [
        'Least outstanding picks the server with the fewest waiting requests',
        'Power of two choices compares just two, at random',
        'Why counting waiting requests beats taking turns here',
      ],
      terms: [
        ['Outstanding request', 'A request sent to a server and not yet answered.'],
        ['Least outstanding', 'Sending each request to the server with the fewest outstanding requests.'],
        [
          'Power of two choices',
          'Picking two servers at random and sending the request to the one with fewer outstanding.',
        ],
      ],
    },
  },
  {
    id: '04-is-it-alive',
    title: 'Is it alive?',
    short: 'Is it alive',
    intro: {
      story: `As the sale starts, ${CEDAR} crashes. The balancer can’t tell: it keeps giving ${CEDAR} its turn, and those customers wait for nothing.`,
      goal: 'How does a balancer find a dead server, and what can it miss?',
      learn: [
        'A health check asks every server, on a timer, whether it answers',
        'A server is pulled after a number of misses in a row',
        'Why a slow server that still answers passes',
      ],
      terms: [
        ['Health check', 'A small request the balancer sends each server on a timer, to see if it answers in time.'],
        ['Pulled', 'Taken out of service: the balancer stops sending it requests.'],
        ['Gray failure', 'A server that is broken for customers but still passes its health check.'],
      ],
    },
  },
  {
    id: '05-same-customer',
    title: 'Same customer, same server',
    short: 'Sticky sessions',
    intro: {
      story:
        'Customers fill carts during the sale. Each server keeps the carts it built in its own memory, and the balancer sends requests anywhere.',
      goal: 'How do you keep a customer’s cart, and what happens when its server dies?',
      learn: [
        'A cart kept on one server is missing when the next request lands elsewhere',
        'Sticky sessions send a customer back to the same server',
        'A shared cart store outlives any one server',
      ],
      terms: [
        ['Session', 'What a site remembers about one customer between requests, like their cart.'],
        ['Sticky sessions', 'Sending every request from one customer to the same server.'],
      ],
    },
  },
  {
    id: '06-the-slow-tail',
    title: 'The slow tail',
    short: 'The slow tail',
    intro: {
      story: `${DOG} is slow but answers its checks, so it stays in. Least outstanding sends it little, yet customers who land there still wait.`,
      goal: 'Why does one slow server set the slowest customers’ wait, and how do you cut it?',
      learn: [
        'p50 and p99 tell different stories',
        'A hedged request asks a second server after a wait',
        'Hedge too early and the copies crowd the servers',
      ],
      terms: [
        ['p50', 'The middle wait: half of requests are faster.'],
        ['Tail', 'The slowest few requests, the ones p99 measures.'],
        ['Hedged request', 'A second copy of a slow request sent to another server; the first answer wins.'],
      ],
    },
  },
  {
    id: '07-route-the-sale',
    title: 'Route the sale',
    short: 'Route the sale',
    intro: {
      story: `Sale day again: ${CEDAR} will die and ${DOG} will turn slow but answering. Carts now live in a shared store.`,
      goal: 'Which rule, health check and hedge keep the slowest customers fastest?',
      learn: [
        'How rules, health checks and hedging work together',
        'Reading p99 against a budget for extra copies',
        'Why more than one setup can be best',
      ],
      terms: [['Budget', 'Limits the team sets: here, no failed requests and a cap on extra copies.']],
    },
  },
];

export const LOAD_BALANCING_MODULE: Module = {
  id: 'load-balancing',
  title: 'Load balancing',
  description:
    'Spreading requests over many servers: round robin, the least busy, health checks, and the one slow server.',
  level: 'Intermediate',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s shop outgrows one server; the team puts four behind a load balancer and keeps a sale fast through a crash, a slow server and full carts.',
  chapters: CHAPTERS,
  recall: RECALL,
};
