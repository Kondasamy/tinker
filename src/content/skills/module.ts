// Skills: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { OUTSIDER, PAGES, REQUESTS, SKILLS } from '../../lib/skills/skills';
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
  {
    id: '04-steps-not-facts',
    title: 'Steps, not facts',
    short: 'Steps',
    intro: {
      story:
        'Refund tickets need sums: days since delivery, the item’s state, the price. The refund binder now holds a calculator script beside its rules.',
      goal: 'Should the assistant read a skill’s script, or run it?',
      learn: ['A skill can hold steps and a script, not just facts', 'A script that runs costs only its output'],
      terms: [['Script', 'A small program kept in a skill, which the assistant can run.']],
    },
  },
  {
    id: '05-two-skills-fight',
    title: 'Two skills fight',
    short: 'Overlap',
    intro: {
      story:
        'A teammate widened the Damaged label to cover anything faulty. Now a kettle under warranty opens the wrong binder.',
      goal: 'What happens when two labels claim the same tickets?',
      learn: ['Overlapping labels open the wrong skill', 'Sharpen each label to its own tickets'],
      terms: [['Overlap', 'Two labels sharing words, so both seem to fit one ticket.']],
    },
  },
  {
    id: '06-a-skill-from-outside',
    title: 'A skill from outside',
    short: 'From outside',
    intro: {
      story: `A vendor offers a free skill, ${OUTSIDER.name}, from ${OUTSIDER.from}. It arrives as a binder on the desk, ready to install.`,
      goal: 'What can a downloaded skill carry besides help?',
      learn: [
        'A skill’s instructions run with the assistant’s access',
        'Read a downloaded skill before you install it',
      ],
      terms: [['Install', 'Put a skill on the carousel, so its label rides in every prompt.']],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench',
    short: 'Workbench',
    intro: {
      story: `Larkspur’s ${SKILLS.length} binders need labels that send all ${REQUESTS.length} tickets to the right one, without padding every prompt.`,
      goal: 'Which labels get every ticket to the right binder for the fewest words?',
      learn: ['Write labels that say what and when', 'Long catch-all labels steal tickets; vague ones miss'],
      terms: [],
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
