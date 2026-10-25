// Calibration: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-what-70-should-mean',
    title: 'What 70% should mean',
    short: 'What 70% means',
    intro: {
      story:
        'Larkspur’s support assistant tells customers how sure it is of each answer. The support team asks when those numbers can be trusted.',
      goal: 'What does a stated confidence promise, and does the assistant keep it?',
      learn: [
        'What a calibrated confidence means',
        'How jars sort answers by the confidence they stated',
        'How to spot a jar that claims too much',
      ],
      terms: [
        ['Confidence', 'How sure a model says it is, from 0% to 100%.'],
        [
          'Calibrated',
          'Its confidences mean what they say: of the answers it gives 70%, about seven in ten are right.',
        ],
        ['Jar', 'Here, the answers that stated about the same confidence, gathered so you can count how many were right.'],
      ],
    },
  },
  {
    id: '02-honest-jars',
    title: 'Honest jars',
    short: 'Honest jars',
    intro: {
      story:
        'Before trusting the assistant’s numbers, the team checks a model whose every guess can be counted: Larkspur mini, this site’s tiny model.',
      goal: 'Is a tiny model honest about how sure it is of its own guesses?',
      learn: [
        'How a model’s odds for the next piece are a confidence',
        'Why held-out text is the fair test',
        'How to read a reliability diagram',
      ],
      terms: [
        ['Top guess', 'The next piece of text the model gives the highest probability.'],
        ['Held-out text', 'Documents the model never trained on, kept aside to test it fairly.'],
        [
          'Reliability diagram',
          'A chart of stated confidence against how often the answers were right. Honest models sit on its diagonal.',
        ],
      ],
    },
  },
  {
    id: '03-after-the-polish',
    title: 'After the polish',
    short: 'After the polish',
    intro: {
      story:
        'Fine-tuning taught Larkspur mini to sign off in the house style. Its replies look more polished. The team wonders what else moved.',
      goal: 'Does polishing a model’s style change how far its confidence can be trusted?',
      learn: [
        'What the style fine-tune did to its confidence',
        'Why it is scored on text it was not tuned for',
        'What larger models showed after post-training',
      ],
      terms: [
        ['Fine-tune', 'Larkspur mini trained a little more on a small set of styled replies.'],
        ['Overconfident', 'Says it is surer than it turns out to be: the jars hold less mint than their rings.'],
      ],
    },
  },
  {
    id: '04-one-dial',
    title: 'One dial',
    short: 'One dial',
    intro: {
      story:
        'The team likes the fine-tune’s style and won’t retrain it. Can its confidence be repaired after the fact instead?',
      goal: 'Can one number make an overconfident model honest again?',
      learn: [
        'How temperature softens or sharpens every confidence',
        'Why the top guess never changes',
        'Why you set it on one half and check it on the other',
      ],
      terms: [
        [
          'Temperature',
          'A number the model’s scores are divided by before they become probabilities. Above 1 softens them.',
        ],
        [
          'Temperature scaling',
          'Fixing a model’s confidence by choosing one temperature on held-out text, without retraining it.',
        ],
        [
          'Log loss',
          'How surprised the model was by the real next piece, on average. Lower is better; it punishes sure mistakes hard.',
        ],
      ],
    },
  },
  {
    id: '05-keeping-score',
    title: 'Keeping score',
    short: 'Keeping score',
    intro: {
      story: 'The team wants one number per model to track from release to release, not a row of jars to eyeball.',
      goal: 'Which single number tells you a confidence can be trusted?',
      learn: [
        'How ECE adds up the gaps between rings and mint',
        'How the Brier score also rewards being sure and right',
        'Why a model can be honest and still no help',
      ],
      terms: [
        [
          'ECE',
          'Expected calibration error: each jar’s gap between stated and actual, weighted by its size. 0 is honest.',
        ],
        [
          'Brier score',
          'The average squared gap between each confidence and what happened (1 right, 0 wrong). Lower is better.',
        ],
      ],
    },
  },
  {
    id: '06-when-to-hand-over',
    title: 'When to hand over',
    short: 'When to hand over',
    intro: {
      story:
        'Back at the support desk. Each answer can go straight to the customer, or to a person when the assistant is unsure.',
      goal: 'Where should the assistant hand an answer to a person?',
      learn: [
        'How a hand-over line trades coverage for accuracy',
        'Why the line rests on the confidence’s order',
        'How to set it from a limit on wrong answers',
      ],
      terms: [
        ['Hand-over line', 'Answers stated below it go to a person instead of the customer. Also called abstaining.'],
        ['Coverage', 'The share of questions the assistant answers itself.'],
        ['Accuracy', 'Of the answers it sends, the share that are right.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a dial and a line per kind',
    short: 'Workbench',
    intro: {
      story:
        'The desk handles three kinds of question: orders, refunds and billing, and products. The assistant is not equally sure of each.',
      goal: 'What temperature and hand-over line should each kind of question get?',
      learn: [
        'How to set the dial so shown confidences are honest',
        'How to set the line so few wrong answers go out',
        'Why the best plan differs by kind',
      ],
      terms: [
        ['Plan', 'A temperature and a hand-over line for each kind of question.'],
        ['Workbench', 'The chapter’s free-play bench: change the plan and see every result.'],
      ],
    },
  },
];

export const CALIBRATION_MODULE: Module = {
  id: 'calibration',
  title: 'Calibration',
  description: 'When to trust a model’s confidence: 70% should mean right seven times in ten, and how to check and fix it.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['evals'],
  story:
    'Larkspur Supply Co.’s support team wants to know when to trust its assistant’s confidence, and when to hand a customer to a person.',
  chapters: CHAPTERS,
  recall: RECALL,
};
