// Chapter 5: break it on purpose (R6g.5). Fault injection on the fixed run (piece 3 swapped): the reader rolls and the
// marble lands right; predicts what a timeout at piece 5 (the stock tool) does; times it out (tap piece 5, or the
// twin) and the marble stops against a red gate: nothing sent, nobody told. The stage closes in on the gate. Adding a
// retry puts a mint wheel at piece 5: the marble pauses there and lands right. The reveal cites the Principles of
// Chaos Engineering and Netflix's Chaos Monkey.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MARBLE_PARTS } from '../../components/scenes/marbleScene';
import { fact } from '../../lib/causal-evals/facts';
import { BLADE, causeOf, replay, type Change } from '../../lib/causal-evals/runs';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, logOf, MarbleStage, marbleOf, StepsList } from './kit';

const MODULE = 'causal-evals',
  ID = '05-break-it-on-purpose';
const RUN = BLADE;
const CAUSE = causeOf(RUN);
const FIX: Change = { kind: 'swap', step: CAUSE };
const STOCK = RUN.steps.findIndex(s => s.id === 'stock');

interface S {
  roll: number;
  fault: boolean;
  retry: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}
const changes = (s: Pick<S, 'fault' | 'retry'>): Change[] => [
  FIX,
  ...(s.fault ? [{ kind: 'timeout' as const, step: STOCK, retry: s.retry }] : []),
];
/** what the fixed run does with a timeout at piece 5, without and with a retry (pinned in the unit test) */
export const COPES = {
  fixed: replay(RUN, changes({ fault: false, retry: false })).outcome,
  timeout: replay(RUN, changes({ fault: true, retry: false })).outcome,
  retry: replay(RUN, changes({ fault: true, retry: true })).outcome,
};

export const PREDICT = {
  question: `The stock tool times out at piece ${STOCK + 1}. What does the run do?`,
  options: [
    'Stops there: nothing sent, Dana not told',
    'Skips the stock check and sends the blade',
    'Asks the stock tool again',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'Each week your team makes the payment service fail on purpose in a test copy of the shop. What is that for?',
  options: [
    'To see how the shop copes before a real failure shows you',
    'To find the cause of last week’s wrong order',
    'To check the payment service is fast enough',
  ],
  correct: 0,
  explanation: fact('chaos-definition').claim,
  why: [
    'Right: breaking a part on purpose shows how the whole copes, while it is safe to look.',
    'Finding a past failure’s cause is a replay with one change, not breaking parts.',
    'Speed is a load test; this breaks the service outright to watch what happens.',
  ],
};

export const PARTS = MARBLE_PARTS;

export const sceneOf = (s: S) => marbleOf(RUN, changes(s), s.roll, { lit: s.roll && !s.fault ? STOCK : null });
const logOfState = (s: S) => [
  ...(s.roll ? [logOf(RUN, FIX)] : []),
  ...(s.fault ? [logOf(RUN, changes({ fault: true, retry: false }))] : []),
  ...(s.retry ? [logOf(RUN, changes(s))] : []),
];

export const STEPS: Step<S>[] = [
  {
    id: 'roll',
    focus: 'roll',
    visibleControls: ['steps'],
    narration: `Piece ${CAUSE + 1} is fixed. Fault injection breaks one part on purpose, to see how the run copes.`,
    act: 'Tap the start cup, or press Roll.',
    say: { block: `p${CAUSE + 1}`, text: 'Fixed' },
    status: `Piece ${CAUSE + 1} is blush and the marble landed in the right tray.`,
    predicate: s => s.roll > 0,
    hint: 'Press Roll under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['steps', 'predict'],
    narration: `Piece ${STOCK + 1} asks the stock tool. Suppose that call hits a timeout.`,
    act: 'Predict what the run does.',
    say: { block: `p${STOCK + 1}`, text: 'Stock tool' },
    status: `The marble rests in the right tray; piece ${STOCK + 1} is ringed.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'fault',
    focus: 'fault',
    visibleControls: ['steps', 'predict'],
    narration: 'Pick locked.',
    act: `Tap piece ${STOCK + 1}, or press Time out and roll.`,
    status: `A red gate closed piece ${STOCK + 1}, and the marble stopped against it.`,
    predicate: s => s.fault,
    hint: 'Press Time out and roll under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'The run had no plan for a timeout: it stopped, sent nothing, and told Dana nothing.',
    act: 'Check your prediction.',
    closeUp: [`p${STOCK + 1}`, 'model'],
    status: `Close in on piece ${STOCK + 1}: the marble waits at the red gate.`,
    predicate: s => s.revealed,
  },
  {
    id: 'retry',
    focus: 'retry',
    visibleControls: ['fact', 'retry'],
    narration: 'A retry asks the stock tool again after a timeout.',
    act: 'Press Add a retry and roll.',
    status: `A mint wheel sits at piece ${STOCK + 1}; the marble paused there, then landed right.`,
    predicate: s => s.retry,
    hint: 'Press Add a retry and roll in the step card.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Break a part on purpose while it is safe to look, before a real failure breaks it for you.',
    act: 'One question to finish.',
    status: `The mint wheel stays at piece ${STOCK + 1}; the marble rests in the right tray.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Was anything broken before the test began?',
  },
];

export default function BreakItOnPurpose() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ roll: 0, fault: false, retry: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MarbleStage
          run={RUN}
          scene={sceneOf(state)}
          log={logOfState(state)}
          twin={{
            pieces: [STOCK],
            buttons: [
              {
                label: 'Time out and roll',
                act: () => {
                  if (!state.roll) return 'Roll the fixed run first, so you can compare.';
                  if (state.prediction === null) return 'Predict what the run does first.';
                  if (state.fault) return `Piece ${STOCK + 1} already times out.`;
                  apply({ ...state, fault: true, roll: state.roll + 1 });
                  return undefined;
                },
              },
            ],
            roll: {
              label: 'Roll',
              act: () => {
                if (state.roll) return 'The fixed run already rolled into the right tray.';
                apply({ ...state, roll: 1 });
                return undefined;
              },
            },
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        steps: ({ state }) => <StepsList run={RUN} change={changes(state)} />,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See how it coped"
          />
        ),
        retry: ({ state, apply }) => (
          <button
            type="button"
            className="big"
            disabled={state.retry}
            onClick={() => apply({ ...state, retry: true, roll: state.roll + 1 })}
          >
            Add a retry and roll
          </button>
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="chaos-events" />
              <Fact id="chaos-monkey" />
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
