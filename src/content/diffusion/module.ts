// Diffusion models: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-noise-to-picture',
    title: 'Noise to picture',
    short: 'Noise to picture',
    intro: {
      story:
        'Larkspur wants a picture of every part for its catalogue, drawn by a model instead of a photo shoot for each.',
      goal: 'How does a picture come out of pure noise?',
      learn: [
        'How forward noising buries a drawing in noise',
        'How a denoiser runs it backwards, every pixel at once',
        'How that differs from writing text a token at a time',
      ],
      terms: [
        [
          'Diffusion model',
          'A model that makes a picture by starting from noise and removing a little of it each step.',
        ],
        ['Noise', 'Random speckle added to every pixel. Enough of it hides the picture completely.'],
        [
          'Denoiser',
          'The part that guesses the clean picture behind a noisy one. This toy averages Larkspur’s twelve drawings, weighted by how well each fits.',
        ],
      ],
    },
  },
  {
    id: '02-step-by-step',
    title: 'Step by step',
    short: 'Step by step',
    intro: {
      story:
        'The pictures come out clean, but each one takes many runs of the denoiser. The team wants to know what fewer would cost.',
      goal: 'What do you give up when you take fewer steps?',
      learn: [
        'Why each step is one run of the denoiser',
        'Why fewer steps draw a rougher picture',
        'Why the step count is a trade of cost against quality',
      ],
      terms: [
        ['Step', 'One run of the denoiser: it guesses the clean picture and moves a little toward it.'],
        ['Roughness', 'Here, how far the dots land from the hinge’s outline on average. 0 is a perfect drawing.'],
        ['Cost', 'Here, how many times the denoiser runs to make one picture.'],
      ],
    },
  },
  {
    id: '03-a-learned-denoiser',
    title: 'A learned denoiser',
    short: 'Learned denoiser',
    intro: {
      story:
        'The toy denoiser in chapter 1 needs every training drawing to hand at every step. Real models learn the job once instead.',
      goal: 'What does a network learn, if it keeps no pictures?',
      learn: [
        'How a network is trained to guess the noise',
        'Why it learns directions, not a list of points',
        'How its guesses pull noise onto a shape',
      ],
      terms: [
        ['Network', 'A small neural network: numbers (weights) that turn an input into a guess, tuned by training.'],
        [
          'Training',
          'Showing the network noisy points again and again, and nudging its weights toward the right answer each time.',
        ],
      ],
    },
  },
  {
    id: '04-copy-or-create',
    title: 'Copy or create',
    short: 'Copy or create',
    intro: {
      story:
        'Larkspur’s lawyers ask a fair question: will the model draw new pictures, or hand back copies of the ones it was trained on?',
      goal: 'Does a denoiser copy its training pictures or make new ones?',
      learn: [
        'Why the ideal denoiser can only copy its training points',
        'Why a learned network draws new points along the shape',
        'Why real models can still memorise',
      ],
      terms: [
        [
          'Ideal denoiser',
          'The best possible guess for exactly these training points: an average of them, weighted by fit.',
        ],
        ['Memorise', 'Hand back a training example, or something very close to it, instead of a new one.'],
        ['Generalise', 'Draw new examples that fit the shape of the training data without copying any of them.'],
      ],
    },
  },
  {
    id: '05-steer-with-a-label',
    title: 'Steer with a label',
    short: 'Steer with a label',
    intro: {
      story: 'The catalogue needs a drill on the drill page. Leaving the part to chance won’t do.',
      goal: 'How does a label steer what the model draws?',
      learn: [
        'How a label changes the denoiser’s guess',
        'What the guidance scale does, from 0 to 4',
        'Why stronger guidance costs twice the predictions',
      ],
      terms: [
        [
          'Label',
          'The part asked for, given to the denoiser with the noisy picture. Also called a class or a condition.',
        ],
        [
          'Guidance scale',
          'How hard to push toward the label: 0 ignores it, 1 follows it as trained, more pushes past it.',
        ],
        [
          'Classifier-free guidance',
          'Mixing the denoiser’s guess with the label and without it, then pushing further in the label’s direction.',
        ],
      ],
    },
  },
  {
    id: '06-why-it-costs',
    title: 'Why it costs what it costs',
    short: 'Why it costs',
    intro: {
      story:
        'Larkspur’s catalogue has thousands of parts, and finance wants to know what a picture costs before anyone presses go.',
      goal: 'What makes a diffusion picture expensive, and how do newer models cut it?',
      learn: [
        'Why the work grows with steps and with picture size',
        'How latent diffusion shrinks what the denoiser reads',
        'How few-step models cut the steps instead',
      ],
      terms: [
        ['Position', 'One place in the picture the denoiser reads each step: a pixel, or a cell of the latent.'],
        [
          'Latent diffusion',
          'Running the denoiser on a small encoded copy of the picture, then decoding the result to full size once.',
        ],
        [
          'Few-step model',
          'A model trained to make a good picture in one or a few steps, often distilled from a diffusion model.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: steps and guidance per picture',
    short: 'Workbench',
    intro: {
      story:
        'Larkspur needs two kinds of picture: a small thumbnail for search results and a large, clean image for each part’s page.',
      goal: 'How many steps and how much guidance does each picture need?',
      learn: [
        'How to pick steps and guidance for each use',
        'Why the cheapest setting that passes each use wins',
        'Why the answer differs per use',
      ],
      terms: [
        ['Plan', 'A step count and a guidance scale for each kind of picture.'],
        ['Bar', 'How rough a picture may be and still pass, set by the team for each use.'],
        ['Workbench', 'The chapter’s free-play bench: change the plan and see every result.'],
      ],
    },
  },
];

export const DIFFUSION_MODULE: Module = {
  id: 'diffusion',
  title: 'Diffusion models',
  description: 'How a picture comes out of noise: a model that removes its best guess of the noise, step by step.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['multimodal'],
  story:
    'Larkspur Supply Co. wants pictures of its parts drawn by a model: a thumbnail for search and a clean image for every catalogue page.',
  chapters: CHAPTERS,
  recall: RECALL,
};
