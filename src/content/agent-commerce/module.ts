// When the buyer is an agent: its chapters and module facts. Chapter ids are a contract with readers' saved progress
// (and key the recordings in data/agent-commerce/turns/): never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { BUILDER, COMPANY, sellerOf } from '../../lib/agent-commerce/story';
import { RECALL } from './recall';

const DANA = BUILDER.name,
  FIRM = BUILDER.firm;

const CHAPTERS: Chapter[] = [
  {
    id: '01-a-page-for-people',
    title: 'A page for people',
    short: 'Page for people',
    intro: {
      story: `${FIRM} builds decks, and now a buying agent orders its parts. First job: price an order from ${COMPANY}’s shop page.`,
      goal: 'Can an agent read a shop page written for people?',
      learn: [
        'How an agent reads a page made for people',
        'Why sales, sizes and footnotes need reasoning',
        'How often agents finish real web tasks',
      ],
      terms: [
        ['Buying agent', 'A model that shops for a person or a firm: it reads shops, weighs offers and places orders.'],
        ['Shop page', 'The page a shop writes for people: prices in prose, with sales, sizes and footnotes.'],
      ],
    },
  },
  {
    id: '02-a-menu-for-agents',
    title: 'A menu for agents',
    short: 'Menu for agents',
    intro: {
      story: `Beside its page, ${COMPANY} publishes two files for agents: a card saying what its sales agent does, and a catalogue of prices.`,
      goal: 'What does an agent need from a shop so it never has to guess?',
      learn: ['What an agent card says', 'Why a catalogue beats a page', 'How a missing field is named, not guessed'],
      terms: [
        [
          'Agent card',
          'A small public file at a fixed address on a domain: the agent’s name, address, version and skills (A2A).',
        ],
        ['Catalogue', 'The shop’s items as data: one row each, with an item code, name, category, price and currency.'],
      ],
    },
  },
  {
    id: '03-agent-to-agent',
    title: 'Agent to agent',
    short: 'Agent to agent',
    intro: {
      story: `${FIRM}’s buying agent hands the order to ${COMPANY}’s sales agent as a task. Some orders are too vague to fill.`,
      goal: 'What happens when one agent must ask another a question?',
      learn: [
        'The states a task moves through',
        'How a task pauses to ask back',
        'Why a vague order costs a round trip',
      ],
      terms: [
        ['Task', 'One job one agent hands another, with a state saying where it is (A2A).'],
        ['Input required', 'A task’s state while it waits for the asking agent to answer a question.'],
      ],
    },
  },
  {
    id: '04-who-said-it-could-buy',
    title: 'Who said it could buy?',
    short: 'Who said so?',
    intro: {
      story: `${DANA} lets her agent spend ${FIRM}’s money. ${COMPANY} has never met the agent, and anyone can claim to speak for her.`,
      goal: `How does a shop know ${DANA} allowed this order?`,
      learn: [
        'What a mandate fixes: what, how much, where, until when',
        'How a signature ties those terms to a person',
        'Why a slip changed after signing fails',
      ],
      terms: [
        ['Mandate', 'A slip a person signs saying what their agent may buy, how much, where and until when.'],
        [
          'Signature',
          'A number only the holder of a private key can make for exactly this text; any change breaks it.',
        ],
        ['Demo key', 'A key pair made for this site and published on purpose, so the page can sign live.'],
      ],
    },
  },
  {
    id: '05-a-seller-that-talks-back',
    title: 'A seller that talks back',
    short: 'Talks back',
    intro: {
      story: `${DANA}’s agent now shops around. Other sellers’ agents answer it, and not every message is honest.`,
      goal: 'What stops a seller’s message from talking the agent into more?',
      learn: [
        'How a seller’s message tries to steer an agent',
        'What the agent caught, and what it missed',
        'Why the shop’s checks hold anyway',
      ],
      terms: [
        ['Prompt injection', 'Text that steers a model by posing as instructions, here inside a seller’s message.'],
        [
          'Lookalike domain',
          `A web address made to pass for another: ${sellerOf('lookalike').domain} for ${sellerOf('larkspur').domain}.`,
        ],
      ],
    },
  },
  {
    id: '06-paying-without-the-card',
    title: 'Paying without the card',
    short: 'No card',
    intro: {
      story: `The shop took the slip. Now ${COMPANY} must be paid, and ${DANA} won’t give an agent her card number.`,
      goal: 'How does an agent pay without ever holding the card?',
      learn: ['What a one-order token is bound to', 'Why a token works only once', 'Where the card network still fits'],
      terms: [['Payment token', 'A stand-in for a card, issued for one order, one shop and one amount.']],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: slip and confirm rule',
    short: 'Workbench',
    intro: {
      story: `${DANA} sets her standing slip, and when her agent must ask her first. Six sellers answer the order, honest and not.`,
      goal: 'Which slip lets every good order through and stops every bad one?',
      learn: [
        'Why the slip must hold for a fooled agent too',
        'What asking the person first costs',
        'Why a tight slip beats a loose one',
      ],
      terms: [
        [
          'Confirm rule',
          `When the agent must ask ${DANA} before sending an order on: never, over an amount, or always.`,
        ],
        ['Workbench', 'The chapter’s free-play bench: change the setup and see every result.'],
      ],
    },
  },
];

export const AGENT_COMMERCE_MODULE: Module = {
  id: 'agent-commerce',
  title: 'When the buyer is an agent',
  description:
    'Agents that shop for people: menus they can read, tasks that ask back, signed spending limits and one-order tokens.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents', 'payments'],
  story: `${FIRM}’s buying agent orders from ${COMPANY}’s shop, and ${COMPANY}’s own sales agent answers it. The shop must know what ${DANA} really allowed.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
