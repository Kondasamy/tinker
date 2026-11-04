// Undo for agents: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-halfway-done',
    title: 'Halfway done',
    short: 'Halfway',
    intro: {
      story:
        'Ana Ruiz returns a drill. Larkspur’s assistant handles it in four steps: restock, refund, email her, book the courier.',
      goal: 'When step four fails after three went through, where does the return stand?',
      learn: ['A failed step doesn’t cancel the ones before it', 'Why a half-done job is the worst place to stop'],
      terms: [['Step', 'One action the assistant takes on another system, like a refund or a booking.']],
    },
  },
  {
    id: '02-save-points',
    title: 'Save points',
    short: 'Save points',
    intro: {
      story:
        'The courier failed and three steps stood. Before undoing anything: what if the assistant itself crashes mid-run?',
      goal: 'How does a restart know which steps already happened?',
      learn: ['A restart with no record redoes finished steps', 'A save point records each finished step'],
      terms: [['Save point', 'A record, written after each finished step, that a restart reads to carry on.']],
    },
  },
  {
    id: '03-the-opposite-step',
    title: 'The opposite step',
    short: 'Opposites',
    intro: {
      story:
        'Save points stop a restart redoing work. Now back to the courier failure: three steps stand, and must come undone.',
      goal: 'What undoes a step, and in what order do the undos run?',
      learn: ['Each step gets an opposite step that cancels it', 'Undos run newest first, back down the hill'],
      terms: [
        ['Opposite step', 'A step that cancels another’s effect: charge back a refund, cancel a booking.'],
        ['Saga', 'A long job split into steps, each with an opposite, so a half-done run can be undone.'],
      ],
    },
  },
  {
    id: '04-cant-undo',
    title: 'Some things can’t be undone',
    short: 'Can’t undo',
    intro: {
      story:
        'Opposites undid the refund and the stock. But the email to Ana went out, and it still says a pickup is booked.',
      goal: 'What do you do about a step that has no opposite?',
      learn: ['A sent email can’t be taken back', 'A follow-up amends it, and still leaves a muddle'],
      terms: [['Follow-up', 'A second message that corrects the first, since the first can’t be taken back.']],
    },
  },
  {
    id: '05-risky-step-last',
    title: 'Do the risky step last',
    short: 'Risky last',
    intro: {
      story:
        'Ana got two letters: one promising a pickup, one taking it back. The follow-up helped, but she never needed the first.',
      goal: 'Where in the order should the step you can’t undo go?',
      learn: ['Order the steps so the one you can’t undo runs last', 'Then a failure never reaches it'],
      terms: [],
    },
  },
  {
    id: '06-only-once',
    title: 'Only once',
    short: 'Only once',
    intro: {
      story:
        'The order is fixed. But steps can also go through while their answer gets lost, and then the assistant tries again.',
      goal: 'How do you retry a step without doing it twice?',
      learn: ['A lost answer doesn’t mean the step failed', 'A key lets the far side spot a repeat'],
      terms: [
        ['Retry', 'Sending the same request again after no answer came back.'],
        [
          'Idempotency key',
          'A unique name sent with a request, so the far side does it once however often it arrives.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: twenty failures',
    short: 'Workbench',
    intro: {
      story:
        'You have seen refusals, crashes, lost answers and steps that can’t be undone. Now set up the return for all of them.',
      goal: 'Which order, opposites, save points and key survive twenty failures?',
      learn: [
        'Weigh clean finishes against harm to the customer',
        'Give every step an opposite; do the one you can’t undo last',
      ],
      terms: [],
    },
  },
];

export const AGENT_UNDO_MODULE: Module = {
  id: 'agent-undo',
  title: 'Undo for agents',
  description:
    'When step four fails after three went through: save points, an opposite for every step, the step you can’t undo last, and retries that happen once.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents', 'queues'],
  story:
    'Larkspur Supply Co.’s assistant handles a return in four steps on a hillside funicular, and learns to undo them when the courier booking fails.',
  chapters: CHAPTERS,
  recall: RECALL,
};
