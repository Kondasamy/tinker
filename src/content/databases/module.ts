// Databases & indexes: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-find-one-order',
    title: 'Find one order',
    short: 'Find one order',
    intro: {
      story:
        'Larkspur’s order system keeps every order in one table. Customers wait on the orders page, and the team wants to know why.',
      goal: 'What does the database do to find a single order?',
      learn: [
        'How a table is stored as pages of rows',
        'A full scan reads every page',
        'Why its cost grows with the table',
      ],
      terms: [
        ['Row', 'One record in a table: here, one order.'],
        ['Page', 'A fixed-size block of rows the database reads in one go: here, 50 orders.'],
        ['Full scan', 'Reading every page of a table to find the rows a request wants.'],
      ],
    },
  },
  {
    id: '02-the-index',
    title: 'The index',
    short: 'The index',
    intro: {
      story:
        'A full scan opened every drawer for one order. The team builds a card index on order number, sorted like a phone book.',
      goal: 'How does an index find one order in a few page reads?',
      learn: [
        'An index is a sorted copy of a column',
        'A B-tree lookup reads one page per level',
        'Why the tree stays shallow',
      ],
      terms: [
        ['Index', 'A sorted copy of one or more columns, each entry pointing at its row.'],
        ['B-tree', 'The tree most databases use for indexes: a root page, levels of pages under it, sorted leaves.'],
        ['Leaf', 'A page at the bottom of a B-tree, holding sorted keys and where each row lives.'],
      ],
    },
  },
  {
    id: '03-every-write-pays',
    title: 'Every write pays',
    short: 'Every write pays',
    intro: {
      story:
        'The order lookup is fast now. The team wants indexes on customer and date too, then the Monday rush brings new orders.',
      goal: 'What does each index cost when a new order is written?',
      learn: ['An insert updates every index', 'Full leaves split in two', 'Why unused indexes are pure cost'],
      terms: [
        ['Insert', 'Writing a new row into a table.'],
        ['Page split', 'When a full page gets a new key, it splits in two and its parent gains an entry.'],
      ],
    },
  },
  {
    id: '04-column-order',
    title: 'Column order matters',
    short: 'Column order',
    intro: {
      story:
        'A regular customer checks their orders daily. The team builds one index on customer, then date, for their orders this month.',
      goal: 'Which requests can a two-column index serve?',
      learn: [
        'A composite index sorts by its first column first',
        'It serves requests on that leading column',
        'It can’t serve the second column alone',
      ],
      terms: [
        ['Composite index', 'An index on more than one column, sorted by the first, then the next within it.'],
        ['Leading column', 'A composite index’s first column, the one its entries are sorted by first.'],
      ],
    },
  },
  {
    id: '05-planner-skips',
    title: 'When the planner skips your index',
    short: 'Planner skips',
    intro: {
      story:
        'The team adds an index on date for the warehouse’s reports. Today’s orders come back fast; this month’s report is no faster.',
      goal: 'Why would the database ignore an index you built?',
      learn: [
        'The planner guesses each way’s cost first',
        'An index fetches its rows one by one',
        'Past a small share of rows, a scan wins',
      ],
      terms: [
        ['Planner', 'The part of the database that picks how to run each request, before running it.'],
        ['Estimated rows', 'The planner’s guess of how many rows a request matches, from statistics it keeps.'],
      ],
    },
  },
  {
    id: '06-joining-tables',
    title: 'Joining tables',
    short: 'Joining tables',
    intro: {
      story:
        'Each morning the warehouse prints today’s orders with each customer’s details, which live in a separate customers table.',
      goal: 'How does the database pair each order with its customer?',
      learn: [
        'A join pairs rows from two tables',
        'A nested loop looks up once per outer row',
        'Why that lookup is the one to index',
      ],
      terms: [
        ['Join', 'Pairing rows from two tables that share a value, like an order and its customer.'],
        ['Nested loop', 'A join that takes each row of one table and looks up its matches in the other.'],
      ],
    },
  },
  {
    id: '07-index-plan',
    title: 'Plan Larkspur’s indexes',
    short: 'Index plan',
    intro: {
      story:
        'Everything is on the bench: a day of requests, the new orders, five possible indexes and a budget for writes.',
      goal: 'Which indexes make the day’s reads cheapest within the write budget?',
      learn: [
        'How to weigh reads against writes',
        'Why one index can serve two requests',
        'Why some indexes aren’t worth their writes',
      ],
      terms: [
        ['Workload', 'The requests and writes a database serves in a day, with how often each comes.'],
        ['Write budget', 'How many pages a day the team lets new orders cost, so checkout stays quick.'],
      ],
    },
  },
];

export const DATABASES_MODULE: Module = {
  id: 'databases',
  title: 'Databases & indexes',
  description:
    'Why the orders page is slow: a full scan, an index that jumps straight to the rows, and what every write then pays.',
  level: 'Beginner',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s orders page crawls; the team finds one order among ten thousand, builds indexes, pays for them on every write and plans the day’s set.',
  chapters: CHAPTERS,
  recall: RECALL,
};
