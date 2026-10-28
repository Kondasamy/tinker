// Chapter 2: guess the next frame. Along the pinned route, the toy model (two frames of context) guesses each frame
// from the real frames before it; the screen shows its guess beside the real floor. The reader predicts how many cells
// change a step, steps through, and opens the Frames tab: the changed cells are the real test.
import { useMemo } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { changed, guessWithConf } from '../../lib/video-models/rollout';
import { SIZE } from '../../lib/video-models/world';
import { Outcome } from '../tool-calling/kit';
import { DreamStage, META, ModelStatus, PIN, ROUTE, ToyNote, pct, useNets, type View } from './kit';

const MODULE = 'video-models',
  ID = '02-guess-the-next-frame';
export const PARTS = DREAM_PARTS;
const LAST = ROUTE.frames.length - 1;
/** The first frame shown: the pinned one-step guess. */
export const FIRST = PIN.oneStep.t + 1;

export interface S {
  p1: number | null;
  t: number;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `Of the floor’s ${SIZE * SIZE} cells, how many change from one frame to the next?`,
  options: [`${PIN.changes.max} or fewer`, 'About half of them', `All ${SIZE * SIZE}`],
};

export const QUIZ = {
  question: 'A model scores 99% of all cells right on a scene where little moves. Why is that weak evidence?',
  options: [
    'Copying the last frame already gets almost every cell right',
    '99% is too low for any video model',
    'Cells should never be scored one at a time',
  ],
  correct: 0,
  explanation: 'When few cells change, a model that copies the last frame scores high; the changed cells are the test.',
  why: [
    'Right: the still cells are free marks, so score the cells that changed.',
    'The number is not the problem; it counts cells a copy gets right anyway.',
    'Cells can be scored; the point is which cells say something about the model.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Left, the real floor. Right, on the projector screen, a world model’s guess of the same frame.',
    act: 'Predict first.',
    say: { block: 'dream', text: 'The guess' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'step',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Your pick is locked. Each frame, the model reads the real frames before it and guesses this one.',
    act: 'Step three frames on.',
    predicate: s => s.t >= FIRST + 3,
  },
  {
    id: 'frames',
    focus: 'stage',
    visibleControls: ['out1', 'next'],
    narration: `At most ${PIN.changes.max} cells change a step: the robot’s and the crate’s. Each is a changed cell.`,
    act: 'Open the Frames tab.',
    say: { block: 'robot', text: 'Changed' },
    predicate: s => s.view === 'frames',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `On held-out runs it got ${pct(META.models.k2.scores.changedAccuracy)} of changed cells right. A tomato ring marks a miss.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many cells would a plain copy of the last frame get right?',
  },
];

function Stage({ s, setView, say }: { s: S; setView: (v: View) => void; say?: { block: string; text: string } }) {
  const { nets, status, retry } = useNets();
  const real = ROUTE.frames[s.t],
    net = nets?.k2;
  const t = s.t;
  const pass = useMemo(
    () => (net ? guessWithConf(net, ROUTE.frames.slice(t - 2, t), ROUTE.actions[t - 1]) : null),
    [net, t],
  );
  const guess = pass?.guess ?? null;
  const moved = changed(ROUTE.frames[s.t - 1], real);
  const right = guess ? moved.filter(c => guess[c] === real[c]).length : 0;
  return (
    <DreamStage
      say={say}
      real={real}
      dream={guess}
      step={s.t}
      conf={pass?.conf ?? null}
      view={s.view}
      onView={setView}
      caption={
        guess
          ? `Frame ${s.t}: ${moved.length} cells changed; the guess got ${right} of them right.`
          : `Frame ${s.t}: ${moved.length} cells changed.`
      }
    >
      <ModelStatus status={status} retry={retry} />
    </DreamStage>
  );
}

export default function GuessTheNextFrame() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, t: FIRST, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <Stage s={state} say={say} setView={view => (focus === 'stage' ? apply : sync)({ ...state, view })} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        next: ({ state, apply, sync, focused }) => (
          <button
            type="button"
            className="big"
            disabled={state.t >= LAST}
            onClick={() => (focused ? apply : sync)({ ...state, t: state.t + 1 })}
          >
            {`Next frame (${state.t + 1} of ${LAST})`}
          </button>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <ToyNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
