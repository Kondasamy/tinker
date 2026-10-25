// Caching & CDNs: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-far-is-slow',
    title: 'Far is slow',
    short: 'Far is slow',
    intro: {
      story:
        'Larkspur’s online shop runs from one central depot. Customers in three regions shop all day, and the West says pages crawl.',
      goal: 'Why does a customer far from the depot wait longer?',
      learn: [
        'Every request without a copy makes a round trip to the origin',
        'Why the wait grows with distance',
        'Why every customer’s trip lands on the same depot',
      ],
      terms: [
        ['Origin', 'The server that holds the real copy of every page: here, Larkspur’s central depot.'],
        ['Round trip', 'A request’s journey to the origin and the reply’s journey back.'],
        ['Latency', 'How long a customer waits between asking and getting the reply.'],
      ],
    },
  },
  {
    id: '02-keep-a-copy',
    title: 'Keep a copy nearby',
    short: 'Keep a copy',
    intro: {
      story:
        'West’s pages crawl because every request crosses the country. The team wonders: what if each regional warehouse kept a copy of what it serves?',
      goal: 'What does a copy nearby save, and when does it still miss?',
      learn: [
        'An edge cache keeps copies close to customers',
        'Hits skip the trip; misses make it once and keep the copy',
        'Hit rate, and what it does to the wait',
      ],
      terms: [
        [
          'Edge cache',
          'A store of copies close to customers, like a regional warehouse’s shelf: here, one per region.',
        ],
        ['Hit', 'A request answered from a copy on the shelf, with no trip to the depot.'],
        ['Miss', 'A request the shelf can’t answer: it goes to the depot, and the shelf keeps the reply.'],
        ['Hit rate', 'The share of requests that are hits.'],
      ],
    },
  },
  {
    id: '03-how-long-is-it-fresh',
    title: 'How long is it fresh?',
    short: 'How long is it fresh',
    intro: {
      story:
        'The shelves worked: almost every request is now a hit. Then the depot raises the hinge price, and a customer is charged more than the page said.',
      goal: 'How long should a copy count as fresh?',
      learn: [
        'TTL: how long a copy counts as fresh',
        'Why a copy can be fresh and still out of date',
        'Why a shorter TTL trades trips for correctness',
      ],
      terms: [
        ['Stale', 'Older than the depot’s current version: the copy no longer matches the original.'],
        ['TTL', 'Time to live: how long a copy counts as fresh before the shelf must fetch it again.'],
        ['Fresh', 'Within its TTL, so the shelf serves it without asking the depot.'],
        ['Expired', 'Past its TTL: the next request fetches a new copy.'],
      ],
    },
  },
  {
    id: '04-take-it-back',
    title: 'Take it back',
    short: 'Take it back',
    intro: {
      story:
        'A 15-minute TTL fixed most stale prices but cost trips, and a few still slipped through. The team wants long TTLs and correct prices.',
      goal: 'How do you take back a copy you already handed out?',
      learn: [
        'A purge drops a copy everywhere the moment it changes',
        'A versioned name gives changed content a new address',
        'Which suits prices, and which suits photos',
      ],
      terms: [
        ['Purge', 'A message telling every cache to drop its copy of something, now.'],
        [
          'Versioned name',
          'A name that changes with the content, like hinge-2.jpg, so no cache holds the new one yet.',
        ],
      ],
    },
  },
  {
    id: '05-everyone-at-once',
    title: 'Everyone at once',
    short: 'Everyone at once',
    intro: {
      story: 'Prices are right now. At noon Larkspur starts a flash sale on hinges and tells every customer at once.',
      goal: 'What happens when everyone asks for the same thing at the same moment?',
      learn: [
        'A stampede: many misses for one item at once',
        'Request coalescing: one trip shared by everyone waiting',
        'Stale-while-revalidate: serve the old copy while fetching a new one',
      ],
      terms: [
        ['Stampede', 'Many requests missing on the same item at once, each sending its own trip.'],
        ['Request coalescing', 'Letting requests for the same item share one trip, the rest waiting on its reply.'],
        [
          'Stale-while-revalidate',
          'Serving an expired copy for a short window while one trip fetches a fresh one in the background.',
        ],
      ],
    },
  },
  {
    id: '06-the-same-trick',
    title: 'The same trick everywhere',
    short: 'The same trick',
    intro: {
      story:
        'Larkspur’s shelves keep prices right and the depot calm. The team’s AI assistant runs on a model server. Does it keep copies too?',
      goal: 'Where else does the keep-a-copy trick show up?',
      learn: [
        'A prompt cache keeps work on a prompt’s opening',
        'A KV cache keeps a reply’s work for that reply',
        'The questions every cache answers',
      ],
      terms: [
        [
          'Prompt cache',
          'A provider’s store of work already done reading a prompt’s opening, reused by matching calls.',
        ],
        [
          'KV cache',
          'The keys and values a model keeps for tokens it already read, so each new token computes only its own.',
        ],
      ],
    },
  },
  {
    id: '07-cache-policy',
    title: 'Set Larkspur’s cache policy',
    short: 'Cache policy',
    intro: {
      story:
        'Everything is on the bench: a TTL per kind, purge and versioned names. The owner has set how stale each kind may be.',
      goal: 'Which policy keeps the most requests on the shelves within the limits?',
      learn: [
        'How TTLs, purges and versioned names work together',
        'How to read a day of traffic kind by kind',
        'Why more than one policy can be equally good',
      ],
      terms: [
        ['Cache policy', 'The rules for each kind of content: how long to keep it, and how changes reach the shelves.'],
      ],
    },
  },
];

export const CACHING_MODULE: Module = {
  id: 'caching',
  title: 'Caching & CDNs',
  description: 'Why a copy close by beats the original far away: edge caches, expiry, stale prices and a flash sale.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s online shop runs from one depot; the team puts copies in three regional warehouses and keeps them right through a price change and a flash sale.',
  chapters: CHAPTERS,
  recall: RECALL,
};
