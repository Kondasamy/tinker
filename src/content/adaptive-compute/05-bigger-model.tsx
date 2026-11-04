// Chapter 5: the bigger model (R6h.5). Warranty questions are the last ones wrong. The reader predicts which mill fixes
// them, tries the thinking wheel (still wrong, dearer), then sends them to the big model machine: all right, at the
// highest price per answer; the stage closes in on it. The reveal cites Snell et al. on the hardest questions; links to
// Choosing a model.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MILL_PARTS } from '../../components/scenes/millScene';
import { BUDGET, COSTS, REQUESTS, ROUTED, type Rules, countOf, runDay } from '../../lib/adaptive-compute/effort';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EffortStage, Fact, ToyNote, turnOnly, yardOf } from './kit';

const MODULE = 'adaptive-compute',
  ID = '05-bigger-model';
const N = REQUESTS.length,
  W = countOf('warranty'),
  START: Rules = { ...ROUTED, warranty: 'straight' },
  THOUGHT = runDay({ ...START, warranty: 'think' }),
  BIG = runDay(ROUTED);

interface S {
  rules: Rules;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Which mill gets the warranty questions right?',
  options: ['The big model', 'The thinking wheel', 'The library wheel'],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A law firm’s bot misreads dense contracts, even when told to think step by step. What next?',
  options: [
    'A bigger model, for the contracts only',
    'Make it think for even longer',
    'Move every question to the bigger model',
  ],
  correct: 0,
  explanation: 'Hard reading is beyond what thinking can fix; pay for a bigger model only where the reading is hard.',
  why: [
    'Right: the reading itself is beyond the model, and only the contracts need the dearer one.',
    'More thinking helped little on the hardest questions; the model can’t read what it doesn’t grasp.',
    'That fixes the contracts and pays the top price on every easy question too.',
  ],
};

export const PARTS = MILL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Warranty questions are the last ones wrong: long terms with exceptions inside exceptions.',
    act: 'Predict which mill fixes them.',
    say: { block: 'valve', text: 'Last ones wrong' },
    status: `Every rim is mint but warranty’s: ${runDay(START).right} of ${N} right.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'think',
    focus: 'turn',
    visibleControls: ['predict'],
    narration: 'Try thinking longer first: it fixed the puzzles.',
    act: 'Turn the warranty valve to Think longer.',
    say: { block: 'think', text: 'Not enough' },
    status: `Warranty at the thinking wheel: still 0 of ${W} right, ${THOUGHT.spent - runDay(START).spent} more spent.`,
    predicate: s => s.rules.warranty === 'think',
    hint: 'Move the Warranty valve slider to Think longer.',
  },
  {
    id: 'big',
    focus: 'turn',
    visibleControls: ['predict'],
    narration: 'Now send them to the bigger model: more trained, better at hard reading.',
    act: 'Drag the warranty hose onto the big model, or move its slider.',
    say: { block: 'big', text: 'Dearest mill' },
    status: `Warranty at the big model: ${W} of ${W} right, at ${COSTS.big} each.`,
    predicate: s => s.rules.warranty === 'big',
    hint: 'Move the Warranty valve slider to Bigger model.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the big model.',
    act: 'Check your prediction.',
    closeUp: ['big'],
    status: `All ${N} right, for ${BIG.spent} of ${BUDGET} spent.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'The bigger model fixes hard reading, and only there is it worth its price.',
    act: 'One question to finish.',
    status: `Every rim is mint: ${BIG.right} of ${N} right, ${BUDGET - BIG.spent} left in the tower.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which questions need the harder reading?',
  },
];

export default function BiggerModel() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: START, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp, focus }) => (
        <EffortStage
          yard={yardOf(state.rules, {
            lit: {
              valve: 'warranty',
              mill: state.rules.warranty === 'straight' ? undefined : (state.rules.warranty as 'think' | 'big'),
            },
          })}
          turn={
            focus === 'turn'
              ? turnOnly('warranty', (k, o) => apply({ ...state, rules: { ...state.rules, [k]: o } }))
              : undefined
          }
          kinds={focus === 'turn' ? ['warranty'] : []}
          say={say}
          closeUp={closeUp}
        />
      )}
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
            label="See the big model"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="hard-bigger" />
              <ToyNote>
                Weighing one model against another is <a href="/choosing-models/">Choosing a model</a>.
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
