// Git: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress: never rename
// one. People's names come from data/git/repo.json.
import type { Chapter, Module } from '../../lib/modules';
import { NAME } from '../../lib/git/graph';
import { RECALL } from './recall';

const { mira: MIRA, tom: TOM } = NAME;

const CHAPTERS: Chapter[] = [
  {
    id: '01-named-by-contents',
    title: 'Named by its contents',
    short: 'Named by contents',
    intro: {
      story: `${MIRA} and ${TOM} keep Larkspur’s price page in Git. Before they change a price, see how Git names each version of the page.`,
      goal: 'How does Git name a version of a file?',
      learn: [
        'Git names a file’s bytes by their hash',
        'One changed byte gives a whole new name',
        'The same bytes always give the same name',
      ],
      terms: [
        ['Blob', 'Git’s name for one version of a file’s bytes, sealed and stored.'],
        ['Hash', 'A fixed-length fingerprint computed from bytes: change any byte and it changes completely.'],
      ],
    },
  },
  {
    id: '02-a-chain-of-snapshots',
    title: 'A chain of snapshots',
    short: 'A chain',
    intro: {
      story: `${MIRA} raises the bracket price. To keep it, Git seals the whole page in a commit, chained to the commits before it.`,
      goal: 'What is a commit, and why can’t its past change quietly?',
      learn: [
        'A commit is a snapshot, its parent, who, when and why',
        'Each commit holds its parent’s name',
        'Why changing old history renames everything after it',
      ],
      terms: [
        ['Commit', 'A saved snapshot of the project, with its parent, author, time and message, named by its hash.'],
        ['Snapshot', 'The whole project as it was at one moment, not a list of changes.'],
        ['Parent', 'The commit a commit was made on top of; its name is written inside.'],
      ],
    },
  },
  {
    id: '03-a-branch-is-a-label',
    title: 'A branch is a label',
    short: 'A branch',
    intro: {
      story: `${MIRA} wants to try a drill press sale without touching the live page. Git offers branches.`,
      goal: 'What does Git make when you make a branch?',
      learn: [
        'A branch is a name pointing at one commit',
        'Committing moves the branch you are on',
        'HEAD marks that branch',
      ],
      terms: [
        ['Branch', 'A name that points at one commit and moves forward as you commit on it.'],
        ['HEAD', 'Git’s marker for the branch you are on: new commits go there.'],
      ],
    },
  },
  {
    id: '04-three-way-merge',
    title: 'Three-way merge',
    short: 'Merge',
    intro: {
      story: `The sale is ready. Meanwhile ${TOM} changed the hinge price on main. Now the two lines of work must come together.`,
      goal: 'How does Git combine two branches that both changed the page?',
      learn: [
        'The merge base: the newest commit both share',
        'Comparing each side with the base',
        'A merge commit has two parents',
      ],
      terms: [
        ['Merge base', 'The newest commit two branches both have: where they split.'],
        ['Three-way merge', 'Combining two versions by comparing each with their merge base, line by line.'],
        ['Merge commit', 'A commit with two parents, joining two branches.'],
      ],
    },
  },
  {
    id: '05-both-changed-it',
    title: 'Both changed it',
    short: 'Conflicts',
    intro: {
      story: `This time ${TOM} raised the drill press price on main, while ${MIRA}’s sale branch cut it.`,
      goal: 'What happens when both sides change the same line?',
      learn: [
        'A conflict: one line, two answers',
        'Git stops and a person chooses',
        'The merge commit keeps the choice',
      ],
      terms: [['Conflict', 'The same part of a file changed differently on both sides, so Git can’t choose.']],
    },
  },
  {
    id: '06-rewriting-history',
    title: 'Rewriting history',
    short: 'Rebase',
    intro: {
      story: `${TOM}’s shelf branch started before main moved on. He’d like his work to sit on top of today’s main, in one straight line.`,
      goal: 'What does a rebase do to commits, and when is it unsafe?',
      learn: [
        'A rebase replays each commit on a new parent',
        'New parents mean new names',
        'Never rebase commits others have',
      ],
      terms: [
        ['Rebase', 'Moving a branch’s commits onto another commit by replaying each one, making new commits.'],
        ['Replay', 'Applying one commit’s change again on top of a different parent.'],
      ],
    },
  },
  {
    id: '07-bring-them-in',
    title: 'Bring three branches in',
    short: 'Bring them in',
    intro: {
      story: `Friday: three branches wait to join main, ${MIRA}’s sale, and ${TOM}’s shelf and hinge work. Others already have the sale.`,
      goal: 'Which way and order brings all three in with no conflicts and the shortest history?',
      learn: [
        'Merge what others have; rebase what only you have',
        'A rebase can meet conflicts a merge never sees',
        'Why more than one plan can be equally good',
      ],
      terms: [['Shared branch', 'A branch others already have and may have built on.']],
    },
  },
];

export const GIT_MODULE: Module = {
  id: 'git',
  title: 'Git',
  description: 'How Git stores history: snapshots named by their content, branches as pointers, and merges that clash.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story: `${MIRA} and ${TOM} edit Larkspur Supply Co.’s price page in Git; the team finds that a commit is a snapshot named by its contents and a branch is just a label.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
