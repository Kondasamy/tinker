// Small models: distillation & routing, module 12: its chapters and module facts. Chapter ids are a contract with
// readers' saved progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/small-models/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-big-model-small-model',
    title: 'Big model, small model',
    short: 'Big and small',
    intro: {
      story:
        'Larkspur’s assistant answers well, but finance has sent the monthly model bill. Someone asks: could a smaller model do the same job for less?',
      goal: 'What does a smaller model give up, and what does it save on every token?',
      learn: [
        'How a model’s size is counted, and why the work per token follows it',
        'What a small model’s top 5 looks like beside a big one’s, on the same sentence',
        'Why “smaller” means “less sure”, not “knows different words”',
      ],
      terms: [
        ['Weights', 'The numbers inside a model that decide what it writes. A model’s size is how many it has.'],
        [
          'Work per token',
          'The multiplications a model does to write one piece of text. It grows with the number of weights.',
        ],
        ['Top 5', 'The five next pieces a model thinks most likely, with the probability it gives each.'],
      ],
    },
  },
  {
    id: '02-learning-from-a-teacher',
    title: 'Learning from a teacher',
    short: 'A teacher',
    intro: {
      story:
        'The student was not trained from scratch: it learnt from Larkspur mini, copying how the bigger model spreads its bets.',
      goal: 'How does a small model learn from a big one, and what does it learn that text alone doesn’t teach?',
      learn: [
        'The difference between the right answer and the teacher’s odds',
        'What a training run of distillation looks like, step by step',
        'Why the student ends a little behind the teacher, not far behind',
      ],
      terms: [
        ['Distillation', fact('distillation').claim],
        ['Teacher and student', 'The big model whose odds are copied, and the small model that learns to copy them.'],
        [
          'Soft targets',
          'The teacher’s whole set of odds over the next piece, used as the lesson instead of the one right piece.',
        ],
        ['Loss', 'How surprised a model is by the next piece of text, on average. Training lowers it.'],
      ],
    },
  },
  {
    id: '03-how-close-is-the-student',
    title: 'How close is the student?',
    short: 'How close',
    intro: {
      story:
        'Before Larkspur trusts the student with anything, the team wants to know how often it still picks what the teacher would.',
      goal: 'How do you measure how close a student is to its teacher, on text neither has seen?',
      learn: [
        'Agreement: how often the two models’ top picks match',
        'KL divergence: how differently they spread their bets, even when the top pick matches',
        'Why closeness to the teacher is not the same as being right',
      ],
      terms: [
        ['Held-out text', 'Text kept out of training, used only to score the models.'],
        ['Agreement', 'The share of positions where the student’s most likely next piece is the teacher’s.'],
        [
          'KL divergence',
          'A number for how far one set of odds is from another: 0 when they are the same, larger the more they differ.',
        ],
      ],
    },
  },
  {
    id: '04-send-it-the-easy-ones',
    title: 'Send it the easy ones',
    short: 'Easy ones',
    intro: {
      story:
        'Larkspur’s assistant comes in two tiers, small and large, both reading the same documents. Which questions can the small tier take?',
      goal: 'Where does a small model answer as well as a large one, and where does it fall short?',
      learn: [
        'How two tiers of the same assistant compare on Evals’ test set',
        'What a small tier costs against a large one, from one dated vendor price pair',
        'Which kinds of question a small model gets wrong',
      ],
      terms: [
        ['Tier', 'One size of model offered for the same job: here, a small tier and a large tier.'],
        ['Relative cost', 'Cost counted in large answers: one large answer is 1, a small one a fraction of that.'],
      ],
    },
  },
  {
    id: '05-fall-back-when-unsure',
    title: 'Fall back when unsure',
    short: 'Fall back',
    intro: {
      story:
        'The small tier stumbles on the tricky questions. So the team wires a router: the small tier answers first, and unsure answers go up to the large tier.',
      goal: 'How does a confidence threshold trade right answers against cost?',
      learn: [
        'What a router and a fallback (a cascade) are',
        'How raising the threshold moves the quality and cost frontier',
        'Why a confident answer can still be wrong',
      ],
      terms: [
        ['Router', 'The step that decides which model answers a question.'],
        [
          'Cascade',
          'Ask the cheap model first; send the question to a bigger one only when the first answer looks unsure.',
        ],
        [
          'Confidence',
          'A score from 0 to 1 for how sure an answer seems. Here it is a stand-in score set by hand to show the trade-off.',
        ],
        ['Threshold', 'The confidence below which the router sends a question up.'],
        ['Frontier', 'The best right answers you can get at each cost: the line the router’s settings trace.'],
      ],
    },
  },
  {
    id: '06-gate-the-switch',
    title: 'Gate the switch',
    short: 'Gate it',
    intro: {
      story:
        'The router saves money at some thresholds and loses answers at others. Before it replaces the all-large assistant, the release gate from the Evals module gets a say.',
      goal: 'How do you prove a cheaper router is safe to ship?',
      learn: [
        'Why the all-large assistant is the baseline the router must match',
        'How the gate’s two rules, a pass rate and no regressions, catch a confident wrong answer',
        'How to find the cheapest setting that still ships',
      ],
      terms: [
        ['Baseline', 'The version a new one is measured against: here, every question sent to the large tier.'],
        ['Regression', 'A question the baseline got right that the new version gets wrong.'],
        ['Release gate', 'The rule that decides, from a test run, whether a candidate ships.'],
      ],
    },
  },
  {
    id: '07-routing-policy',
    title: 'Larkspur’s routing policy',
    short: 'The policy',
    intro: {
      story:
        'One threshold for every question works, but the questions differ. The support lead sorts them into kinds and asks for a policy per kind: small, router or large.',
      goal: 'Which tier should answer each kind of question?',
      learn: [
        'How to match a tier to what a kind of question needs',
        'How right answers and cost pull against each other in one score',
        'Why the router suits some kinds and not others',
      ],
      terms: [
        ['Routing policy', 'A rule for each kind of question: always small, always large, or the router.'],
        ['Policy score', 'Points for every right answer, minus what the answers cost, added up over every kind.'],
      ],
    },
  },
];

export const SMALL_MODELS_MODULE: Module = {
  id: 'small-models',
  title: 'Small models: distillation & routing',
  description: 'Teach a small model from a big one, send it the easy questions, and fall back when it isn’t sure.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['fine-tuning', 'evals'],
  story:
    'Back at Larkspur Supply Co., the model bill has grown, and the team wants a smaller, cheaper model to answer what it can without losing the answers that matter.',
  chapters: CHAPTERS,
  recall: RECALL,
};
