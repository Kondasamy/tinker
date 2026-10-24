// Chapter 1: did it work? The turnstile splits shoppers at random between today's checkout (A) and the one-page
// checkout (B). The reader runs day 1, predicts the two-week verdict, runs the two weeks and reads the difference with
// its interval on the Result tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, SCENARIOS, resultAt, runOf } from '../../lib/ab-testing/sim';
import { SPLIT_PARTS, splitAt } from '../../components/scenes/splitScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { AbStage, Fact, SimNote, pct1, pts, span, type View } from './kit';

const MODULE = 'ab-testing',
  ID = '01-did-it-work';
export const PARTS = SPLIT_PARTS;
export const PLAN = SCENARIOS.checkout;
export const RUN = runOf(PLAN);
export const END = PLAN.days - 1;
const rateOf = (t: number, arm: number) => RUN[t].orders[arm] / RUN[t].visitors[arm];
export const FINAL = resultAt(RUN, END, ASSUMPTIONS.level);

export const P1 = {
  question: `After ${PLAN.days} days, what will the scoreboard say?`,
  options: [
    'B wins: the new checkout sells more',
    'No winner: the gap is too small to trust',
    'A wins: today’s sells more',
  ],
};
export const outcomeOf = () => (FINAL.significant ? (FINAL.diff > 0 ? 0 : 2) : 1);

export const QUIZ = {
  question:
    'A café shows a new menu to customers who come before noon and the old one after noon. The new menu sells more. What is wrong?',
  options: [
    'Morning and afternoon customers differ, so the time, not the menu, may explain it',
    'Nothing: more sales prove the new menu works',
    'Too many customers saw the new menu',
  ],
  correct: 0,
  explanation: 'Only a random split makes the two groups alike in everything but the change.',
  why: [
    'Right: the time of day chose who saw which menu, so anything that differs between mornings and afternoons rides along.',
    'More sales show the morning group bought more, not that the menu made them.',
    'How many saw it matters less than how they were chosen; the split was by time, not chance.',
  ],
};

interface S {
  /** the last day index run (-1: nothing yet) */
  day: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'split',
    focus: 'run',
    visibleControls: ['run'],
    narration: 'The turnstile sends each shopper at random to A, the control, or B, the variant: a random split.',
    act: 'Run day 1.',
    say: { block: 'turnstile', text: 'Coin flip' },
    predicate: s => s.day >= 0,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Day 1: B’s conversion rate, the share who buy, is ${pct1(rateOf(0, 1))}; A’s is ${pct1(rateOf(0, 0))}.`,
    act: 'Predict the two-week result.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Your pick is locked.',
    act: `Run all ${PLAN.days} days.`,
    predicate: s => s.day === END,
  },
  {
    id: 'chart',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration:
      'The Result tab shows B minus A each day, with its interval: where the true difference most likely sits.',
    act: 'Open the Result tab.',
    say: { block: 'scoreboard', text: 'The verdict' },
    predicate: s => s.view === 'chart',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['evals', 'quiz'],
    narration: 'The split made A and B alike in everything but the checkout, so the gap belongs to the change.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who chose which customers saw the new menu: chance, or the clock?',
  },
];

export default function DidItWork() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ day: -1, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <AbStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            scene: splitAt(RUN, PLAN, state.day),
            chart: state.day === END ? { run: RUN } : undefined,
            at: END,
            caption:
              state.day < 0
                ? 'Shoppers queue at the turnstile.'
                : state.day < END
                  ? `Day ${state.day + 1}: too early to call.`
                  : `Day ${PLAN.days}: B minus A is ${pts(FINAL.diff)}.`,
          }}
        />
      )}
      controls={{
        run: ({ state, apply }) => (
          <div className="ab-row" role="group" aria-label="Run the test">
            <button
              type="button"
              className="chip"
              disabled={state.day >= 0}
              onClick={() => apply({ ...state, day: 0 })}
            >
              Run day 1
            </button>
            <button
              type="button"
              className="chip"
              disabled={state.day < 0 || state.p1 === null}
              onClick={() => apply({ ...state, day: END })}
            >
              {`Run all ${PLAN.days} days`}
            </button>
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`A ${pct1(rateOf(END, 0))}, B ${pct1(rateOf(END, 1))}: B minus A is ${pts(FINAL.diff)}, interval ${span(FINAL)}.`}</p>
            <Fact id="random" />
            <SimNote />
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'chart' })}>
            Open the Result tab
          </button>
        ),
        evals: () => (
          <p className="tc-status">
            The AI version of “is B better?” is <a href="/evals/">Evals</a>: the same comparison, run on an assistant’s
            answers.
          </p>
        ),
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
