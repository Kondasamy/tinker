// Coding agents: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import TICKETS from '../../../data/coding-agents/tickets.json' with { type: 'json' };
import { RECALL } from './recall';

// names are read from the tickets (R18)
const [BULK, CHEAT, SHIP] = TICKETS.tickets;

const CHAPTERS: Chapter[] = [
  {
    id: '01-read-edit-run',
    title: 'Read, edit, run',
    short: 'Read, edit, run',
    intro: {
      story:
        'A Larkspur ticket says the bulk discount is wrong. The team hands it to a coding agent with the shop’s code and its tests.',
      goal: 'What does a coding agent actually do with a ticket?',
      learn: [
        'An agent works in turns: an action, then its result',
        'The host carries out every action',
        'Running the tests closes the loop',
      ],
      terms: [
        [
          'Coding agent',
          'A model that changes code by asking a host to search, read, edit and run things, one turn at a time.',
        ],
        ['Host', 'The program that runs the agent: it carries out each action the agent asks for, on the real files.'],
        ['Repository', 'The project’s files, kept together: here, the shop’s pricing code and its tests.'],
        ['Test', 'A small program that checks one thing the code must do, and passes or fails.'],
        ['Agent loop', 'Ask for an action, get its result, pick the next action, until done.'],
      ],
    },
  },
  {
    id: '02-finding-the-file',
    title: 'Finding the file',
    short: 'The file',
    intro: {
      story: 'The fix landed, but the team saw what it cost: every file the agent opens is text it must read.',
      goal: 'How does an agent find the right file without reading them all?',
      learn: [
        'Everything read goes into the context',
        'Search shows only the matching lines',
        'Fewer tokens, same fix',
      ],
      terms: [
        ['Search', 'A tool that returns only the lines holding some words, and which files they are in.'],
        ['Context', 'Everything the agent has been shown so far, which it reads again each turn.'],
        ['Token', 'The unit a model reads text in: here, about four bytes of code.'],
      ],
    },
  },
  {
    id: '03-a-patch-not-a-rewrite',
    title: 'A patch, not a rewrite',
    short: 'A patch',
    intro: {
      story:
        'Larkspur wants a person to look at every change before it lands. The agent’s change arrives as a patch, in pieces.',
      goal: 'What is in a patch, and can you take only part of it?',
      learn: ['A diff shows changed lines only', 'A patch splits into hunks', 'Each hunk can be kept or dropped'],
      terms: [
        ['Diff', 'The lines a change removes and adds, with the lines around them left as they were.'],
        ['Patch', 'A change to a file, written as a diff, that can be applied to it.'],
        ['Hunk', 'One run of changed lines in a patch; a patch may have several.'],
        ['Drive-by', 'An extra change slipped into a patch that the ticket never asked for.'],
      ],
    },
  },
  {
    id: '04-red-to-green',
    title: 'Red to green',
    short: 'Red to green',
    intro: {
      story:
        'You can now keep or drop each hunk. Before the next review, the team asks you to guess what the tests will say.',
      goal: 'Can you tell from the hunks whether the tests will pass?',
      learn: ['Each test checks one promise', 'Red names the promise that broke', 'The agent reads red and fixes it'],
      terms: [
        ['Red', 'A test run with at least one failure.'],
        ['Green', 'A test run where every test passes.'],
      ],
    },
  },
  {
    id: '05-green-by-cheating',
    title: 'Green by cheating',
    short: 'Cheating',
    intro: {
      story: `Release day. ${CHEAT.from}’s ticket asks the agent to make the red discount checks green before 5 pm, and it does.`,
      goal: 'Does green tests always mean the code is right?',
      learn: [
        'An agent can pass a test by weakening it',
        'Done means what the tests check',
        'The host can protect test files',
      ],
      terms: [
        ['Weakened test', 'A test changed so it checks less, and passes code it used to fail.'],
        ['Protected file', 'A file the host refuses to let the agent edit, whatever it asks.'],
      ],
    },
  },
  {
    id: '06-what-it-may-run',
    title: 'What it may run',
    short: 'May run',
    intro: {
      story: `The fix is green and honest. ${SHIP.from}’s ticket asks the agent to push it for review.`,
      goal: 'Which commands should an agent run alone, ask about, or never run?',
      learn: ['An allow-list of safe commands', 'Ask a person before the rest', 'A never list the host refuses'],
      terms: [
        ['Allow-list', 'The commands the host runs without asking anyone.'],
        ['Ask first', 'The host pauses and shows a person the command, who approves it or says no.'],
        [
          'Push',
          'Sending your changes to the team’s shared copy of the code, on a named line of work called a branch.',
        ],
        ['Force push', 'A push that replaces the shared branch with yours, losing others’ work on it.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Rules for the queue',
    short: 'Workbench',
    intro: {
      story: `Three tickets wait: ${BULK.from}’s discount bug, ${CHEAT.from}’s red checks and ${SHIP.from}’s push. You set the host’s rules once, for all of them.`,
      goal: 'Which host rules get every ticket really done, with the fewest questions to a person?',
      learn: ['Each rule closes one failure', 'Rules live in the host, not the prompt', 'Asking costs a person’s time'],
      terms: [['Workbench', 'Every host rule at once, run over the whole queue of tickets.']],
    },
  },
];

export const CODING_AGENTS_MODULE: Module = {
  id: 'coding-agents',
  title: 'Coding agents',
  description:
    'An agent that edits code and runs the tests: reading a repository, making a change, and checking its own work.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents'],
  story:
    'A Larkspur ticket says the bulk discount is wrong; the team hands it to a coding agent, and learns it is only as right as the tests it runs.',
  chapters: CHAPTERS,
  recall: RECALL,
};
