// Models on your device: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-will-it-fit',
    title: 'Will it fit?',
    short: 'Will it fit?',
    intro: {
      story:
        'Larkspur’s pickers ask the stock assistant from warehouse handhelds, but the back aisles have no signal. Could the model live on the handheld itself?',
      goal: 'Will a model fit in the handheld’s free memory?',
      learn: [
        'Weight memory: parameters times bytes per parameter',
        'Why a 1B model at 16 bits already overflows the handheld',
        'How phone models fit in a few GB',
      ],
      terms: [
        ['Parameter', 'One number the model learned. A phone-sized model has one to a few billion.'],
        ['Free memory', 'The memory the handheld leaves one app: a Larkspur planning number.'],
      ],
    },
  },
  {
    id: '02-smaller-numbers',
    title: 'Smaller numbers',
    short: 'Smaller numbers',
    intro: {
      story:
        'Fewer bytes per weight would shrink the 1B. Larkspur’s server team rounded Larkspur mini to 8 and 4 bits; for a handheld the team wants to try 2.',
      goal: 'How few bits can a weight keep before the reply breaks?',
      learn: [
        'Quantization: rounding each weight to a few levels',
        'Bits per weight against memory, counted',
        'What Larkspur mini’s reply loses at 8, 4 and 2 bits, live',
      ],
      terms: [
        ['Quantization', 'Storing each weight with fewer bits by rounding it to the nearest of a few levels.'],
        ['Bits per weight', 'How many bits store each weight: 16, 8, 4 or 2 here.'],
        ['Inference', 'Running a trained model to get its reply, as the handheld does for every question.'],
      ],
    },
  },
  {
    id: '03-working-memory',
    title: 'The working memory',
    short: 'Working memory',
    intro: {
      story:
        'At 4 bits the 3B fits with room to spare. But the picker’s chat, the stock list and the instructions all ride along as context.',
      goal: 'How much memory does the context take, and when does it overflow?',
      learn: [
        'The KV cache: keys and values kept for every token read',
        'Its size, from the model’s published shape',
        'Why a long context can overflow a model that fits',
      ],
      terms: [
        [
          'KV cache',
          'The keys and values the model keeps for every token it has read, so each new token computes only its own.',
        ],
        ['Context', 'Everything the model reads before replying: instructions, the chat so far, the stock list.'],
      ],
    },
  },
  {
    id: '04-battery-tank',
    title: 'The battery tank',
    short: 'Battery tank',
    intro: {
      story:
        'The 3B fits at 4 bits. Every token it writes reads every weight once, and that costs battery. One charge must last a picker’s shift.',
      goal: 'How many replies does one charge give, and what decides it?',
      learn: [
        'Energy per token, which grows with the weights’ bytes',
        'Replies per charge: the battery over the energy per reply',
        'Why reply length matters as much as model size',
      ],
      terms: [
        [
          'Energy per token',
          'The battery a model spends writing one token: here a planning number scaled from a phone study.',
        ],
        ['Replies per charge', 'How many replies one full battery pays for.'],
      ],
    },
  },
  {
    id: '05-heat-and-speed',
    title: 'Heat and speed',
    short: 'Heat and speed',
    intro: {
      story: 'Monday’s delivery lands at once, and pickers fire questions back to back. The handheld has no fan.',
      goal: 'What happens to speed when the handheld runs hot?',
      learn: [
        'Speed on a phone: memory bandwidth over the weights’ bytes',
        'Throttling: a hot phone slows itself to cool down',
        'Why short replies keep it cool',
      ],
      terms: [
        ['Tokens per second', 'How fast the model writes: here the handheld’s bandwidth over the weights’ bytes.'],
        ['Throttling', 'A hot phone lowering its own speed to shed heat.'],
      ],
    },
  },
  {
    id: '06-what-never-leaves',
    title: 'What never leaves',
    short: 'What never leaves',
    intro: {
      story:
        'Stock questions name customers and orders. On the handheld, nothing leaves it. But a question too big for it could go to the cloud.',
      goal: 'What leaves the handheld, and when should it fall back to the cloud?',
      learn: [
        'On-device: the question and the reply never leave the handheld',
        'Falling back: sending what the handheld can’t handle to a cloud model',
        'Why a fallback must be a choice you can see',
      ],
      terms: [
        ['On-device', 'The model runs on the handheld itself: no network needed, and nothing leaves it.'],
        ['Fall back', 'Send a request the device can’t handle to a bigger model in the cloud.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Pack the handheld',
    short: 'Pack the handheld',
    intro: {
      story:
        'Everything is on the bench: model size, bits and reply length. The warehouse lead has set the rule for the handheld rollout.',
      goal: 'Which setup answers well, fits, stays private and lasts a shift?',
      learn: [
        'How size, bits and reply length pull against each other',
        'How to read a setup against a rule, line by line',
        'Why the cheapest setup on battery can still lose',
      ],
      terms: [['Shift', 'A picker’s working day of questions, which one charge must last.']],
    },
  },
];

export const ON_DEVICE_MODULE: Module = {
  id: 'on-device',
  title: 'Models on your device',
  description:
    'A model that runs on a phone: what fits in its memory, what it costs the battery, and what never leaves it.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['inference'],
  story:
    'Larkspur Supply Co. wants its stock-lookup assistant on the warehouse handhelds, working offline in the back aisles.',
  chapters: CHAPTERS,
  recall: RECALL,
};
