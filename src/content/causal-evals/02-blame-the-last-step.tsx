// Chapter 2: blame the last step (R6g.2). Piece 8 sent the wrong blade, so the obvious fix is to change it. The reader
// predicts, swaps piece 8 for its other version (express post) by tapping it or with the twin, and the marble drops
// into the wrong tray again; the stage closes in on piece 8. Where a failure shows is not where it began. The reveal
// cites Who&When: even the best method named the failing step only 14.2% of the time.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MARBLE_PARTS } from '../../components/scenes/marbleScene';
import { fact } from '../../lib/causal-evals/facts';
import { BLADE, replay, type Change } from '../../lib/causal-evals/runs';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, logOf, MarbleStage, marbleOf, StepsList } from './kit';

const MODULE = 'causal-evals',
  ID = '02-blame-the-last-step';
const RUN = BLADE;
const SEND = RUN.steps.length - 1;
const AS = replay(RUN);
const SWAP: Change = { kind: 'swap', step: SEND };
/** the outcome with the last piece swapped: still the wrong blade (pinned in tests/unit/causal-evals.test.ts) */
export const AFTER = replay(RUN, SWAP).outcome;

interface S {
  swapped: boolean;
  roll: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Swap piece ${SEND + 1} for its other version. Where does the marble land?`,
  options: ['Still in the wrong tray', 'In the right tray', 'In the gutter: nothing sent'],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A report bot emails last month’s figures instead of this month’s. A teammate rewrites the “send email” step. What happens next month?',
  options: [
    'Probably the same mistake: the step that fetched the figures is untouched',
    'Fixed: the email step was the one that sent the wrong figures',
    'Nothing sends at all, since the email step changed',
  ],
  correct: 0,
  explanation: fact('step-accuracy').claim,
  why: [
    'Right: the email step only sent what an earlier step fetched, so the cause is still there.',
    'The email step is where the failure showed; changing it leaves the wrong figures in place.',
    'A rewritten step still runs; the question is what it is handed.',
  ],
};

export const PARTS = MARBLE_PARTS;

export const sceneOf = (s: S) => marbleOf(RUN, s.swapped ? SWAP : null, s.roll, { lit: SEND });
export const logOfState = (s: S) => [logOf(RUN, null), ...(s.swapped ? [logOf(RUN, SWAP)] : [])];

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['steps', 'predict'],
    narration: `Piece ${SEND + 1} sent the wrong blade, so the quick fix is to change piece ${SEND + 1}.`,
    act: `Predict where the marble lands with piece ${SEND + 1} swapped.`,
    say: { block: `p${SEND + 1}`, text: 'Blamed' },
    status: `Piece ${SEND + 1} is ringed: the step that sent ${AS.slots[SEND]}.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'swap',
    focus: 'swap',
    visibleControls: ['steps', 'predict'],
    narration: `Pick locked. A swap gives piece ${SEND + 1} its other version: ${RUN.steps[SEND].swap.toLowerCase()}`,
    act: `Tap piece ${SEND + 1}, or press Swap and replay.`,
    status: `Piece ${SEND + 1} is blush now, and the marble dropped into the wrong tray again.`,
    predicate: s => s.swapped && s.roll > 1,
    hint: 'Press Swap and replay under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Same blade, sent faster. Failure attribution asks which step caused the failure, not where it showed.',
    act: 'Check your prediction.',
    closeUp: [`p${SEND + 1}`, 'wrong'],
    status: `Close in on blush piece ${SEND + 1} and the wrong tray.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'The last step is where a failure shows, and often the least likely place it began.',
    act: 'One question to finish.',
    status: 'The marble rests in the wrong tray beside blush piece 8.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which step decided which figures went out?',
  },
];

export default function BlameTheLastStep() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ swapped: false, roll: 1, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MarbleStage
          run={RUN}
          scene={sceneOf(state)}
          log={logOfState(state)}
          twin={{
            pieces: [SEND],
            buttons: [
              {
                label: 'Swap and replay',
                act: () => {
                  if (state.swapped) return `Piece ${SEND + 1} is already swapped: the marble still landed wrong.`;
                  apply({ ...state, swapped: true, roll: state.roll + 1 });
                  return undefined;
                },
              },
            ],
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        steps: ({ state }) => <StepsList run={RUN} change={state.swapped ? SWAP : null} lit={SEND} />,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See why it didn’t help"
          />
        ),
        fact: ({ state }) => (state.revealed ? <Fact id="step-accuracy" /> : null),
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
