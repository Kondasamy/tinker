// Replication & consistency: the module's registry entry and chapters. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-one-count-three-copies',
    title: 'One count, three copies',
    short: 'Three copies',
    intro: {
      story:
        'Larkspur’s stock count used to live in one database. Now each of its three warehouses keeps its own copy, so every region answers fast.',
      goal: 'When North sells a hinge, what do the other copies show?',
      learn: [
        'A replica is a copy of the same data in another place',
        'Changes reach the other copies after a delay',
        'Why a copy can answer with an old count',
      ],
      terms: [
        ['Replica', 'One copy of the same data, kept in another place: here, each warehouse’s stock count.'],
        ['Replication lag', 'The time a change takes to reach the other replicas.'],
        ['Stale', 'Older than the newest change: a count that hasn’t heard about the latest sale.'],
      ],
    },
  },
  {
    id: '02-two-buyers-one-hinge',
    title: 'Two buyers, one hinge',
    short: 'Two buyers',
    intro: {
      story:
        'The copies catch up within minutes, and Larkspur is happy. Then the hinges run low, and two customers in two regions want the last one.',
      goal: 'What happens when two warehouses sell the last unit at the same moment?',
      learn: [
        'Concurrent orders each read the count before either writes',
        'How the last unit gets two receipts',
        'Why waiting for news doesn’t help',
      ],
      terms: [
        ['Concurrent', 'Happening at the same time, so neither knows about the other.'],
        ['Oversold', 'More units sold than there were: a promise the shop can’t keep.'],
      ],
    },
  },
  {
    id: '03-the-link-goes-down',
    title: 'The link goes down',
    short: 'The link goes down',
    intro: {
      story:
        'Two buyers at once is rare. A cut line is not: one morning the phone line to West goes down for eight minutes, and West keeps taking orders.',
      goal: 'When the warehouses can’t talk, should West keep selling?',
      learn: [
        'A partition splits the copies into sides that can’t talk',
        'Each side can stay available or stay consistent, not both',
        'The CAP theorem, in one picture',
      ],
      terms: [
        ['Partition', 'A break in the network: the copies on each side can’t reach each other.'],
        ['Available', 'Every request gets an answer, even while the line is down.'],
        ['Consistent', 'Every answer agrees with the newest change, as if there were one copy.'],
      ],
    },
  },
  {
    id: '04-quorums',
    title: 'Quorums',
    short: 'Quorums',
    intro: {
      story:
        'Stay open or stay right is too blunt. The team wants a dial: how many copies must agree before a read or a sale counts.',
      goal: 'How many copies must a read and a write reach to never miss the latest sale?',
      learn: [
        'N, R and W: copies, reads and writes',
        'Why R + W > N makes every read see the latest write',
        'What a bigger W costs when the line is down',
      ],
      terms: [
        ['N', 'How many replicas each count has: here, 3.'],
        ['R', 'How many replicas a read must hear from.'],
        ['W', 'How many replicas must take a write before the receipt prints.'],
        ['Quorum', 'A set of replicas big enough that any read set and any write set share at least one.'],
      ],
    },
  },
  {
    id: '05-who-wins',
    title: 'Who wins',
    short: 'Who wins',
    intro: {
      story:
        'Quorums fixed the stale reads. But the two buyers of the last hinge are back, and the quorum still prints two receipts.',
      goal: 'When two writes clash, which one wins, and what is lost?',
      learn: [
        'Last writer wins keeps one write and drops the other',
        'A lost update: a sale the count forgets',
        'Reservations at one primary sell one at a time',
      ],
      terms: [
        ['Last writer wins', 'A conflict rule: keep the version with the newest timestamp and drop the rest.'],
        ['Lost update', 'A change that vanished because another write, based on older data, replaced it.'],
        ['Primary', 'The one replica that decides every order, so sales happen one at a time.'],
      ],
    },
  },
  {
    id: '06-eventually',
    title: 'Eventually',
    short: 'Eventually',
    intro: {
      story: 'Orders are right now. Then Priya writes in: she bought a hinge, reloaded, and her purchase was gone.',
      goal: 'Why can a customer miss their own order, and how do you stop it?',
      learn: [
        'Every copy agrees, eventually',
        'Read your writes: seeing your own change',
        'Sending a customer’s reads where they wrote',
      ],
      terms: [
        ['Eventually consistent', 'Every copy agrees once the changes have arrived; until then they may differ.'],
        ['Read your writes', 'A promise that after you change something, your own reads show the change.'],
      ],
    },
  },
  {
    id: '07-stock-policy',
    title: 'Set Larkspur’s stock policy',
    short: 'Stock policy',
    intro: {
      story:
        'Everything is on the bench: R, W and the conflict rule, for each product. The line to West will go down again tomorrow morning.',
      goal: 'Which settings never sell the drill press twice and refuse the fewest orders?',
      learn: [
        'Different data needs different settings',
        'How to read a morning of orders product by product',
        'Why more than one setting can be equally good',
      ],
      terms: [['Stock policy', 'The setting for each product: R, W and the rule for writes that clash.']],
    },
  },
];

export const CONSISTENCY_MODULE: Module = {
  id: 'consistency',
  title: 'Replication & consistency',
  description: 'Three warehouses, one stock count: how the last hinge gets sold twice, and what each fix costs.',
  level: 'Advanced',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['databases'],
  story:
    'Larkspur Supply Co. copies its stock count to three warehouses; the team finds how the last hinge sells twice, and picks what each product can risk when the line goes down.',
  chapters: CHAPTERS,
  recall: RECALL,
};
