// Evals & LLM testing, module 4: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/evals/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-it-worked-when-i-tried-it',
    title: 'It worked when I tried it',
    short: 'It worked when I tried it',
    intro: {
      story:
        'Larkspur’s assistant answers from the company’s documents. This week the team made the pieces bigger, and the answers they tried look better.',
      goal: 'How do you know a change made the assistant better, not just on the questions you tried?',
      learn: [
        'Why a change can look better on the questions you try and still break others',
        'What a test set is, and why you run all of it on every change',
        'How to spot a regression by comparing versions question by question, not by their totals',
      ],
      terms: [
        [
          'Version',
          'One setup of the assistant: how it cuts the documents, how many pieces it sends the model. Changing a setting makes a new version.',
        ],
        ['Eval', fact('eval').claim],
        [
          'Test set',
          'A fixed list of questions, each with the answer it should get. Every version runs all of them, so results compare.',
        ],
        ['Regression', 'A question that used to pass and now fails, because of a change meant to make things better.'],
      ],
    },
  },
  {
    id: '02-the-test-set',
    title: 'The test set',
    short: 'The test set',
    intro: {
      story:
        'Chapter 1’s test set caught a regression. The team wants more cases, from a week of the assistant’s chat log.',
      goal: 'Which cases belong in a test set, and what does each need to be graded?',
      learn: [
        'Where test cases come from: real questions and known failures',
        'Why a set needs questions the documents can’t answer',
        'What a reference answer is, and why every case needs one',
      ],
      terms: [
        ['Test case', 'One question in the test set, asked on every run, with the answer it should get.'],
        [
          'Reference answer',
          'The answer a case should get, written by the team. Graders compare the assistant’s answer against it.',
        ],
        [
          'Known failure',
          'A question the assistant once got wrong. Kept in the set so the same mistake can’t come back unseen.',
        ],
        ['Coverage', 'Which kinds of case the set includes. A kind with no case is a gap: nothing checks it.'],
      ],
    },
  },
  {
    id: '03-graders',
    title: 'Graders',
    short: 'Graders',
    intro: {
      story:
        'Larkspur’s test set is built, each case with its reference answer. Now something must mark each answer pass or fail.',
      goal: 'What can grade an answer, and what does each grader catch or miss?',
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
    id: '04-judge-the-judge',
    title: 'Judge the judge',
    short: 'Judge the judge',
    intro: {
      story:
        'In chapter 3 the judge passed a made-up policy a person failed. People can’t read every answer, so the team checks the judge first.',
      goal: 'Does the judge grade the way your people would, and what tricks it?',
      learn: [
        'How to measure a judge: agreement with people’s labels',
        'How rewriting the rubric changes what the judge catches',
        'Position bias in side-by-side grading, and the fix: judge both orders',
      ],
      terms: [
        ['Label', 'A person’s pass or fail on one answer, used to check a grader.'],
        ['Agreement', 'How often the judge’s verdict matches people’s labels, out of the answers both graded.'],
        [
          'Side-by-side grading',
          'The judge sees two answers to one question and picks the better one. Also called pairwise.',
        ],
        ['Position bias', fact('position-bias').claim],
      ],
    },
  },
  {
    id: '05-grading-the-path',
    title: 'Grading the path',
    short: 'Grading the path',
    intro: {
      story:
        'In Tool calling, Larkspur’s assistant also looks orders up and issues refunds. One recorded run answered right and refunded money nobody asked for.',
      goal: 'When the assistant takes actions, what should a grader check besides the reply?',
      learn: [
        'Why a reply can pass while the run behind it did harm',
        'Checking the state: what the run left in the order system',
        'Checking the path: calls a run should never make, without demanding a fixed list of steps',
      ],
      terms: [
        ['Run', 'One request played through: every tool call the assistant made, and its reply.'],
        ['Answer grader', 'A check on the reply alone, here that it states the delivery date asked about.'],
        ['State', 'What a run leaves behind in the systems it touched, like the refunds in the order ledger.'],
        ['Path', 'The steps a run took: which tools it called, with what. Also called the trajectory.'],
      ],
    },
  },
  {
    id: '06-run-it-twice',
    title: 'Run it twice',
    short: 'Run it twice',
    intro: {
      story:
        'So far each question was asked once. Asked again, with nothing changed, the same question passes one time and fails the next.',
      goal: 'If the same case can pass and fail, what does one test run prove?',
      learn: [
        'Why one try at a case says little about the next',
        'pass@k and pass^k: “can it?” against “will it, every time?”',
        'Why a small test set’s score moves in big steps',
      ],
      terms: [
        ['Trial', fact('trial').claim],
        ['pass@k', fact('pass-at-k').claim],
        ['pass^k', fact('pass-hat-k').claim],
        ['Flaky', 'A case that passes on some trials and fails on others, with nothing changed.'],
      ],
    },
  },
  {
    id: '07-release-day',
    title: 'Release day',
    short: 'Release day',
    intro: {
      story:
        'The team has a test set, checked graders and a feel for flaky cases. New versions wait to replace the one Larkspur ships.',
      goal: 'What rule should decide whether a new version ships, and what can fool it?',
      learn: [
        'How a release gate turns a test run into ship or do not ship',
        'Why a pass-rate bar alone lets a regression through',
        'Why the gate is only as good as its grader, and its number of runs',
      ],
      terms: [
        ['Baseline', 'The version that ships today. Every candidate is compared against it, question by question.'],
        ['Candidate', 'A new version that wants to replace the baseline.'],
        ['Release gate', 'The rule that decides, from a test run, whether a candidate ships.'],
        ['Threshold', 'The pass rate a candidate must reach to ship, like 75% of the test set.'],
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
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['rag'],
  story:
    'Back at Larkspur Supply Co., the team keeps changing the assistant, and has to show each change made it better before it ships.',
  chapters: CHAPTERS,
  recall: RECALL,
};
