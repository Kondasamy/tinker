// Chapter 3: look it up (R6h.3). Puzzles go to the thinking wheel; stock questions are still wrong there. The reader
// predicts what the library wheel does for them, turns the stock valve to it, and they come out right for half the
// cost; the stage closes in on the library wheel. Then the puzzles try it too, and come out wrong. The reveal cites
// Lewis et al.'s retrieval paper; links to RAG.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MILL_PARTS } from '../../components/scenes/millScene';
import { COSTS, PLAIN, REQUESTS, type Rules, countOf, runDay } from '../../lib/adaptive-compute/effort';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EffortStage, Fact, ToyNote, turnOnly, yardOf } from './kit';

const MODULE = 'adaptive-compute',
  ID = '03-look-it-up';
const N = REQUESTS.length,
  START: Rules = { ...PLAIN, puzzle: 'think', stock: 'think' },
  LOOKED: Rules = { ...START, stock: 'lookup' },
  AFTER = runDay(LOOKED),
  WRONG = runDay({ ...LOOKED, puzzle: 'lookup' });

interface S {
  rules: Rules;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Stock questions go to the library wheel instead. What changes?',
  options: [
    'All right, and cheaper than thinking',
    'Still wrong: no model knows today’s stock',
    'Right, but dearer than thinking',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A travel bot is asked today’s exchange rate for euros. What helps most?',
  options: ['Looking the rate up first', 'Thinking longer before answering', 'A bigger, better-read model'],
  correct: 0,
  explanation: 'A fact that changes daily is in no model; only a look-up brings it in.',
  why: [
    'Right: today’s rate lives in a live source, so fetch it.',
    'Thinking can only work with what the model has; today’s rate isn’t there.',
    'However much a model read, it read it before today.',
  ],
};

export const PARTS = MILL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration:
      'Stock questions still go to the thinking wheel, all wrong. A look-up fetches today’s figure from the stock system.',
    act: 'Predict what the library wheel does.',
    say: { block: 'lookup', text: 'Idle' },
    status: `Stock questions sit at the thinking wheel: 0 of ${countOf('stock')} right.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'turn',
    focus: 'turn',
    visibleControls: ['predict'],
    narration: 'Send the stock questions to the library wheel.',
    act: 'Drag the stock hose onto the library wheel, or move its slider.',
    say: { block: 'lookup', text: 'Today’s figures' },
    status: `Stock at the library wheel: ${countOf('stock')} of ${countOf('stock')} right, at ${COSTS.lookup} each, not ${COSTS.think}.`,
    predicate: s => s.rules.stock === 'lookup',
    hint: 'Move the Stock valve slider to Look it up.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the library wheel.',
    act: 'Check your prediction.',
    closeUp: ['lookup'],
    status: `The library wheel turns: ${AFTER.right} of ${N} right, ${AFTER.spent} spent.`,
    predicate: s => s.revealed,
  },
  {
    id: 'puzzles',
    focus: 'turn',
    visibleControls: ['fact'],
    narration: 'Would a look-up help the puzzles too?',
    act: 'Turn the puzzles valve to Look it up.',
    say: { block: 'valve', text: 'Nothing to fetch' },
    status: `Puzzles at the library wheel: 0 of ${countOf('puzzle')} right, ${WRONG.right} of ${N} in all.`,
    predicate: s => s.rules.puzzle === 'lookup',
    hint: 'Move the Puzzles valve slider to Look it up.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A look-up brings in a fact the model can’t know. A puzzle has no fact to fetch.',
    act: 'One question to finish.',
    status: `Stock is right at the library wheel; puzzles are wrong there.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does today’s rate live?',
  },
];

export default function LookItUp() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: START, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp, focus }) => {
        const kind = state.revealed ? 'puzzle' : 'stock';
        return (
          <EffortStage
            yard={yardOf(state.rules, {
              // the tower rings while the bill drops, until the reveal
              lit: { valve: kind, mill: 'lookup', tower: state.rules.stock === 'lookup' && !state.revealed },
            })}
            turn={
              focus === 'turn'
                ? turnOnly(kind, (k, o) => apply({ ...state, rules: { ...state.rules, [k]: o } }))
                : undefined
            }
            kinds={focus === 'turn' ? [kind] : []}
            say={say}
            closeUp={closeUp}
          />
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
            label="See the library wheel"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="lookup-facts" />
              <ToyNote>
                How a look-up finds the right passage is <a href="/rag/">Retrieval-augmented generation</a>.
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
