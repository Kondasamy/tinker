// Synthetic data: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-too-few-examples',
    title: 'Too few examples',
    short: 'Too few',
    intro: {
      story:
        'Larkspur’s support set teaches its assistant. It has plenty about scanners and printers, but few examples of rare requests.',
      goal: 'How often do Larkspur’s documents answer a rare request?',
      learn: [
        'Why a few topics fill most training data',
        'What counts as a rare request',
        'Why a model learns rare answers poorly',
      ],
      terms: [
        ['Support set', 'The examples Larkspur trains its assistant on: here, Larkspur’s own documents.'],
        ['Rare request', 'A question only one or two documents answer, like how long call recordings are kept.'],
        ['Rare word', 'A piece of text from the rarest half of Larkspur mini’s vocabulary, by how often it appears.'],
      ],
    },
  },
  {
    id: '02-ask-the-model-to-write',
    title: 'Ask the model to write',
    short: 'Ask it to write',
    intro: {
      story:
        'The team’s idea: let Larkspur mini write more examples. Synthetic data, written by a model, not by people.',
      goal: 'What does a model write when you ask it for twenty replies?',
      learn: [
        'How temperature trades repeats for variety',
        'Why a cool model writes the same reply again',
        'Why a hot model drifts off topic',
      ],
      terms: [
        ['Synthetic data', 'Training examples a model writes, instead of people.'],
        ['Temperature', 'How adventurous the model’s word picks are: low picks likely words, high takes more chances.'],
        ['Copy', 'A reply that repeats, word for word or mostly, one already written.'],
      ],
    },
  },
  {
    id: '03-the-sieve',
    title: 'The sieve',
    short: 'The sieve',
    intro: {
      story:
        'Twenty replies came out, some repeated, some off topic. Before any go into training, the team runs them through a sieve.',
      goal: 'What does a sieve keep, and what does it throw away?',
      learn: [
        'How dedupe drops copies and near-copies',
        'How a fact filter keeps replies that name a product',
        'Why a sieve can only remove, never add',
      ],
      terms: [
        ['Sieve', 'Checks that drop written examples before training.'],
        ['Dedupe', 'Dropping a reply that copies, or mostly overlaps, one already kept.'],
        ['Fact filter', 'Keeping only replies that name one of Larkspur’s products.'],
      ],
    },
  },
  {
    id: '04-the-teachers-mistakes',
    title: 'The teacher’s mistakes',
    short: 'Teacher’s mistakes',
    intro: {
      story:
        'The point was more rare requests. So the team asks Larkspur mini the rare questions, to write their answers.',
      goal: 'Can a model write good examples of what it never learned?',
      learn: [
        'Why the teacher’s answers set the ceiling',
        'Why a sieve can’t catch a fluent wrong answer',
        'Where real examples must come from',
      ],
      terms: [
        ['Teacher', 'The model that writes the synthetic data.'],
        ['Student', 'The model trained on the teacher’s writing.'],
        ['Key fact', 'The fact an answer must contain to be right, like “180 days”.'],
      ],
    },
  },
  {
    id: '05-copies-of-copies',
    title: 'Copies of copies',
    short: 'Copies of copies',
    intro: {
      story:
        'Synthetic text ends up in the next model’s training data, and that model writes more. Larkspur ran it five times over.',
      goal: 'What happens when each model trains only on the last one’s writing?',
      learn: ['What a generation is', 'How held-out loss shows drift from real text', 'Why rare words go first'],
      terms: [
        ['Generation', 'One model trained from scratch on the text the one before it wrote.'],
        ['Held-out loss', 'How surprised a model is by real text it never trained on. Lower is better.'],
        ['Drift', 'Each generation moving further from the real text.'],
      ],
    },
  },
  {
    id: '06-keep-the-real-data',
    title: 'Keep the real data',
    short: 'Keep real data',
    intro: {
      story:
        'Replacing real text with copies drifted. The team ran a second test that keeps the real documents in every generation.',
      goal: 'Does keeping the real data in stop the drift?',
      learn: [
        'Replace versus accumulate',
        'How real data anchors each generation',
        'Why it slows the loss of rare words but doesn’t stop it',
      ],
      terms: [
        ['Replace', 'Each generation trains only on the last generation’s text.'],
        ['Accumulate', 'Each generation trains on the real text plus every generation’s text so far.'],
        ['Data mix', 'Which texts go into training, and how much of each.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a data recipe',
    short: 'Workbench',
    intro: {
      story:
        'The team must pick one recipe for the next model: a temperature, a sieve and a real share. Each was trained ahead of time.',
      goal: 'Which recipe stays closest to real text and still guesses rare words?',
      learn: [
        'How each choice moves loss and rare words',
        'Why real data matters most',
        'Why more than one recipe can be best',
      ],
      terms: [
        ['Recipe', 'A temperature, a sieve and a share of real data.'],
        ['Real share', 'How much of the training text is Larkspur’s own documents.'],
        ['Workbench', 'The chapter’s free-play bench: change the recipe and see every result.'],
      ],
    },
  },
];

export const SYNTHETIC_DATA_MODULE: Module = {
  id: 'synthetic-data',
  title: 'Synthetic data',
  description:
    'Training data written by a model: how it is made and sieved, why copies of copies drift, and why real data anchors it.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['fine-tuning'],
  story:
    'Larkspur Supply Co.’s support set has too few examples of rare requests, so the team lets its tiny model write more, and watches copies of copies drift.',
  chapters: CHAPTERS,
  recall: RECALL,
};
