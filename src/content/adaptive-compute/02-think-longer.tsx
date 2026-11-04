// Chapter 2: think longer (R6h.2). Every valve is shut. The reader predicts what thinking does for stock questions,
// turns the stock valve to the thinking wheel (in the picture or by its slider) and finds them still wrong at a higher
// bill; the stage closes in on that valve and the wheel. Then the puzzles go there instead, and come out right. The
// reveal cites Snell et al. on thinking against a bigger model; links to Reasoning's effort dial.
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
  ID = '02-think-longer';
const N = REQUESTS.length,
  STOCK: Rules = { ...PLAIN, stock: 'think' },
  BOTH: Rules = { ...STOCK, puzzle: 'think' },
  AFTER = runDay(BOTH);

interface S {
  rules: Rules;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Stock questions go to the thinking wheel. What happens to them?',
  options: ['Still wrong, and each costs more', 'They come out right', 'Right, and cheaper too'],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A bot is told to think step by step before saying when a shop opens. What changes?',
  options: [
    'The bill goes up and the answer stays the same',
    'The opening time becomes more accurate',
    'It answers faster, having planned ahead',
  ],
  correct: 0,
  explanation: 'Thinking helps when an answer needs working out; a plain fact gains nothing but cost.',
  why: [
    'Right: there is nothing to work out, so the extra thinking is pure cost.',
    'The time was right already, or it was never known; thinking can’t add it.',
    'Thinking adds words before the answer, so it is slower, not faster.',
  ],
};

export const PARTS = MILL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Every valve is shut. Thinking works an answer out in steps before replying.',
    act: 'Predict what thinking does for stock questions.',
    say: { block: 'model', text: 'Puzzles wrong' },
    status: `Every valve is shut: ${runDay(PLAIN).right} of ${N} right, ${runDay(PLAIN).spent} spent.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'stock',
    focus: 'turn',
    visibleControls: ['predict'],
    narration: 'Send the stock questions to the thinking wheel.',
    act: 'Drag the stock hose onto the thinking wheel, or move its slider.',
    say: { block: 'think', text: 'Turning' },
    status: `Stock questions now cost ${COSTS.think} each at the thinking wheel, and all ${countOf('stock')} are still wrong.`,
    predicate: s => s.rules.stock === 'think',
    hint: 'Move the Stock valve slider to Think longer.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the stock valve and the wheel.',
    act: 'Check your prediction.',
    closeUp: ['valve', 'think'],
    status: `The stock valve’s rim is red: 0 of ${countOf('stock')} right, at a higher bill.`,
    predicate: s => s.revealed,
  },
  {
    id: 'puzzle',
    focus: 'turn',
    visibleControls: ['fact'],
    narration: 'Today’s stock is a fact the model never saw; thinking can’t find it. Puzzles need working out.',
    act: 'Turn the puzzles valve to Think longer.',
    say: { block: 'valve', text: 'Now all right' },
    status: `Puzzles at the thinking wheel: ${countOf('puzzle')} of ${countOf('puzzle')} right, ${AFTER.right} of ${N} in all.`,
    predicate: s => s.rules.puzzle === 'think',
    hint: 'Move the Puzzles valve slider to Think longer.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Thinking longer fixes working-out, and only working-out.',
    act: 'One question to finish.',
    status: `Puzzles are all right; stock still wrong; ${AFTER.spent} of the budget spent.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is there anything to work out in an opening time?',
  },
];

export default function ThinkLonger() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: PLAIN, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp, focus }) => {
        // the stock valve until the reveal, then the puzzles'
        const kind = state.revealed ? 'puzzle' : 'stock';
        return (
          <EffortStage
            yard={yardOf(state.rules, {
              lit: state.rules.stock === 'think' ? { valve: kind, mill: 'think' } : {},
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
            label="See the stock valve"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="think-14x" />
              <ToyNote>
                How to set the dial itself is <a href="/reasoning/03-the-effort-dial/">Reasoning’s “The effort dial”</a>
                .
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
