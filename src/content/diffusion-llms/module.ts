// Diffusion language models: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { fact } from '../../lib/diffusion-llms/facts';
import { RECALL } from './recall';

const CLAIM = Number(fact('mercury-2').value).toLocaleString('en-US');

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-word-at-a-time',
    title: 'One word at a time',
    short: 'One at a time',
    intro: {
      story: `A vendor promises a model that writes ${CLAIM} tokens a second. Larkspur’s team wants to know what that speed buys.`,
      goal: 'How does a model write a reply, and what does each token cost?',
      learn: ['Why a left-to-right model takes one pass per token', 'What a pass is', 'Why passes set a model’s speed'],
      terms: [
        ['Token', 'A piece of text a model reads and writes: a word, part of a word, or a mark.'],
        ['Pass', 'One run of the model over everything it can see. Each pass takes about the same time.'],
        [
          'Larkspur mini',
          'Larkspur’s tiny left-to-right model from the Transformers module. It writes one token a pass.',
        ],
      ],
    },
  },
  {
    id: '02-fill-the-blanks',
    title: 'Fill the blanks',
    short: 'Fill the blanks',
    intro: {
      story:
        'The vendor’s model is not left to right. It starts from a reply of blanks and fills them, like Larkspur’s toy masked model.',
      goal: 'How does a model fill a blank it can see both sides of?',
      learn: [
        'How a masked model guesses a hidden token',
        'Why it reads the words on both sides',
        'How one pass guesses every blank at once',
      ],
      terms: [
        ['Masked model', 'A model trained to guess hidden tokens, reading the words on both sides of each one.'],
        ['Blank', 'A slot whose token is hidden. The model sees [MASK] there and guesses what belongs.'],
        ['Confidence', 'The probability the model gives its best guess for a slot. Here, the glow on the slot.'],
      ],
    },
  },
  {
    id: '03-sure-words-first',
    title: 'Sure words first',
    short: 'Sure words first',
    intro: {
      story:
        'One pass guesses every blank. The fill must choose which guesses to keep; the rest wait for the next pass.',
      goal: 'Which blanks should a pass stamp first?',
      learn: [
        'What remasking chooses on each pass',
        'Why keeping the surest guesses works better than random',
        'Why the frame fills in any order',
      ],
      terms: [
        ['Remasking', 'Choosing which guesses a pass keeps; the rest go back to blanks for the next pass.'],
        ['Surest first', 'Keep the guesses with the highest confidence. Papers call it low-confidence remasking.'],
        ['Careful fill', 'One slot a pass, surest first: the slowest way the toy writes, used here as the reply to measure against.'],
      ],
    },
  },
  {
    id: '04-faster-and-worse',
    title: 'Faster and worse',
    short: 'Faster and worse',
    intro: {
      story:
        'The vendor’s speed comes from stamping many tokens a pass. Larkspur wants to see what fewer passes do to a reply.',
      goal: 'What do you lose when each pass stamps more tokens?',
      learn: [
        'How tokens a pass sets the number of passes',
        'Why guesses stamped together drift and repeat',
        'Why speed and quality are one dial',
      ],
      terms: [
        ['Tokens a pass', 'How many blanks each pass stamps. Twice as many a pass, half the passes.'],
        ['Repeat', 'A token the same as the one before it, like “the the”. Many repeats: the reply stutters.'],
        ['Drift', 'How far a reply moves from the careful fill: its tokens that differ, slot for slot.'],
      ],
    },
  },
  {
    id: '05-the-length-is-fixed',
    title: 'The length is fixed',
    short: 'Length is fixed',
    intro: {
      story:
        'Before the first pass, the frame needs a size. Larkspur’s team tries one release-note phrase at several reply lengths.',
      goal: 'What happens when a reply’s length is set before it is written?',
      learn: [
        'Why the frame’s size is chosen first',
        'How the model shapes a reply to fit it',
        'Which replies suit a fixed length',
      ],
      terms: [
        ['Reply length', 'How many blank slots the frame holds. The model fills every one, no more and no fewer.'],
        ['End-of-text token', 'A token that marks where a reply ends. Real models pad a long frame with it.'],
      ],
    },
  },
  {
    id: '06-reading-a-speed-claim',
    title: 'Reading a speed claim',
    short: 'Speed claims',
    intro: {
      story:
        'The vendor’s figure is on the sales deck. Larkspur’s team wants to know what sits behind it before signing.',
      goal: 'What makes up tokens a second, and what should you ask about it?',
      learn: ['How tokens a second splits into two numbers', 'What a speed claim leaves out', 'What to ask a vendor'],
      terms: [
        ['Tokens a second', 'Tokens a pass times passes a second. A vendor can raise either one.'],
        [
          'Passes a second',
          'How many times a second the hardware runs the model over the reply. Here, Larkspur’s planning number.',
        ],
        ['Vendor claim', 'A figure the seller measured on its own setup and reports itself.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: speed per kind of reply',
    short: 'Workbench',
    intro: {
      story:
        'Larkspur will use the vendor’s model for several kinds of reply, each with its own bar. The team needs a setting per kind.',
      goal: 'How many tokens a pass, and which remasking, does each kind of reply need?',
      learn: [
        'How to pick tokens a pass for each kind of reply',
        'Why the fewest passes that pass every bar wins',
        'Why the answer differs per kind',
      ],
      terms: [
        ['Plan', 'Tokens a pass and a remasking rule for each kind of reply.'],
        ['Bar', 'What a reply must keep to pass, set by the team for each kind.'],
        ['Workbench', 'The chapter’s free-play bench: change the plan and see every result.'],
      ],
    },
  },
];

export const DIFFUSION_LLMS_MODULE: Module = {
  id: 'diffusion-llms',
  title: 'Diffusion language models',
  description:
    'Language models that write in any order: fill the sure words first, and fewer passes means worse words.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['diffusion', 'transformers'],
  story: `A vendor promises a model that writes ${CLAIM} tokens a second by filling a reply’s blanks in any order. Larkspur Supply Co. wants to know what that buys.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
