// Where the effort goes: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-setting',
    title: 'One setting for all',
    short: 'One setting',
    intro: {
      story:
        'Larkspur’s assistant answers questions all day. A water tower holds the day’s effort budget, and valves send it to four mills.',
      goal: 'What happens if every question gets the most effort?',
      learn: ['Why maximum effort runs out', 'Why no effort gets too much wrong'],
      terms: [
        ['Effort', 'The extra work spent on one answer: thinking longer, looking it up, checking, or a bigger model.'],
      ],
    },
  },
  {
    id: '02-think-longer',
    title: 'Think longer',
    short: 'Think',
    intro: {
      story:
        'Every valve is shut, so each question goes straight to the assistant. Puzzles and stock questions come out wrong.',
      goal: 'Which questions does thinking longer fix?',
      learn: ['Thinking fixes working-out', 'It can’t supply a fact the model lacks'],
      terms: [
        ['Thinking', 'Working the answer out in steps before replying; the extra words are billed like any others.'],
      ],
    },
  },
  {
    id: '03-look-it-up',
    title: 'Look it up',
    short: 'Look it up',
    intro: {
      story: 'Puzzles now go to the thinking wheel. Stock questions are still wrong: today’s prices are in no model.',
      goal: 'What fixes a question about today?',
      learn: ['A look-up brings in facts the model can’t know', 'It is cheap next to thinking'],
      terms: [['Look-up', 'Fetching the fact from a live source, like the stock system, before answering.']],
    },
  },
  {
    id: '04-check-the-work',
    title: 'Check the work',
    short: 'Check',
    intro: {
      story: 'Order totals still come back wrong now and then: one slip in the sums and the bill is off.',
      goal: 'When is a second pass worth paying for?',
      learn: ['A checker catches slips in sums', 'It costs a second pass on every answer it sees'],
      terms: [['Checker', 'A second pass that redoes the working and sends a wrong answer back.']],
    },
  },
  {
    id: '05-bigger-model',
    title: 'The bigger model',
    short: 'Bigger model',
    intro: {
      story: 'Warranty questions are the last ones wrong: long terms, with exceptions inside exceptions.',
      goal: 'What helps when the reading itself is hard?',
      learn: ['A bigger model reads hard text better', 'It is the priciest mill', 'Thinking can’t stand in for it'],
      terms: [['Bigger model', 'A larger model trained on more text: better at hard reading, dearer per answer.']],
    },
  },
  {
    id: '06-per-request',
    title: 'Deciding per request',
    short: 'Per request',
    intro: {
      story:
        'For one day the tower is filled for maximum effort on every question. Then a sorter starts sending each one where it needs.',
      goal: 'How much does sending effort only where it helps save?',
      learn: ['A cheap sorter reads each question first', 'Routing keeps the answers and cuts the bill'],
      terms: [['Routing', 'Choosing, for each question, where its effort goes.']],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a day of questions',
    short: 'Workbench',
    intro: {
      story: 'You now set every valve for a whole day of questions, on the usual budget.',
      goal: 'Which settings get every answer right within the budget?',
      learn: ['How the four kinds of effort work together', 'Why the easy questions get none'],
      terms: [],
    },
  },
];

export const ADAPTIVE_COMPUTE_MODULE: Module = {
  id: 'adaptive-compute',
  title: 'Where the effort goes',
  description:
    'No setting is best for every question: send extra effort where it changes the answer, to thinking longer, looking it up, checking, or a bigger model.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['reasoning', 'choosing-models'],
  story:
    'Larkspur Supply Co.’s assistant runs a mill yard: a water tower of effort, a valve for each kind of question, and four mills that each fix a different kind of wrong answer.',
  chapters: CHAPTERS,
  recall: RECALL,
};
