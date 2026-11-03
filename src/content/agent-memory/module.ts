// Memory you can trust: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-what-to-keep',
    title: 'What to keep',
    short: 'What to keep',
    intro: {
      story:
        'Larkspur’s assistant now remembers customers between chats, pinning cards to a cork board in the support room. Ada’s chat has just ended.',
      goal: 'Which parts of a chat are worth remembering?',
      learn: ['Why keeping everything buries what matters', 'What a keep rule saves'],
      terms: [['Memory', 'A note the assistant keeps about a customer from one chat to the next.']],
    },
  },
  {
    id: '02-where-it-came-from',
    title: 'Where it came from',
    short: 'Source',
    intro: {
      story:
        'The board fills with cards from chats, the order system and the handbook. Then one source turns out wrong.',
      goal: 'How do you find every card a bad source taught?',
      learn: ['Every memory names its source', 'Why that lets you check it later'],
      terms: [['Source', 'Where a memory came from: a chat, a staff system or a web page.']],
    },
  },
  {
    id: '03-old-and-new',
    title: 'Old and new disagree',
    short: 'Conflicts',
    intro: {
      story:
        'Ada moves house. The board now holds two addresses for her, and the assistant can only send a parcel to one.',
      goal: 'When two memories disagree, which one stays?',
      learn: ['One card per fact', 'The better source wins, then the newer', 'Why newest alone isn’t enough'],
      terms: [['Conflict', 'Two memories that can’t both be true.']],
    },
  },
  {
    id: '04-forgetting',
    title: 'Forgetting on purpose',
    short: 'Forgetting',
    intro: {
      story: 'Some cards stop mattering, and some customers want to be forgotten. The board has to let go of both.',
      goal: 'When should the assistant forget, and what does “forget me” remove?',
      learn: ['Expiry drops notes that stop mattering', '“Forget me” removes every card about a person'],
      terms: [['Expiry', 'The point after which a memory is dropped, set by its kind.']],
    },
  },
  {
    id: '05-poisoned-note',
    title: 'A poisoned note',
    short: 'Poison',
    intro: {
      story:
        'Someone wants Larkspur’s assistant to skip its checks. They don’t hack it: they leave a page for it to read.',
      goal: 'How does a planted page change what the assistant does weeks later?',
      learn: ['A planted rule becomes a memory', 'It keeps working after the page is gone'],
      terms: [['Memory poisoning', 'Planting false memories so the assistant acts on them later.']],
    },
  },
  {
    id: '06-undo-the-source',
    title: 'Undo the source',
    short: 'Undo',
    intro: {
      story: 'Two planted sources are on the board: a deals page and a chat from someone posing as a customer.',
      goal: 'How do you remove everything a bad source taught, and nothing else?',
      learn: ['Pull a source’s thread and its cards fall', 'Cards learnt from other cards fall too'],
      terms: [['Undo by source', 'Removing a source and every memory that hangs from it.']],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a month of memory',
    short: 'Workbench',
    intro: {
      story: 'You now set the board’s rules for a whole month of chats, with two planted sources hidden in it.',
      goal: 'Which rules keep every answer right and leave no poison behind?',
      learn: ['How keep, expiry and trust rules work together', 'Why undo by source is the last step'],
      terms: [],
    },
  },
];

export const AGENT_MEMORY_MODULE: Module = {
  id: 'agent-memory',
  title: 'Memory you can trust',
  description:
    'What an assistant should keep and forget between chats, where each memory came from, and how to undo everything a poisoned source taught.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents', 'context'],
  story:
    'Larkspur Supply Co.’s assistant remembers customers on a cork board of cards, each tied by red thread to its source, and learns to pull a poisoned thread.',
  chapters: CHAPTERS,
  recall: RECALL,
};
