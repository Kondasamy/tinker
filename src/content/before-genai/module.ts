// Before GenAI: the module's registry entry, Module 0 (KTD1). Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-scripted',
    title: 'The bot that followed a script',
    short: 'Script',
    intro: {
      story:
        'Larkspur Supply Co. sells hardware. Its first help bot, a kiosk at the help desk, follows a script: keyword rules, each with a fixed reply card.',
      goal: 'Can a script answer a question nobody wrote a rule for?',
      learn: [
        'A script: keywords and fixed replies',
        'Why new wording falls back',
        'Why one new keyword can break another',
      ],
      terms: [
        ['Script', 'A bot’s list of keyword rules, checked in order: the first match picks the reply.'],
        ['Keyword', 'A word or phrase a rule looks for in the message.'],
        ['Fallback', 'The fixed “sorry” reply a bot gives when nothing matches.'],
      ],
    },
  },
  {
    id: '02-intents',
    title: 'The bot that sorted messages',
    short: 'Sorter',
    intro: {
      story:
        'Rules couldn’t keep up with new wording. Larkspur’s next bot is a sorter, trained on support tickets people had labelled.',
      goal: 'Can a trained bot cope with words nobody wrote a rule for?',
      learn: [
        'An intent: what the customer wants',
        'Trained on labelled examples, not rules',
        'Why off-list messages still fall back',
      ],
      terms: [
        ['Intent', 'What the customer wants: a refund, a return, delivery news, a product answer or account help.'],
        [
          'Trained',
          'Built by counting which words turn up under each intent in tickets people labelled, instead of writing rules.',
        ],
      ],
    },
  },
  {
    id: '03-predictive-ai',
    title: 'AI that picks from a list',
    short: 'Picks',
    intro: {
      story:
        'Bots weren’t Larkspur’s only AI. Its email had a spam filter and its shop a shelf of suggested products, years before GenAI.',
      goal: 'What did AI do before it could write?',
      learn: [
        'A spam filter picks inbox or junk',
        'A shelf picks products from a catalogue',
        'Older AI chose; it never wrote',
      ],
      terms: [
        ['Spam filter', 'A trained sorter for email: each message goes to the inbox or the junk folder.'],
        ['Recommendation', 'A product the shop picks for a customer from its catalogue, from what people bought.'],
      ],
    },
  },
  {
    id: '04-next-word',
    title: 'A machine that guesses the next word',
    short: 'Next word',
    intro: {
      story:
        'The sorter could only pick. Researchers had long built a different machine: one that reads some text and guesses the word that comes next.',
      goal: 'How can guessing the next word ever write a reply?',
      learn: [
        'A language model guesses the next word',
        'It gives every word a chance',
        'Word after word, guesses write text',
      ],
      terms: [
        ['Language model', 'A program that, given some text, gives each possible next word a chance of coming next.'],
      ],
    },
  },
  {
    id: '05-scale',
    title: 'More text, bigger models',
    short: 'Scale',
    intro: {
      story:
        'Larkspur mini guesses next words, but its sentences make little sense. Real models read far more text and are far bigger.',
      goal: 'What changed when language models got bigger?',
      learn: [
        'The transformer: a design that scales',
        'Bigger models, trained on more text',
        'Tasks nobody trained it for',
      ],
      terms: [
        ['Transformer', 'The design most language models use today: it weighs every earlier word at once.'],
        ['Scale', 'How big a model is, and how much text it learns from.'],
      ],
    },
  },
  {
    id: '06-chat',
    title: 'Taught to follow instructions',
    short: 'Chat',
    intro: {
      story:
        'A big model continues text: ask it a question and it may add more questions. Larkspur needs one that answers.',
      goal: 'What turns a text continuer into an assistant?',
      learn: ['A base model continues text', 'Instruction tuning: taught to answer', 'Why ChatGPT reached everyone'],
      terms: [
        ['Base model', 'A language model trained only to continue text.'],
        [
          'Instruction tuning',
          'More training on requests paired with good answers, so the model follows instructions.',
        ],
      ],
    },
  },
  {
    id: '07-what-changed',
    title: 'Same messages, three bots',
    short: 'Side by side',
    intro: {
      story:
        'Larkspur puts its three bots side by side: the script, the sorter and a GenAI assistant. Four customer messages arrive.',
      goal: 'Which messages can each bot answer?',
      learn: ['Picking a reply vs writing one', 'One model, many tasks', 'Where the old bots still fall back'],
      terms: [['Assistant', 'A language model tuned to follow instructions and answer in chat.']],
    },
  },
  {
    id: '08-what-stayed',
    title: 'What GenAI didn’t fix',
    short: 'Still open',
    intro: {
      story:
        'The GenAI assistant answers almost anything. Before Larkspur lets customers use it, the team tries four harder messages.',
      goal: 'What can a GenAI assistant still get wrong?',
      learn: [
        'It can make up an answer',
        'It knows nothing of your company, and can’t act',
        'Each gap has its own fix',
      ],
      terms: [['Made-up answer', 'A confident reply that isn’t true, written because it sounds right.']],
    },
  },
];

export const BEFORE_GENAI_MODULE: Module = {
  id: 'before-genai',
  title: 'Before GenAI',
  description:
    'Chatbots are older than ChatGPT. Play the scripted and trained bots that came first, then see what generative AI (GenAI) changed, and what it didn’t.',
  level: 'Beginner',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s help desk runs through three bots, scripted, trained and GenAI, before you join the team building its assistant.',
  chapters: CHAPTERS,
  recall: RECALL,
};
