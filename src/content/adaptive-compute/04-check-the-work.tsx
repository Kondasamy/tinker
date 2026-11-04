// Chapter 4: check the work (R6h.4). Order totals come back wrong. The reader predicts what a checker costs, turns the
// totals valve to the checking sieve, and every total comes out right for a second pass each; the stage closes in on
// the sieve. Then the everyday answers go through it too: nothing changes but the bill. The reveal cites Cobbe et al.'s
// trained checkers on maths word problems.
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
  ID = '04-check-the-work';
const N = REQUESTS.length,
  START: Rules = { ...PLAIN, puzzle: 'think', stock: 'lookup' },
  CHECKED: Rules = { ...START, total: 'check' },
  AFTER = runDay(CHECKED),
  EVERY = runDay({ ...CHECKED, everyday: 'check' });

interface S {
  rules: Rules;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Totals go through the checking sieve. What does the check cost?',
  options: [
    `A second pass: ${COSTS.check} per total instead of ${COSTS.straight}`,
    'Nothing: it only reads the answer',
    `As much as the big model: ${COSTS.big} each`,
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A bot writes both invoices and thank-you notes. Where does a checker earn its cost?',
  options: ['On the invoices, where a slip costs money', 'On both, equally', 'On the thank-you notes'],
  correct: 0,
  explanation: 'A check pays where a mistake is likely and costly, and is wasted where answers are already right.',
  why: [
    'Right: sums slip, and a wrong invoice costs real money; that is where a second pass pays.',
    'A check costs the same everywhere but only catches something where mistakes happen.',
    'A thank-you note has nothing to get wrong that a checker could catch.',
  ],
};

export const PARTS = MILL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration:
      'Order totals come back wrong: one slip in the sums. A checker redoes the working and sends wrong ones back.',
    act: 'Predict what checking costs.',
    say: { block: 'valve', text: 'Slips in sums' },
    status: `Totals go straight to the assistant: 0 of ${countOf('total')} right.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'turn',
    focus: 'turn',
    visibleControls: ['predict'],
    narration: 'Send the order totals through the checking sieve.',
    act: 'Drag the totals hose onto the sieve, or move its slider.',
    say: { block: 'check', text: 'Second pass' },
    status: `Totals through the sieve: ${countOf('total')} of ${countOf('total')} right, at ${COSTS.check} each.`,
    predicate: s => s.rules.total === 'check',
    hint: 'Move the Totals valve slider to Check the work.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the sieve.',
    act: 'Check your prediction.',
    closeUp: ['check'],
    status: `The sieve runs wet: ${AFTER.right} of ${N} right, ${AFTER.spent} spent.`,
    predicate: s => s.revealed,
  },
  {
    id: 'everyday',
    focus: 'turn',
    visibleControls: ['fact'],
    narration: 'Everyday answers are already right. Check them too, to see what it buys.',
    act: 'Turn the everyday valve to Check the work.',
    say: { block: 'tower', text: 'Paid for nothing' },
    status: `Everyday answers checked: still ${AFTER.right} right, but ${EVERY.spent - AFTER.spent} more spent.`,
    predicate: s => s.rules.everyday === 'check',
    hint: 'Move the Everyday valve slider to Check the work.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A checker pays where slips happen. On answers already right, it is a second pass for nothing.',
    act: 'One question to finish.',
    status: `${EVERY.right} of ${N} right with ${EVERY.spent} spent: the everyday check bought nothing.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which one has sums to slip on?',
  },
];

export default function CheckTheWork() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: START, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp, focus }) => {
        const kind = state.revealed ? 'everyday' : 'total';
        return (
          <EffortStage
            yard={yardOf(state.rules, {
              lit: { valve: kind, mill: 'check', tower: state.rules.everyday === 'check' },
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
            label="See the sieve"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="verifiers" />
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
