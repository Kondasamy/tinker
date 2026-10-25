// Post-training, module 19: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-base-or-assistant',
    title: 'Base or assistant',
    short: 'Base or assistant',
    intro: {
      story:
        'Larkspur wants an assistant of its own. Pre-training gave it a base model that has read a mountain of text, but it doesn’t answer customers yet.',
      goal: 'What is the difference between a base model and an assistant?',
      learn: [
        'Why a base model continues text instead of answering',
        'What supervised fine-tuning on examples changes',
        'What post-training adds after that',
      ],
      terms: [
        [
          'Base model',
          'A model trained only to guess the next words of documents. It continues text; it was never taught to answer.',
        ],
        ['Post-training', 'Everything done to a base model after pre-training to turn it into a helpful assistant.'],
        [
          'Supervised fine-tuning',
          'Training on examples people wrote: a prompt and the reply they want. The model learns to copy their style.',
        ],
      ],
    },
  },
  {
    id: '02-which-is-better',
    title: 'Which is better?',
    short: 'Which is better',
    intro: {
      story:
        'Examples teach a style, but writing a perfect reply for every case is slow. Comparing two drafts is fast: anyone can say which one they prefer.',
      goal: 'How do people’s preferences become something a model can learn from?',
      learn: [
        'What a preference pair is',
        'How a reward model turns pairs into scores',
        'Why pairs suit tone, where there is no right answer',
      ],
      terms: [
        ['Preference pair', 'Two drafts for the same message, with a person’s pick of the better one.'],
        ['Reward model', 'A scorer fitted to preference pairs: drafts that win their pairs score higher.'],
      ],
    },
  },
  {
    id: '03-learning-from-preferences',
    title: 'Learning from preferences',
    short: 'Preferences',
    intro: {
      story:
        'Your picks from the last chapter are in. Now the model learns from them, without drifting off into answers nobody asked for.',
      goal: 'How does DPO move a model toward the drafts people prefer, and what holds it back?',
      learn: [
        'How DPO shifts the odds toward preferred drafts',
        'What the reference policy is',
        'How the strength β trades your picks against what the model knew',
      ],
      terms: [
        [
          'DPO',
          'Direct preference optimization: training on preference pairs directly, with no reward model or reinforcement loop.',
        ],
        [
          'Toy policy',
          'This module’s stand-in for a model: a share of probability for each written draft, not a language model.',
        ],
        ['Reference policy', 'The model as it was before this training: the starting odds it is pulled back toward.'],
        [
          'Strength',
          'β: how far the policy may stray from its reference. Low lets your picks dominate; high keeps it close.',
        ],
      ],
    },
  },
  {
    id: '04-grade-dont-judge',
    title: 'Grade, don’t judge',
    short: 'Grade it',
    intro: {
      story:
        'Some questions have one right answer. A warranty’s length is in the documents, so a program can check every draft, with no people needed.',
      goal: 'How does a model learn from a grader that checks its drafts?',
      learn: ['What a checkable grader is', 'How GRPO scores each draft against its group', 'Why each step is clipped'],
      terms: [
        ['Grader', 'A program that checks a draft and gives it a reward: here, Evals’ key-fact check.'],
        ['Group', 'Several drafts the model writes for the same question, graded together.'],
        [
          'GRPO',
          'Group relative policy optimization: each draft is scored against its group’s average, and the model leans toward the above-average ones.',
        ],
        ['Advantage', 'A draft’s reward minus the group’s average, divided by how spread out the rewards are.'],
      ],
    },
  },
  {
    id: '05-only-what-you-can-check',
    title: 'Only what you can check',
    short: 'What you check',
    intro: {
      story:
        'The grader worked on the warranty. The team points it at the upset customer from chapter 2, hoping it will learn a warmer reply.',
      goal: 'What happens when a grader can’t tell the good drafts from the bad ones?',
      learn: [
        'Why equal rewards mean no update',
        'Which qualities a grader can check, and which it can’t',
        'Why teams mix graders and preferences',
      ],
      terms: [['Spread', 'How far apart the rewards in a group are. With no spread, no draft beats the average.']],
    },
  },
  {
    id: '06-you-get-what-you-check',
    title: 'You get what you check',
    short: 'Gamed',
    intro: {
      story:
        'Checking key facts means writing references. A teammate proposes a cheaper grader: reward any reply with a number and Larkspur’s sign-off.',
      goal: 'What does a model learn from a grader that checks the wrong thing?',
      learn: [
        'What reward hacking looks like',
        'Why a weak grader’s favourite can be wrong',
        'How a better grader fixes it',
      ],
      terms: [
        [
          'Weak grader',
          'A grader that checks something easy, like the presence of a number, instead of whether the answer is right.',
        ],
        ['Reward hacking', 'Scoring high on the grader without doing the job the grader stands for.'],
      ],
    },
  },
  {
    id: '07-build-a-grader',
    title: 'Build a grader',
    short: 'The grader',
    intro: {
      story:
        'The team wants one grader for four questions with checkable answers. You assemble it from rules and run the toy policy on each.',
      goal: 'Which rules make a grader that rewards right answers and nothing that games it?',
      learn: ['How each rule can help or be gamed', 'How to test a grader before trusting it'],
      terms: [['Rule', 'One check in a grader, worth a point when a draft passes it.']],
    },
  },
];

export const POST_TRAINING_MODULE: Module = {
  id: 'post-training',
  title: 'Post-training',
  description:
    'How a base model becomes an assistant: preferences, a grader that marks its drafts, and the answers that game a weak one.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['fine-tuning', 'evals'],
  story:
    'Back at Larkspur Supply Co., the team is turning a base model into its assistant: with people’s picks, with graders, and by finding where a grader gets gamed.',
  chapters: CHAPTERS,
  recall: RECALL,
};
