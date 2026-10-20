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
  {
    id: '02-the-test-set', title: 'The test set', short: 'The test set',
    intro: {
      story: 'Chapter 1’s test set caught a regression nobody tried. Now the team wants more cases in it, and the support lead has a week of the assistant’s chat log to choose from.',
      goal: 'Which cases belong in a test set, and what does each one need before it can be graded?',
      learn: [
        'Where test cases come from: real questions and known failures',
        'Why a set needs questions the documents can’t answer',
        'What a reference answer is, and why every case needs one',
      ],
      terms: [
        ['Test case', 'One question in the test set, asked on every run, with the answer it should get.'],
        ['Reference answer', 'The answer a case should get, written by the team. Graders compare the assistant’s answer against it.'],
        ['Known failure', 'A question the assistant once got wrong. Kept in the set so the same mistake can’t come back unseen.'],
        ['Coverage', 'Which kinds of case the set includes. A kind with no case is a gap: nothing checks it.'],
      ],
    },
  },
  {
    id: '03-graders', title: 'Graders', short: 'Graders',
    intro: {
      story: 'Larkspur’s test set is built, and every case has a reference answer. Now something has to decide, for each answer, pass or fail.',
      goal: 'What can grade an answer, and which mistakes does each kind of grader catch or miss?',
      learn: [
        'Three code checks: exact match, contains the key fact, has a citation',
        'What a model judge and its rubric are, and how a rubric can be fooled',
        'Why people are the best grader and the slowest',
      ],
      terms: [
        ['Grader', 'Whatever decides whether one answer passes: a code check, a model, or a person.'],
        ['Exact match', 'A code check: the answer’s words equal the reference answer’s.'],
        ['Key fact', 'The short phrase an answer must contain to be right, like “30 days”.'],
        ['Citation', 'The passage from the documents an answer says it rests on.'],
        ['Model judge', 'Another model that reads an answer and grades it, pass or fail.'],
        ['Rubric', 'The written test a model judge applies: the question it answers about each answer.'],
      ],
    },
  },
  {
    id: '04-judge-the-judge', title: 'Judge the judge', short: 'Judge the judge',
    intro: {
      story: 'In chapter 3 the model judge passed a made-up policy that a person failed. The team still wants a judge: people can’t read every answer of every run. First they check it.',
      goal: 'How do you know a model judge grades the way your people would, and what tricks it?',
      learn: [
        'How to measure a judge: agreement with people’s labels',
        'How rewriting the rubric changes what the judge catches',
        'Position bias in side-by-side grading, and the fix: judge both orders',
      ],
      terms: [
        ['Label', 'A person’s pass or fail on one answer, used to check a grader.'],
        ['Agreement', 'How often the judge’s verdict matches people’s labels, out of the answers both graded.'],
        ['Side-by-side grading', 'The judge sees two answers to one question and picks the better one. Also called pairwise.'],
        ['Position bias', fact('position-bias').claim],
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
