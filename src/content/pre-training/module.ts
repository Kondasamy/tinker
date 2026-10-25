// Pre-training, module 18: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
// read straight from the data, not the engine: the e2e specs import the registry, and the engine pulls in Evals' data
import RUNS from '../../../data/pre-training/runs.json' with { type: 'json' };
import CKPT from '../../../public/data/pre-training/meta.json' with { type: 'json' };

const STEPS = CKPT.steps;
const N = STEPS.at(-1)!.toLocaleString('en-US');

const CHAPTERS: Chapter[] = [
  {
    id: '01-before-training',
    title: 'Before training',
    short: 'Before training',
    intro: {
      story:
        'Larkspur’s team has only used models someone else trained. Today they watch one being made: Larkspur mini, trained from nothing on Larkspur’s own documents.',
      goal: 'What does a language model know before any training at all?',
      learn: [
        'What a model’s weights are before training',
        'Why an untrained model writes nonsense',
        'What a checkpoint is',
      ],
      terms: [
        [
          'Pre-training',
          'Training a model from scratch on a large pile of text, by having it guess each next piece over and over.',
        ],
        ['Weights', 'The numbers inside the model that decide what it writes. Before training they are random.'],
        [
          'Checkpoint',
          'A saved copy of the weights at one step of training, like a photo of the model at that moment.',
        ],
        [
          'Next piece',
          'What a language model guesses, one at a time: the next token of the text (see the Tokens module).',
        ],
      ],
    },
  },
  {
    id: '02-watch-it-learn',
    title: 'Watch it learn',
    short: 'Watch it learn',
    intro: {
      story: `Step 0 babbled. The run went on for ${N} steps and saved ${STEPS.length} checkpoints along the way.`,
      goal: 'How does the same prompt change as the model trains?',
      learn: [
        'How each training step nudges the weights',
        'What the loss measures, and why it falls',
        'How a checkpoint lets you look back at any moment of a run',
      ],
      terms: [
        [
          'Training step',
          'One small change to the weights, made after the model reads a batch of text and checks its guesses.',
        ],
        [
          'Loss',
          'How surprised the model is by the real next piece, on average. Lower is better; training pushes it down.',
        ],
      ],
    },
  },
  {
    id: '03-held-out',
    title: 'Held out',
    short: 'Held out',
    intro: {
      story: 'Training loss fell all run long. But it is measured on the very text the model trained on.',
      goal: 'Does the model also get better on text it has never seen?',
      learn: [
        'Why you score a model on held-out text',
        'What the gap between training and held-out loss means',
        'How memorising shows up as that gap growing',
      ],
      terms: [
        ['Held-out text', 'Documents kept out of training, used only to score the model.'],
        ['Gap', 'Held-out loss minus training loss: how much better the model does on text it has seen.'],
        ['Memorising', 'Learning the training text itself, rather than patterns that carry over to new text.'],
      ],
    },
  },
  {
    id: '04-data-is-the-curriculum',
    title: 'Data is the curriculum',
    short: 'The data',
    intro: {
      story: `The team reran training with one document, Larkspur’s environmental policy, copied ${RUNS.duplicated.copies} times into the data.`,
      goal: 'What does a model learn from text that repeats?',
      learn: [
        'Why the data decides what a model learns',
        'How a repeated document gets memorised and parroted',
        'Why teams remove duplicates before training',
      ],
      terms: [
        ['Data mix', 'Which documents go into training, and how often each one appears.'],
        ['Duplicate', 'The same text appearing more than once in the training data.'],
      ],
    },
  },
  {
    id: '05-a-leaked-test',
    title: 'A leaked test',
    short: 'A leaked test',
    intro: {
      story: `In a third run, ${RUNS.leaked.length} of the team’s test questions, answers included, slipped into the training data.`,
      goal: 'Does a model that has seen the test do better at the job?',
      learn: [
        'What a leaked test does to its score',
        'Why held-out text tells the truth when the test does not',
        'How to keep a test out of training',
      ],
      terms: [
        ['Leak', 'Test questions, or their answers, ending up in the training data.'],
        ['Contamination', 'Another word for a leak: a test is contaminated once the model has trained on it.'],
      ],
    },
  },
  {
    id: '06-bigger-or-longer',
    title: 'Bigger or longer',
    short: 'Bigger or longer',
    intro: {
      story:
        'The next model gets ten times the compute. The team must choose: a bigger model, or more text to train on.',
      goal: 'Should extra compute go into a bigger model or into more training data?',
      learn: [
        'What a scaling law is',
        'How the published advice changed between 2020 and 2022',
        'Why Larkspur mini’s numbers stay off the published chart',
      ],
      terms: [
        ['Compute', 'The arithmetic spent on training, roughly 6 × parameters × training tokens operations.'],
        ['Scaling law', 'A fitted curve that predicts how loss falls as the model, its data or its compute grows.'],
        ['Parameters', 'Another word for weights. A model’s size is counted in them.'],
      ],
    },
  },
  {
    id: '07-larkspurs-run',
    title: 'Larkspur’s training run',
    short: 'The run',
    intro: {
      story: 'The team gets one more training run before launch. They choose the data, and when to stop.',
      goal: 'Which data and which stopping step give the best score on text the model never saw?',
      learn: [
        'How the data mix and the stopping step trade off',
        'Why a small data set peaks early',
        'Why more than one plan can tie for best',
      ],
      terms: [
        ['Stopping step', 'The training step whose checkpoint you keep and ship.'],
        [
          'Early stopping',
          'Keeping an earlier checkpoint because held-out loss was lowest there, before memorising took over.',
        ],
      ],
    },
  },
];

export const PRE_TRAINING_MODULE: Module = {
  id: 'pre-training',
  title: 'Pre-training',
  description:
    'Watch Larkspur mini learn from nothing: the same prompt at every checkpoint, the data that shaped it, and a leaked test.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['tokens'],
  story:
    'Back at Larkspur Supply Co., the team trains its own tiny model from scratch, and learns what the data, the test set and the stopping point do to it.',
  chapters: CHAPTERS,
  recall: RECALL,
};
