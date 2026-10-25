// __TITLE__: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress: never rename one.
// Scaffolded by `pnpm new-module`; replace every placeholder (description, level, author, story, the chapter's intro).
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-first-step',
    title: 'First step',
    short: 'First step',
    intro: {
      story: 'Where the story stands as the chapter opens: who the reader is, and the problem in front of them.',
      goal: 'The one question this chapter answers?',
      learn: ['The first thing the reader will be able to explain', 'The second thing'],
      terms: [['System', 'Define each term the first time a chapter uses it.']],
    },
  },
];

export const __CONST__: Module = {
  id: '__ID__',
  title: '__TITLE__',
  description: 'What the reader will understand, in one sentence.',
  level: 'Beginner',
  // track: 'Classic tech', for a non-AI module
  status: 'live',
  author: { name: 'Your Name', url: 'https://example.com' },
  prereqs: [],
  story: 'The module’s one story, in a sentence.',
  chapters: CHAPTERS,
  recall: RECALL,
};
