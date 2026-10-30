// Voice agents, module 17: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-larkspurs-phone-line',
    title: 'Larkspur’s phone line',
    short: 'Phone line',
    intro: {
      story:
        'Larkspur’s assistant looks orders up in a chat window, as in the Tool calling module. Now the support lead wants it on the phone, so customers can just call.',
      goal: 'What happens between a caller speaking and the assistant answering out loud?',
      learn: [
        'The three stages of a chained voice line: speech-to-text, the model, text-to-speech',
        'Why the model in the middle still reads and writes text',
        'Where you can see each stage’s work',
      ],
      terms: [
        ['Speech-to-text (STT)', 'A model that writes down what a voice says. Its output is called a transcript.'],
        ['Text-to-speech (TTS)', 'A model that reads text out loud in a voice.'],
        ['Chained pipeline', 'A voice line built from separate stages, each handing text or audio to the next.'],
      ],
    },
  },
  {
    id: '02-the-latency-budget',
    title: 'The latency budget',
    short: 'Latency',
    intro: {
      story:
        'The phone line works, and the first callers say the same thing: the pause after they stop talking feels long. The team times every stage.',
      goal: 'Where does the wait go, and how do you bring the first word forward?',
      learn: [
        'Why the stages’ times add up into the wait the caller hears',
        'What streaming changes: the voice starts on the first sentence while the model writes the rest',
        'Why the first sound matters more than when the reply is finished',
      ],
      terms: [
        [
          'Latency',
          'How long something takes to respond. On a call, the gap between the caller’s last word and the first sound of the reply.',
        ],
        ['Streaming', 'Passing work on in pieces as it is made, instead of waiting for the whole thing.'],
        ['Latency budget', 'The wait you can afford, shared out between the stages that make it up.'],
      ],
    },
  },
  {
    id: '03-whose-turn-is-it',
    title: 'Whose turn is it?',
    short: 'Whose turn',
    intro: {
      story:
        'Streaming helped. Then Ravi from Marlow Builders calls, a man who pauses while he thinks, and the assistant starts answering before he has finished.',
      goal: 'How does the line decide the caller has finished?',
      learn: [
        'How a silence setting ends a turn, and why there is no perfect value',
        'What a cut-off and dead air are, and how one trades against the other',
        'Why a noisy line needs an energy threshold too',
      ],
      terms: [
        ['Turn', 'One person’s stretch of talking, before the other replies.'],
        [
          'Voice activity detection (VAD)',
          'Deciding, from the audio, when someone is speaking and when they have stopped.',
        ],
        ['Cut-off', 'Answering before the caller has finished: the line took a pause for the end of their turn.'],
        ['Dead air', 'A silence that runs on too long after the caller has finished, before anything is said.'],
        ['Silence setting', 'How long the line must stay quiet before the caller’s turn ends.'],
        ['Energy threshold', 'How loud the line must be for a moment to count as speech.'],
      ],
    },
  },
  {
    id: '04-being-interrupted',
    title: 'Being interrupted',
    short: 'Interrupted',
    intro: {
      story:
        'Dana from Hollis Hardware books a delivery slot. Halfway through the list of slots she remembers something and talks over the assistant.',
      goal: 'What should the line do when the caller talks over the reply?',
      learn: [
        'What barge-in is: stopping the reply when the caller starts speaking',
        'Why the history must keep only what was actually said',
        'What goes wrong when the line keeps talking',
      ],
      terms: [
        ['Barge-in', 'The caller speaking over the assistant, and the line stopping to listen.'],
        ['History', 'The conversation so far, as the model reads it on its next turn.'],
      ],
    },
  },
  {
    id: '05-mishearing',
    title: 'Mishearing',
    short: 'Mishearing',
    intro: {
      story:
        'Ravi calls about an order and reads its number out. The assistant answers at once, sure of itself, about a different order.',
      goal: 'What do you do when speech-to-text gets a word wrong?',
      learn: [
        'Why numbers and names are where speech-to-text slips',
        'How reading a number back before acting catches the mistake',
        'Why the cost is one short turn',
      ],
      terms: [
        ['Mishearing', 'Speech-to-text writing a different word from the one said, like “fifty” for “fifteen”.'],
        ['Read-back', 'Saying a detail back to the caller and waiting for a yes before acting on it.'],
        ['Confidence', 'How sure speech-to-text is of each word it wrote.'],
      ],
    },
  },
  {
    id: '06-one-model-or-three',
    title: 'One model or three',
    short: 'One or three',
    intro: {
      story:
        'A vendor pitches a speech-to-speech model: no ear, no mouth, one model that hears and speaks. The support lead asks what Larkspur would gain and lose.',
      goal: 'When is a chained pipeline the better choice, and when is one speech-to-speech model?',
      learn: [
        'What a speech-to-speech model does differently',
        'What the chained line gives you: a transcript to read and check between stages',
        'Why the turn-taking rules apply to both',
      ],
      terms: [
        [
          'Speech-to-speech model',
          'One model that takes audio in and gives audio out, with no separate transcript step in the middle.',
        ],
        [
          'Policy check',
          'A rule the line’s software applies to text before acting on it, like the Guardrails module’s checks.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: tune the line',
    short: 'Workbench',
    intro: {
      story:
        'Everything is on the bench: the calls, the turn detector’s settings and the line’s rules. The support lead wants no cut-offs, no dead air and no misheard number acted on.',
      goal: 'Which settings serve every call?',
      learn: [
        'How to read cut-offs, dead air, wait and errors together',
        'Why each setting fixes one call and can break another',
        'Why the best line combines several rules',
      ],
      terms: [
        ['Energy threshold', 'How loud the line must be for a moment to count as speech.'],
        ['Silence setting', 'How long the line must stay quiet before the caller’s turn ends.'],
      ],
    },
  },
];

export const VOICE_MODULE: Module = {
  id: 'voice',
  title: 'Voice agents',
  description: 'Assistants you talk to: speech in and out, taking turns, being interrupted, and the latency budget.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['tool-calling', 'multimodal'],
  story:
    'Larkspur Supply Co. puts its assistant on the phone: customers call, speak, pause, talk over it and read out order numbers, and the team has to make the line feel like a conversation.',
  chapters: CHAPTERS,
  recall: RECALL,
};
