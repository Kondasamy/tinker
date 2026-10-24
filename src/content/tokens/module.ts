// Tokens & embeddings, module 6: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Each chapter's `intro` is the story column's opening context; its island is picked by src/pages/tokens/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/tokens/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-what-the-model-reads',
    title: 'What the model reads',
    short: 'What it reads',
    intro: {
      story:
        'You have joined the team building an AI assistant for Larkspur Supply Co., a hardware company. Before it reads any document, the team starts with what a model reads.',
      goal: 'When you type a sentence, what does the model receive?',
      learn: [
        'Text reaches the model as a list of tokens, each one a number',
        'Why tokens are not words and not letters',
        'How to count a sentence in tokens, words and characters',
      ],
      terms: [
        [
          'Token',
          'A piece of text the model reads as one unit: a word, part of a word, a space with a word, or a single byte. Each token has a number, its id.',
        ],
        [
          'Tokenizer',
          'The program that cuts text into tokens and turns them into ids, before the model sees anything.',
        ],
        [
          'Vocabulary',
          'Every token a tokenizer knows, each with its id. Text can only be cut into tokens from this list.',
        ],
      ],
    },
  },
  {
    id: '02-how-the-vocabulary-is-learned',
    title: 'How the vocabulary is learned',
    short: 'Learning the vocabulary',
    intro: {
      story:
        'The sentence came out as more tokens than words: some words were cut into pieces. Nobody chose those pieces by hand; the tokenizer learned them from Larkspur’s documents.',
      goal: 'Where does a tokenizer’s vocabulary come from, and why does it cut where it does?',
      learn: [
        'A byte-level tokenizer starts from single bytes, so it can read any text',
        'How a merge glues a common pair of tokens into one new token',
        'Why the order of merges comes from the training text, not from the text you send',
      ],
      terms: [
        [
          'Byte',
          'The smallest unit computers store text in. An English letter is one byte; many other characters take two to four.',
        ],
        [
          'Merge',
          'A rule the tokenizer learned: wherever these two tokens sit side by side, glue them into one new token.',
        ],
        ['Byte pair encoding (BPE)', fact('bpe-origin').claim],
      ],
    },
  },
  {
    id: '03-tokens-are-the-meter',
    title: 'Tokens are the meter',
    short: 'The meter',
    intro: {
      story:
        'The tokenizer learned its pieces from Larkspur’s documents. Now the team wants to know what sending them all to a model costs, and whether a rule of thumb will do.',
      goal: 'How many tokens are Larkspur’s documents, and how far off is the rule of thumb?',
      learn: [
        'Why providers bill and size the context window in tokens',
        `How the “${fact('openai-rule').value} characters per token” rule compares with real tokenizers’ counts`,
        'Why the same text costs a different amount on a different tokenizer',
      ],
      terms: [
        ['Rule of thumb', fact('openai-rule').claim],
        [
          'Context window',
          'The most tokens a model can read in one go: the prompt, the documents and its reply together.',
        ],
        [
          'In-sample',
          'Counted on the same text the tokenizer was trained on. It looks better than it would on new text.',
        ],
      ],
    },
  },
  {
    id: '04-every-tokenizer-splits-differently',
    title: 'Every tokenizer splits differently',
    short: 'Different splits',
    intro: {
      story:
        'Real tokenizers counted Larkspur’s documents differently from each other. The team now looks at why, sentence by sentence.',
      goal: 'Why does the same sentence become different tokens on different tokenizers?',
      learn: [
        'How leading spaces and capitals make different tokens',
        'Why numbers and code cut into odd pieces',
        'Why other languages often take more tokens for the same meaning',
      ],
      terms: [
        ['Leading space', 'A space glued to the front of a word’s token: “ shelf” and “shelf” are different tokens.'],
        ['Token tax', 'The extra tokens one language or kind of text needs, against English, for the same content.'],
      ],
    },
  },
  {
    id: '05-from-token-to-vector',
    title: 'From token to vector',
    short: 'To vectors',
    intro: {
      story:
        'A token id says nothing about meaning: id 500 is no closer to 501 than to 9. Larkspur’s search, from the RAG module, needs similar texts to sit close.',
      goal: 'How does text become a list of numbers that carries its meaning?',
      learn: [
        'What an embedding is: a list of numbers for a piece of text',
        'Why texts with similar meaning get similar embeddings',
        'How RAG’s map of meaning draws them in two dimensions',
      ],
      terms: [
        ['Embedding', fact('embedding-def').claim],
        ['Vector', 'A list of numbers; an embedding is one.'],
        ['Dimension', `One number in a vector. RAG’s embedding model gives ${fact('minilm').value}.`],
      ],
    },
  },
  {
    id: '06-meaning-by-neighbours',
    title: 'Meaning by neighbours',
    short: 'Neighbours',
    intro: {
      story:
        'Every Larkspur document piece and customer question now has an embedding. The assistant needs the pieces closest in meaning to each question.',
      goal: 'How do you measure how close two meanings are, and find the nearest ones?',
      learn: [
        'Cosine similarity: how close two embeddings point',
        'Nearest neighbours: the pieces closest to a question',
        'Why close in meaning is not the same as sharing words',
      ],
      terms: [
        ['Cosine similarity', 'A score for how alike two vectors point, from -1 to 1; 1 means the same direction.'],
        ['Nearest neighbours', 'The vectors with the highest similarity to a given one.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: fit the prompt',
    short: 'Workbench',
    intro: {
      story:
        'Larkspur’s assistant builds each prompt from parts: instructions, the question, document pieces, examples. The team must choose what fits its token budget.',
      goal: 'Which parts of Larkspur’s prompt fit in the budget, and which matter most?',
      learn: [
        'How a prompt’s token count adds up from its parts',
        'How to fit a prompt into a budget, counting live',
        'Why you count with the tokenizer you will be billed by',
      ],
      terms: [
        ['Token budget', 'The most tokens a team allows for one request, set for cost or for the window.'],
        ['Prompt', 'Everything sent to the model in one request.'],
      ],
    },
  },
];

export const TOKENS_MODULE: Module = {
  id: 'tokens',
  title: 'Tokens & embeddings',
  description:
    'How text becomes the numbers a model reads: tokens to count and pay for, and embeddings that carry meaning.',
  level: 'Beginner',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co. is building an AI assistant, and the team starts where the model does: with the tokens it reads and the numbers that carry meaning.',
  chapters: CHAPTERS,
  recall: RECALL,
};
