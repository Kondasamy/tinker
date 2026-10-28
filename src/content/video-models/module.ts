// Video and world models: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import bench from '../../../data/video-models/workbench.json' with { type: 'json' };
import { TRAIN_ROLLOUTS } from '../../lib/video-models/training';
import { RECALL } from './recall';

const RUNS = TRAIN_ROLLOUTS.toLocaleString('en-US');

const CHAPTERS: Chapter[] = [
  {
    id: '01-many-pictures',
    title: 'A film is many pictures',
    short: 'Many pictures',
    intro: {
      story:
        'Larkspur wants to try warehouse robot routes in a simulator before it builds them. A simulator that learns from video starts with frames.',
      goal: 'What is a video made of, and what does a second of it cost?',
      learn: [
        'A video is a row of still frames',
        'How the bytes add up each second',
        'Why each frame repeats most of the last',
      ],
      terms: [
        ['Frame', 'One still picture in a video. Here, the warehouse floor’s 16 × 16 cells at one tick.'],
        ['Frame rate', 'How many frames a video shows each second.'],
      ],
    },
  },
  {
    id: '02-guess-the-next-frame',
    title: 'Guess the next frame',
    short: 'Next frame',
    intro: {
      story: `The simulator Larkspur wants learns from video. Its toy one was trained on ${RUNS} recorded runs of the test floor.`,
      goal: 'How good is one guess of the next frame?',
      learn: [
        'How a world model guesses every cell',
        'Why most cells are easy',
        'Why the cells that change are the real test',
      ],
      terms: [
        ['World model', 'A model that guesses what a world looks like next, from its latest frames and an action.'],
        ['Changed cell', 'A cell whose kind differs from the frame before: where something moved.'],
      ],
    },
  },
  {
    id: '03-one-frame-is-not-enough',
    title: 'One frame is not enough',
    short: 'Two frames',
    intro: {
      story:
        'The toy model reads the last two frames. A cheaper one reads only the latest, and Larkspur asks whether the second frame earns its keep.',
      goal: 'Can one frame tell you which way the crate is going?',
      learn: ['Why a still frame hides motion', 'How a second frame shows direction', 'What the extra frame costs'],
      terms: [
        ['Context', 'The frames a model reads before it guesses: here one or two.'],
        ['Direction', 'Which way something is moving. A still frame cannot show it.'],
      ],
    },
  },
  {
    id: '04-press-a-key',
    title: 'Press a key',
    short: 'Press a key',
    intro: {
      story: 'A simulator for routes must take orders. Larkspur’s toy model also reads an action each tick.',
      goal: 'How does a key press reach the model’s next frame?',
      learn: [
        'How an action goes in beside the frames',
        'What driving inside the model feels like',
        'Why the real floor is the referee',
      ],
      terms: [
        ['Action', 'What the robot is told to do this tick: up, down, left, right or stay.'],
        ['Dream', 'Frames the model draws from its own earlier frames, with no camera watching.'],
      ],
    },
  },
  {
    id: '05-drift',
    title: 'Drift',
    short: 'Drift',
    intro: {
      story:
        'Larkspur runs a whole route inside the model, with no real frames after the first two. Every frame now rests on earlier guesses.',
      goal: 'What happens when guesses are built on guesses?',
      learn: ['How small errors pile up', 'Why the robot and the crate vanish', 'How a re-sync pulls the dream back'],
      terms: [
        ['Drift', 'Errors that pile up when a model reads its own guesses instead of real frames.'],
        ['Re-sync', 'Swapping in a real frame, so the model guesses from the truth again.'],
      ],
    },
  },
  {
    id: '06-the-big-ones',
    title: 'The big ones',
    short: 'The big ones',
    intro: {
      story:
        'Larkspur’s team reads about large world and video models. They want to know what those do differently, and what they cost.',
      goal: 'How do large models keep frames agreeing, and how big are they?',
      learn: [
        'Why big models read many past frames',
        'How some make a whole clip at once',
        'What their published sizes say',
      ],
      terms: [
        ['Video model', 'A model that makes moving pictures, often from a text prompt.'],
        ['Denoising', 'Making a picture from noise a step at a time, as diffusion models do.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: context and re-sync',
    short: 'Workbench',
    intro: {
      story: `Larkspur will test ${bench.routes} routes of ${bench.steps} steps inside the model. Real test-floor frames are costly, and the dream must stay right.`,
      goal: 'Which plan keeps the dream right with the fewest real frames?',
      learn: [
        'How context and re-sync trade against each other',
        'Why compute is not the only cost',
        'Why the cheapest passing plan wins',
      ],
      terms: [
        ['Plan', 'A context (one frame or two) and a re-sync interval.'],
        ['Bar', 'How many dreamed frames must be right, set by the team.'],
        ['Workbench', 'The chapter’s free-play bench: change the plan and see every result.'],
      ],
    },
  },
];

export const VIDEO_MODELS_MODULE: Module = {
  id: 'video-models',
  title: 'Video and world models',
  description:
    'Models that make moving pictures: frames that agree over time, and models that guess what a world does next.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['diffusion'],
  story:
    'Larkspur Supply Co. wants to try warehouse robot routes in a simulator before it builds them: a model that guesses the next frame of its test floor.',
  chapters: CHAPTERS,
  recall: RECALL,
};
