// Multi-agent systems: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { CATALOGUES, jobOf, ROOM } from '../../lib/multi-agent/sim';
import { RECALL } from './recall';

const N = CATALOGUES.length;
const RATES = jobOf('rates');

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-desk',
    title: 'One agent, one desk',
    short: 'One desk',
    intro: {
      story: `You join Larkspur’s buying team. Ines wants a supplier report built from ${N} catalogues, and the assistant starts on it alone.`,
      goal: 'What happens when one agent has more to read than it can hold?',
      learn: ['An agent holds only so much at once', 'What happens to the rest'],
      terms: [['Context window', 'The text a model can hold at once; past it, the rest is cut off.']],
    },
  },
  {
    id: '02-lead-and-helpers',
    title: 'A lead and helpers',
    short: 'Helpers',
    intro: {
      story: `Alone, the assistant ran out of room after ${ROOM} catalogues. Now it leads: it can hire helpers, each at its own desk.`,
      goal: 'What do helpers buy, and what do they cost?',
      learn: ['Helpers split the reading, each with its own room', 'Every helper adds to the token bill'],
      terms: [
        ['Lead agent', 'The agent that splits a job, hands out the parts and merges what comes back.'],
        ['Helper', 'An agent the lead hands part of a job to; it works alone and reports back.'],
        ['Token', 'A small piece of text a model reads or writes; providers bill by the token.'],
      ],
    },
  },
  {
    id: '03-the-hand-off',
    title: 'The hand-off',
    short: 'Hand-off',
    intro: {
      story:
        'Three helpers finished the report quickly. Today the lead is rushed and hands out one-line briefs instead.',
      goal: 'What does a helper need to be told to do its share?',
      learn: ['A vague brief makes helpers repeat each other and leave gaps', 'What a good brief says'],
      terms: [['Brief', 'The instructions a lead gives a helper: its share, and what to send back.']],
    },
  },
  {
    id: '04-agreed-shapes',
    title: 'Agreed shapes',
    short: 'Shapes',
    intro: {
      story:
        'Detailed briefs made the report complete. Now every reply must also fit a shape the lead and helpers agreed.',
      goal: 'What happens to a reply that doesn’t fit the agreed shape?',
      learn: ['An agreed shape lets the lead check each reply as it arrives', 'A reply that doesn’t fit goes back'],
      terms: [
        ['Agreed shape', 'The fields a reply must have, and the kind of value in each, settled before work starts.'],
      ],
    },
  },
  {
    id: '05-waiting',
    title: 'Waiting on each other',
    short: 'Waiting',
    intro: {
      story: `Ines now wants a euro price list from ${RATES.catalogues} catalogues. Two helpers split them, but each needs something the other has.`,
      goal: 'What happens when two helpers wait on each other?',
      learn: [
        'Two helpers waiting on each other never finish',
        'A timeout lets the lead step in',
        'Work that must talk suits one agent',
      ],
      terms: [
        ['Deadlock', 'Two workers each waiting for the other, so neither can go on.'],
        ['Timeout', 'A limit on how long to wait before giving up and doing something else.'],
      ],
    },
  },
  {
    id: '06-trusting-a-helper',
    title: 'Trusting a helper',
    short: 'Trust',
    intro: {
      story:
        'The euro list came in late but right. Back on the supplier report, one helper misreads a price, and reports it with confidence.',
      goal: 'How does the lead catch a helper that is sure and wrong?',
      learn: ['A helper can be sure and wrong', 'Check each reply against its source before merging'],
      terms: [['Check', 'Re-reading a reply against its source before trusting it.']],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: set up three jobs',
    short: 'Workbench',
    intro: {
      story:
        'You have seen helpers speed up, cost, repeat, bounce, wait and slip. Now three jobs need setting up, each its own way.',
      goal: 'When does a job need helpers, and how many?',
      learn: ['Split work only where the parts don’t need to talk', 'Check every reply, whoever sent it'],
      terms: [],
    },
  },
];

export const MULTI_AGENT_MODULE: Module = {
  id: 'multi-agent',
  title: 'Multi-agent systems',
  description:
    'When one agent beats five: splitting a job between a lead and helpers, the briefs and shapes they agree, deadlocks, and checking every answer.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents'],
  story: `Larkspur Supply Co.’s assistant builds a supplier report from ${N} catalogues at a switchboard, hiring helper agents by patch cord.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
