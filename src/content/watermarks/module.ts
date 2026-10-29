// Watermarks and made-by-AI: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { CUSTOMER } from '../../lib/watermarks/story';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-can-you-tell',
    title: 'Can you tell?',
    short: 'Can you tell?',
    intro: {
      story: `${CUSTOMER.name} of ${CUSTOMER.firm} forwards a “Larkspur” email asking for her card number. Larkspur’s assistant never wrote it.`,
      goal: 'Can a person, or a detector, tell a model’s writing from a person’s?',
      learn: [
        'Why good model text has no tell',
        'Why detectors misjudge real people',
        'Why Larkspur wants a mark of its own',
      ],
      terms: [
        ['Detector', 'A program that guesses from style whether a model wrote some text.'],
        ['Watermark', 'A hidden pattern a writer puts in on purpose, so its text can be checked later.'],
      ],
    },
  },
  {
    id: '02-a-hidden-pattern',
    title: 'A hidden pattern',
    short: 'Hidden pattern',
    intro: {
      story:
        'Larkspur decides to mark its own replies as they are written. Its tiny model, Larkspur mini, writes them here.',
      goal: 'How can a pattern hide in words that read normally?',
      learn: [
        'Each token is green or red, set by the one before',
        'A marked writer picks green more often',
        'Only the key shows which is which',
      ],
      terms: [
        ['Green list', 'The tokens counted green after a given token: a share of all of them, picked by the key.'],
        ['Key', 'The secret number that picks every green list. Whoever holds it can check text.'],
      ],
    },
  },
  {
    id: '03-leaning-green',
    title: 'Leaning green',
    short: 'Leaning green',
    intro: {
      story:
        'The mark goes in while the reply is written: before each pick, green tokens get a boost. Larkspur must choose how big.',
      goal: 'What does a bigger nudge buy, and what does it cost the reply?',
      learn: ['How the nudge tilts each pick', 'Bigger nudges mark more strongly', 'The cost: less likely words'],
      terms: [
        ['Nudge', 'δ: added to every green token’s score before the writer picks. At 0 there is no mark.'],
        ['Nat', 'A unit of surprise. Quality lost is how many more nats each word costs the unmarked model.'],
      ],
    },
  },
  {
    id: '04-counting-green',
    title: 'Counting green',
    short: 'Counting green',
    intro: {
      story: `Larkspur’s checker holds the key, not the model. ${CUSTOMER.name}’s forwarded email is waiting to be checked.`,
      goal: 'How does the checker score text, and when can it say nothing?',
      learn: [
        'Count green pairs and compare with chance',
        'Why the line sits at 4',
        'Why short text is too short to say',
      ],
      terms: [
        ['z-score', 'How many standard deviations the green count sits above what chance gives.'],
        ['False alarm', 'Text nobody marked that the checker calls marked anyway.'],
      ],
    },
  },
  {
    id: '05-rewording',
    title: 'Rewording washes it out',
    short: 'Rewording',
    intro: {
      story: 'The mark lives in which token follows which. Someone who wants it gone only has to change tokens.',
      goal: 'How many swaps wash the mark out?',
      learn: [
        'Each swap breaks up to two green pairs',
        'A few swaps pull the score under the line',
        'A full paraphrase leaves only chance',
      ],
      terms: [
        ['Swap', 'Replacing one token with another the writer rated close.'],
        ['Paraphrase', 'The same meaning in different words.'],
      ],
    },
  },
  {
    id: '06-pictures-and-labels',
    title: 'Pictures and labels',
    short: 'Pictures',
    intro: {
      story:
        'Larkspur’s image tool makes catalogue pictures. Each leaves with a hidden mark in its pixels and a signed made-by-AI label.',
      goal: 'What survives a picture’s trip to a reader: the mark, the label, both, or neither?',
      learn: [
        'A pixel mark is a faint seeded pattern',
        'A signed label rides beside the file',
        'Crops, blurs and screenshots each break one',
      ],
      terms: [
        ['Pixel mark', 'A faint seeded pattern added to a picture’s pixels; a checker with the seed finds it.'],
        ['Label', 'A signed note that a model made the file, carrying the file’s hash (C2PA).'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: share and nudge',
    short: 'Workbench',
    intro: {
      story:
        'Larkspur fixes its mark for good. The team wants replies caught even after a light reword, and no person’s reply flagged.',
      goal: 'Which green share and nudge pass the rule and survive edits best?',
      learn: [
        'Green share and nudge trade off',
        'Quality, edits and false alarms side by side',
        'Why the smaller green list wins here',
      ],
      terms: [
        ['Green share', 'γ: the share of all tokens on the green list after each token.'],
        ['Workbench', 'The chapter’s free-play bench: change the setting and see every result.'],
      ],
    },
  },
];

export const WATERMARKS_MODULE: Module = {
  id: 'watermarks',
  title: 'Watermarks and made-by-AI',
  description: 'Marking generated text and pictures so they can be spotted later, and why a detector can only guess.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['transformers'],
  story:
    'Larkspur Supply Co. wants to mark its assistant’s replies, and a customer forwards a “Larkspur” email the assistant never wrote.',
  chapters: CHAPTERS,
  recall: RECALL,
};
