// Transformer architecture, module 7: its chapters and module facts. Chapter ids are a contract with readers' saved
// progress: never rename one. Each chapter's `intro` is the story column's opening context; its island is picked by
// src/pages/transformers/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RAG_MODULE } from '../rag/module';
import { RECALL } from './recall';
import { fact } from '../../lib/transformers/facts';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };

/** Larkspur mini's shape, read from the shipped weights' layout, never typed by hand. */
const LM = META.model;

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-token-at-a-time', title: 'One token at a time', short: 'One token at a time',
    intro: {
      story: 'In Tokens, you saw Larkspur’s documents become tokens. Now the team opens up Larkspur mini, a tiny model trained only on those documents, and runs it right here in your browser.',
      goal: 'What does a language model actually do with a prompt?',
      learn: [
        'That a model gives a probability to every token it knows, for the next position only',
        'How a longer answer is built by adding one token and running again',
        'Why Larkspur mini is a toy: what it can and can’t know',
      ],
      terms: [
        ['Model', 'A program of fixed numbers (its weights), learned from text, that turns a prompt into scores for what comes next. Larkspur mini is one, small enough to run in a web page.'],
        ['Next-token prediction', 'The one job a language model does: given the tokens so far, give each token in its vocabulary a probability of coming next.'],
        ['Vocabulary', 'Every token the model knows. It can only ever write one of these.'],
      ],
    },
  },
  {
    id: '02-tokens-become-vectors', title: 'Tokens become vectors', short: 'Tokens become vectors',
    intro: {
      story: 'Larkspur mini picked “days” after “five business”. But a model does arithmetic, and a token is only an id. Before the model can weigh anything, each token has to become numbers.',
      goal: 'How does a token id become something the model can compute with, and how does it know where the token sits?',
      learn: [
        'What an embedding is: a row of numbers looked up for each token',
        'Why the same token always starts from the same row',
        'How adding a position’s row tells the model where each token sits',
      ],
      terms: [
        ['Vector', `A list of numbers of fixed length. Larkspur mini’s are ${LM.d_model} numbers long.`],
        ['Embedding', 'The vector a token is turned into, looked up in a table with one row per token in the vocabulary.'],
        ['Position embedding', 'A second table with one row per position in the window, added to the token’s row so the model knows where the token sits.'],
      ],
    },
  },
  {
    id: '03-attention', title: 'Attention', short: 'Attention',
    intro: {
      story: 'Each token now enters the model as its own vector. But “business” alone can’t tell the model what comes next: it needs “five” and “within” too. Something has to let tokens read each other.',
      goal: 'How does each token gather what it needs from the tokens before it?',
      learn: [
        'How to read an attention heatmap: who looks at whom, and how much',
        'Why each row of weights adds up to 1',
        'Why a token can never look at a token after it: the causal mask',
      ],
      terms: [
        ['Attention', 'The step where each token gives every earlier token a weight, then takes in a mix of them, more from the heavier ones.'],
        ['Weight', 'How much one token takes from another, between 0 and 1. A token’s weights add up to 1.'],
        ['Causal mask', fact('causal-mask').claim],
      ],
    },
  },
  {
    id: '04-heads-and-layers', title: 'Heads and layers', short: 'Heads and layers',
    intro: {
      story: 'One attention pattern can’t look for everything at once. Larkspur mini has several, stacked in layers, and nobody told any of them what to look for.',
      goal: 'Why does a model have many heads and many layers, and how do their results come together?',
      learn: [
        'That each head learns to look for something different',
        'How to spot a head that finds the start of the current word',
        'How every layer adds to one running vector per token: the residual stream',
      ],
      terms: [
        ['Head', `One attention pattern with its own learned weights. ${fact('multi-head').claim}`],
        ['Layer', 'One round of attention heads followed by a small calculation on each token. Layers are stacked: the second reads what the first wrote.'],
        ['Residual stream', 'The running vector each token carries through the model. Every layer adds what it found to it instead of replacing it.'],
      ],
    },
  },
  {
    id: '05-choosing-the-next-token', title: 'Choosing the next token', short: 'Choosing the next token',
    intro: {
      story: 'Larkspur mini now gives a probability to every token it knows. Picking the likeliest one every time makes the same reply every time. The team wants to know how a model picks, and what the settings they see in every model’s API change.',
      goal: 'How do temperature and top-p change which token gets picked?',
      learn: [
        'What sampling is, and why the same prompt can give different replies',
        'How temperature sharpens or flattens the probabilities',
        'How top-p keeps only the likeliest tokens before picking',
      ],
      terms: [
        ['Sampling', 'Picking the next token at random, in proportion to its probability.'],
        ['Temperature', 'A setting that sharpens the probabilities when low (0 always picks the likeliest) and flattens them when high.'],
        ['Top-p', fact('top-p').claim],
        ['Seed', 'The number a random draw starts from. The same seed gives the same draws, so a run can be repeated.'],
      ],
    },
  },
  {
    id: '06-why-long-prompts-cost-more', title: 'Why long prompts cost more', short: 'Why long prompts cost more',
    intro: {
      story: 'Larkspur’s finance team sees the bill grow faster than the prompts. Every token in the window looks back at every token before it, and that adds up.',
      goal: 'Why does the work grow faster than the prompt, and what does the KV cache save?',
      learn: [
        'Why attention pairs grow with the square of the prompt’s length',
        'What the KV cache keeps so earlier tokens aren’t recomputed',
        'Why the window has a limit at all',
      ],
      terms: [
        ['Attention pair', 'One token scoring one earlier token (or itself). A prompt of n tokens has n × (n + 1) ÷ 2 of them per head.'],
        ['KV cache', 'The keys and values of the tokens already read, kept so that each new token only computes its own.'],
        ['Context window', `The most tokens a model reads at once. Larkspur mini’s is ${LM.ctx}.`],
      ],
    },
  },
  {
    id: '07-trace-a-prompt', title: 'Trace a prompt', short: 'Trace a prompt',
    intro: {
      story: 'You have seen every part of Larkspur mini. Now the whole machine is yours: type any prompt and follow it through, from tokens to the next token.',
      goal: 'Can you follow any prompt through the model, step by step?',
      learn: [
        'How the pieces fit: tokens, vectors, attention, layers, the next token',
        'What a prompt longer than the window loses',
        'How to read what a head is doing on text you chose',
      ],
      terms: [
        ['Trace', 'Everything one run of the model computed for a prompt: its tokens, every attention pattern and the next-token probabilities.'],
        ['Truncation', 'Dropping the oldest tokens of a prompt that doesn’t fit the window. The model never reads them.'],
      ],
    },
  },
];

export const TRANSFORMERS_MODULE: Module = {
  id: 'transformers',
  title: 'Transformer architecture',
  description: 'What happens inside the model between a prompt and its next word: vectors, attention, heads and layers, and how the next token is picked.',
  level: 'Advanced',
  status: 'live',
  author: RAG_MODULE.author,
  prereqs: ['tokens'],
  story: 'Larkspur Supply Co.’s team opens up “Larkspur mini”, a tiny model trained only on Larkspur’s own documents, and watches it work in the browser.',
  chapters: CHAPTERS,
  recall: RECALL,
};
