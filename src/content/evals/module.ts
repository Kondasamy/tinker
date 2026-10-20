// Evals & LLM testing, module 4: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/evals/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-it-worked-when-i-tried-it', title: 'It worked when I tried it', short: 'It worked when I tried it',
    intro: {
      story: 'At the end of RAG, Larkspur’s assistant answered staff questions from the company’s own documents. The team keeps tuning it. This week someone changed how big the pieces of each document are, and the answers they tried look better. They want to ship it.',
      goal: 'How do you know a change made the assistant better, and not just better on the questions you happened to try?',
      learn: [
        'Why a change can look better on the questions you try and still break others',
        'What a test set is, and why you run all of it on every change',
        'How to spot a regression by comparing versions question by question, not by their totals',
      ],
      terms: [
        ['Version', 'One setup of the assistant: how it cuts the documents, how many pieces it sends the model. Changing a setting makes a new version.'],
        ['Eval', fact('eval').claim],
        ['Test set', 'A fixed list of questions, each with the answer it should get. Every version runs all of them, so results compare.'],
        ['Regression', 'A question that used to pass and now fails, because of a change meant to make things better.'],
      ],
    },
  },
];

export const EVALS_MODULE: Module = {
  id: 'evals',
  title: 'Evals & LLM testing',
  description: 'How a team knows the assistant got better or worse: test sets, graders and regressions.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['rag'],
  story: 'Back at Larkspur Supply Co., the team keeps changing the assistant, and has to show each change made it better before it ships.',
  chapters: CHAPTERS,
  recall: RECALL,
};
