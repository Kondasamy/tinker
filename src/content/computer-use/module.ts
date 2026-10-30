// Computer use: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-look-then-click',
    title: 'Look, then click',
    short: 'Look, then click',
    intro: {
      story:
        'Brightwater’s trade portal offers no way for software to connect, only web pages. Larkspur gives an agent the job of re-ordering hinges there, the way a person would.',
      goal: 'How does an agent use a website made for people?',
      learn: [
        'Why the agent sees only screenshots',
        'How a click comes back as a point',
        'Why every step starts with a fresh look',
      ],
      terms: [
        ['Host', 'The program that runs the computer for the model: it takes the screenshots and does the clicks.'],
        ['Screenshot', 'A picture of the screen, taken by the host and sent to the model as an image.'],
        ['Agent loop', 'Look, act, look again, repeated until the task is done.'],
      ],
    },
  },
  {
    id: '02-the-wrong-button',
    title: 'The wrong button',
    short: 'Wrong button',
    intro: {
      story: 'To save tokens, the team now sends the agent smaller screenshots. The real screen hasn’t changed.',
      goal: 'Why would an agent that aims well click the wrong button?',
      learn: [
        'Why a click comes back in the screenshot’s pixels',
        'How the host scales it back to the screen',
        'What goes wrong when it forgets',
      ],
      terms: [
        ['Coordinates', 'A point as x (pixels from the left) and y (pixels from the top).'],
        [
          'Scaling back',
          'Turning a point in a resized screenshot into the same point on the real screen, by dividing by the resize factor.',
        ],
      ],
    },
  },
  {
    id: '03-too-quick',
    title: 'Too quick',
    short: 'Too quick',
    intro: {
      story: 'Some days Brightwater’s portal is slow. On one of them, Larkspur’s hinge order went through twice.',
      goal: 'What does an agent see while a page is still loading?',
      learn: [
        'Why a screenshot can show a page that’s already changing',
        'How a stale picture makes the agent repeat a click',
        'What a wait rule changes',
      ],
      terms: [
        ['Stale screenshot', 'A screenshot taken before the page finished changing, so it shows the past.'],
        ['Wait rule', 'A host rule: wait for the page to settle before taking the next screenshot.'],
      ],
    },
  },
  {
    id: '04-the-page-gives-orders',
    title: 'The page that gives orders',
    short: 'Page gives orders',
    intro: {
      story: 'Someone has been editing what Brightwater’s pages show. Larkspur’s agent reads every word on them.',
      goal: 'Can words on a web page take over the agent?',
      learn: [
        'Why the agent reads on-screen text as instructions',
        'What a planted notice can make it do',
        'How an allow-list stops it leaving the site',
      ],
      terms: [
        [
          'Prompt injection',
          'Instructions placed in content the model will read, written to steer it away from its task.',
        ],
        ['Allow-list', 'The sites the host lets the agent open. Everything else is refused.'],
      ],
    },
  },
  {
    id: '05-ask-before-you-pay',
    title: 'Ask before you pay',
    short: 'Ask before you pay',
    intro: {
      story: 'Brightwater wants more subscribers, and its checkout page now pushes a monthly plan hard.',
      goal: 'Which clicks should a person approve before the agent makes them?',
      learn: [
        'Why a trap on an allowed site gets past an allow-list',
        'How confirmation stops a costly click',
        'Which clicks are worth a person’s time',
      ],
      terms: [
        ['Look-alike button', 'A button made to look like the one you want, that does something else.'],
        [
          'Confirmation',
          'A host rule: pause before a click with real consequences, such as paying, and ask a person to approve it.',
        ],
      ],
    },
  },
  {
    id: '06-every-look-costs',
    title: 'Every look costs',
    short: 'Every look costs',
    intro: {
      story: 'Finance asks what one re-order costs. Every look the agent takes is an image the model has to read.',
      goal: 'How big should a screenshot be?',
      learn: [
        'How a screenshot becomes tokens',
        'Why smaller screenshots cost less',
        'Why too small makes the agent miss',
      ],
      terms: [
        ['Visual token', 'One small square patch of an image, read by the model as one token.'],
        ['Screenshot size', 'The width and height, in pixels, of the picture the host sends.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a policy for the agent',
    short: 'Workbench',
    intro: {
      story:
        'Brightwater’s portal is slow some days, its pages carry planted text, and Larkspur wants re-orders as cheap as they are safe.',
      goal: 'Which host rules and screenshot size get every re-order right and stop every attack?',
      learn: [
        'How to set the host’s rules against a suite',
        'Why each rule fixes one failure',
        'Why the cheapest safe size wins',
      ],
      terms: [
        ['Policy', 'A screenshot size and the host rules: the wait rule, the allow-list and confirmation.'],
        ['Workbench', 'The chapter’s free-play bench: change the policy and see every case’s result.'],
      ],
    },
  },
];

export const COMPUTER_USE_MODULE: Module = {
  id: 'computer-use',
  title: 'Computer use',
  description:
    'An agent that sees a screenshot and clicks: what it sees, where it clicks, and the screens that fool it.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents', 'multimodal'],
  story:
    'Larkspur Supply Co. re-orders stock from Brightwater Fasteners, whose old trade portal has no way for software to connect, so an agent clicks through it like a person.',
  chapters: CHAPTERS,
  recall: RECALL,
};
