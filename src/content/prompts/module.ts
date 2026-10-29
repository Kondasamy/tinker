// Writing a prompt: its chapters and module facts. Chapter ids are a contract with readers' saved progress (and with
// the recordings, keyed by them): never rename one. Counts come from the tickets' data.
import type { Chapter, Module } from '../../lib/modules';
import { TEAMS, TEXT, TICKETS } from '../../lib/prompts/cards';
import { RECALL } from './recall';

const N = TICKETS.length;
const TEAM_LIST = `${TEAMS.slice(0, -1).join(', ')} or ${TEAMS.at(-1)}`;

const CHAPTERS: Chapter[] = [
  {
    id: '01-it-only-continues',
    title: 'It only continues text',
    short: 'It continues',
    intro: {
      story:
        'Larkspur’s support team wants a model to draft its replies. First, meet the simplest kind of model: one trained only on Larkspur’s documents.',
      goal: 'What does a model do with an instruction it was never trained to follow?',
      learn: ['What a prompt is', 'Why a plain model only continues text', 'What instruction tuning adds'],
      terms: [
        ['Prompt', 'The text you give a model. It writes what comes next.'],
        ['Continuation', 'The text a model adds after a prompt, its likeliest next words.'],
        [
          'Instruction tuning',
          'Extra training on instructions paired with good replies, so a model learns to follow them.',
        ],
      ],
    },
  },
  {
    id: '02-say-what-you-want',
    title: 'Say what you want',
    short: 'Say it',
    intro: {
      story: `Larkspur now drafts with a large chat model. Dana’s ticket: the Portal is down at night. Rosa’s first prompt says only “${TEXT.vague}”`,
      goal: 'Does a vague ask get the answer Larkspur’s policy gives?',
      learn: ['What a clear task says', 'Why a role line isn’t enough', 'What a key fact is'],
      terms: [
        ['Task', 'The part of a prompt that says what to do.'],
        ['Key fact', 'The detail from Larkspur’s policy a right reply must state.'],
        ['Role', 'A line saying who the model writes as.'],
      ],
    },
  },
  {
    id: '03-show-dont-tell',
    title: 'Show, don’t tell',
    short: 'Examples',
    intro: {
      story:
        'The clear task gets the key fact. But Larkspur’s replies have a house style, and describing a style takes many words.',
      goal: 'What does a model take from examples in a prompt?',
      learn: ['How examples set a style', 'Why a model copies quirks', 'How to pick examples'],
      terms: [
        ['Example', 'A sample ticket with the reply you want, placed in the prompt.'],
        ['Few-shot prompting', 'Steering a model with a few examples instead of a description.'],
        ['Quirk', 'A habit every example shares, wanted or not.'],
      ],
    },
  },
  {
    id: '04-put-it-in-a-shape',
    title: 'Put it in a shape',
    short: 'Format',
    intro: {
      story: `Larkspur’s router sends each reply to a team: ${TEAM_LIST}. The router is a program, and a program can’t read prose.`,
      goal: 'How do you get a reply a program can read?',
      learn: ['How a format line shapes a reply', 'Why a program needs JSON', 'Where asking stops being enough'],
      terms: [
        ['Format', 'The shape a reply must take, such as a list or JSON.'],
        ['JSON', 'A text format of named fields that programs read.'],
        ['Parse', 'For a program, to read text into fields, or fail.'],
      ],
    },
  },
  {
    id: '05-order-and-emphasis',
    title: 'Order and emphasis',
    short: 'Order',
    intro: {
      story:
        'Larkspur adds a house rule: every reply ends with the ticket reference. Rosa puts it on top, above two examples that end without one.',
      goal: 'Does where a rule sits change whether it is kept?',
      learn: ['Why a rule can get buried', 'Why the end of a prompt is safest', 'Why to test the order you ship'],
      terms: [
        ['House rule', 'A rule every reply must keep, here the ticket reference at the end.'],
        ['Simulated', 'Written by stated rules in code, not recorded from a model.'],
        ['Buried rule', 'A rule placed where other parts of the prompt drown it out.'],
      ],
    },
  },
  {
    id: '06-test-it-like-code',
    title: 'Test it like code',
    short: 'Test it',
    intro: {
      story: `The prompt has a role, JSON and the house rule, but still the vague task. Larkspur keeps ${N} real tickets, each with a reference answer.`,
      goal: 'How do you know a prompt change helped?',
      learn: ['What a question set is', 'How graders score each reply', 'Why to test per model'],
      terms: [
        ['Question set', 'Fixed tickets every version of a prompt is run on.'],
        ['Pass', 'A reply with the key fact, the right team and the house rule.'],
        ['Grader', 'Code that checks a reply against its reference.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: the prompt that ships',
    short: 'Workbench',
    intro: {
      story: `Larkspur ships a prompt only if all ${N} tickets pass. Of those, the shortest wins: every token is paid for on every ticket.`,
      goal: 'Which cards pass every ticket with the fewest tokens?',
      learn: [
        'How the parts trade quality for length',
        'Which parts earn their tokens',
        'What to check before shipping',
      ],
      terms: [
        ['Token', 'A piece of text a model reads; prompts are priced by tokens.'],
        ['Workbench', 'The chapter’s free-play bench: change the cards and see every result.'],
      ],
    },
  },
];

export const PROMPTS_MODULE: Module = {
  id: 'prompts',
  title: 'Writing a prompt',
  description:
    'Telling a model what you want: clear instructions, a few good examples, and testing the prompt like code.',
  level: 'Beginner',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s support team writes the prompt for its reply drafter, card by card, and tests it on real tickets before it ships.',
  chapters: CHAPTERS,
  recall: RECALL,
};
