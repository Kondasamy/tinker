// Many chips, one model: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { PER_BOX } from '../../lib/parallel-training/facts';
import { CHIPS } from '../../lib/parallel-training/workbench';
import { COMPANY, MODEL_NAME, VENDOR } from '../../lib/parallel-training/story';
import { RECALL } from './recall';

const LARKSPUR = COMPANY.replace(/ Supply Co\.$/, '');
const RENTED = CHIPS.toLocaleString('en-US');

const CHAPTERS: Chapter[] = [
  {
    id: '01-wont-fit',
    title: 'It doesn’t fit',
    short: 'Won’t fit',
    intro: {
      story: `${VENDOR} quotes ${LARKSPUR} for training ${MODEL_NAME} on ${RENTED} rented chips. The team asks the obvious question first: why so many?`,
      goal: 'How much memory does training a big model take?',
      learn: [
        'What training keeps besides the weights',
        'Why that is many times the weights alone',
        'Why one chip can’t hold it',
      ],
      terms: [
        ['Parameter', 'One number the model learns: a weight. A big model has billions.'],
        ['Gradient', 'For each parameter, which way and how far to nudge it after a batch.'],
        ['Optimiser state', 'Extra numbers the optimiser (Adam) keeps per parameter to steady its nudges.'],
      ],
    },
  },
  {
    id: '02-copies',
    title: 'Copies and slices of data',
    short: 'Copies',
    intro: {
      story: `The simplest split: every chip trains its own copy of ${MODEL_NAME} on a different slice of each batch.`,
      goal: 'How do copies that saw different data stay the same model?',
      learn: ['How copies share out a batch', 'How a ring averages gradients', 'Why each chip sends about the same'],
      terms: [
        ['Data parallel', 'Each chip trains a whole copy of the model on its own slice of the batch.'],
        ['All-reduce', 'Every chip ends with the sum (here, the mean) of every chip’s numbers.'],
        ['Ring', 'Chips in a loop, each passing to the next: the usual way to all-reduce.'],
      ],
    },
  },
  {
    id: '03-sharding',
    title: 'Split the copies’ memory',
    short: 'Sharding',
    intro: {
      story: 'Eight copies each hold the whole training state. Most of it is the same on every chip.',
      goal: 'Can copies share out their memory instead of repeating it?',
      learn: ['What each ZeRO stage shares out', 'What that saves on each chip', 'What it costs in sending'],
      terms: [
        ['Sharding', 'Cutting something into pieces so each chip keeps one piece, not the whole.'],
        ['ZeRO', 'A way to shard training state over data-parallel copies, in three stages.'],
        ['Activations', 'What each layer works out on the way forward, kept for the way back.'],
      ],
    },
  },
  {
    id: '04-pipeline',
    title: 'Split by layers',
    short: 'Pipeline',
    intro: {
      story: `${MODEL_NAME}’s activations alone overflow a chip. So ${VENDOR} gives each chip some of the layers, like stations on a line.`,
      goal: 'When the layers are split, who waits for whom?',
      learn: [
        'How a batch flows down the stages and back',
        'Where the idle bubble comes from',
        'How micro-batches shrink it',
      ],
      terms: [
        ['Pipeline', 'The layers cut into stages on different chips, each passing its output on.'],
        ['Bubble', 'Time a pipeline stage sits idle, waiting for work to reach it.'],
        ['Micro-batch', 'A small slice of the batch, so stages can work on different slices at once.'],
      ],
    },
  },
  {
    id: '05-inside-a-layer',
    title: 'Split inside a layer',
    short: 'Inside a layer',
    intro: {
      story: `${VENDOR} also splits each layer’s maths across chips. The quote says those chips stay inside one box.`,
      goal: 'Why does a split inside a layer need the fastest link?',
      learn: ['How a layer’s maths is shared out', 'Why its chips talk every layer', 'Why that stays inside one box'],
      terms: [
        ['Tensor parallel', 'Each layer’s maths split across chips, which swap partial results as they go.'],
        ['Box', `One server: here, ${PER_BOX} chips joined by a fast link.`],
      ],
    },
  },
  {
    id: '06-checkpoints',
    title: 'A chip fails',
    short: 'Checkpoints',
    intro: {
      story: `With ${RENTED} chips, one fails every couple of days. The quote budgets time for saving the run and for lost work.`,
      goal: 'How often should a long run save itself?',
      learn: ['What a failure throws away', 'Why saving often costs too', 'Where the best interval sits'],
      terms: [
        ['Checkpoint', 'A saved copy of the whole training state, to restart from after a failure.'],
        ['Interval', 'Minutes of training between two checkpoints.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: lay out the run',
    short: 'Workbench',
    intro: {
      story: `${LARKSPUR} checks the layout ${VENDOR} quotes before signing. Every chip must fit, then the quickest step wins once lost work counts.`,
      goal: 'Which layout of the rented chips trains fastest?',
      learn: ['How the splits combine', 'Why a split that fits can still be slow', 'Why several layouts can tie'],
      terms: [
        ['Layout', 'How the chips are split: inside layers, by layers, into copies, plus ZeRO and saving.'],
        ['Workbench', 'The chapter’s free-play bench: change the layout and see every result.'],
      ],
    },
  },
];

export const PARALLEL_TRAINING_MODULE: Module = {
  id: 'parallel-training',
  title: 'Many chips, one model',
  description:
    'How one model trains across thousands of chips: copies, layers and slices of layers, and what every split costs.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['pre-training'],
  story: `${COMPANY}’s model vendor, ${VENDOR}, trains ${MODEL_NAME} on rented chips, and ${LARKSPUR}’s team reads the quote.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
