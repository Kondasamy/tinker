// Chapter 4: peeking. Another A/A test, checked every morning. The reader moves day by day until the scoreboard calls a
// winner, predicts whether it holds to the planned end, sees it vanish, then runs 100 peeking tests against one look at
// a fixed horizon.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import {
  ASSUMPTIONS,
  SCENARIOS,
  SEEDS,
  falseWinRate,
  peekResult,
  resultAt,
  runOf,
  verdicts,
} from '../../lib/ab-testing/sim';
import { SPLIT_PARTS, splitAt } from '../../components/scenes/splitScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { AbStage, DayRange, Fact, SimNote, Tally, pts, span, type View } from './kit';

const MODULE = 'ab-testing',
  ID = '04-peeking';
export const PARTS = SPLIT_PARTS;
export const PLAN = SCENARIOS.aa;
export const RUN = runOf(PLAN);
export const END = PLAN.days - 1;
export const PEEK = peekResult(RUN, ASSUMPTIONS.level)!;
export const FINAL = resultAt(RUN, END, ASSUMPTIONS.level);
export const PEEK_RATE = falseWinRate(PLAN, 'peek');
export const FIXED_RATE = falseWinRate(PLAN, 'fixed');
const N = SEEDS.length,
  of = (r: number) => `${Math.round(r * N)} of ${N}`;

export const P1 = {
  question: `Day ${PEEK.t + 1}: B leads, significant. Keep going to day ${PLAN.days}. What will it say?`,
  options: ['B still wins', 'No winner: the early lead was luck', 'A wins instead'],
};
export const outcomeOf = () => (FINAL.significant ? (FINAL.diff > 0 ? 0 : 2) : 1);

export const QUIZ = {
  question:
    'A teacher lets a class retake a quiz every day and stops the moment the average beats last year’s. Is that win trustworthy?',
  options: [
    'No: stopping on the first good day lets luck pick the moment',
    'Yes: the average really did beat last year’s',
    'Yes, as long as they retook it at least twice',
  ],
  correct: 0,
  explanation: 'Each look is another chance for luck; stopping on the first win keeps the lucky one.',
  why: [
    'Right: with a look every day, a lucky high day is likely sooner or later, and stopping there keeps it.',
    'One good day among many tries is what luck alone produces, so beating the bar once proves little.',
    'More retakes mean more chances for a lucky day, not fewer.',
  ],
};

interface S {
  day: number;
  p1: number | null;
  many: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'morning',
    focus: 'day',
    visibleControls: ['day'],
    narration:
      'Another A/A test: both checkouts identical. Peeking means checking every morning and stopping on a win.',
    act: 'Move day by day until it calls a winner.',
    say: { block: 'scoreboard', text: 'Stop here?' },
    predicate: s => s.day === PEEK.t,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Day ${PEEK.t + 1}: B wins by ${pts(PEEK.result.diff)}. A peeker would stop here and ship B.`,
    act: `Predict day ${PLAN.days}.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'end',
    focus: 'day',
    visibleControls: ['p1', 'day'],
    narration: 'Your pick is locked.',
    act: `Move to day ${PLAN.days}.`,
    predicate: s => s.day === END,
  },
  {
    id: 'many',
    focus: 'many',
    visibleControls: ['out1', 'many'],
    narration: `The full run keeps no win. Now ${N} A/A tests, peeked at every day, stopping at the first win.`,
    act: `Run ${N} peeking tests.`,
    predicate: s => s.many,
  },
  {
    id: 'tally',
    focus: 'tab',
    visibleControls: ['tally', 'tab'],
    narration: `${of(PEEK_RATE)} called a winner, against ${of(FIXED_RATE)} with one look at a fixed horizon, the planned end.`,
    act: 'Open the Result tab.',
    predicate: s => s.view === 'chart',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Each look is another chance for luck. Fix the length first, or use methods built for watching.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'If you look every day and stop on the first good one, who picks the day: the class, or luck?',
  },
];

export default function Peeking() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ day: 0, p1: null, many: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <AbStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            scene: splitAt(RUN, PLAN, state.day),
            chart: state.day === END ? { run: RUN, peek: PEEK.t } : undefined,
            at: state.day,
            caption:
              state.day === PEEK.t
                ? `Day ${state.day + 1}: a significant lead, between identical checkouts.`
                : `Day ${state.day + 1} of ${PLAN.days}.`,
          }}
        />
      )}
      controls={{
        day: ({ state, apply }) => (
          <DayRange id="ab-peek-day" t={state.day} days={PLAN.days} onDay={day => apply({ ...state, day })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`Day ${PLAN.days}: ${pts(FINAL.diff)}, interval ${span(FINAL)}.`}</p>
          </>
        ),
        many: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.many} onClick={() => apply({ ...state, many: true })}>
            {`Run ${N} peeking tests`}
          </button>
        ),
        tally: () => (
          <>
            <Tally verdicts={verdicts(PLAN, 'peek')} label="peeking A/A tests called a winner" />
            <Tally verdicts={verdicts(PLAN, 'fixed')} label="one look at the planned end" />
            <Fact id="peeking" />
            <Fact id="always-valid" />
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
