// Reasoning models & thinking budgets, module 11: its chapters and module facts. Chapter ids are a contract with readers'
// saved progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/reasoning/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-answer-now-or-think-first',
    title: 'Answer now or think first',
    short: 'Think first',
    intro: {
      story:
        'Larkspur’s assistant reads the right documents and passes the Evals module’s release gate on policy questions. Then sales starts sending it quotes: volume prices, split order lines, a few sums in a row. The answers come back fast, and some are wrong.',
      goal: 'What changes when a model writes out its working before it answers?',
      learn: [
        'What a reasoning model’s thinking is: text it writes before the answer',
        'Why a question with several steps goes wrong when answered at once',
        'Why the same model, with the same documents, can give a different answer after thinking',
      ],
      terms: [
        ['Reasoning model', 'A model trained to write out its working before it gives an answer.'],
        [
          'Thinking',
          'The working a reasoning model writes before its answer. Readers of the reply usually see a summary of it, or nothing.',
        ],
        [
          'Multi-step question',
          'A question whose answer needs several small steps in a row, like picking a price and then multiplying.',
        ],
      ],
    },
  },
  {
    id: '02-thinking-is-tokens',
    title: 'Thinking is tokens',
    short: 'Thinking is tokens',
    intro: {
      story:
        'Thinking fixed the split-order quote. The support lead’s next question is the one every team asks: what does it cost, and how long does the customer wait?',
      goal: 'Where does thinking show up on the bill and on the clock?',
      learn: [
        'Why thinking is counted in tokens, like the answer',
        'Why thinking is billed as output, even when you never see it',
        'Why every thinking token is written before the first word of the answer',
      ],
      terms: [
        [
          'Token',
          'A small piece of text a model reads or writes; prices and limits are counted in them. The Tokens module covers them.',
        ],
        [
          'Output tokens',
          'The tokens a model writes, billed separately from the tokens it reads. Thinking counts as output.',
        ],
        ['Wait', 'How long the customer waits for the whole answer: the thinking is written first, then the answer.'],
      ],
    },
  },
  {
    id: '03-the-effort-dial',
    title: 'The effort dial',
    short: 'Effort dial',
    intro: {
      story:
        'Thinking costs tokens and time. Larkspur’s team can ask for more or less of it with one setting, effort, and wants to know what each step of the dial buys on the questions that need it.',
      goal: 'Does more thinking keep making answers better?',
      learn: [
        'What an effort setting is: none, low, medium or high',
        'How to sweep a set of questions across every effort level',
        'Why accuracy rises and then flattens while the cost keeps climbing',
      ],
      terms: [
        ['Effort', 'A setting that tells a reasoning model how much work to put into an answer, thinking included.'],
        ['Sweep', 'Running the same questions at every setting, to compare them on equal terms.'],
        ['Accuracy', 'The share of answers that pass the check: here, the Evals module’s key-fact check.'],
      ],
    },
  },
  {
    id: '04-when-more-thinking-hurts',
    title: 'When more thinking hurts',
    short: 'Overthinking',
    intro: {
      story:
        'After chapter 3, someone suggests turning effort up to high for everything, just in case. The team tries it on the simplest questions it has: counts, with a few stray details nearby.',
      goal: 'Can more thinking make an answer worse?',
      learn: [
        'What overthinking looks like: a long chain of reasoning that wanders off the question',
        'Why simple questions with distracting details are where it shows',
        'Why “high everywhere” is not a safe default',
      ],
      terms: [
        ['Distractor', 'A detail near the question that has nothing to do with the answer, but looks like it might.'],
        ['Overthinking', 'Thinking past the point of the answer, until the extra steps change it for the worse.'],
        ['Inverse scaling', 'When more of something, here thinking, makes results worse instead of better.'],
      ],
    },
  },
  {
    id: '05-effort-is-a-hint',
    title: 'Effort is a hint, not a counter',
    short: 'A hint',
    intro: {
      story:
        'The team sets effort to high and expects every answer to think the same amount. The token counts say otherwise.',
      goal: 'What does an effort setting actually control, in today’s APIs?',
      learn: [
        'Why the same effort gives a short think on an easy question and a long one on a hard question',
        'What the current APIs take: effort levels and adaptive thinking, not a fixed token budget',
        'Why a hard cap on output still matters',
      ],
      terms: [
        ['Adaptive thinking', fact('adaptive').claim],
        [
          'Thinking budget',
          'A fixed number of tokens a model may think for. The older way to control thinking; effort replaces it on newer models.',
        ],
        ['max_tokens', 'The hard limit on everything a reply writes, thinking and answer together.'],
      ],
    },
  },
  {
    id: '06-measure-then-pick',
    title: 'Measure, then pick',
    short: 'Measure, then pick',
    intro: {
      story:
        'Every kind of question Larkspur gets has its own best effort, and nobody wants to guess. The release gate from the Evals module gets a say.',
      goal: 'How do you choose an effort for each kind of question, with numbers?',
      learn: [
        'How to run a sweep through a release gate, one kind of question at a time',
        'Why the right setting is the lowest effort that passes, not the highest',
        'How the no-regressions rule catches overthinking',
      ],
      terms: [
        [
          'Release gate',
          'The rule that decides, from a test run, whether a change ships. Here: a pass-rate bar, and no question that passed without thinking may fail.',
        ],
        ['Baseline', 'What a change is measured against: here, answering with no thinking.'],
        ['Regression', 'A question that used to pass and now fails.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: an effort per request',
    short: 'Workbench',
    intro: {
      story:
        'Everything is on the bench: three kinds of request, four effort levels, and the recorded answers graded live. The support lead needs one setting per kind before the assistant goes back on duty.',
      goal: 'Which effort should each kind of request get?',
      learn: [
        'How to read accuracy, cost and wait together',
        'Why the best plan mixes efforts instead of using one everywhere',
        'Why more than one plan can be equally good',
      ],
      terms: [
        ['Effort plan', 'One effort level for each kind of request.'],
        ['Cost', 'Here, thinking and answer tokens added up, in relative units: one output token is 1.'],
      ],
    },
  },
];

export const REASONING_MODULE: Module = {
  id: 'reasoning',
  title: 'Reasoning models & thinking budgets',
  description:
    'Models that think before they answer: what a thinking budget buys, what it costs, and when more thinking hurts.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['evals'],
  story:
    'Back at Larkspur Supply Co., the assistant starts getting quotes and delivery questions with several steps, and the team has to decide how much it should think before it answers.',
  chapters: CHAPTERS,
  recall: RECALL,
};
