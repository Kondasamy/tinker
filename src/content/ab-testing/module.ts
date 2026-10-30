// A/B testing: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-did-it-work',
    title: 'Did it work?',
    short: 'Did it work',
    intro: {
      story:
        'Larkspur’s team built a one-page checkout. The owner wants proof it sells more before every shopper gets it.',
      goal: 'How do you tell whether a change worked, and not something else?',
      learn: [
        'Split shoppers at random between the old and the new',
        'Compare each checkout’s conversion rate',
        'Read the interval round the difference',
      ],
      terms: [
        [
          'Random split',
          'Sending each shopper to A or B by chance, like a coin flip, so nothing else decides who sees what.',
        ],
        ['Control', 'The version you have today, A, kept as the yardstick.'],
        ['Variant', 'The changed version, B, that you want to judge.'],
        ['Conversion rate', 'The share of shoppers who buy: 10% means 1 in 10.'],
        ['Interval', 'The range the true difference most likely sits in, given the shoppers seen so far.'],
      ],
    },
  },
  {
    id: '02-luck',
    title: 'Luck',
    short: 'Luck',
    intro: {
      story:
        'The new checkout won by about two points. Then someone asks: would two identical checkouts differ too? The team pits today’s checkout against itself.',
      goal: 'How big a gap can luck alone make?',
      learn: [
        'An A/A test shows the noise between identical groups',
        'What significant means',
        'Why a few A/A tests still call a winner',
      ],
      terms: [
        ['A/A test', 'A test of a version against an identical copy of itself: any gap is luck.'],
        ['Noise', 'Gaps that come from which shoppers happened to buy, not from any change.'],
        ['Significant', 'A gap bigger than luck alone makes 19 times in 20 (a 5% level).'],
        ['False win', 'A significant result when nothing truly differs.'],
      ],
    },
  },
  {
    id: '03-how-many-shoppers',
    title: 'How many shoppers?',
    short: 'How many shoppers',
    intro: {
      story:
        'Next idea: a bigger Buy button. The team expects a small rise, about one point, and wants an answer within a week.',
      goal: 'How many shoppers does a test need to find a small change?',
      learn: [
        'Power: the chance a test finds a real change',
        'Why small changes need many shoppers',
        'Sample size, planned before the test starts',
      ],
      terms: [
        ['Power', 'The share of runs in which a test finds a change that is really there.'],
        ['Underpowered', 'Too few shoppers to find the change you care about most of the time.'],
        ['Sample size', 'How many shoppers each version needs, worked out before the test starts.'],
      ],
    },
  },
  {
    id: '04-peeking',
    title: 'Peeking',
    short: 'Peeking',
    intro: {
      story:
        'The team is impatient. They check the scoreboard every morning and plan to stop the moment one checkout wins.',
      goal: 'What does stopping on a good day do to false wins?',
      learn: [
        'Peeking: checking a running test and stopping on a win',
        'Why each look is another chance for luck',
        'Fix the length first, or use methods built for watching',
      ],
      terms: [
        ['Peeking', 'Checking a running test and stopping as soon as it looks significant.'],
        ['Fixed horizon', 'A test length set in advance, read once at the end.'],
      ],
    },
  },
  {
    id: '05-twenty-colours',
    title: 'Twenty colours',
    short: 'Twenty colours',
    intro: {
      story: 'A designer proposes twenty colours for the Buy button and tests every one against today’s blue at once.',
      goal: 'If you test twenty things, how often does one win by luck?',
      learn: [
        'Every extra comparison is another chance of a false win',
        'Why a lone winner among many needs doubt',
        'A correction raises the bar for each comparison',
      ],
      terms: [
        ['Multiple comparisons', 'Running many tests at once, each one another chance for luck to win.'],
        ['Correction', 'A stricter bar for each test, so the whole family keeps its false wins near the level.'],
      ],
    },
  },
  {
    id: '06-guardrails',
    title: 'The metric moved, the business didn’t',
    short: 'Guardrails',
    intro: {
      story:
        'A banner says “Only a few left!” and orders jump. The team is ready to ship, until the returns desk calls.',
      goal: 'What if the number you tested rises while the business doesn’t?',
      learn: [
        'The primary metric is what the test is for',
        'Guardrail metrics watch what must not get worse',
        'Ship only when the guardrails hold too',
      ],
      terms: [
        ['Primary metric', 'The one number a test is run to move: here, the share who buy.'],
        ['Guardrail metric', 'A number that must not get worse, like returns, checked before anything ships.'],
      ],
    },
  },
  {
    id: '07-ship-or-stop',
    title: 'Ship, keep testing or stop',
    short: 'Ship or stop',
    intro: {
      story:
        'Five experiments finished this month, each run to its planned end with no peeking. The owner wants a decision on each.',
      goal: 'Which experiments ship, which keep testing, and which stop?',
      learn: [
        'Apply one rule to every experiment',
        'Why underpowered is not the same as no effect',
        'Why a rule can still ship a lucky win',
      ],
      terms: [
        ['Decision rule', 'A rule written before the results come in, saying what each kind of result leads to.'],
      ],
    },
  },
];

export const AB_TESTING_MODULE: Module = {
  id: 'ab-testing',
  title: 'A/B testing',
  description: 'Did the new button work? Running a fair test, and the lucky days and early peeks that fake a win.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co. tests a new checkout, a bigger button, twenty colours and a pushy banner, and learns which wins are real.',
  chapters: CHAPTERS,
  recall: RECALL,
};
