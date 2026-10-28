// What a model remembers: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-seen-once-seen-often',
    title: 'Seen once, seen often',
    short: 'Seen often',
    intro: {
      story:
        'Larkspur wants to train its support model on old tickets. Some tickets hold customers’ card numbers. First, what does a model keep?',
      goal: 'Does a model keep the exact words of a line it saw many times?',
      learn: [
        'Why repeated text comes back word for word',
        'What memorisation is',
        'Why it shows where the prompt doesn’t ask for it',
      ],
      terms: [
        ['Memorisation', 'A model storing exact training text, not just its patterns.'],
        ['Duplicate', 'The same text more than once in the training data.'],
        ['Recite', 'To give back a training line word for word.'],
      ],
    },
  },
  {
    id: '02-a-planted-secret',
    title: 'A planted secret',
    short: 'Planted secret',
    intro: {
      story:
        'To measure the risk safely, the team trains a test model with fake secrets planted in its text. No real customer is in it.',
      goal: 'How do you test whether a model leaks a secret, without a real secret?',
      learn: ['What a canary is', 'Why each canary is planted a different number of times', 'Why the PINs are fake'],
      terms: [
        ['Canary', 'A made-up secret planted in training text on purpose, to test whether it leaks.'],
        ['PIN', 'A short secret number. These four are fake.'],
        ['Copies', 'How many times a canary’s line appears in the training text.'],
      ],
    },
  },
  {
    id: '03-ask-it-to-finish',
    title: 'Ask it to finish',
    short: 'Ask it to finish',
    intro: {
      story:
        'The canary model is trained. An attacker who knows a customer’s name could start the sentence and let the model finish it.',
      goal: 'Which planted PINs does the model give back when asked?',
      learn: [
        'How extraction works: a prefix in, the secret out',
        'Why copies decide what comes back',
        'Why a model can fill a slot with someone else’s secret',
      ],
      terms: [
        ['Prefix', 'The start of a training line, given to the model to finish.'],
        ['Extraction', 'Getting training text back out of a model by prompting it.'],
        ['Greedy', 'Always taking the model’s likeliest next piece.'],
      ],
    },
  },
  {
    id: '04-how-sure-is-it',
    title: 'How sure is it?',
    short: 'How sure',
    intro: {
      story:
        'Two PINs came back, two did not. A miss is not proof of safety: the model may still rate the true PIN unusually likely.',
      goal: 'How do you measure a secret the model doesn’t say outright?',
      learn: ['How ranking every possible PIN works', 'What exposure measures', 'Why exposure tops out'],
      terms: [
        ['Candidate', 'A possible PIN: any four digits.'],
        ['Rank', 'Where the true PIN falls when candidates are sorted likeliest first.'],
        ['Exposure', 'How far above chance the true PIN ranks, in bits: more bits, easier to guess.'],
      ],
    },
  },
  {
    id: '05-copies-make-it-worse',
    title: 'Copies make it worse',
    short: 'Copies',
    intro: {
      story:
        'Old support tickets repeat: forwarded threads, quoted replies, the same signature. The team trained a second model with every duplicate removed.',
      goal: 'Does removing duplicates stop the model reciting the PINs?',
      learn: ['How copies raise exposure', 'What deduplication removes', 'Why one copy can still be guessed'],
      terms: [
        ['Deduplication', 'Removing repeated lines from the training text so each appears once.'],
        ['Held-out', 'Text the model never trained on, used to check it still works.'],
        ['Top-5', 'How often the right next piece is among the model’s five likeliest guesses.'],
      ],
    },
  },
  {
    id: '06-keep-it-out',
    title: 'Keep it out',
    short: 'Keep it out',
    intro: {
      story:
        'Deduplication helped. Now the team compares two more fixes: an output filter that hides PINs in replies, and scrubbing PINs before training.',
      goal: 'Which fix keeps a secret safe: a filter on replies, or scrubbing the text?',
      learn: [
        'What an output filter catches and misses',
        'How a secret slips past one digit at a time',
        'Why scrubbing before training is the fix',
      ],
      terms: [
        ['Output filter', 'A check that hides anything shaped like a secret in a reply.'],
        ['Scrubbing', 'Replacing secrets in the training text with a placeholder before training.'],
        ['Placeholder', 'A stand-in like [PIN] that takes a secret’s place.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a data policy',
    short: 'Workbench',
    intro: {
      story:
        'The team must pick Larkspur’s data policy before training on the real tickets: deduplicate, scrub, filter, or a mix. Each was trained offline.',
      goal: 'Which policy leaks no PIN and keeps the model useful?',
      learn: [
        'Why a filter alone still leaks',
        'How scrubbing and deduplication trade off',
        'Why more than one policy can be best',
      ],
      terms: [
        ['Data policy', 'What the team does to the training text and to replies: here, three switches.'],
        ['Leak', 'A planted PIN the model gives back.'],
        ['Workbench', 'The chapter’s free-play bench: change the policy and see every result.'],
      ],
    },
  },
];

export const MEMORISATION_MODULE: Module = {
  id: 'memorisation',
  title: 'What a model remembers',
  description:
    'What a model keeps from its training text: memorised lines, how they leak back out, and keeping private data out.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['pre-training'],
  story:
    'Larkspur Supply Co. wants to train its support model on old tickets that hold card numbers, so the team plants fake PINs and watches what leaks.',
  chapters: CHAPTERS,
  recall: RECALL,
};
