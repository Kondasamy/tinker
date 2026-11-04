// Chapter 1: the failed run (R6g.1). Dana's L40 blade request, as a hand-written example run of eight steps laid out
// as eight chute pieces. The reader rolls the marble (tap the start cup, or Roll) and it drops into the wrong tray;
// reads piece 4 (it picked B-50), predicts what piece 8 sends, reads piece 8, and the stage closes in on piece 8 and
// the wrong tray: a failure shows at the end, wherever it began. The reveal cites Who&When's failure collection.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MARBLE_PARTS } from '../../components/scenes/marbleScene';
import { fact } from '../../lib/causal-evals/facts';
import { BLADE, replay } from '../../lib/causal-evals/runs';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, logOf, MarbleStage, marbleOf, StepsList, ToyNote } from './kit';

const MODULE = 'causal-evals',
  ID = '01-the-failed-run';
const RUN = BLADE;
const AS = replay(RUN);
const PICK = RUN.steps.findIndex(s => s.id === 'pick'),
  SEND = RUN.steps.length - 1;

interface S {
  roll: number;
  lit: number | null;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Piece ${PICK + 1} picked ${AS.slots[PICK]}. What does piece ${SEND + 1} send?`,
  options: [
    `${AS.slots[PICK]}: it sends what it is handed`,
    'The L40 blade: it checks Dana’s order first',
    'Nothing: it sees the parts don’t match',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A travel assistant books the wrong hotel. Its last step, “book”, ran without an error. What does that tell you?',
  options: [
    'Little: “book” may have booked exactly what an earlier step handed it',
    '“Book” is broken, since the wrong hotel came out of it',
    'The run is fine, since no step reported an error',
  ],
  correct: 0,
  explanation: fact('who-when-size').claim,
  why: [
    'Right: each step works on what earlier steps wrote, so a bad input can travel to the end.',
    'The last step is where the failure shows, not necessarily where it began.',
    'A run can finish every step without an error and still deliver the wrong thing.',
  ],
};

export const PARTS = MARBLE_PARTS;

export const sceneOf = (s: S) => marbleOf(RUN, null, s.roll, { lit: s.lit });

export const STEPS: Step<S>[] = [
  {
    id: 'roll',
    focus: 'roll',
    visibleControls: ['steps'],
    narration: `Dana asked for an L40 blade. This hand-written example run took ${RUN.steps.length} steps, one chute piece each.`,
    act: 'Tap the start cup, or press Roll.',
    say: { block: 'start', text: 'Start here' },
    status: 'The marble rolled all eight pieces and dropped into the wrong tray.',
    predicate: s => s.roll > 0,
    hint: 'Press Roll under the picture.',
  },
  {
    id: 'pick',
    focus: 'pick',
    visibleControls: ['steps'],
    narration: 'The marble is the task, handed down the run. Each piece reads what earlier pieces wrote.',
    act: `Tap piece ${PICK + 1}, or pick it and press Read.`,
    status: `Piece ${PICK + 1} is ringed: it picked ${AS.slots[PICK]}, the top result.`,
    predicate: s => s.lit === PICK,
    hint: `Choose piece ${PICK + 1} in the box under the picture, then press Read.`,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['steps', 'predict'],
    narration: `Piece ${PICK + 1} picked ${AS.slots[PICK]}, a blade for another mower.`,
    act: `Predict what piece ${SEND + 1} sends.`,
    say: { block: `p${PICK + 1}`, text: 'Picked B-50' },
    status: `Piece ${PICK + 1} stays ringed; the marble sits in the wrong tray.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['steps', 'predict'],
    narration: 'Pick locked. Now read the last piece.',
    act: `Tap piece ${SEND + 1}, or pick it and press Read.`,
    status: `Piece ${SEND + 1} is ringed: it sent ${AS.slots[SEND]} to 14 Elm Road.`,
    predicate: s => s.lit === SEND,
    hint: `Choose piece ${SEND + 1} in the box under the picture, then press Read.`,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Piece ${SEND + 1} sent what it was handed. The outcome shows at the end of a run, wherever the trouble began.`,
    act: 'Check your prediction.',
    closeUp: [`p${SEND + 1}`, 'wrong'],
    status: `Close in on piece ${SEND + 1} and the wrong tray, where ${AS.slots[SEND]} landed.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Every step can do its own job and the run still fail.',
    act: 'One question to finish.',
    status: 'The marble rests in the wrong tray.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which step handed the last one its input?',
  },
];

export default function TheFailedRun() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ roll: 0, lit: null, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MarbleStage
          run={RUN}
          scene={sceneOf(state)}
          log={state.roll ? [logOf(RUN, null)] : []}
          twin={{
            taps: [PICK, SEND],
            buttons: [{ label: 'Read', act: i => void apply({ ...state, lit: i }) }],
            roll: {
              label: 'Roll',
              act: () => {
                if (state.roll) return 'The marble already rolled: it sits in the wrong tray.';
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
        steps: ({ state }) => <StepsList run={RUN} lit={state.lit} />,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See what piece 8 did"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="who-when-size" />
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
