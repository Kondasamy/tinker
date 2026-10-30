// Diffusion's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea
// in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  noise: '01-noise-to-picture',
  steps: '02-step-by-step',
  learned: '03-a-learned-denoiser',
  copy: '04-copy-or-create',
  label: '05-steer-with-a-label',
  cost: '06-why-it-costs',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 1. Noise to picture (pinned: the module's one idea)
  {
    id: 'noise-to-picture',
    chapter: C.noise,
    pin: true,
    question: 'A colleague asks how an image model “draws”. What do you tell them?',
    options: [
      'It starts from random noise and, step after step, removes its best guess of the noise until a picture is left',
      'It paints the picture pixel by pixel, like a printer, left to right',
      'It searches its training pictures for the best match and returns it',
      'It writes a description first, then turns the words into pixels one by one',
    ],
    correct: 0,
    why: [
      'Right. Every step, the denoiser guesses the clean picture and moves every pixel a little toward it.',
      'That is how text models write, a word or so at a time; a diffusion model works on every pixel at every step.',
      'Nothing is looked up when it draws: each step is one run of the network on the noisy picture.',
      'A text prompt can steer it, but the picture still comes out of noise, all pixels at once.',
    ],
  },
  {
    id: 'forward-noising',
    chapter: C.noise,
    question: 'Training data for a diffusion model is made by adding noise to pictures. Why add noise on purpose?',
    options: [
      'So the model can practise removing it: the clean picture is the answer it learns to guess',
      'To hide the pictures, so the model can’t copy them',
      'To make the training pictures smaller to store',
    ],
    correct: 0,
    why: [
      'Right: noising is easy, so every picture gives free practice at the hard way back.',
      'Hiding is not the goal; chapter 4 shows models can still memorise.',
      'Noise doesn’t shrink a picture: it has the same pixels, just speckled.',
    ],
  },
  {
    id: 'halfway',
    chapter: C.noise,
    question: 'You stop a diffusion model halfway through a picture of a lamp. What do you see?',
    options: [
      'The whole lamp, faint and speckled',
      'The top half of the lamp, finished',
      'Nothing yet: the picture appears only at the end',
    ],
    correct: 0,
    why: [
      'Right: every pixel improves every step, so the whole picture sharpens together.',
      'Finishing one part first is how text is written, not how diffusion works.',
      'The picture builds up gradually; halfway, its shape is already there.',
    ],
  },
  // 2. Step by step
  {
    id: 'fewer-steps',
    chapter: C.steps,
    question: 'To cut costs, a team drops its image model from 30 steps to 3. What should they expect?',
    options: [
      'About a tenth of the cost, and rougher pictures',
      'The same pictures, ten times cheaper',
      'No pictures at all: the model needs all 30',
    ],
    correct: 0,
    why: [
      'Right: each step is one run of the denoiser, and bigger jumps from rougher guesses lose detail.',
      'Fewer steps mean bigger jumps from rougher guesses, so quality drops.',
      'A picture still comes out; it is just rougher.',
    ],
  },
  {
    id: 'step-cost',
    chapter: C.steps,
    question: 'What does one step of a diffusion model cost?',
    options: [
      'One full run of the denoiser over the picture',
      'Nothing: only the last step runs the model',
      'One run per pixel',
    ],
    correct: 0,
    why: [
      'Right: that is why the step count sets the bill.',
      'Every step runs the model; that is where the cost comes from.',
      'One run reads the whole picture at once, not a pixel at a time.',
    ],
  },
  {
    id: 'one-step-blur',
    chapter: C.steps,
    question: 'An ordinary diffusion model is asked for a picture in a single step. What comes out?',
    options: [
      'A blurry average of what it might draw',
      'A sharp picture, just less varied',
      'The noise it started from, unchanged',
    ],
    correct: 0,
    why: [
      'Right: from pure noise its best single guess is an average, so it is blurred.',
      'Sharpness needs the later steps, when the guess has settled on one picture.',
      'One step still moves all the way to its guess; the guess is just blurry.',
    ],
  },
  // 3. A learned denoiser
  {
    id: 'what-it-learns',
    chapter: C.learned,
    question: 'A diffusion model is trained on photos of shoes. What has it learned?',
    options: [
      'How to guess the noise in a noisy picture, so it can step toward a shoe',
      'A compressed list of every training shoe',
      'A single average shoe to paste in',
    ],
    correct: 0,
    why: [
      'Right: it learns which way to move each pixel at each noise level.',
      'The photos tune the weights and stay behind; no list ships with the model.',
      'An average shoe would make every picture the same; it learns directions, not one picture.',
    ],
  },
  {
    id: 'training-loop',
    chapter: C.learned,
    question: 'Which describes one round of training a diffusion model?',
    options: [
      'Add noise to a training picture, ask the network for the noise, nudge its weights toward the right answer',
      'Ask the network for a picture and keep it if it looks good',
      'Store the training picture and its label',
    ],
    correct: 0,
    why: [
      'Right: the noise added is the answer, so every picture becomes a free exercise.',
      'Nothing grades finished pictures in this training; the target is the noise that was added.',
      'Storing pictures is a database, not training.',
    ],
  },
  {
    id: 'weights-not-points',
    chapter: C.learned,
    question: 'The toy network drew the hinge from noise. Where was the hinge kept?',
    options: [
      'Nowhere as points: its weights say which way to move a dot at each noise level',
      'In a list of outline points inside the network',
      'In the noise it started from',
    ],
    correct: 0,
    why: [
      'Right: the shape lives in how it moves dots, not in stored points.',
      'It keeps no list; that is what made it different from the ideal denoiser.',
      'The noise is random every time; the network supplies the shape.',
    ],
  },
  // 4. Copy or create
  {
    id: 'few-examples-copy',
    chapter: C.copy,
    question: 'A model is trained on twenty product photos and asked for a new one. What is the main risk?',
    options: [
      'It hands back one of the twenty almost exactly',
      'It can’t produce anything it hasn’t seen',
      'It produces only noise',
    ],
    correct: 0,
    why: [
      'Right: with so few examples, the best fit is a copy of one of them.',
      'Making new pictures is what models do when they generalise; copying is the worry.',
      'A trained model removes noise; the risk is the opposite, too faithful a picture.',
    ],
  },
  {
    id: 'ideal-copies',
    chapter: C.copy,
    question: 'Why does the ideal denoiser only ever return its training points?',
    options: [
      'Its guess is an average of the training points, and near the end one point outweighs the rest',
      'It was trained badly',
      'It is too small to draw anything else',
    ],
    correct: 0,
    why: [
      'Right: it is the best possible fit to exactly those points, so it ends on one of them.',
      'It isn’t trained at all; it is the exact best answer for its points.',
      'Size isn’t the issue: its formula can only average the points it has.',
    ],
  },
  {
    id: 'memorise-real',
    chapter: C.copy,
    question: 'Can a large, real image model hand back a near-copy of a training picture?',
    options: [
      'Yes: researchers have pulled training images back out of such models',
      'No: a network can’t hold pictures',
      'Only if someone asks for that exact picture by name',
    ],
    correct: 0,
    why: [
      'Right: Carlini and colleagues extracted over a thousand training examples from such models.',
      'Weights can hold near-copies of pictures that appear often enough in training.',
      'Extraction worked from ordinary prompts that generate many samples, not only exact names.',
    ],
  },
  // 5. Steer with a label
  {
    id: 'guidance-zero',
    chapter: C.label,
    question: 'A label asks for a teapot, but the guidance scale is 0. What do you get?',
    options: [
      'Whatever the model happens to draw: the label is ignored',
      'A teapot, always',
      'Nothing: 0 switches the model off',
    ],
    correct: 0,
    why: [
      'Right: at scale 0 only the unlabelled guess is used.',
      'At 0 the label carries no weight; scale 1 or more brings it in.',
      'The model still draws; it just isn’t steered.',
    ],
  },
  {
    id: 'guidance-cost',
    chapter: C.label,
    question: 'Why does classifier-free guidance above 1 cost twice as much per step?',
    options: [
      'Each step needs two predictions: one with the label and one without',
      'It takes twice as many steps',
      'It draws two pictures and keeps the better one',
    ],
    correct: 0,
    why: [
      'Right: the two guesses are mixed, so both must be computed every step.',
      'The step count stays the same; each step does more work.',
      'There is one picture; the two predictions are mixed into one step.',
    ],
  },
  {
    id: 'guidance-tradeoff',
    chapter: C.label,
    question: 'Raising the guidance scale makes pictures match their label better. What does it give up?',
    options: ['Variety: pictures grow more alike', 'Speed of training', 'The label itself'],
    correct: 0,
    why: [
      'Right: the paper describes it as trading sample diversity for quality.',
      'Guidance acts when drawing, not when training.',
      'It strengthens the label’s pull; it doesn’t lose it.',
    ],
  },
  // 6. Why it costs
  {
    id: 'size-cost',
    chapter: C.cost,
    question: 'A team moves from 512 × 512 pictures to 1024 × 1024. Roughly how much more work per step?',
    options: ['About four times', 'About twice', 'The same'],
    correct: 0,
    why: [
      'Right: twice the width and twice the height is four times the positions.',
      'Doubling one side doubles; doubling both quadruples.',
      'The denoiser reads every position each step, so more pixels cost more.',
    ],
  },
  {
    id: 'latent-why',
    chapter: C.cost,
    question: 'What does latent diffusion change?',
    options: [
      'The denoiser works on a small squeezed copy, then the result is expanded to full size once',
      'It skips the noise and draws directly',
      'It uses fewer, bigger steps on the full picture',
    ],
    correct: 0,
    why: [
      'Right: fewer positions per step, with one expansion at the end.',
      'It still starts from noise and denoises step by step, just on the small copy.',
      'Cutting steps is what few-step models do; latent diffusion cuts positions.',
    ],
  },
  {
    id: 'few-step',
    chapter: C.cost,
    question: 'How do few-step models, such as consistency models, save time?',
    options: [
      'They are trained to land a good picture in one or a few steps',
      'They draw smaller pictures',
      'They skip the denoiser and copy training pictures',
    ],
    correct: 0,
    why: [
      'Right: they cut the number of steps, often by learning from a diffusion model.',
      'Shrinking the picture is latent diffusion’s trick, a different lever.',
      'They still turn noise into a new picture; they just need fewer steps.',
    ],
  },
  // 7. Workbench
  {
    id: 'per-use',
    chapter: C.bench,
    question:
      'A shop makes tiny icons and large banners with one setting: the most steps and guidance. What should it do?',
    options: [
      'Test each use and keep the cheapest setting that passes it',
      'Keep it: everything passes',
      'Use the fewest steps everywhere',
    ],
    correct: 0,
    why: [
      'Right: icons and banners have different bars, so each gets its own measured setting.',
      'Passing at several times the cost isn’t the best plan.',
      'The banners need a clean picture, which the fewest steps won’t give.',
    ],
  },
  {
    id: 'tied-plans',
    chapter: C.bench,
    question: 'Two plans pass every picture. One costs 60 predictions, the other 120. Which wins?',
    options: ['The one at 60', 'The one at 120: more is safer', 'Either: they both pass'],
    correct: 0,
    why: [
      'Right: with every picture passing, cost decides.',
      'More work that no test can see is cost without a gain.',
      'They are not equal: one costs twice as much for the same result.',
    ],
  },
  {
    id: 'right-part-first',
    chapter: C.bench,
    question: 'A thumbnail is clean but shows the wrong part. What would fix it most cheaply?',
    options: ['More guidance toward the label', 'Many more steps', 'A bigger picture'],
    correct: 0,
    why: [
      'Right: the wrong part is a steering problem, and guidance steers.',
      'More steps clean a picture; they don’t change which part it settles on.',
      'Size changes detail and cost, not which part comes out.',
    ],
  },
];
