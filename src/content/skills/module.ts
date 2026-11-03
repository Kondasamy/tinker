// Skills: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { PAGES } from '../../lib/skills/skills';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-the-long-prompt',
    title: `The ${PAGES}-page prompt`,
    short: 'Long prompt',
    intro: {
      story:
        'You join Larkspur’s returns desk. The assistant answers customers from one long prompt holding every rule, and it keeps getting returns wrong.',
      goal: 'Why does one long prompt with every rule bury the rule a ticket needs?',
      learn: [
        'Why a prompt that holds everything buries the rule you need',
        'What every ticket pays for a long prompt',
      ],
      terms: [['Prompt', 'The instructions sent to the model with every request.']],
    },
  },
  {
    id: '02-label-and-folder',
    title: 'A label and a folder',
    short: 'Label and folder',
    intro: {
      story:
        'The long prompt buried the refund rule. Now each binder becomes a skill, and the assistant keeps only its label in every prompt.',
      goal: 'What does a skill keep in every prompt, and what does it load only when needed?',
      learn: ['A skill’s label is in every prompt; its body loads only when picked', 'Why that keeps the prompt small'],
      terms: [
        ['Skill', 'A folder of instructions the assistant opens only when a task needs it.'],
        ['Label', 'A skill’s name and one-line description, sent in every prompt.'],
      ],
    },
  },
  {
    id: '03-picking-the-binder',
    title: 'Picking the binder',
    short: 'Picking',
    intro: {
      story:
        'Skills cut the prompt. But a ticket about a broken drill gets no help, though a warranty binder sits on the carousel.',
      goal: 'How does the assistant decide which binder to open?',
      learn: [
        'The label alone decides which skill opens',
        'Why a vague label never gets picked',
        'What a sharp label says',
      ],
      terms: [['Description', 'The line in a skill’s label that says what it does and when to use it.']],
    },
  },
];

export const SKILLS_MODULE: Module = {
  id: 'skills',
  title: 'Skills',
  description:
    'Know-how packed as folders the assistant opens only when a task needs it, instead of one long prompt: only the label sits in every prompt.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['context', 'tool-calling'],
  story: `Larkspur Supply Co.’s returns assistant swaps its ${PAGES}-page prompt for a carousel of skill binders, and learns to open the right one.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
