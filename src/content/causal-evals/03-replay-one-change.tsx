// Chapter 3: replay with one change (R6g.3). Piece 8 is back as it was. The reader swaps piece 7 (the note) and the
// marble lands wrong; predicts which swap sends the right blade; then swaps pieces one at a time (tap a piece, or the
// twin) until the marble lands right: only piece 3 (the search) flips it, its blue stripes running on to piece 8. The
// stage closes in on piece 3 and the right tray; the reveal cites Who&When's definition of the decisive error.
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
  ID = '03-replay-one-change';
const RUN = BLADE;
const NOTE = RUN.steps.findIndex(s => s.id === 'note');
/** the cause, worked out by replaying every swap (pinned in tests/unit/causal-evals.test.ts) */
export const CAUSE = causeOf(RUN);
const swap = (i: number | null): Change => (i === null ? null : { kind: 'swap', step: i });

interface S {
  /** the piece swapped now, if any */
  swapped: number | null;
  /** every piece swapped and replayed so far, in order */
  tried: number[];
  roll: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Which single swap sends Dana the right blade?',
  options: [
    `Piece ${CAUSE + 1}: ${RUN.steps[CAUSE].swap}`,
    `Piece 4: ${RUN.steps[3].swap}`,
    `Piece 1: ${RUN.steps[0].swap}`,
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A bot refunds the wrong customer. Swapping its “find account” output for the right account fixes the refund; swapping its “write reply” output doesn’t. What is the cause?',
  options: [
    '“Find account”: changing it alone flips the outcome',
    '“Write reply”: it is the last thing the customer sees',
    'Neither: you can only know by reading the code',
  ],
  correct: 0,
  explanation: fact('decisive-error').claim,
  why: [
    'Right: the step whose change flips failure into success is the cause.',
    'The reply is where the mistake shows, but changing it left the refund wrong.',
    'A replay with one change answers it from the run itself, without reading any code.',
  ],
};

export const PARTS = MARBLE_PARTS;

export const sceneOf = (s: S) => marbleOf(RUN, swap(s.swapped), s.roll, { lit: s.swapped });
const landed = (s: S) => s.roll > 0 && replay(RUN, swap(s.swapped)).outcome;

export const STEPS: Step<S>[] = [
  {
    id: 'note',
    focus: 'swap',
    visibleControls: ['steps'],
    narration: `A replay reruns it: one change, same dice. Try piece ${NOTE + 1}, the note.`,
    act: `Tap piece ${NOTE + 1}, or pick it and press Swap and replay.`,
    status: `Piece ${NOTE + 1} is blush; the marble still dropped into the wrong tray.`,
    predicate: s => s.swapped === NOTE && s.roll > 0,
    hint: `Choose piece ${NOTE + 1} in the box under the picture, then press Swap and replay.`,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['steps', 'predict'],
    narration: 'A new note changed nothing that later pieces read.',
    act: 'Predict which swap sends the right blade.',
    say: { block: 'wrong', text: 'Still wrong' },
    status: `Piece ${NOTE + 1} is blush; the marble waits in the wrong tray.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'search',
    focus: 'swap',
    visibleControls: ['steps', 'predict'],
    narration: 'Pick locked. Try your pick, or any piece: each swap is one replay.',
    act: 'Swap pieces until the marble lands right.',
    status: `Piece ${CAUSE + 1} is blush, blue stripes run on to piece 8, and the marble landed right.`,
    predicate: s => landed(s) === 'right',
    hint: `Piece ${CAUSE + 1} searched without the model number.`,
    solution: s => ({ ...s, swapped: CAUSE, tried: [...s.tried, CAUSE], roll: s.roll + 1 }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Only piece ${CAUSE + 1}’s swap flipped the outcome, so it is the cause, ${RUN.steps.length - 1 - CAUSE} pieces before the failure showed.`,
    act: 'Check your prediction.',
    closeUp: [`p${CAUSE + 1}`, 'right'],
    status: `Close in on blush piece ${CAUSE + 1} and the right tray.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Change one thing, keep the rest: the change that flips the outcome is the cause.',
    act: 'One question to finish.',
    status: `The marble rests in the right tray below blush piece ${CAUSE + 1}.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which swap changed where the refund went?',
  },
];

export default function ReplayOneChange() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ swapped: null, tried: [], roll: 0, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MarbleStage
          run={RUN}
          scene={sceneOf(state)}
          log={state.tried.map(i => logOf(RUN, swap(i)))}
          twin={{
            taps: [NOTE, CAUSE],
            buttons: [
              {
                label: 'Swap and replay',
                act: i => {
                  if (state.swapped === i && state.roll) return `Piece ${i + 1} is already swapped and replayed.`;
                  apply({ ...state, swapped: i, tried: [...state.tried, i], roll: state.roll + 1 });
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
        steps: ({ state }) => <StepsList run={RUN} change={swap(state.swapped)} />,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See which swap flipped it"
          />
        ),
        fact: ({ state }) => (state.revealed ? <Fact id="decisive-error" /> : null),
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
