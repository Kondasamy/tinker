// Observability & error analysis: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one. They match the chapter domains in src/lib/observability/traces.ts (DOMAINS).
// Each chapter's `intro` is the story column's opening context; its island is picked by src/pages/observability/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-what-it-did',
    title: 'What the assistant did',
    short: 'What it did',
    intro: {
      story:
        'Larkspur’s assistant is live and passed Evals’ offline suite. Customers ask it about orders and policies all day. What does it do with real traffic?',
      goal: 'What happened, step by step, when a customer asked the assistant a question?',
      learn: [
        'A trace: one request’s record, from the question to the reply',
        'Spans: the steps inside it (retrieval, model calls, tool calls, the reply)',
        'Reading a trace as a waterfall: what ran, in what order, for how long',
      ],
      terms: [
        ['Trace', 'The record of one request through the assistant, made of spans.'],
        [
          'Span',
          'One step in a trace, with a start, an end and what it did. Spans nest: the whole run is the parent of its steps.',
        ],
        [
          'Waterfall',
          'A trace drawn as one row per span, each bar placed where the step started and as long as it took.',
        ],
      ],
    },
  },
  {
    id: '02-first-failure',
    title: 'The first failure',
    short: 'First failure',
    intro: {
      story: 'Some customers got wrong answers yesterday. Each bad reply has a trace behind it.',
      goal: 'Where, inside a bad trace, did things first go wrong?',
      learn: [
        'Why the reply is where you notice a failure, not where it starts',
        'Finding the first span that went wrong',
        'Why the first failure, not the last, is the one to note',
      ],
      terms: [
        [
          'First failure',
          'The earliest span in a trace that did the wrong thing. Later spans often go wrong only because of it.',
        ],
        ['Upstream', 'Earlier in the trace. An upstream error flows into every step after it.'],
      ],
    },
  },
  {
    id: '03-open-coding',
    title: 'Open coding',
    short: 'Open coding',
    intro: {
      story:
        'You found where two traces went wrong; yesterday left many more. Nobody has a list of what goes wrong yet, so there is nothing to tick.',
      goal: 'How do you start making sense of failures before you know what kinds there are?',
      learn: [
        'Open coding: a short note per failed trace, in your own words',
        'Why you write notes before you choose categories',
        'Why a person who knows the business does it',
      ],
      terms: [
        ['Open coding', 'Reading traces one by one and writing a free note on what went wrong in each.'],
        ['Note', 'A line in your own words about one trace’s failure. Notes are never graded.'],
      ],
    },
  },
  {
    id: '04-axial-coding',
    title: 'Axial coding',
    short: 'Axial coding',
    intro: {
      story: 'You have a note for every failed trace. Read together, some notes say the same thing in different words.',
      goal: 'How do notes become a short list of failure modes you can count?',
      learn: [
        'Axial coding: grouping notes that share a cause',
        'Failure modes: the groups, named by what went wrong',
        'Counting how often each mode happened',
      ],
      terms: [
        ['Axial coding', 'Sorting open notes into groups that share a cause, then naming and counting the groups.'],
        ['Failure mode', 'One kind of failure, such as “answered from an old passage”, with the traces that show it.'],
      ],
    },
  },
  {
    id: '05-what-matters',
    title: 'Which ones matter',
    short: 'What matters',
    intro: {
      story: 'The failure modes are counted. The team can fix one this week.',
      goal: 'Which failure mode should Larkspur fix first?',
      learn: [
        'Why the most common failure isn’t always the first to fix',
        'Weighing how often against how much harm',
        'Picking one fix, with a reason',
      ],
      terms: [
        [
          'Harm',
          'How much a failure costs the customer or the business when it happens. Here, the team’s rating from 1 to 3.',
        ],
      ],
    },
  },
  {
    id: '06-trace-to-test',
    title: 'From trace to test',
    short: 'Trace to test',
    intro: {
      story:
        'The team rebuilt the policy index so it holds only this year’s passages. Did that fix the old-passage failures, and will it stay fixed?',
      goal: 'How do failed traces become tests that guard the fix?',
      learn: [
        'Turning a failed trace into an eval case with a reference answer',
        'Running the cases on the current and the fixed version, with Evals’ graders',
        'Why the cases join the suite for good',
      ],
      terms: [
        ['Eval case', 'An input with a reference answer and a grader, as in the Evals module.'],
        [
          'Regression',
          'Something that worked, or was fixed, breaking again later. A test from a real failure catches it.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a new day',
    short: 'Workbench',
    intro: {
      story:
        'The fix shipped. A new day brings a new queue of thumbs-down traces, and the team wants one fix for the week again.',
      goal: 'Given a fresh day of failed traces, which one fix should ship?',
      learn: [
        'Triage: labelling each failed trace with its mode',
        'Reading the tally by count and harm together',
        'How a wrong label can point you at the wrong fix',
      ],
      terms: [['Triage', 'Sorting a queue of problems to decide which to deal with first.']],
    },
  },
];

export const OBSERVABILITY_MODULE: Module = {
  id: 'observability',
  title: 'Observability & error analysis',
  description:
    'Reading what the assistant really did in production: traces, labelling failures by hand, and finding the ones that matter.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['evals'],
  story:
    'Larkspur Supply Co.’s assistant is answering real customers now, so the team reads its traces, names what goes wrong, and fixes what matters first.',
  chapters: CHAPTERS,
  recall: RECALL,
};
