// Chapter 3: price per answer. Tokens in and out times each machine's hand-set price, per 1,000 answers. The reader
// predicts how many times A's price is C's, then slides the cost poise until the beam tips (any cost weight that tips
// it passes); the month's bill follows. Cites a real price list for how pricing is shaped (in and out apart); output's
// price is input's times that list's multiple (matched, OUT_TIMES).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { REPLY, machineOf } from '../../lib/choosing-models/machines';
import { money, per1000 } from '../../lib/choosing-models/price';
import { rowsOf, weigh, type Weights } from '../../lib/choosing-models/score';
import { qualityText } from '../../lib/choosing-models/story';
import pinned from '../../../data/choosing-models/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, MachinesNote, SteelyardStage } from './kit';
import { num } from '../../lib/format';

const MODULE = 'choosing-models',
  ID = '03-price-per-answer';
export const PARTS = STEELYARD_PARTS;
const ROWS = rowsOf('larkspur');
const Q = qualityText('larkspur');
const P = { A: per1000(machineOf('A'), REPLY), B: per1000(machineOf('B'), REPLY), C: per1000(machineOf('C'), REPLY) };
/** how many times A's price is C's */
export const TIMES = Math.round(P.A / P.C);
const MONTH = REPLY.perMonth / 1000;
export const START: Weights = { quality: 2, cost: 0, wait: 0 };

export interface S {
  w: Weights;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Per 1,000 answers, how many times Machine A’s price is Machine C’s?',
  options: ['About 3 times', `About ${TIMES} times`, 'About the same'],
};
export const OUTCOME = 1;

export const QUIZ = {
  question: 'One reply costs well under a cent on every machine. Why weigh price at all?',
  options: [
    'It is paid on every answer, so volume multiplies it',
    'It doesn’t matter until a model is very large',
    'Only the question’s tokens are charged, so it stays small',
  ],
  correct: 0,
  explanation: 'A small price per answer times thousands of answers a month is the bill.',
  why: [
    'Right: price per answer times volume is the monthly bill, and it differs many times over.',
    'Even small models are paid per token on every answer, so volume decides the bill.',
    'Output tokens are charged too, and usually at a higher price than input.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A support answer reads about ${num(REPLY.tokensIn)} input tokens and writes ${REPLY.tokensOut} output tokens; each kind has its own price.`,
    act: 'Predict first.',
    say: { block: 'pan', text: 'One answer' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'slide',
    focus: 'weights',
    visibleControls: ['out1'],
    narration: `Price per answer, times 1,000: A ${money(P.A)}, B ${money(P.B)}, C ${money(P.C)}.`,
    act: 'Slide Cost until the beam tips away from A.',
    say: { block: 'cost', text: 'Cost' },
    predicate: s => weigh(ROWS, s.w).winner !== 'A' && weigh(ROWS, s.w).winner !== null,
    hint: `Try Cost at ${pinned.costTip}.`,
    solution: s => ({ ...s, w: { ...s.w, cost: pinned.costTip ?? 1 } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bill', 'fact', 'quiz'],
    narration: `At ${num(REPLY.perMonth)} answers a month: A costs ${money(P.A * MONTH)}, C ${money(P.C * MONTH)}. Real price lists span even wider gaps.`,
    act: 'One question to finish.',
    say: { block: 'machine-c', text: 'Cheapest' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to a tiny price over thousands of answers?',
  },
];

export default function PricePerAnswer() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ w: START, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <SteelyardStage
          rows={ROWS}
          weights={state.w}
          only={['quality', 'cost']}
          onWeights={state.p1 === null ? undefined : w => (focus === 'weights' ? apply : sync)({ ...state, w })}
          quality={Q}
          pills={Q.pills}
          say={say}
          step={focus}
          caption={`Per 1,000 answers: A ${money(P.A)}, B ${money(P.B)}, C ${money(P.C)}. Hand-set prices.`}
        >
          <MachinesNote />
        </SteelyardStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        bill: () => (
          <details className="cm-maths">
            <summary>The sum</summary>
            <p>
              {`Price per answer = input tokens × input price + output tokens × output price, prices per million tokens. Machine A: ${num(REPLY.tokensIn)} × $${machineOf('A').priceIn} + ${REPLY.tokensOut} × $${machineOf('A').priceOut}, over a million, is $${(P.A / 1000).toFixed(4)} an answer.`}
            </p>
          </details>
        ),
        fact: () => <Fact id="prices" />,
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
