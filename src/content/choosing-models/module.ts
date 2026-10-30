// Choosing a model: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename
// one. Counts come from the hand-set data (machines.json, questions.json).
import type { Chapter, Module } from '../../lib/modules';
import { BAR, NEXT, QUESTIONS, machineOf } from '../../lib/choosing-models/machines';
import { RECALL } from './recall';

const N = QUESTIONS.length;

const CHAPTERS: Chapter[] = [
  {
    id: '01-the-leaderboard',
    title: 'The leaderboard',
    short: 'Leaderboard',
    intro: {
      story:
        'Larkspur’s support team needs a model behind its reply drafter. Three made-up machines are on offer: A, B and C. First stop: a public leaderboard.',
      goal: 'What does a leaderboard’s top spot tell you?',
      learn: ['What a leaderboard ranks', 'How its votes and tests are made', 'Why its top isn’t your answer'],
      terms: [
        ['Benchmark', 'A fixed public test that many models are scored on.'],
        ['Leaderboard', 'A public ranking of models by their benchmark scores or votes.'],
        ['Weight', 'How much one criterion counts when the steelyard weighs the machines.'],
      ],
    },
  },
  {
    id: '02-your-own-questions',
    title: 'Your own questions',
    short: 'Your test',
    intro: {
      story: `The leaderboard put A, then B, then C. But Larkspur’s customers ask about trade accounts, timber and returns. The team keeps ${N} real questions.`,
      goal: 'Does the public order hold on Larkspur’s own questions?',
      learn: ['What your own question set adds', 'Why orders change between tests', 'What contamination is'],
      terms: [
        ['Question set', 'Your own real questions, each with a reference answer, that every candidate is run on.'],
        ['Reference answer', 'The answer a person checked is right, to grade replies against.'],
        ['Contamination', 'A public test’s questions leaking into a model’s training, inflating its score.'],
      ],
    },
  },
  {
    id: '03-price-per-answer',
    title: 'Price per answer',
    short: 'Price',
    intro: {
      story: `On Larkspur’s ${N}, A leads with C close behind. A model is paid for by the token, in and out, on every reply.`,
      goal: 'What does each answer cost, and does it change the pick?',
      learn: ['How tokens set the price of an answer', 'Why output tokens cost more', 'Why volume multiplies it'],
      terms: [
        ['Input token', 'A piece of the text the model reads: the prompt and the question.'],
        ['Output token', 'A piece of the text the model writes, usually priced higher.'],
        ['Price per answer', 'Input tokens times their price, plus output tokens times theirs.'],
      ],
    },
  },
  {
    id: '04-the-wait',
    title: 'The wait',
    short: 'Wait',
    intro: {
      story:
        'Support’s replies go to customers waiting in a chat window. A slow reply is a customer staring at three dots.',
      goal: 'What does the customer feel while a model writes?',
      learn: ['Time to first word', 'Words per second and the whole reply', 'What streaming hides'],
      terms: [
        ['Time to first word', 'The wait from sending a question to the first word of the reply.'],
        ['Streaming', 'Showing a reply word by word as the model writes it.'],
        ['Words per second', 'How fast the reply is written once it starts.'],
      ],
    },
  },
  {
    id: '05-good-enough',
    title: 'Good enough is enough',
    short: 'Good enough',
    intro: {
      story: `Support agreed a rule: a machine must pass ${BAR} of the ${N} questions. Above that, a draft is good enough for an agent to send.`,
      goal: 'Should Larkspur pay for the best machine, or the cheapest that clears the bar?',
      learn: [
        'What a quality bar is',
        'Why the best scorer can be the wrong pick',
        'What to weigh once the bar is met',
      ],
      terms: [
        ['Bar', 'The least a machine must score on your questions before you will use it.'],
        ['Good enough', 'Clears the bar; more quality past it buys nothing you need.'],
      ],
    },
  },
  {
    id: '06-models-change',
    title: 'Models change',
    short: 'Versions',
    intro: {
      story: `Larkspur shipped Machine ${NEXT.id}, version ${machineOf(NEXT.id).version}. Its maker now offers ${NEXT.version}, with a better public score.`,
      goal: 'Is a newer version safe to switch to?',
      learn: ['Why a new version can answer differently', 'What pinning a version means', 'How to test a switch'],
      terms: [
        ['Version', 'One fixed release of a model; a new one can answer differently.'],
        ['Pin', 'Call one exact version by name, so the model can’t change under you.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: three teams, three needs',
    short: 'Workbench',
    intro: {
      story:
        'Support, the warehouse and the catalogue team each want a model. Each has its own questions, its own bill and its own wait.',
      goal: 'Can one set of weights serve every team?',
      learn: ['How needs become weights', 'Why teams pick differently', 'What to ask before picking'],
      terms: [
        ['Needs', 'A team’s bar on quality, budget per 1,000 answers and longest wait.'],
        ['Workbench', 'The chapter’s free-play bench: change the weights and see every result.'],
      ],
    },
  },
];

export const CHOOSING_MODELS_MODULE: Module = {
  id: 'choosing-models',
  title: 'Choosing a model',
  description:
    'Picking the model for the job: what a leaderboard shows, testing on your own questions, price per answer and the wait.',
  level: 'Beginner',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['evals'],
  story:
    'Larkspur Supply Co. picks the model behind its reply drafter: it weighs three machines on its own questions, the price per answer and the wait.',
  chapters: CHAPTERS,
  recall: RECALL,
};
