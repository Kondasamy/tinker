// Chapter 6: the big ones. Large world and video models fight the same drift: the reader predicts how many past frames
// GameNGen reads, then reads how it and Movie Gen keep frames agreeing (denoising, linked to Diffusion), and sets the
// published sizes beside Larkspur's toy. Every figure is a dated fact from facts.json, never the toy's.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { fact } from '../../lib/video-models/facts';
import { SIZE } from '../../lib/video-models/world';
import { Outcome } from '../tool-calling/kit';
import { DREAMED, DreamStage, Fact, META, PIN, ROUTE, n } from './kit';

const MODULE = 'video-models',
  ID = '06-the-big-ones';
export const PARTS = DREAM_PARTS;
const CONTEXT = Number(fact('gamengen-context').value),
  GENIE = fact('genie').value,
  TOY = META.models.k2.params,
  K1 = META.models.k1.k,
  K2 = META.models.k2.k;
const LOST = PIN.kept + 2;

export interface S {
  p1: number | null;
  read: boolean;
  sizes: boolean;
  quiz: number | null;
}

export const P1 = {
  question: 'GameNGen runs the game DOOM inside a model. How many past frames does it read before each guess?',
  options: [`${K1}, like the cheap toy`, `${K2}, like Larkspur’s toy`, `${CONTEXT}, a little over 3 seconds`],
};

export const QUIZ = {
  question: 'A video model makes a whole clip at once instead of frame by frame. What does that buy?',
  options: [
    'Every frame can agree with every other from the start',
    'It needs no training video',
    'It runs faster than real time on any laptop',
  ],
  correct: 0,
  explanation: 'Made together, no frame rests on an earlier frame’s mistakes, so the clip can agree with itself.',
  why: [
    'Right: no frame waits on another’s guess, so errors have no chain to ride.',
    'It still learns from a great deal of video; making clips at once changes how it draws, not what it needs.',
    'Making the clip at once is about frames agreeing; it says nothing about speed.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Large world models fight the same drift. GameNGen, a model that plays DOOM, is one.',
    act: 'Predict first.',
    say: { block: 'dream', text: 'Drift' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'read',
    focus: 'read',
    visibleControls: ['out1', 'context', 'read'],
    narration: `${CONTEXT} frames, with noise added to them in training so it learns to fix its own slips.`,
    act: 'Read how it draws each frame.',
    predicate: s => s.read,
  },
  {
    id: 'clip',
    focus: 'sizes',
    visibleControls: ['draw', 'sizes'],
    narration:
      'Each frame comes from denoising, as in Diffusion. A video model may instead make a whole clip together.',
    act: 'Compare the sizes.',
    predicate: s => s.sizes,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['table', 'quiz'],
    narration: `Larkspur’s toy holds ${n(TOY)} weights. Genie, a world model you can play, holds ${GENIE} billion.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'If no frame is built on another’s guess, what can’t pile up?',
  },
];

export default function TheBigOnes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, read: false, sizes: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ say }) => (
        <DreamStage
          say={say}
          real={ROUTE.frames[LOST]}
          dream={DREAMED[LOST]}
          step={LOST}
          caption={`Larkspur’s toy reads ${K2} frames and drifts by step ${LOST}; GameNGen reads ${CONTEXT}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={2} />,
        context: () => <Fact id="gamengen-context" />,
        read: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, read: true })}>
            How each frame is drawn
          </button>
        ),
        draw: () => (
          <>
            <Fact id="gamengen" />
            <p className="note">
              <a href="/diffusion/">Denoising, step by step, is the Diffusion module.</a>
            </p>
            <Fact id="sora" />
          </>
        ),
        sizes: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, sizes: true })}>
            Show the sizes
          </button>
        ),
        table: () => (
          <>
            <Fact id="genie" />
            <Fact id="movie-gen" />
            <p className="note">{`Larkspur’s toy: ${n(TOY)} weights, a ${SIZE} × ${SIZE} floor, ${K2} frames of context.`}</p>
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
