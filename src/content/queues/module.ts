// Queues and background jobs: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-waiting-at-the-till',
    title: 'Waiting at the till',
    short: 'At the till',
    intro: {
      story:
        'Larkspur’s spring sale is about to open. Today the till handles each order right there: book the courier, print the label, email, then answer.',
      goal: 'What does a customer see when the till does all the work?',
      learn: [
        'Work done inside a request makes the customer wait',
        'A busy till makes everyone behind wait too',
        'Why slow work belongs somewhere else',
      ],
      terms: [
        ['Request', 'What a customer’s browser sends when they press Buy; the page waits for the answer.'],
        ['Inline', 'Done inside the request, before the answer goes back.'],
      ],
    },
  },
  {
    id: '02-a-ticket-and-a-worker',
    title: 'A ticket and a worker',
    short: 'A ticket',
    intro: {
      story:
        'The team’s fix: the till only writes a ticket and answers at once. Someone in the back does the slow part.',
      goal: 'What changes for the customer when the work moves to a queue?',
      learn: [
        'A queue holds jobs until a worker is free',
        'The till answers before the work is done',
        'A worker takes one job at a time',
      ],
      terms: [
        ['Queue', 'A line of jobs waiting their turn: here, the order rail.'],
        ['Job', 'One piece of work on the queue: here, ship one order.'],
        ['Worker', 'A program that takes jobs off the queue and does them, one at a time.'],
      ],
    },
  },
  {
    id: '03-when-the-line-grows',
    title: 'When the line grows',
    short: 'The line grows',
    intro: {
      story:
        'Customers love the instant answer. Then the sale opens, and orders arrive faster than one worker can pack them.',
      goal: 'What happens when jobs arrive faster than workers finish them?',
      learn: ['Arrival rate against service rate', 'A backlog grows while arrivals win', 'More workers drain it'],
      terms: [
        ['Backlog', 'Jobs waiting on the queue that no worker has started.'],
        ['Arrival rate', 'How many jobs join the queue each minute.'],
        ['Service rate', 'How many jobs the workers finish each minute.'],
      ],
    },
  },
  {
    id: '04-try-again-later',
    title: 'Try again later',
    short: 'Try again',
    intro: {
      story:
        'Mid-sale, the courier’s booking site stops answering. Jobs fail, and the workers put them back to try again.',
      goal: 'How soon should a failed job try again?',
      learn: [
        'A retry tries a failed job again',
        'Backoff waits longer after each failure',
        'Jitter spreads retries so they don’t land together',
      ],
      terms: [
        ['Retry', 'Trying a failed job again.'],
        ['Backoff', 'Waiting longer before each new try, doubling the wait each time.'],
        ['Jitter', 'A random part of the wait, so jobs that failed together don’t retry together.'],
      ],
    },
  },
  {
    id: '05-ran-twice',
    title: 'Ran twice',
    short: 'Ran twice',
    intro: {
      story:
        'The sale is busy and the workers are flat out. Then one trips over a box mid-job, a parcel already booked.',
      goal: 'What happens to a job whose worker falls over halfway?',
      learn: [
        'A lease hides a job while a worker has it',
        'When the lease runs out, the job comes back',
        'Idempotent jobs are safe to run twice',
      ],
      terms: [
        ['Lease', 'How long a taken job stays hidden from other workers; with no “done” by then, it comes back.'],
        ['At least once', 'A queue’s promise that every job runs, and some may run more than once.'],
        ['Idempotent', 'Safe to repeat: running it twice has the same effect as running it once.'],
      ],
    },
  },
  {
    id: '06-the-job-that-never-works',
    title: 'The job that never works',
    short: 'Never works',
    intro: {
      story:
        'Retries saved the outage. But one order has an address the courier can’t read, and its job fails every time.',
      goal: 'What should a queue do with a job that will never succeed?',
      learn: [
        'A poison job fails on every try',
        'A limit on tries stops the retrying',
        'A dead-letter queue keeps it for a person',
      ],
      terms: [
        ['Poison job', 'A job that fails every time, however often it is tried.'],
        ['Dead-letter queue', 'A shelf for jobs that ran out of tries, kept for a person to look at.'],
      ],
    },
  },
  {
    id: '07-sale-day',
    title: 'Run the sale day',
    short: 'Sale day',
    intro: {
      story:
        'Everything is on the bench: workers, the most tries and the lease. Tomorrow’s sale brings the outage, the bad address and a crash.',
      goal: 'Which settings lose no good order and keep waits short, with the fewest workers?',
      learn: [
        'A lease must outlast the slowest job',
        'Enough tries to ride out an outage',
        'Why more than one setting can be equally good',
      ],
      terms: [['Workbench', 'Every setting at once, run over the whole sale, checked against the owner’s rule.']],
    },
  },
];

export const QUEUES_MODULE: Module = {
  id: 'queues',
  title: 'Queues and background jobs',
  description: 'How an order waits its turn: a queue, workers that take jobs, retries, and the jobs that run twice.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'A sale floods Larkspur Supply Co. with orders; the team moves the slow work onto a queue, and learns it keeps work safe while it waits, and any job may run twice.',
  chapters: CHAPTERS,
  recall: RECALL,
};
