// Shipping a release: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-straight-to-everyone',
    title: 'Straight to everyone',
    short: 'To everyone',
    intro: {
      story:
        'Larkspur’s team has built a new checkout page for the spring sale. Today it ships the simple way: to every customer at once.',
      goal: 'What happens when a change with a bug reaches everyone at once?',
      learn: [
        'A release puts a change in front of customers',
        'A bug in it reaches all of them together',
        'A rollback takes minutes, and the bug runs on meanwhile',
      ],
      terms: [
        ['Release', 'Putting a change in front of customers.'],
        ['Rollback', 'Putting the previous version back on every server.'],
      ],
    },
  },
  {
    id: '02-tests-on-every-change',
    title: 'Tests on every change',
    short: 'Tests',
    intro: {
      story: 'After the bad morning, the team adds a pipeline: every change must build and pass tests before it ships.',
      goal: 'Which bugs do tests stop, and which get through?',
      learn: [
        'A pipeline runs every change through gates',
        'A test stops the bug it checks',
        'A bug no test checks passes every gate',
      ],
      terms: [
        ['Pipeline', 'The automatic steps every change passes through before it can ship.'],
        ['Gate', 'One step of the pipeline, a build or a set of tests, that must pass.'],
      ],
    },
  },
  {
    id: '03-a-few-first',
    title: 'A few first',
    short: 'A canary',
    intro: {
      story:
        'Tests can’t catch everything, so the team tries changes on a few customers first and compares their failures with everyone else’s.',
      goal: 'How do you tell a bad canary from bad luck?',
      learn: [
        'A canary gets the change before everyone else',
        'Few checkouts make luck look like a bug',
        'A small bug can hide under the check',
      ],
      terms: [
        ['Canary', 'A small share of customers who get the new version first, compared with the rest.'],
        ['Bake time', 'How long a stage runs before the check decides.'],
        ['False alarm', 'The check rings for a change that is fine: luck, not a bug.'],
      ],
    },
  },
  {
    id: '04-deploy-now-switch-on-later',
    title: 'Deploy now, switch on later',
    short: 'Flags',
    intro: {
      story:
        'A rollback took minutes. For the gift-wrap option, the team ships the code switched off, and turns it on separately.',
      goal: 'What changes when the code is out but switched off?',
      learn: [
        'Deploying code and releasing a feature are two moves',
        'A flag decides who sees the feature',
        'Switching a flag off is faster than a rollback',
      ],
      terms: [
        ['Deploy', 'Putting new code on the servers; with its flag off, nobody uses it yet.'],
        ['Feature flag', 'A switch in the code that decides who sees a feature, changed without a deploy.'],
      ],
    },
  },
  {
    id: '05-back-it-out',
    title: 'Back it out',
    short: 'Back it out',
    intro: {
      story:
        'The saved-cards change moves card data into a new table. A quarter of checkouts have it when failures start.',
      goal: 'Can every change be rolled back?',
      learn: [
        'A migration changes the stored data, not only code',
        'Old code can’t read moved data',
        'Expand first, contract later, keeps the way back',
      ],
      terms: [
        ['Migration', 'A change to how stored data is laid out, like moving it into a new table.'],
        ['Expand and contract', 'Add the new layout beside the old, move everyone, then remove the old.'],
      ],
    },
  },
  {
    id: '06-step-by-step',
    title: 'Step by step',
    short: 'Stages',
    intro: {
      story:
        'The new checkout is back, bug and all. This time it goes out in stages, with a check before each step up.',
      goal: 'How far does a bad change get when each step is checked?',
      learn: [
        'A staged rollout raises the share in steps',
        'The check can roll back by itself',
        'Few customers meet a bad change',
      ],
      terms: [
        ['Staged rollout', 'Raising the share on the new version in steps, with a check before each one.'],
        ['Automatic rollback', 'A rollback the check starts by itself, with nobody at the lever.'],
      ],
    },
  },
  {
    id: '07-release-plan',
    title: 'Plan the release',
    short: 'Release plan',
    intro: {
      story:
        'Next week four changes ship before the sale: one good, three with bugs nobody has found. Everything is on the bench.',
      goal: 'Which plan hurts few customers and still gets the good change out soon?',
      learn: [
        'A bigger canary sees bad changes sooner',
        'A flag makes the way back fast',
        'Why a check that is too loose or too strict both cost',
      ],
      terms: [['Workbench', 'Every setting at once, run over all four changes, checked against the owner’s rule.']],
    },
  },
];

export const RELEASES_MODULE: Module = {
  id: 'releases',
  title: 'Shipping a release',
  description: 'How new code reaches everyone: tests on every change, a canary first, feature flags, and a rollback.',
  level: 'Intermediate',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co. ships a new checkout before its sale; the team learns to ship to a few first, watch, and keep a way back that is faster than a fix.',
  chapters: CHAPTERS,
  recall: RECALL,
};
