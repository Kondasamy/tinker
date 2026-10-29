// Who labels the data: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { GOLD, POOL, UNCHECKED, labellerOf } from '../../lib/labelling/story';
import { RECALL } from './recall';

const [ROSA, MIRA, TOM] = (['rosa', 'mira', 'tom'] as const).map(id => labellerOf(id).name);

const CHAPTERS: Chapter[] = [
  {
    id: '01-someone-has-to-decide',
    title: 'Someone has to decide',
    short: 'Someone decides',
    intro: {
      story:
        'Larkspur’s triage model sends each support ticket to the right desk. To train and grade it, people first label tickets by intent.',
      goal: 'Do three careful people give one ticket the same label?',
      learn: [
        'A label is a person’s judgement',
        'Why one ticket can get three answers',
        'Why labels become the answer key',
      ],
      terms: [
        ['Label', 'The intent a person files a ticket under: one of five pigeonholes.'],
        ['Intent', 'What the customer wants: a refund, a return, delivery news, a product answer or account help.'],
        ['Labeller', 'A person who reads each ticket and gives it a label.'],
      ],
    },
  },
  {
    id: '02-how-often-do-they-agree',
    title: 'How often do they agree?',
    short: 'Agreement',
    intro: {
      story: `${ROSA}, ${MIRA} and ${TOM} have each labelled all ${POOL.length} pool tickets. Before Larkspur trusts the labels, it checks how often they agree.`,
      goal: 'How much of their agreement is real, and how much is luck?',
      learn: ['Agreement: tickets two people label alike', 'Why some agreement is luck', 'Kappa: agreement above luck'],
      terms: [
        ['Agreement', 'The share of tickets two labellers filed in the same hole.'],
        ['By luck', 'How often two labellers would agree if each picked holes at random, at their own rates.'],
        ['Kappa', 'Agreement above luck: 1 is perfect, 0 is no better than luck.'],
      ],
    },
  },
  {
    id: '03-write-the-rule-down',
    title: 'Write the rule down',
    short: 'The rule',
    intro: {
      story: `${MIRA} keeps filing refunds as returns and returns as refunds. She isn’t careless: nobody told her where one ends and the other begins.`,
      goal: 'Can one written rule fix most disagreements?',
      learn: [
        'Why careful people still disagree',
        'A guideline: one line per label',
        'How kappa moves once it’s written',
      ],
      terms: [
        ['Guideline', 'The written rule for each label, saying where one ends and the next begins.'],
        ['Edge case', 'A ticket that sits between two labels.'],
      ],
    },
  },
  {
    id: '04-check-the-checkers',
    title: 'Check the checkers',
    short: 'Gold',
    intro: {
      story: `Larkspur can’t check every label. The support lead checked ${GOLD.length} tickets by hand, and every labeller files those too.`,
      goal: 'How do you catch a careless labeller without checking everything?',
      learn: ['Gold tickets: answers checked ahead', 'Scoring each labeller on gold', 'What bad labels do to a model'],
      terms: [
        ['Gold ticket', 'A ticket whose right label a lead checked ahead, mixed in to score labellers.'],
        ['Gold score', 'The share of gold tickets a labeller got right.'],
      ],
    },
  },
  {
    id: '05-many-votes',
    title: 'Many votes',
    short: 'Votes',
    intro: {
      story:
        'Even careful labellers slip now and then. Larkspur tries three labels on every ticket, keeping the most common.',
      goal: 'Does a vote of three beat the best single labeller?',
      learn: ['Majority vote: the label most gave', 'Why a vote beats one person', 'When the outvoted one was right'],
      terms: [
        ['Majority vote', 'Each ticket takes the label most labellers gave it.'],
        ['Outvoted', 'A labeller whose label lost the vote on a ticket.'],
      ],
    },
  },
  {
    id: '06-label-the-hard-ones-first',
    title: 'Label the hard ones first',
    short: 'Hard first',
    intro: {
      story: `Labels cost money. Larkspur wants the ${UNCHECKED.length} unchecked tickets labelled in the order that teaches its triage model fastest, and wonders if a model could label too.`,
      goal: 'Which tickets earn a person’s time, and can a model take the rest?',
      learn: ['Least-sure first', 'A model as a labeller', 'When a cross-check buys nothing'],
      terms: [
        ['Least sure', 'Tickets where the triage model’s top two intents score nearly level.'],
        ['Model labeller', 'A large language model asked to label tickets, as a person would.'],
        ['Cross-check', 'A second model labels the same tickets; people settle only where the two differ.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a labelling budget',
    short: 'Workbench',
    intro: {
      story: `Larkspur needs its ${UNCHECKED.length} unchecked tickets labelled for the triage model, mostly right, for as little money as it can.`,
      goal: 'What is the cheapest setup that clears the bar?',
      learn: [
        'How votes, gold and a model trade cost for accuracy',
        'Why checking the checkers pays',
        'Why the cheapest passing setup wins',
      ],
      terms: [
        ['Setup', 'Labels per ticket, gold tickets per person, and who labels the hard twenty.'],
        ['Bar', 'The share of labels that must be right, set by the team.'],
        ['Workbench', 'The chapter’s free-play bench: change the setup and see every result.'],
      ],
    },
  },
];

export const LABELLING_MODULE: Module = {
  id: 'labelling',
  title: 'Who labels the data',
  description:
    'The people behind every answer key: labels as judgements, agreement above luck, written rules, gold checks, votes and model labellers.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['evals'],
  story:
    'Larkspur Supply Co. labels its support tickets by intent, to train and grade the triage model that routes them.',
  chapters: CHAPTERS,
  recall: RECALL,
};
