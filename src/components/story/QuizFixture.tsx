// Test fixture for /dev/quiz/: predict, reveal, then a checkpoint with `why` lines and "I'm not sure" (tests/e2e/quiz.spec.ts).
import StepRunner from './StepRunner';
import type { Step } from './steps';
import Quiz from '../quiz/Quiz';
import Predict, { Reveal } from '../quiz/Predict';
import { UNSURE } from '../../lib/recall';

interface S { prediction: number | null; revealed: boolean; quiz: number | null }

const PREDICT = { question: 'Six 4K pages, an 8K window: how many pages reach the model?', options: ['All 6', '2', 'None'] };
const OUTCOME = 1;
const QUIZ = {
  question: 'What happens to the pages that do not fit?',
  options: ['The model reads them later', 'The model never sees them', 'They are summarised for free'],
  correct: 1,
  explanation: 'Anything outside the context window is invisible to the model. That gap is what retrieval fills.',
  why: [
    'A model reads one prompt at a time; it has no “later” for pages left out.',
    'Right: what is outside the window is invisible to the model.',
    'Nothing summarises for free: a summary is another call, and it drops detail.',
  ],
};

const STEPS: Step<S>[] = [
  { id: 'predict', focus: 'predict', visibleControls: ['predict'], narration: 'Before you look: make a prediction.', predicate: s => s.prediction !== null },
  { id: 'reveal', focus: 'reveal', visibleControls: ['predict', 'reveal'], narration: 'Now see what happens.', predicate: s => s.revealed },
  // the comparison stays beside the outcome (R9)
  { id: 'quiz', focus: 'quiz', visibleControls: ['reveal', 'quiz'], narration: 'One question before you move on.', predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE },
];

export default function QuizFixture() {
  return (
    <StepRunner<S>
      chapter="dev-quiz"
      steps={STEPS}
      initial={{ prediction: null, revealed: false, quiz: null }}
      stage={({ state }) => <figure><figcaption>{state.revealed ? `${PREDICT.options[OUTCOME]} of 6 pages fit in an 8K window` : 'Six pages wait for an 8K window'}</figcaption></figure>}
      controls={{
        predict: ({ state, apply }) => <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />,
        reveal: ({ state, apply }) => (
          <Reveal prediction={state.prediction === null ? null : PREDICT.options[state.prediction]} outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed} onReveal={() => apply({ ...state, revealed: true })} />
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
