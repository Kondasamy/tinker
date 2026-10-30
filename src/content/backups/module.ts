// Backups and recovery: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-copy-is-no-copy',
    title: 'One copy is no copy',
    short: 'One copy',
    intro: {
      story:
        'Every Larkspur order lives in one database, on one disk, in the server room. Mira runs it. Nobody has ever made a copy.',
      goal: 'What is left when the only disk dies?',
      learn: [
        'A database on one disk is one copy',
        'A backup is a second copy, kept apart',
        'You lose what came after the last copy',
      ],
      terms: [
        ['Database', 'Where the shop keeps its orders: here, files on the server’s disk.'],
        ['Backup', 'A second copy of the data, kept apart, to restore from when the first is lost.'],
      ],
    },
  },
  {
    id: '02-how-often',
    title: 'How often to copy',
    short: 'How often',
    intro: {
      story: 'Mira now copies the database to tape every night at 01:00. On Thursday afternoon the disk dies again.',
      goal: 'How does the copy schedule decide what you lose?',
      learn: ['You lose the work since the last copy', 'More often loses less', 'The gap between copies is your RPO'],
      terms: [
        ['Schedule', 'How often a copy is taken: every night, every six hours, every hour.'],
        ['RPO', 'Recovery point objective: how much recent work you can afford to lose, measured in time.'],
      ],
    },
  },
  {
    id: '03-full-and-since-last',
    title: 'Full and since-last',
    short: 'Full and since-last',
    intro: {
      story: 'Copies every six hours fill a whole tape each time, and tapes cost money. Mira wants smaller copies.',
      goal: 'What does a restore need when copies only hold the changes?',
      learn: [
        'A full copy holds everything',
        'An incremental copy holds what changed',
        'A restore needs the whole chain',
      ],
      terms: [
        ['Full copy', 'A copy of the whole database.'],
        ['Incremental copy', 'A copy of only what changed since the copy before it.'],
        ['Chain', 'A full copy and the incrementals after it, all needed to restore the last one.'],
      ],
    },
  },
  {
    id: '04-not-in-the-same-building',
    title: 'Not in the same building',
    short: 'Off-site',
    intro: {
      story:
        'The six-hourly tapes sit in a cabinet beside the server. One cabinet, one room, one building, one bad night.',
      goal: 'What survives a fire in the server room?',
      learn: ['On-site copies share on-site disasters', 'Off-site copies survive them', 'The 3-2-1 rule'],
      terms: [
        ['On-site', 'In the same building as the thing it copies.'],
        ['Off-site', 'Somewhere else, far enough that one disaster can’t reach both.'],
      ],
    },
  },
  {
    id: '05-ransomware',
    title: 'Ransomware',
    short: 'Ransomware',
    intro: {
      story:
        'Copies now go over the network to the warehouse across town. Then someone opens a fake invoice on an office laptop.',
      goal: 'Which copies does an attacker on your network reach?',
      learn: ['Ransomware encrypts what it can reach', 'Online copies are reachable', 'An offline, locked copy is not'],
      terms: [
        ['Ransomware', 'Malware that encrypts your files and asks for money to unlock them.'],
        ['Offline', 'Not connected to any network, so nothing online can touch it.'],
      ],
    },
  },
  {
    id: '06-test-the-restore',
    title: 'Test the restore',
    short: 'Test it',
    intro: {
      story: 'Larkspur’s copies run every six hours and every one reports done. Nobody has ever read one back.',
      goal: 'How do you know a copy will restore?',
      learn: ['A copy can report done and never restore', 'Only a test restore finds out', 'Restore time is your RTO'],
      terms: [
        ['Test restore', 'Reading a copy back on purpose, to check it works before you need it.'],
        ['RTO', 'Recovery time objective: how long you can afford to be down while you restore.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Plan Larkspur’s backups',
    short: 'Workbench',
    intro: {
      story:
        'Everything is on the bench: how often, full or incremental, and where copies go. Next week brings a dead disk, a fire and ransomware.',
      goal: 'Which plan meets Mira’s rule for the least money?',
      learn: [
        'Every disaster needs a copy it can’t reach',
        'Short chains restore fast',
        'Cheap and safe can be the same plan',
      ],
      terms: [['Workbench', 'Every setting at once, run over the whole week against every disaster.']],
    },
  },
];

export const BACKUPS_MODULE: Module = {
  id: 'backups',
  title: 'Backups and recovery',
  description:
    'Copies that save you on a bad day: how often to copy, where to keep them, and why only a tested restore counts.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['databases'],
  story:
    'Larkspur Supply Co.’s order database lives on one disk; the team copies it, carries a copy across town, locks one away from the network, and learns a backup counts only when a restore works.',
  chapters: CHAPTERS,
  recall: RECALL,
};
