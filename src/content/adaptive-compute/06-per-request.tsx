// Chapter 6: deciding per request (R6h.6). For one day the tower holds enough for maximum effort on every question, and
// it drains to the last drop. The reader predicts the bill when a sorter sends each question only where it needs, sorts
// the day, and the tower barely drops for the same answers; the stage closes in on it. The reveal cites RouteLLM and
// Snell et al.'s per-question strategy. The toy sorter is free and never misreads (ToyNote).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MILL_PARTS } from '../../components/scenes/millScene';
import { MAX, REQUESTS, ROUTED, type Rules, runDay } from '../../lib/adaptive-compute/effort';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EffortStage, Fact, ToyNote, yardOf } from './kit';

const MODULE = 'adaptive-compute',
  ID = '06-per-request';
const N = REQUESTS.length,
  FULL = runDay(MAX, Infinity),
  /** today's tower: just enough for maximum effort on every question */
  TANK = FULL.spent,
  SORTED = runDay(ROUTED, TANK);

interface S {
  rules: Rules;
  ran: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Each question now goes only where it needs. Same answers: what bill?',
  options: [
    `About ${Math.round((100 * SORTED.spent) / TANK)}% of it`,
    'About the same',
    'More: the sorter adds its own cost',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A team runs every chat on its priciest model “to be safe”. What should it try?',
  options: [
    'A cheap first pass that sends only the hard chats to the pricey model',
    'A cheaper model for every chat, to cut the bill',
    'Nothing: the priciest model is always the safest choice',
  ],
  correct: 0,
  explanation: 'Routing keeps the strong model where it changes the answer, and saves its price everywhere else.',
  why: [
    'Right: most chats don’t need it, and the hard ones still get it.',
    'That cuts the bill and gets the hard chats wrong.',
    'Safe, but it pays the top price on chats a cheap model answers just as well.',
  ],
};

export const PARTS = MILL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'max',
    focus: 'run',
    visibleControls: [],
    narration: 'For one day the tower holds just enough for maximum effort on every question.',
    act: 'Press Run the day.',
    say: { block: 'tower', text: 'Brim full' },
    status: `Maximum effort: all ${N} right, and the tower drained to the last drop.`,
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Routing: a cheap sorter reads each question first and opens only the valve it needs.',
    act: 'Predict the new bill.',
    say: { block: 'sorter', text: 'Reads each one' },
    status: `${FULL.right} of ${N} right for ${FULL.spent} spent; every hose runs to every mill.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'route',
    focus: 'route',
    visibleControls: ['predict'],
    narration: 'Let the sorter turn each valve to the one mill its questions need.',
    act: 'Press Sort each question.',
    say: { block: 'manifold', text: 'One mill each' },
    status: `Sorted: still ${SORTED.right} of ${N} right, and only ${SORTED.spent} of ${TANK} spent.`,
    predicate: s => s.rules.puzzle === ROUTED.puzzle,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the tower.',
    act: 'Check your prediction.',
    closeUp: ['tower'],
    status: `The tower is still ${Math.round((1 - SORTED.spent / TANK) * 100)}% full, for the same ${SORTED.right} right answers.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'No setting suits every question. Send effort only where it changes the answer.',
    act: 'One question to finish.',
    status: `Each valve feeds one mill, or none; ${SORTED.spent} of ${TANK} spent.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which chats actually need the pricey model?',
  },
];

export default function PerRequest() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: MAX, ran: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp, focus }) => {
        const sorted = state.rules.puzzle === ROUTED.puzzle;
        return (
          <EffortStage
            yard={yardOf(state.rules, {
              budget: TANK,
              idle: !state.ran,
              lit: sorted ? { sorter: true, tower: true } : state.ran ? { tower: true } : {},
            })}
            say={say}
            closeUp={closeUp}
          >
            {focus === 'run' && (
              <button type="button" className="big" onClick={() => apply({ ...state, ran: true })}>
                Run the day
              </button>
            )}
            {focus === 'route' && (
              <button type="button" className="big" onClick={() => apply({ ...state, rules: ROUTED })}>
                Sort each question
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
              <Fact id="routellm-2x" />
              <Fact id="per-prompt-4x" />
              <ToyNote>
                The toy sorter costs nothing and never misreads a question; a real one costs a little and can.
              </ToyNote>
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
