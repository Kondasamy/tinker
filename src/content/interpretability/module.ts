// Interpretability: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename
// one. Each chapter's `intro` is the story column's opening context; its island is picked by
// src/pages/interpretability/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RAG_MODULE } from '../rag/module';
import { RECALL } from './recall';
import { fact } from '../../lib/interpretability/facts';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };

const LM = META.model;

const CHAPTERS: Chapter[] = [
  {
    id: '01-why-did-it-say-that',
    title: 'Why did it say that?',
    short: 'Why did it say that?',
    intro: {
      story:
        'Larkspur’s team watched Larkspur mini work in Transformers. Now a reviewer asks why it says what it says, and an attention map won’t settle it.',
      goal: 'What can an attention map tell you about why a model answered, and what can’t it?',
      learn: [
        'What interpretability asks: which parts made this guess',
        'Why an attention map describes where a head looks, not what it caused',
      ],
      terms: [
        [
          'Interpretability',
          'Finding out how a model reaches its output from what happens inside it: which parts, doing what.',
        ],
        [
          'Attention map',
          'A picture of one head’s weights: how much each token looks at each earlier one. Transformers drew them as threads and a heatmap.',
        ],
      ],
    },
  },
  {
    id: '02-pull-a-fuse',
    title: 'Pull a fuse',
    short: 'Pull a fuse',
    intro: {
      story:
        'Looking didn’t prove anything. The team tries the electrician’s test: switch one part off and see what stops working.',
      goal: 'What changes when one head is switched off, on one prompt and over many?',
      learn: [
        'What ablation is: silencing one part and watching the guess',
        'Why one prompt can mislead, and how text-wide counts help',
        'That in Larkspur mini no single head carries the work',
      ],
      terms: [
        ['Ablation', 'Switching one part of a model off (here, zeroing a head’s output) and watching what changes.'],
        [
          'Fuse',
          'This module’s switch for one part of Larkspur mini: one per head and one per MLP. Pulled, the part is off.',
        ],
        [
          'Held-out text',
          'Larkspur documents kept out of training, so a score on them isn’t just the model remembering.',
        ],
      ],
    },
  },
  {
    id: '03-the-guess-forming',
    title: 'The guess forming',
    short: 'The guess forming',
    intro: {
      story: `Fuses showed which parts matter. Now the team wants to see the guess itself take shape, layer by layer, through Larkspur mini’s ${LM.n_layer} blocks.`,
      goal: 'Where inside the model does the answer first appear?',
      learn: [
        'How the logit lens reads a guess partway up',
        'What the model guesses before any block has run',
        'Which block makes the guess in Larkspur mini',
      ],
      terms: [
        ['Block', 'One layer of the model: its attention heads, then its MLP, each adding to the residual stream.'],
        ['Logit lens', fact('logit-lens').claim],
      ],
    },
  },
  {
    id: '04-patching',
    title: 'Patching',
    short: 'Patching',
    intro: {
      story:
        'Swap one word and Larkspur mini’s answer changes. The team wants to know where, inside the run, that word’s effect travels.',
      goal: 'How do you find where a piece of information sits and where it moves?',
      learn: [
        'What activation patching is: copying one activation from another run',
        'How a grid of patches shows where information travels',
      ],
      terms: [
        [
          'Activation',
          'The numbers a part of the model computes for one token on one run, such as the residual stream at one layer.',
        ],
        [
          'Activation patching',
          'Copying one activation from a run on another prompt into this run, to see whether the answer follows it.',
        ],
      ],
    },
  },
  {
    id: '05-steering',
    title: 'Steering',
    short: 'Steering',
    intro: {
      story:
        'If information sits in the residual stream, can the team push it there? They build a direction from two sets of Larkspur prompts.',
      goal: 'Can you change what a model says without changing its weights?',
      learn: [
        'How a steering direction is made from two sets of prompts',
        'What adding it does, and what too much does',
      ],
      terms: [
        ['Steering', 'Adding a vector to the model’s residual stream during a run to push its output one way.'],
        ['Direction', 'A vector found as the average of one set of runs minus the average of another.'],
      ],
    },
  },
  {
    id: '06-one-neuron-many-meanings',
    title: 'One neuron, many meanings',
    short: 'One neuron, many meanings',
    intro: {
      story: `Heads and blocks are big parts. The team looks smaller: each MLP has ${LM.d_mlp} neurons. Surely one of them means “shipping”?`,
      goal: 'Does one neuron stand for one idea?',
      learn: [
        'What a neuron is, and how its top tokens are found',
        'Why most neurons mix unrelated tokens',
        'Why researchers look for features instead',
      ],
      terms: [
        [
          'Neuron',
          'One of the numbers in an MLP’s middle layer; it fires (goes high) on some tokens more than others.',
        ],
        ['Polysemantic', fact('superposition').claim],
        [
          'Feature',
          'A direction in the model’s activations that stands for one idea, found by methods that go beyond single neurons.',
        ],
      ],
    },
  },
  {
    id: '07-the-smallest-set',
    title: 'The smallest set',
    short: 'The smallest set',
    intro: {
      story:
        'The bench is yours: six fuses, every behaviour live. The reviewer’s last question: how little of the model does one answer need?',
      goal: 'What is the smallest set of parts that still gives the answer?',
      learn: ['How to search for the parts a behaviour needs', 'Why some behaviours need almost all of them'],
      terms: [
        [
          'Circuit',
          'The smallest set of a model’s parts that still produces one behaviour when everything else is switched off.',
        ],
      ],
    },
  },
];

export const INTERPRETABILITY_MODULE: Module = {
  id: 'interpretability',
  title: 'Interpretability',
  description:
    'Open a real model and pull its fuses: switch off a head, read its guess layer by layer, copy and push activations, and find the parts an answer needs.',
  level: 'Advanced',
  status: 'live',
  author: RAG_MODULE.author,
  prereqs: ['transformers'],
  story:
    'Larkspur Supply Co.’s team opens Larkspur mini again to answer a reviewer’s question: why did it say that? They pull its fuses, read its guess mid-way and push it.',
  chapters: CHAPTERS,
  recall: RECALL,
};
