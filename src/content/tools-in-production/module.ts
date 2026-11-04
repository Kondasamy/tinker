// Tools and MCP in production: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { SERVERS, TOOLS } from '../../lib/tools-in-production/tools';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-sixty-tools',
    title: `${TOOLS.length} tools, one prompt`,
    short: 'Sixty tools',
    intro: {
      story: `Larkspur’s assistant now uses ${TOOLS.length} tools from ${SERVERS.length} MCP servers. Tomás runs the workshop board where every tool hangs.`,
      goal: 'What does loading every tool cost, and what does it do to the pick?',
      learn: ['Every tool definition rides in every prompt', 'Why more tools can mean worse picks'],
      terms: [
        ['Tool definition', 'A tool’s name, description and input shape, sent to the model so it can choose.'],
        ['Token', 'A word piece: the unit a model reads, and is billed by.'],
      ],
    },
  },
  {
    id: '02-fetch-when-needed',
    title: 'Fetch when needed',
    short: 'Fetch when needed',
    intro: {
      story:
        'Sixty definitions crowded every prompt and the pick went wrong. Now the tools stay in their vans until a request needs them.',
      goal: 'How much does loading only the tools a request needs save?',
      learn: ['How a tool search loads a few tools per request', 'What that saves, and what it costs'],
      terms: [
        ['Lazy loading', 'Loading a tool definition only when a request needs it.'],
        ['Tool search', 'A tool the model calls to find other tools by matching words, then load them.'],
      ],
    },
  },
  {
    id: '03-the-tool-changed',
    title: 'The tool changed',
    short: 'Tool changed',
    intro: {
      story:
        'Tools now arrive only when needed. QuickPost’s three tools hang on the board, each in the outline you approved.',
      goal: 'What happens when a server changes a tool you already approved?',
      learn: ['A server can change a tool at any time', 'Why a changed tool can break calls that worked'],
      terms: [
        ['Field', 'One named input a tool takes, such as postcode.'],
        ['Drift', 'A tool changing after you approved it.'],
      ],
    },
  },
  {
    id: '04-a-fingerprint',
    title: 'A fingerprint per tool',
    short: 'Fingerprints',
    intro: {
      story:
        'QuickPost renamed a field overnight, and the new tool hung askew. Nobody checked it against what you had approved.',
      goal: 'How do you notice a tool changed before the model uses it?',
      learn: ['A fingerprint changes with any change to a tool', 'A pin holds a changed tool for a person to approve'],
      terms: [
        ['Fingerprint', 'A short code worked out from a tool definition; any change gives a different code.'],
        ['Pin', 'Keeping the fingerprints you approved, and holding back a tool whose fingerprint changed.'],
      ],
    },
  },
  {
    id: '05-hidden-instructions',
    title: 'Hidden instructions',
    short: 'Hidden orders',
    intro: {
      story:
        'Pins catch tools that change. But DocShelf, a new manuals server, sends a tool whose description says more than its first line.',
      goal: 'Can a tool’s description give the assistant orders?',
      learn: ['The model reads the whole description; people see one line', 'Why a pin can’t help here'],
      terms: [['Tool poisoning', 'Orders hidden in a tool description: the model reads them, the person doesn’t.']],
    },
  },
  {
    id: '06-who-is-calling',
    title: 'Who is calling',
    short: 'Who is calling',
    intro: {
      story: 'DocShelf is barred. Now the question is how the assistant signs in to the servers it does trust.',
      goal: 'Why should each server get its own sign-in, never one shared key?',
      learn: ['A shared key opens every door it reaches', 'A server’s own pass works only there'],
      terms: [
        ['Pass', 'Proof of sign-in the assistant shows a server; it names the server it was issued for.'],
        ['OAuth', 'The standard sign-in that gives an app a pass to act for you at one service.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a week of changes',
    short: 'Workbench',
    intro: {
      story:
        'You have seen crowded prompts, drift, poisoned descriptions and shared keys. Now set the rules for a whole week.',
      goal: 'Which servers do you trust, pin and load only when needed?',
      learn: ['Weigh requests done against leaks and tokens', 'Pin where tools may change; bar what is poisoned'],
      terms: [],
    },
  },
];

export const TOOLS_IN_PRODUCTION_MODULE: Module = {
  id: 'tools-in-production',
  title: 'Tools and MCP in production',
  description:
    'Running many tools from outside servers: load them only when needed, check each one is still the tool you approved, and sign in per server.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['tool-calling', 'dependencies'],
  story: `Larkspur Supply Co.’s assistant hangs ${TOOLS.length} tools from ${SERVERS.length} supplier servers on a workshop shadow board, and learns to load, check and sign in to them safely.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
