// Chapter 3: one frame is not enough. Two frames after the crate turned at the belt's end, the one-frame model (k1)
// and the two-frame model (k2) guess its next cell. The reader predicts what one frame can tell, shows k1's guess, then
// k2's; held-out scores and the cost of the extra frame close it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { confidence, crateCells, oneStep } from '../../lib/video-models/rollout';
import { Outcome } from '../tool-calling/kit';
import { DreamStage, META, ModelStatus, PIN, ROUTE, pct, useNets } from './kit';

const MODULE = 'video-models',
  ID = '03-one-frame-is-not-enough';
export const PARTS = DREAM_PARTS;
const T = PIN.bounce.t,
  REAL = PIN.bounce.real + 1,
  /** where each model put the crate, counted from 1 (one cell each, pinned) */
  K1 = PIN.bounce.k1[0] + 1,
  K2 = PIN.bounce.k2[0] + 1;
const NOW = crateCells(ROUTE.frames[T])[0] + 1;

export interface S {
  p1: number | null;
  k: 0 | 1 | 2;
  quiz: number | null;
}

export const P1 = {
  question: 'The crate turned at the belt’s end two frames ago. Reading one frame, where does the model put it next?',
  options: ['Where it really goes', 'Back toward the end it left', 'Nowhere: it drops the crate'],
};
/** What k1 did, as P1's option (pinned). */
export const OUTCOME = PIN.bounce.k1.length !== 1 ? 2 : K1 === REAL ? 0 : 1;

export const QUIZ = {
  question: 'A model guesses a tennis rally’s next frame from one still photo. What can it not know?',
  options: ['Which way the ball is flying', 'Where the ball is now', 'Where the players stand'],
  correct: 0,
  explanation: 'A still shows where things are; which way they move needs at least two frames.',
  why: [
    'Right: a ball heading out and one heading back look the same in one still.',
    'The photo shows the ball’s place; that part one frame can tell.',
    'Positions are in the photo; motion is what is missing.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The crate bounced off the belt’s end and now heads back. A cheaper model reads only the latest frame.',
    act: 'Predict first.',
    say: { block: 'crate', text: 'Which way?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'one',
    focus: 'one',
    visibleControls: ['one'],
    narration: 'Your pick is locked. Context is what a model reads before it guesses: here, one frame.',
    act: 'Show the one-frame guess.',
    predicate: s => s.k === 1,
  },
  {
    id: 'two',
    focus: 'two',
    visibleControls: ['out1', 'two'],
    narration: `One frame put the crate at cell ${K1}; it really went to ${REAL}. A still frame hides direction.`,
    act: 'Give it two frames.',
    say: { block: 'dream', text: 'One frame' },
    predicate: s => s.k === 2,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['scores', 'quiz'],
    narration: `Two frames put it at ${K2}. On held-out runs: ${pct(META.models.k1.scores.crateNext)} right from one frame, ${pct(META.models.k2.scores.crateNext)} from two.`,
    act: 'One question to finish.',
    say: { block: 'dream', text: 'Two frames' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can one still photo show which way something moves?',
  },
];

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const { nets, status, retry } = useNets();
  const net = nets && s.k ? nets[s.k === 1 ? 'k1' : 'k2'] : null;
  const guess = net ? oneStep(net, ROUTE, T) : null;
  const at = guess ? crateCells(guess) : [];
  return (
    <DreamStage
      say={say}
      real={ROUTE.frames[T + 1]}
      dream={guess}
      step={T + 1}
      conf={net ? confidence(net, ROUTE.frames.slice(T + 1 - net.k, T + 1), ROUTE.actions[T]) : null}
      caption={
        guess
          ? `${s.k === 1 ? 'One frame' : 'Two frames'}: the guess puts the crate at cell ${at.map(x => x + 1).join(' and ') || 'none'}; the real one is at ${REAL}.`
          : `The crate was at cell ${NOW} and moves on to ${REAL}.`
      }
    >
      <ModelStatus status={status} retry={retry} />
    </DreamStage>
  );
}

export default function OneFrameIsNotEnough() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, k: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        one: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, k: 1 })}>
            One frame of context
          </button>
        ),
        two: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, k: 2 })}>
            Two frames of context
          </button>
        ),
        scores: () => (
          <p className="note">
            {`A pass with two frames costs ${PIN.units.k2} million multiplies; with one, ${PIN.units.k1} million. The second frame is cheap.`}
          </p>
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
