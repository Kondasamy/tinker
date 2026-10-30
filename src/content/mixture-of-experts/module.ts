// Mixture of experts: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { fact } from '../../lib/mixture-of-experts/facts';
import { CARDS } from '../../lib/mixture-of-experts/cards';
import { RECALL } from './recall';

/** The vendor's card as the Mixtral paper rounds it: “47B total, 13B active”. */
export const CARD_LINE = fact('mixtral-abstract').value!;

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-big-kitchen',
    title: 'One big kitchen',
    short: 'One kitchen',
    intro: {
      story: `A vendor’s model card says “${CARD_LINE}”. Larkspur’s team wants to know what that means, starting with a plain model.`,
      goal: 'In a plain model, how many weights work on each token?',
      learn: [
        'Every weight of a dense model works on every token',
        'Why the work per token grows with size',
        'What a mixture of experts changes',
      ],
      terms: [
        ['Weight', 'A number the model learned. A model’s size is how many weights it has.'],
        ['Dense model', 'A model where every weight works on every token it reads.'],
        ['Mixture of experts', 'A model split into many experts, of which only a few work on each token.'],
      ],
    },
  },
  {
    id: '02-rooms-and-a-doorman',
    title: 'Rooms and a doorman',
    short: 'A doorman',
    intro: {
      story:
        'The vendor’s model splits its big kitchen into rooms. A doorman at each floor sends every token to a few of them.',
      goal: 'Who picks the rooms for a token, and how many?',
      learn: ['What an expert is', 'How the router scores every expert', 'Why only the top two run'],
      terms: [
        ['Expert', 'One of the rooms: a small block of weights of its own. Each layer here has eight.'],
        ['Router', 'The doorman: a small layer that scores every expert for each token.'],
        ['Top-2', 'Only the two best-scored experts run; their outputs mix by the router’s scores.'],
      ],
    },
  },
  {
    id: '03-what-the-experts-learned',
    title: 'What the experts learned',
    short: 'What they learned',
    intro: {
      story:
        'Training kept sending similar tokens to the same rooms. Larkspur’s team asks what its toy’s rooms ended up good at.',
      goal: 'Do experts split by topic, or by kind of token?',
      learn: [
        'What the toy’s rooms took most often',
        'Why experts split by kind of token',
        'What a large model’s authors found',
      ],
      terms: [
        ['Token', 'A piece of text a model reads: a word, part of a word, or a mark.'],
        ['Specialisation', 'What an expert ends up taking most: here, measured over the toy’s training text.'],
      ],
    },
  },
  {
    id: '04-send-it-elsewhere',
    title: 'Send it elsewhere',
    short: 'Send elsewhere',
    intro: {
      story: 'The doorman’s pick is only a score. Larkspur’s team wants to see how much the right rooms matter.',
      goal: 'What happens to the guess when a token goes to other rooms?',
      learn: [
        'How to override the doorman',
        'Why the rooms, not the doorman, hold the work',
        'Why a wrong room gives a worse guess',
      ],
      terms: [
        ['Guess', 'The model’s likeliest next token, read at the booth.'],
        ['Override', 'Sending a token to rooms you pick instead of the doorman’s, on every floor.'],
      ],
    },
  },
  {
    id: '05-the-busy-room',
    title: 'The busy room',
    short: 'The busy room',
    intro: {
      story:
        'Rooms work on a batch of tokens at once, with a fixed number of seats. Popular rooms get more tokens than they can seat.',
      goal: 'What happens when too many tokens want the same room?',
      learn: ['What capacity is', 'What happens to dropped tokens', 'How training spreads the load'],
      terms: [
        ['Capacity', 'How many tokens of a batch one expert takes: its seats.'],
        ['Capacity factor', 'Seats per expert = factor × tokens × 2 ÷ 8, rounded up. Higher means more spare seats.'],
        ['Dropped token', 'A token turned away by a full room: it skips that room’s work.'],
        ['Load-balancing loss', 'A training penalty that pushes the router to spread tokens evenly over the experts.'],
      ],
    },
  },
  {
    id: '06-total-versus-active',
    title: 'Total versus active',
    short: 'Total vs active',
    intro: {
      story: `Back to the vendor’s card: “${CARD_LINE}”. Larkspur needs to know what each of the two numbers costs.`,
      goal: 'What does the total cost, and what does the active count cost?',
      learn: [
        'Total weights set the memory',
        'Active weights set the work per token',
        'What the toy measured against a dense model',
      ],
      terms: [
        ['Total parameters', 'Every weight in the model, every expert included. All of them must sit in memory.'],
        ['Active parameters', 'The weights one token runs through: shared parts plus its chosen experts.'],
        ['Memory', 'The GPU memory that holds the weights while the model serves.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a shape for the server',
    short: 'Workbench',
    intro: {
      story: `Larkspur’s server has a memory budget and a speed budget. The team has ${CARDS.length} published model cards to choose from.`,
      goal: 'Which model and precision fit both budgets with the most weights?',
      learn: [
        'Check total weights against memory',
        'Check active weights against the work per token',
        'Why precision helps memory, not work',
      ],
      terms: [
        ['Budget', 'A limit Larkspur sets: memory for weights, and weights at work per token. Planning numbers.'],
        ['Precision', 'Bits per weight. Fewer bits shrink the memory each weight takes; the work per token stays.'],
        ['Workbench', 'The chapter’s free-play bench: change the plan and see every result.'],
      ],
    },
  },
];

export const MIXTURE_OF_EXPERTS_MODULE: Module = {
  id: 'mixture-of-experts',
  title: 'Mixture of experts',
  description:
    'A model with many experts that wakes only a few for each word: the router that picks them, and what it saves.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['transformers'],
  story: `A vendor’s model card says “${CARD_LINE}”, and Larkspur Supply Co. wants to know what that means: the model holds many experts but pays for a few per word, and a router picks them.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
