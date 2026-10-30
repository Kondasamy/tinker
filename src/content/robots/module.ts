// Robots that act: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress: never
// rename one. Names come from the module's data.
import type { Chapter, Module } from '../../lib/modules';
import { PERSON } from '../../lib/robots/story';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-see-decide-move',
    title: 'See, decide, move',
    short: 'The loop',
    intro: {
      story: `Larkspur’s warehouse is trying a picking arm: a claw on overhead rails above a parts bin. ${PERSON} runs the trial, and you help.`,
      goal: 'What does a robot do, over and over, to pick one part?',
      learn: ['The see, decide, move loop', 'How often real robots run it', 'Why each move is small'],
      terms: [['Control loop', 'See, decide, move, then again: what every robot runs.']],
    },
  },
  {
    id: '02-what-the-camera-gives',
    title: 'What the camera gives',
    short: 'The camera',
    intro: {
      story: `The claw can’t look at a bin the way ${PERSON} does. Its camera gives a picture, and software turns it into something to decide on.`,
      goal: 'What does the robot actually know about the bin?',
      learn: ['How a frame becomes a grid', 'What the policy reads from it', 'What the camera can’t give'],
      terms: [
        ['Frame', 'One picture from the camera.'],
        ['State', 'What the robot knows right now, read from the frame.'],
        ['Policy', 'The part that picks the next move from the state.'],
      ],
    },
  },
  {
    id: '03-rules-break',
    title: 'Rules break',
    short: 'Rules break',
    intro: {
      story: `Before any learning, Larkspur tried the old way: ${PERSON} wrote down the moves that worked on one bin, and the arm repeats them.`,
      goal: 'Does a fixed list of moves work on the next bin?',
      learn: ['What a hand-written rule is', 'Why it breaks on a new layout', 'Why more rules don’t scale'],
      terms: [
        ['Rule', 'A fixed list of moves a person wrote down.'],
        ['Layout', 'Where the crates, the part and the tray sit in one bin.'],
      ],
    },
  },
  {
    id: '04-show-it',
    title: 'Show it',
    short: 'Show it',
    intro: {
      story: `A rule for every bin won’t scale. ${PERSON} has another idea: show the arm what to do, and let it copy.`,
      goal: 'Can a robot learn a task from someone showing it?',
      learn: ['What a demonstration records', 'How a copy-what-you-did policy works', 'Why more demos help'],
      terms: [
        ['Demonstration', 'A person doing the task while each frame and move is recorded. A demo, for short.'],
        ['Nearest neighbour', 'Doing what was done at the most similar recorded frame.'],
        ['Fresh bin', 'A bin layout no demo used.'],
      ],
    },
  },
  {
    id: '05-mistakes-snowball',
    title: 'Mistakes snowball',
    short: 'Snowball',
    intro: {
      story: `${PERSON}’s four demos clear bin C every time. Then the rail slips once, carrying the claw one cell too far.`,
      goal: 'Why does one small slip end the whole pick?',
      learn: ['Why a copied policy drifts where no demo went', 'Why mistakes snowball', 'How corrections fix it'],
      terms: [
        ['Slip', 'A move that carries the claw one cell too far.'],
        ['Off-demo', 'A frame no demo ever showed.'],
        ['Correction', 'A person’s move, recorded at a frame the policy reached.'],
        ['DAgger', 'Ross et al.’s method: run the policy, have a person label the frames it reached, add them.'],
      ],
    },
  },
  {
    id: '06-practice-in-a-game',
    title: 'Practice in a game first',
    short: 'Practice',
    intro: {
      story: `The real bay has slips and changing light. Demos cost ${PERSON}’s time, but a game of the bay runs practice for free.`,
      goal: 'Can practice in a simulator prepare a robot for the real bay?',
      learn: [
        'Why practice in simulation is cheap',
        'What the gap to the real bay is',
        'How varying the game closes it',
      ],
      terms: [
        ['Simulator', 'A program that plays the bay: claw, part, tray, light and slips.'],
        ['Sim-to-real gap', 'What the simulator gets wrong about the real bay.'],
        ['Domain randomisation', 'Varying the simulator’s conditions, so the real bay looks like one more variation.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: ready for every bay',
    short: 'Workbench',
    intro: {
      story: `Larkspur will put the arm in every bay. Each demo and correction costs ${PERSON}’s time; practice in the simulator is free.`,
      goal: 'Which mix clears the most bins for the least of her time?',
      learn: [
        'How demos, corrections and practice trade off',
        'Why free practice comes first',
        'What to check before rollout',
      ],
      terms: [
        ['Label', 'One frame with the right move, from a demo or a correction.'],
        ['Workbench', 'The chapter’s free-play bench: change the mix and see every result.'],
      ],
    },
  },
];

export const ROBOTS_MODULE: Module = {
  id: 'robots',
  title: 'Robots that act',
  description:
    'How a robot turns camera frames into moves, learns by copying people, and why its small mistakes snowball.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['multimodal'],
  story:
    'Larkspur Supply Co.’s warehouse trials a claw on overhead rails above its parts bins: first a written rule, then demos, corrections and practice in a simulator.',
  chapters: CHAPTERS,
  recall: RECALL,
};
