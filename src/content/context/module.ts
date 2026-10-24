// Context engineering & memory, module 8: its chapters and module facts. Chapter ids are a contract with readers' saved
// progress: never rename one. They match the recording scenarios in src/lib/context/loop.ts (DOMAINS).
// Each chapter's `intro` is the story column's opening context; its island is picked by src/pages/context/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/context/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-whats-in-the-window',
    title: 'What’s in the window',
    short: 'What’s in the window',
    intro: {
      story:
        'Larkspur’s assistant now answers from documents, calls tools and holds conversations. Each one adds text to what the model reads.',
      goal: 'What does the model read on each turn, and how much room does each part take?',
      learn: [
        'The parts of a turn: system prompt, tools, history, documents and the question',
        'That every part, the reply included, shares one token budget',
        'Which parts are big, counted live',
      ],
      terms: [
        [
          'Context window',
          'Everything the model reads in one turn, plus the reply it writes. It has a fixed size, counted in tokens.',
        ],
        [
          'Token',
          'The unit a model reads and is billed in: a word, part of a word or a mark. Counts here come from this site’s own tokenizer.',
        ],
        ['System prompt', 'Larkspur’s standing instructions to the model, sent at the top of every turn.'],
        [
          'Tool definition',
          'A tool’s name, description and input schema, sent with every turn so the model knows it can call it.',
        ],
        [
          'Budget',
          'How many tokens the host lets one turn use. A window over it is refused before the model is called.',
        ],
      ],
    },
  },
  {
    id: '02-more-isnt-better',
    title: 'More isn’t better',
    short: 'More isn’t better',
    intro: {
      story:
        'The right passage in the window fixed Mara Quill’s answer. The team’s next idea: send more passages, so the right one is always there.',
      goal: 'If the fact is in the window, does the model always find it?',
      learn: [
        'Why a fact in the middle of many passages is easier to miss',
        'How related but wrong passages pull the answer off',
        'Context rot: why a fuller window can answer worse',
      ],
      terms: [
        ['Distractor', 'A passage that looks related to the question but doesn’t hold the answer.'],
        [
          'Lost in the middle',
          'Models find a fact best at the start or end of a long input, and miss it more often in the middle.',
        ],
        ['Context rot', fact('context-rot').claim],
      ],
    },
  },
  {
    id: '03-fetch-when-needed',
    title: 'Fetch it when you need it',
    short: 'Fetch when needed',
    intro: {
      story:
        'More passages made answers worse, not better. Yet Larkspur can’t know in advance which passage a customer will need.',
      goal: 'Should the assistant get every document up front, or look things up when it needs them?',
      learn: [
        'Stuffing: every document in every window, and what it costs',
        'Just in time: a search tool the model calls when the question needs it',
        'Why a small, focused window answers better',
      ],
      terms: [
        ['Stuffing', 'Sending every document up front in every window, whatever the question.'],
        ['Just in time', 'Loading a document only when the model asks for it, through a tool.'],
        ['Search tool', 'A tool the model calls with a query; the host runs the search and returns the best passages.'],
      ],
    },
  },
  {
    id: '04-order-for-the-cache',
    title: 'Order for the cache',
    short: 'Order for the cache',
    intro: {
      story:
        'Every question in a conversation re-sends the tools, instructions, documents and history. Most of it matches the last call.',
      goal: 'How can Larkspur stop paying full price for the same text every call?',
      learn: [
        'Prompt caching: reusing the start of a recent call’s input',
        'Why one changing line near the top throws the rest away',
        'How to order a turn so the stable parts come first',
      ],
      terms: [
        [
          'Prompt caching',
          'The provider keeps the start of a recent input; a call that begins the same way reads it back at a fraction of the price.',
        ],
        ['Prefix', 'The start of the input, up to some point. A cache hit needs the prefix to match exactly.'],
        ['Cache breakpoint', 'A mark the host puts after a part, saying “cache everything up to here”.'],
        ['Cache hit', 'Tokens read back from the cache instead of being sent fresh.'],
      ],
    },
  },
  {
    id: '05-clearing-the-desk',
    title: 'Clearing the desk',
    short: 'Clearing the desk',
    intro: {
      story:
        'Mara’s conversation runs on, and each search leaves its results in the history. Soon most of the window is old search results.',
      goal: 'What can the assistant drop from a long conversation without losing what matters?',
      learn: [
        'Clearing old tool results and keeping the latest',
        'How clearing compares with one summary of the history',
        'Why clearing costs a cache write',
      ],
      terms: [
        ['Tool result', 'What the host sends back after a tool call, such as the passages a search found.'],
        [
          'Clearing',
          'Replacing an old tool result with a short placeholder, so the window keeps that a search happened but not its text.',
        ],
        ['Summary', 'The history replaced by a few lines that keep the decisions.'],
      ],
    },
  },
  {
    id: '06-memory',
    title: 'Memory outside the window',
    short: 'Memory',
    intro: {
      story:
        'Everything so far lives in one conversation. When Hollis Hardware writes again next week, the new conversation starts with an empty window.',
      goal: 'How can the assistant remember something from one conversation in the next?',
      learn: [
        'Why a new session starts empty',
        'Memory notes: files the assistant writes and reads in a later session',
        'What the host, not the model, keeps control of',
      ],
      terms: [
        ['Session', 'One conversation. Nothing in its window carries over to the next.'],
        ['Memory tool', fact('memory-tool').claim],
        [
          'Memory note',
          'A short file the assistant chose to write, read back into the window when a later session starts.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: the context policy',
    short: 'Workbench',
    intro: {
      story:
        'You have every lever now: what goes in, where it sits, and what is cached, cleared or remembered. Larkspur wants one policy.',
      goal: 'Which context policy gives good answers for the least cost?',
      learn: [
        'How the policies combine over a whole conversation',
        'Reading answer quality, tokens and cost side by side',
        'Why the policy that sends the most is rarely the best',
      ],
      terms: [
        [
          'Context policy',
          'The host’s rules for building each window: what to retrieve, how to keep the history, and where to cache.',
        ],
      ],
    },
  },
];

export const CONTEXT_MODULE: Module = {
  id: 'context',
  title: 'Context engineering & memory',
  description:
    'What goes into the model’s window each turn, in what order, and what it should remember between conversations.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['rag', 'tool-calling'],
  story:
    'Larkspur Supply Co.’s assistant now answers from documents, calls tools and holds long conversations, so the team has to choose what goes into its window each turn.',
  chapters: CHAPTERS,
  recall: RECALL,
};
