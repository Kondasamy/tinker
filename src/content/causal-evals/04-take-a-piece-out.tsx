// Chapter 4: take a piece out (R6g.4). Ablation: the reader predicts where the marble lands without piece 2 (the order
// look-up), drags piece 2 onto the floor pile (or the twin), and the marble hops the gap into the wrong tray: nothing
// later read Dana's order, which is why the model number got lost. The stage closes in on the gap. Then piece 3 (the
// search) comes out and the marble falls through its gap into the gutter: nothing sent. Taking a piece out shows what
// the run needs; only a swap shows what fixes it. The reveal cites the hours Who&When's people spent labelling causes.
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
  ID = '04-take-a-piece-out';
const RUN = BLADE;
const ORDER = RUN.steps.findIndex(s => s.id === 'order'),
  SEARCH = RUN.steps.findIndex(s => s.id === 'search');
const out = (i: number | null): Change => (i === null ? null : { kind: 'remove', step: i });
/** where the marble lands with each of those pieces taken out (pinned in tests/unit/causal-evals.test.ts) */
export const WITHOUT = { order: replay(RUN, out(ORDER)).outcome, search: replay(RUN, out(SEARCH)).outcome };

interface S {
  /** the piece out of the run now, if any */
  out: number | null;
  tried: number[];
  roll: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Take piece ${ORDER + 1}, Dana’s order, out of the run. Where does the marble land?`,
  options: ['Still in the wrong tray', 'In the right tray', 'In the gutter: nothing sent'],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A bot that books deliveries runs fine with its “check the weather” step taken out. What have you learned about that step?',
  options: [
    'This outcome doesn’t depend on it, here, on this run',
    'It is the cause of the bot’s failures',
    'It is broken and should be deleted',
  ],
  correct: 0,
  explanation: fact('label-hours').claim,
  why: [
    'Right: taking it out changed nothing, so this outcome didn’t need it.',
    'A cause is a step whose fix flips a failure; this test shows only that nothing needed it.',
    'Unused on one run is not broken; another run may need it.',
  ],
};

export const PARTS = MARBLE_PARTS;

export const sceneOf = (s: S) => marbleOf(RUN, out(s.out), s.roll, { lit: s.roll ? null : ORDER });
const landed = (s: S) => s.roll > 0 && replay(RUN, out(s.out)).outcome;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['steps', 'predict'],
    narration: `Ablation takes one piece out and rolls again. Piece ${ORDER + 1} found Dana’s order: an L40 mower.`,
    act: `Predict where the marble lands without piece ${ORDER + 1}.`,
    say: { block: `p${ORDER + 1}`, text: 'Take out?' },
    status: `Piece ${ORDER + 1} is ringed: Dana’s order, an L40 mower.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'order',
    focus: 'take-out',
    visibleControls: ['steps', 'predict'],
    narration: 'Pick locked.',
    act: `Drag piece ${ORDER + 1} onto the floor pile, or press Take out and replay.`,
    status: `Piece ${ORDER + 1} lies on the floor; the marble hopped its gap into the wrong tray.`,
    predicate: s => s.out === ORDER && s.roll > 0,
    hint: `Choose piece ${ORDER + 1} under the picture, then press Take out and replay.`,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `No later piece read piece ${ORDER + 1}. The search never used Dana’s order, which is how the model number got lost.`,
    act: 'Check your prediction.',
    closeUp: [`p${ORDER + 1}`, 'wrong'],
    status: `Close in on piece ${ORDER + 1}’s empty slot and the wrong tray.`,
    predicate: s => s.revealed,
  },
  {
    id: 'search',
    focus: 'take-out',
    visibleControls: ['steps', 'fact'],
    narration: `Taking out piece ${SEARCH + 1}, the search, leaves later pieces nothing to read.`,
    act: `Take out piece ${SEARCH + 1} and replay.`,
    status: `Piece ${SEARCH + 1} lies on the floor; the marble fell through its gap into the gutter.`,
    predicate: s => s.out === SEARCH && landed(s) === 'none',
    hint: `Choose piece ${SEARCH + 1} under the picture, then press Take out and replay.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Taking a piece out shows what the run needs. Only a swap shows what fixes it.',
    act: 'One question to finish.',
    status: `Piece ${SEARCH + 1} stays on the floor; the marble rests in the gutter.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Taking it out changed nothing. What does that say, and what doesn’t it say?',
  },
];

export default function TakeAPieceOut() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ out: null, tried: [], roll: 0, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const take = (i: number) => {
          if (state.out === i && state.roll) return `Piece ${i + 1} is already out.`;
          apply({ ...state, out: i, tried: [...state.tried, i], roll: state.roll + 1 });
          return undefined;
        };
        return (
          <MarbleStage
            run={RUN}
            scene={sceneOf(state)}
            log={state.tried.map(i => logOf(RUN, out(i)))}
            twin={{
              taps: [state.out === null ? ORDER : SEARCH],
              buttons: [{ label: 'Take out and replay', act: take }],
              drop: take,
            }}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        steps: ({ state }) => <StepsList run={RUN} change={out(state.out)} />,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See what still works"
          />
        ),
        fact: ({ state }) => (state.revealed ? <Fact id="label-hours" /> : null),
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
