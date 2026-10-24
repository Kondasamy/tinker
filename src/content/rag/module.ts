// RAG, module 1: its chapters and module facts. Chapter ids are a contract with readers' saved progress (R3): never rename one.
import type { BlockType } from '../../lib/iso/blocks';
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

export interface RagChapter extends Chapter {
  unlocks: BlockType[]; // canvas blocks this chapter adds to the track
}

const LLM: [string, string] = [
  'LLM',
  'Large language model. It writes text by predicting what comes next, using what it learned in training and what is in its prompt.',
];
export const WINDOW: [string, string] = [
  'Context window',
  'How much text a model can read in one request, counted in tokens (a token is about ¾ of a word).',
];
const CHUNK: [string, string] = [
  'Chunk',
  'A small piece of a document. RAG searches and hands over chunks, not whole files.',
];

const CHAPTERS: Omit<RagChapter, 'og' | 'legacySteps'>[] = [
  {
    id: '01-history',
    title: 'How RAG came to be',
    short: 'History',
    unlocks: [],
    intro: {
      story:
        'Larkspur Supply Co. sells office and warehouse hardware to about 4,000 businesses. Its 260 staff lose hours hunting through policies, contracts, price lists and meeting notes. The company wants an AI assistant that answers their questions from those documents, and you are on the team building it.',
      goal: 'Why can’t an AI model simply answer questions about your company? And how did the industry arrive at RAG between 2020 and 2026?',
      learn: [
        'Why a language model invents confident answers about things it never read',
        'What Retrieval-Augmented Generation (RAG) is, in one sentence',
        'Why RAG was essential in 2023, and why today it is one tool an AI agent can choose to use',
      ],
      terms: [
        LLM,
        ['Training data', 'The text a model learned from. Your company’s private documents were never part of it.'],
        WINDOW,
        [
          'RAG',
          'Retrieval-Augmented Generation: look up the relevant passages first, then have the model answer from them.',
        ],
        [
          'Tool calling',
          'A model asking the software around it to run something, such as a search, and reading the result.',
        ],
      ],
      clip: [
        'A model knows only what it was trained on',
        'Look up the passages first, then answer',
        'Small context windows made lookup essential',
        'Retrieval learned to find the right passage',
        'Now RAG is one tool an agent can choose',
      ],
    },
  },
  {
    id: '02-why-not-stuff-it',
    title: 'Why not stuff it all in the prompt?',
    short: 'Why not stuff it',
    unlocks: [],
    intro: {
      story:
        'In chapter 1 the assistant invented a refund policy, because it had never read Larkspur’s real one. The team’s first idea: skip anything clever and paste the whole company drive into the prompt.',
      goal: 'Why does “just give it everything” break down, even with today’s huge context windows?',
      learn: [
        'How the size of real company data compares with what a context window holds',
        'Why text that does fit still gets missed or goes stale',
        'Why one shared prompt can’t respect who is allowed to see what',
      ],
      terms: [
        ['Corpus', 'All the documents the assistant could draw on: here, the company drive.'],
        WINDOW,
        ['Truncation', 'Cutting text off when it doesn’t fit. Whatever is cut, the model never sees.'],
        ['Lost in the middle', 'Models tend to miss facts buried in the middle of a long prompt.'],
      ],
      clip: [
        'Idea: paste the whole company drive in',
        'The drive grows; the context window does not',
        'Far too big: it overflows window after window',
        'Too slow, too stale, and no permissions',
      ],
    },
  },
  {
    id: '03-what-is-rag',
    title: 'What is RAG?',
    short: 'What is RAG',
    unlocks: ['docs', 'retriever', 'llm'],
    intro: {
      story:
        'Pasting everything failed: too big, too stale, no permissions. So the team will hand the model only the few passages each question needs. From this chapter on, the picture on the left is the assistant itself, a pipeline of blocks you build and change.',
      goal: 'What is the smallest working RAG system, and what does each part do?',
      learn: [
        'The three steps in the name: Retrieve, Augment, Generate',
        'How a retriever scores every passage against the question',
        'Why a grounded answer can cite where it came from',
      ],
      terms: [
        ['Retriever', 'Finds the passages that best match the question and hands the top few to the model.'],
        ['Similarity score', 'A number for how close in meaning a passage is to the question. Higher is closer.'],
        ['Grounded answer', 'An answer built from the passages it was given, so it can cite them.'],
        LLM,
      ],
      clip: [
        'Pasting every document in failed',
        'A bare model guesses at the refund policy',
        'Give it the documents it should answer from',
        'A retriever picks the few passages that match',
        'Retrieve, augment, generate: a sourced answer',
      ],
    },
  },
  {
    id: '04-layers',
    title: 'The layers of a RAG system',
    short: 'Layers',
    unlocks: ['chunker', 'embedder', 'index', 'assembler'],
    intro: {
      story:
        'The simple pipeline works, so the team cut costs: documents are now split into small pieces and only the single best piece is sent. A sales lead asks about refunds again, and the answer goes wrong.',
      goal: 'What happens between “a pile of documents” and “the passages the model reads”, and where can it break?',
      learn: [
        'How a chunker splits documents, and how a bad cut hides a rule',
        'How embeddings turn text into numbers that capture meaning',
        'How the index and the context assembler deliver the final prompt',
      ],
      terms: [
        CHUNK,
        [
          'Overlap',
          'Repeating the end of one chunk at the start of the next, so a sentence near a cut survives whole.',
        ],
        [
          'Embedding',
          'A list of numbers (here 384) that captures what a piece of text means. Similar meanings get similar numbers.',
        ],
        [
          'Vector index',
          'Storage for every chunk’s embedding, built so all of them can be compared with the question at once.',
        ],
      ],
      clip: [
        'Behind the retriever sit more layers',
        'A chunker cuts documents into small pieces',
        'An embedder turns each piece into numbers',
        'An index holds them, ready to compare',
        'An assembler builds the prompt the model reads',
      ],
    },
  },
  {
    id: '05-accuracy',
    title: 'Making RAG accurate',
    short: 'Accuracy',
    unlocks: ['rewrite', 'reranker', 'grader'],
    intro: {
      story:
        'The pipeline is fully built and it still gets things wrong: outdated policies, vague questions, rules buried in long context. Employees are starting to notice.',
      goal: 'When a RAG answer is wrong, how do you tell whether retrieval or the model failed, and which lever fixes it?',
      learn: [
        'Measure first: retrieval recall vs. answer quality',
        'Seven levers: top-k, metadata filters, query rewriting, reranking, hybrid search, overlap and chunking strategy',
        'Why getting the right text is not the same as using it well',
      ],
      terms: [
        [
          'Recall@k',
          'Did the passage with the answer make it into the top k results? Measures retrieval, not the answer.',
        ],
        ['Top-k', 'How many chunks the retriever hands over. Too few misses facts; too many buries them.'],
        ['Metadata filter', 'A rule on document properties (date, status, team) applied before ranking.'],
        ['Reranker', 'A second, more careful model that re-scores the retrieved chunks and reorders them.'],
        ['Hybrid search', 'Blending meaning-based search with exact keyword matching.'],
      ],
      clip: [
        'Built, and still wrong: measure before you fix',
        'Rewrite vague questions into searchable ones',
        'Rerank so the best passages come first',
        'Check whether the right text was found and used',
      ],
    },
  },
  {
    id: '06-types',
    title: 'Types of RAG',
    short: 'Types',
    unlocks: ['agent', 'graph'],
    intro: {
      story:
        'The tuned pipeline answers most questions well. But some questions need two documents joined together, some answers hide in tables, PDFs or images, and sometimes the right answer is “I don’t know”.',
      goal: 'Which kind of RAG fits which kind of problem, and what does each one cost?',
      learn: [
        'Naive and advanced RAG: one search, tuned or not',
        'Agentic RAG: an agent that decides when to search again',
        'GraphRAG, self-correcting RAG and multimodal RAG, each on a question that needs it',
      ],
      terms: [
        ['Agent', 'A model that can call tools, such as search, in a loop and decide when it has enough.'],
        [
          'Knowledge graph',
          'Entities (teams, products, people) joined by relations, each traced to the sentence it came from.',
        ],
        ['Hop', 'One step along a relation in the graph.'],
        ['Cross-encoder', 'A model that reads the question and a chunk together to judge how well they match.'],
        ['Multimodal', 'Working with more than plain text: tables, PDFs and images.'],
      ],
      clip: [
        "Some questions don't fit one search",
        'An agent decides when to search again',
        'A graph joins facts across documents',
        'Pick the kind of RAG the question needs',
      ],
    },
  },
  {
    id: '07-sandbox',
    title: 'Sandbox',
    short: 'Sandbox',
    unlocks: [],
    intro: {
      story: 'Every block from chapters 3 to 6 is now yours. Larkspur’s assistant is as capable as you can make it.',
      goal: 'Can you build, break and tune a RAG pipeline on your own, and pick the right type for a real team’s problem?',
      learn: [
        'Rewire the pipeline freely on the workbench',
        'Ask any question from the module and compare runs',
        'A final challenge: match five Larkspur teams to the RAG type each needs',
      ],
      terms: [],
      clip: [
        'Every block from chapters 3 to 6 is yours',
        'Rewire it, ask anything, compare runs',
        'Then match each team to the RAG it needs',
      ],
    },
  },
];

// Each chapter's step ids when runs began carrying them (KTD4): a run saved before then resumes only while these still match.
const LEGACY_STEPS: Record<string, string[]> = {
  '01-history': ['ask', 'era-origins', 'era-small-windows', 'era-retrieval-matures', 'era-agents', 'quiz'],
  '02-why-not-stuff-it': ['ask', 'overflow', 'scale', 'reason-middle', 'reason-fresh', 'reason-access', 'quiz'],
  '03-what-is-rag': ['ask', 'docs', 'retriever', 'grounded', 'math', 'quiz'],
  '04-layers': ['ask', 'chunker', 'embedder', 'map', 'assembler', 'fix', 'quiz'],
  '05-accuracy': [
    'ask',
    'evaluator',
    'more',
    'filter',
    'add-rewrite',
    'rewrite',
    'after-rewrite',
    'topk',
    'add-reranker',
    'needle',
    'after-needle',
    'distractor',
    'after-distractor',
    'overlap',
    'after-overlap',
    'strategy',
    'quiz',
  ],
  '06-types': [
    'recap',
    'naive-run',
    'attach',
    'agent-run',
    'cost',
    'quiz',
    'multi-hop',
    'attach-graph',
    'graph-one',
    'graph-two',
    'graph-quiz',
    'sc-run',
    'sc-attach',
    'sc-grade',
    'mm-attach',
    'mm-run',
    'mm-tables',
    'mm-more',
  ],
  '07-sandbox': ['open', 'play', 'challenge'],
};

export const RAG_MODULE: Module<RagChapter> = {
  id: 'rag',
  title: 'RAG',
  description: 'How AI assistants answer from your company’s documents, why they go wrong, and how to fix them.',
  level: 'Beginner',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: [],
  story: 'You join the team building an AI assistant for Larkspur Supply Co., a hardware company.',
  // bare og ids: already-shared links keep their images (KTD5)
  chapters: CHAPTERS.map(c => ({ ...c, og: c.id, legacySteps: LEGACY_STEPS[c.id] })),
  recall: RECALL,
};
