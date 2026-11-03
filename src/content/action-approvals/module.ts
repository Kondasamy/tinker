// Approvals and permissions: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-the-approve-button',
    title: 'The approve button',
    short: 'Approve button',
    intro: {
      story:
        'You join Larkspur’s refund office. The assistant reads customer mail and can issue refunds, so Rosa approves each one at a toll booth.',
      goal: 'What happens when a person must say yes to every action?',
      learn: ['Why a yes for everything stops being read', 'What approval fatigue costs'],
      terms: [['Approval', 'A person’s yes before the assistant’s action runs.']],
    },
  },
  {
    id: '02-text-that-gives-orders',
    title: 'Text that gives orders',
    short: 'Orders in text',
    intro: {
      story:
        'Rosa’s yes was waved through on a fake refund. Now a dye shows where each refund’s words came from: Rosa, or mail from outside.',
      goal: 'Who gave the order when an email’s text turns into a refund?',
      learn: ['Text the assistant reads can give it orders', 'Dye marks what came from outside text'],
      terms: [
        ['Dye', 'A mark on text from outside Larkspur, carried by whatever the assistant writes after reading it.'],
      ],
    },
  },
  {
    id: '03-following-the-dye',
    title: 'Following the dye',
    short: 'Following the dye',
    intro: {
      story:
        'The dye showed an email gave the refund order. But the assistant writes more than refunds: notes, logs and replies to the sender.',
      goal: 'After the assistant reads an email, which of the things it writes carry the dye?',
      learn: ['Everything written after reading carries the dye', 'Why a reply going outside is the dangerous one'],
      terms: [['Trifecta', 'Private data, text from strangers and a way to send messages out, all in one assistant.']],
    },
  },
  {
    id: '04-small-steps',
    title: 'Small steps, big harm',
    short: 'Small steps',
    intro: {
      story:
        'Dyed refunds now wait for Rosa. But Kim asks for refunds one small box at a time, and each one looks fine on its own.',
      goal: 'How can small refunds that each look fine add up to harm?',
      learn: ['Harm can hide in a total, not in one step', 'A running budget stops what adds up'],
      terms: [['Budget', 'The most the assistant may pay out in a day, counted across every refund.']],
    },
  },
  {
    id: '05-approvals-run-out',
    title: 'Approvals run out',
    short: 'Approvals run out',
    intro: {
      story:
        'The budget stopped the third refund. Rosa still flips hourglasses all day, and each yes stays on the counter as a pass.',
      goal: 'What should a yes cover, and for how long?',
      learn: ['A yes names one order', 'A yes runs out, so an old one can’t be reused'],
      terms: [['Pass', 'A person’s yes for one order, kept for a limited time.']],
    },
  },
  {
    id: '06-two-minds',
    title: 'Two minds',
    short: 'Two minds',
    intro: {
      story:
        'Dye, budgets and passes all catch orders after the assistant has read them. What if the part that acts never reads the mail?',
      goal: 'Can an email still add a refund if the planner never reads it?',
      learn: ['A planner sets the steps from the person’s request only', 'A reader with no tools handles outside text'],
      terms: [
        ['Planner', 'The part that decides the steps, from the person’s request alone.'],
        ['Reader', 'The part that reads outside text and has no tools to act.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Set the rules',
    short: 'Workbench',
    intro: {
      story:
        'You know dye, budgets and passes. Now set them for a hand-written week of mail, three letters of it harmful.',
      goal: 'Which rules stop every harmful refund without burying Rosa in prompts?',
      learn: ['Too many prompts let harm through as surely as too few', 'Dye, a budget and short passes work together'],
      terms: [['Prompt', 'A question to Rosa at the barrier: yes or no to one refund.']],
    },
  },
];

export const ACTION_APPROVALS_MODULE: Module = {
  id: 'action-approvals',
  title: 'Approvals and permissions',
  description:
    'Harmless steps that add up to harm, approvals that run out, and keeping text the assistant read from approving what it does.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['guardrails', 'sandboxing'],
  story:
    'Larkspur Supply Co.’s refund office puts a toll booth between the assistant and the money, and learns which refunds need a person’s yes.',
  chapters: CHAPTERS,
  recall: RECALL,
};
