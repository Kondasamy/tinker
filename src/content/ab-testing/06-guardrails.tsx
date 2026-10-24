// Chapter 6: the metric moved, the business didn't. An "Only a few left!" banner wins on buying; the reader predicts
// returns, turns on the returns guardrail and sees orders kept stay flat.
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
  ID = '06-guardrails';
export const PARTS = SPLIT_PARTS;
export const PLAN = SCENARIOS.hurry;
export const RUN = runOf(PLAN);
const END = PLAN.days - 1,
  LEVEL = ASSUMPTIONS.level,
  D = RUN[END];
export const ORDERS = resultAt(RUN, END, LEVEL);
export const RETURNS = resultAt(RUN, END, LEVEL, 1, 'returns');
const back = (a: number) => D.returns[a] / D.orders[a];
/** Orders kept (bought and not sent back) per shopper. */
export const kept = (a: number) => (D.orders[a] - D.returns[a]) / D.visitors[a];

export const P1 = {
  question: 'Of B’s orders, how many will come back compared with A’s?',
  options: [
    'About the same share: the products are the same',
    'A bigger share: rushed buyers send more back',
    'A smaller share: eager buyers keep more',
  ],
};
export const outcomeOf = () => (RETURNS.significant ? (RETURNS.diff > 0 ? 1 : 2) : 0);

export const QUIZ = {
  question:
    'A video app starts the next episode automatically and watch time rises. What should it check before shipping?',
  options: [
    'Cancellations: more watch time may come with more people quitting',
    'Watch time again, over a longer week',
    'Nothing: watch time is what the test was for',
  ],
  correct: 0,
  explanation: 'A guardrail checks the cost a win on the primary metric might hide.',
  why: [
    'Right: cancellations are the guardrail here, the thing that must not get worse while watch time rises.',
    'A longer look at the same number can’t show what the win costs elsewhere.',
    'The primary metric can rise while the business loses, as returns showed with the banner.',
  ],
};

interface S {
  ran: boolean;
  p1: number | null;
  guard: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['run'],
    narration: 'The primary metric is the number a test is run to move: here, the share who buy.',
    act: 'Run the banner test.',
    say: { block: 'b', text: 'The banner' },
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `B wins on buying, ${pts(ORDERS.diff)}. Before shipping, think about who a hurry banner rushes.`,
    act: 'Predict returns.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'guard',
    focus: 'guard',
    visibleControls: ['p1', 'guard'],
    narration: 'A guardrail metric watches what must not get worse. Here: the share of orders sent back.',
    act: 'Watch returns.',
    say: { block: 'b', text: 'Sent back' },
    predicate: s => s.guard,
  },
  {
    id: 'kept',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `Orders kept per shopper: A ${pct1(kept(0))}, B ${pct1(kept(1))}. The metric moved; the business didn’t.`,
    act: 'Open the Result tab.',
    predicate: s => s.view === 'chart',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Ship only when the primary metric wins and every guardrail holds.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What could get worse while watch time goes up?',
  },
];

export default function Guardrails() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, p1: null, guard: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const base = splitAt(RUN, PLAN, state.ran ? END : -1, { guardrail: state.guard });
        const warn = state.guard && RETURNS.significant && RETURNS.diff > 0;
        return (
          <AbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: warn ? { ...base, verdict: 'B WINS · RETURNS UP', tone: 'warn' } : base,
              chart: state.ran ? { run: RUN, metric: state.guard ? 'returns' : 'orders' } : undefined,
              at: END,
              caption: !state.ran
                ? 'Checkout B shows an “Only a few left!” banner.'
                : state.guard
                  ? `Sent back: A ${pct1(back(0))} of orders, B ${pct1(back(1))}.`
                  : `B minus A in buying: ${pts(ORDERS.diff)}.`,
            }}
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.ran} onClick={() => apply({ ...state, ran: true })}>
            Run the banner test
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        guard: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.guard}
            onClick={() => apply({ ...state, guard: !state.guard })}
          >
            Watch returns
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`Returns, B minus A: ${pts(RETURNS.diff)} of orders, interval ${span(RETURNS)}.`}</p>
            <Fact id="short-term" />
            <Fact id="guardrails" />
            <SimNote />
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'chart' })}>
            Open the Result tab
          </button>
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
