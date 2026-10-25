// Chapter 1: noise to picture. The reader predicts how a diffusion model makes a picture, buries the hinge drawing in
// noise with the slider (forward noising, live), then develops a picture from pure noise with the ideal denoiser (live,
// computed once, played back a step per frame). Contrasts with Transformers' token-by-token writing.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { drawing } from '../../lib/diffusion/drawings';
import { trajectory } from '../../lib/diffusion/ideal';
import { noised } from '../../lib/diffusion/schedule';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import { Outcome } from '../tool-calling/kit';
import {
  DiffusionStage,
  Fact,
  NoiseRange,
  ToyNote,
  noiseWords,
  pictureFrames,
  printName,
  printWords,
  usePlayback,
} from './kit';

const MODULE = 'diffusion',
  ID = '01-noise-to-picture';
export const PARTS = DARKROOM_PARTS;
/** The develop run: 50 steps from the noise of this seed (pinned in data/diffusion/pinned.json: it ends on a hinge). */
export const STEPS_1 = 50,
  SEED = 4;
const HINGE = drawing('hinge-square').pixels,
  T = trajectory(STEPS_1, SEED),
  FRAMES = pictureFrames(T);

interface S {
  p1: number | null;
  noise: number;
  developed: boolean;
  quiz: number | null;
}

const P1 = {
  question: 'A transformer writes a reply one token at a time. How does a diffusion model make a picture?',
  options: [
    'Pixel by pixel, left to right, top to bottom',
    'All at once: start from noise and clean every pixel a little, step after step',
    'It finds the closest picture it was trained on and copies it',
  ],
};

export const QUIZ = {
  question:
    'A diffusion model is halfway through making a picture of a chair. What does the half-made picture look like?',
  options: [
    'The whole chair, blurry and speckled',
    'The top half of the chair, the bottom half blank',
    'A finished picture of something else',
  ],
  correct: 0,
  explanation: 'Every step changes every pixel, so halfway the whole picture is there, still noisy.',
  why: [
    'Right: every pixel is cleaned a little each step, so the whole picture sharpens together.',
    'That is how text is written, a token at a time; a diffusion model works on every pixel at every step.',
    'The picture only settles at the end; halfway it is the chair, still noisy.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The darkroom: a clean hinge drawing lies in the tray. A diffusion model makes pictures, but not the way a transformer writes text.',
    act: 'Predict first.',
    say: { block: 'tray', text: 'A clean drawing' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'noise',
    focus: 'noise',
    visibleControls: ['p1', 'noise'],
    narration: 'Forward noising mixes the drawing with random noise. Each notch keeps less of the hinge.',
    act: 'Drag the noise all the way up.',
    say: { block: 'tray', text: 'Into the noise' },
    predicate: s => s.noise === 1,
    hint: 'Drag the Noise slider to the right end.',
  },
  {
    id: 'develop',
    focus: 'develop',
    visibleControls: ['develop'],
    narration: `Nothing of the hinge is left. Now run it backwards: the denoiser cleans every pixel a little, ${STEPS_1} times.`,
    act: 'Develop a picture from the noise.',
    say: { block: 'dial', text: `${STEPS_1} steps` },
    predicate: s => s.developed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reveal', 'quiz'],
    narration: 'A picture came out of pure noise, sharpening all over at once. The Strip tab shows it step by step.',
    act: 'One question to finish.',
    say: { block: 'tray', text: 'Out of noise' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Think of the strip: what did the tray hold halfway along?',
  },
];

function Stage({ state, say }: { state: S; say?: Step<S>['say'] }) {
  const at = usePlayback(T.length, state.developed);
  const px = state.developed ? T[at] : noised(HINGE, state.noise, SEED + 100);
  return (
    <DiffusionStage
      say={say}
      shown={{
        print: { kind: 'pixels', px, name: state.developed ? printName(px) : state.noise === 0 ? 'HINGE' : 'NOISE' },
        steps: STEPS_1,
        done: state.developed ? at : undefined,
        frames: state.developed ? FRAMES : undefined,
        stripLabel: `A picture developed from pure noise in ${STEPS_1} steps`,
        caption: state.developed
          ? at < T.length - 1
            ? `Developing: step ${at} of ${STEPS_1}.`
            : `Developed in ${STEPS_1} steps: ${printWords(px)}.`
          : state.noise === 0
            ? 'The hinge drawing, clean.'
            : `The hinge drawing, noised ${noiseWords(state.noise)}.`,
      }}
    />
  );
}

export default function NoiseToPicture() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, noise: 0, developed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage state={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        noise: ({ state, sync }) => <NoiseRange value={state.noise} onChange={noise => sync({ ...state, noise })} />,
        develop: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, developed: true })}>
            Develop: {STEPS_1} steps
          </button>
        ),
        reveal: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <p className="note">
              Compare <a href="/transformers/">Transformers</a>: a reply is written one token at a time, left to right.
              Here every pixel changes at every step, and <a href="/diffusion-llms/">diffusion language models</a> write
              text the same way.
            </p>
            <Fact id="score-sde" />
            <ToyNote />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
    />
  );
}
