// Chapter 3: how many shoppers? A bigger Buy button truly adds a point. One week finds nothing; the reader predicts the
// test's power, runs it over the seed list, then slides the test's length to the sample size Kohavi et al.'s rule asks
// for and watches the power climb.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import {
  ASSUMPTIONS,
  ENOUGH,
  LENGTHS,
  SCENARIOS,
  SEEDS,
  findings,
  powerOf,
  resultAt,
  runOf,
} from '../../lib/ab-testing/sim';
import { sampleSize } from '../../lib/ab-testing/stats';
import { SPLIT_PARTS, splitAt } from '../../components/scenes/splitScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { AbStage, Fact, Maths, SimNote, Tally, count, pct, type View } from './kit';

const MODULE = 'ab-testing',
  ID = '03-how-many-shoppers';
export const PARTS = SPLIT_PARTS;
const SMALL = SCENARIOS.small;
export const DAYS = LENGTHS;
export { ENOUGH };
const [A, B] = SMALL.arms;
export const LIFT = B.rate - A.rate;
export const NEEDED = sampleSize(A.rate, LIFT);
export const planOf = (days: number) => ({ ...SMALL, days });
export const WEEK = resultAt(runOf(planOf(DAYS[0])), DAYS[0] - 1, ASSUMPTIONS.level);
const N = SEEDS.length,
  liftWords = `${Math.round(LIFT * 100)} point${Math.round(LIFT * 100) === 1 ? '' : 's'}`;

export const P1 = {
  question: `Run this one-week test ${N} times. In how many will B win?`,
  options: ['Most: the lift is real', 'Under half: a week is too few shoppers', 'None at all'],
};
export const outcomeOf = () => {
  const p = powerOf(planOf(DAYS[0]));
  return p >= 0.5 ? 0 : p > 0 ? 1 : 2;
};

export const QUIZ = {
  question:
    'A team tests a small change for three days, finds no significant difference and decides the change does nothing. What is the flaw?',
  options: [
    'Three days may be far too few shoppers to see a small change',
    'No flaw: no difference means no effect',
    'They should have checked the results every hour',
  ],
  correct: 0,
  explanation: 'An underpowered test that finds nothing has not shown there is nothing to find.',
  why: [
    'Right: with too few shoppers a real small change is usually missed, so silence proves little.',
    'A short test misses most small changes, so finding none is what you expect even when one is there.',
    'Checking more often adds chances for luck to win; it doesn’t add shoppers.',
  ],
};

interface S {
  ran: boolean;
  p1: number | null;
  many: boolean;
  /** the test's length in days, one of DAYS */
  days: number;
  view: View;
  quiz: number | null;
}
const daysOf = (s: S) => ((DAYS as readonly number[]).includes(s.days) ? s.days : DAYS[0]);

export const STEPS: Step<S>[] = [
  {
    id: 'week',
    focus: 'run',
    visibleControls: ['run'],
    narration: `In this simulation the bigger button truly adds ${liftWords}. Run one week and read the scoreboard.`,
    act: 'Run one week.',
    say: { block: 'b', text: 'Truly better' },
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'No winner after a week. Power is the share of runs that find a real lift.',
    act: 'Predict the power.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'many',
    focus: 'many',
    visibleControls: ['p1', 'many'],
    narration: 'Your pick is locked.',
    act: `Run it ${N} times.`,
    predicate: s => s.many,
  },
  {
    id: 'size',
    focus: 'size',
    visibleControls: ['out1', 'size'],
    narration: `Too few shoppers makes a test underpowered. The sample size rule says each checkout needs ${count(NEEDED)}.`,
    act: 'Find the shortest test that’s enough.',
    say: { block: 'turnstile', text: 'More shoppers' },
    predicate: s => daysOf(s) === ENOUGH,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `${pct(powerOf(planOf(ENOUGH)))} of runs find it at ${ENOUGH / 7} weeks. Plan the size first: a short test that finds nothing proves nothing.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Could three days of shoppers find a small change most of the time?',
  },
];

function Size({ s, set }: { s: S; set: (s: S) => void }) {
  const days = daysOf(s),
    p = planOf(days),
    i = (DAYS as readonly number[]).indexOf(days);
  return (
    <div>
      <div className="ab-range">
        <label htmlFor="ab-days">{`Test length: ${days / 7} weeks, ${count(days * SMALL.perDay)} shoppers each`}</label>
        <input
          id="ab-days"
          type="range"
          min={0}
          max={DAYS.length - 1}
          step={1}
          value={i}
          aria-valuetext={`${days / 7} weeks`}
          onChange={e => set({ ...s, days: DAYS[Number(e.target.value)] })}
        />
      </div>
      <Tally verdicts={findings(p)} label={`runs found the lift: power ${pct(powerOf(p))}`} />
      <Maths>
        <p>
          The rule: shoppers per checkout = 16 × p × (1 − p) ÷ Δ², where p is today’s rate and Δ the change to find.
          {` Here 16 × ${A.rate} × ${(1 - A.rate).toFixed(1)} ÷ ${LIFT.toFixed(2)}² = ${count(NEEDED)}.`}
        </p>
        <Fact id="sample-size" />
      </Maths>
      <Fact id="power" />
    </div>
  );
}

export default function HowManyShoppers() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, p1: null, many: false, days: DAYS[0], view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const days = daysOf(state),
          p = planOf(days),
          r = runOf(p);
        return (
          <AbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: splitAt(r, p, state.ran ? days - 1 : -1),
              chart: state.ran ? { run: r } : undefined,
              at: days - 1,
              caption: state.ran
                ? `${days / 7} weeks, ${count(days * SMALL.perDay)} shoppers per checkout.`
                : 'A bigger Buy button on checkout B.',
            }}
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.ran} onClick={() => apply({ ...state, ran: true })}>
            Run one week
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        many: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.many} onClick={() => apply({ ...state, many: true })}>
            {`Run it ${N} times`}
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <SimNote />
          </>
        ),
        // changing the length is an attempt only while it is the puzzle
        size: ({ state, apply, sync, focused }) => <Size s={state} set={focused ? apply : sync} />,
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
