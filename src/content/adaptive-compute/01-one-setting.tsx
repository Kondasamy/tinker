// Chapter 1: one setting for all (R6h.1). Every valve is open wide, so each question gets every mill at once. The
// reader predicts how the day ends, runs it, and the tower runs dry a few questions in; the stage closes in on it. Then
// every valve shuts: the whole day is answered for almost nothing, and most of it wrong. The reveal cites how reasoning
// effort is billed. Outcomes and costs are hand-set (ToyNote).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MILL_PARTS } from '../../components/scenes/millScene';
import { fact } from '../../lib/adaptive-compute/facts';
import { BUDGET, MAX, PLAIN, REQUESTS, type Rules, runDay } from '../../lib/adaptive-compute/effort';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EffortStage, Fact, ToyNote, yardOf } from './kit';

const MODULE = 'adaptive-compute',
  ID = '01-one-setting';
const N = REQUESTS.length,
  FULL = runDay(MAX),
  NONE = runDay(PLAIN);

interface S {
  rules: Rules;
  ran: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Every question gets every mill. How does the day end?',
  options: [
    `The tower runs dry after ${FULL.answered} questions`,
    `All ${N} right, with water to spare`,
    `All ${N} answered, a few of them wrong`,
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A help desk sends every ticket to its most senior engineer. What goes wrong first?',
  options: [
    'The seniors’ hours run out on easy tickets, and hard ones wait',
    'Nothing: every ticket gets the best possible answer',
    'Easy tickets get worse answers from the seniors',
  ],
  correct: 0,
  explanation: fact('effort-billed').claim,
  why: [
    'Right: the most effort on everything spends the budget on questions that never needed it.',
    'The best answer for each ticket still costs the most, and the hours run out.',
    'The seniors answer easy tickets fine; the cost is the problem, not the quality.',
  ],
};

export const PARTS = MILL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Every valve is turned to every mill: maximum effort on each question, whatever it asks.',
    act: 'Predict how the day ends.',
    say: { block: 'manifold', text: 'Every mill' },
    status: 'Every valve feeds every mill; the tower is full and no question has run yet.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict'],
    narration: 'Each question takes thinking, a look-up, a check and the big model before it is answered.',
    act: 'Press Run the day.',
    say: { block: 'tower', text: 'Draining fast' },
    status: `The tower ran dry after ${FULL.answered} questions; ${N - FULL.answered} got no answer at all.`,
    predicate: s => s.ran,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the tower.',
    act: 'Check your prediction.',
    closeUp: ['tower'],
    status: `Maximum effort spent ${FULL.spent} of ${BUDGET} on just ${FULL.answered} questions.`,
    predicate: s => s.revealed,
  },
  {
    id: 'shut',
    focus: 'shut',
    visibleControls: ['fact'],
    narration: 'Now the other end: no extra effort, every question straight to the assistant.',
    act: 'Press Shut every valve.',
    say: { block: 'model', text: 'Mostly wrong' },
    status: `All ${N} answered for ${NONE.spent}, but only ${NONE.right} right: the everyday ones.`,
    predicate: s => s.rules.puzzle === 'straight' && s.ran,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration:
      'Most effort everywhere runs out; none at all gets most questions wrong. Neither setting fits every question.',
    act: 'One question to finish.',
    status: `${NONE.right} of ${N} right with every valve shut, and the tower nearly full.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does the budget go when every ticket gets the most?',
  },
];

export default function OneSetting() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: MAX, ran: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp, focus }) => {
        const shut = state.rules.puzzle === 'straight';
        return (
          <EffortStage
            yard={yardOf(state.rules, {
              idle: !state.ran,
              lit: shut ? { model: true } : state.ran ? { tower: true } : {},
            })}
            say={say}
            closeUp={closeUp}
          >
            {focus === 'run' && (
              <button type="button" className="big" onClick={() => apply({ ...state, ran: true })}>
                Run the day
              </button>
            )}
            {focus === 'shut' && (
              <button type="button" className="big" onClick={() => apply({ ...state, rules: PLAIN, ran: true })}>
                Shut every valve
              </button>
            )}
          </EffortStage>
        );
      }}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See the tower"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="effort-billed" />
              <ToyNote />
            </>
          ) : null,
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
