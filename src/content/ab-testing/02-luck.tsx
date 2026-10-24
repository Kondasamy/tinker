// Chapter 2: luck. An A/A test (today's checkout against itself) still shows a gap; the reader predicts how many of 100
// A/A tests call a winner, runs them over the seed list and sees the false wins counted live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, SCENARIOS, SEEDS, falseWinRate, resultAt, runOf, verdicts } from '../../lib/ab-testing/sim';
import { SPLIT_PARTS, splitAt } from '../../components/scenes/splitScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { AbStage, Fact, SimNote, Tally, pts, type View } from './kit';

const MODULE = 'ab-testing',
  ID = '02-luck';
export const PARTS = SPLIT_PARTS;
const AA = SCENARIOS.aa,
  END = AA.days - 1,
  LEVEL = ASSUMPTIONS.level;
/** The A/A run shown: the first seed whose gap is at least a point and still not significant. */
export const SEED = SEEDS.find(seed => {
  const r = resultAt(runOf({ ...AA, seed }), END, LEVEL);
  return !r.significant && Math.abs(r.diff) >= 0.01;
})!;
export const PLAN = { ...AA, seed: SEED };
export const RUN = runOf(PLAN);
export const FINAL = resultAt(RUN, END, LEVEL);
export const RATE = falseWinRate(AA, 'fixed');
const N = SEEDS.length,
  IN = Math.round(1 / LEVEL);

export const P1 = {
  question: `Out of ${N} A/A tests, how many will call a winner?`,
  options: [
    'None: identical checkouts can’t really differ',
    `A few, about ${Math.round(N * LEVEL)}: luck crosses the line now and then`,
    'About half',
  ],
};
export const outcomeOf = () => (RATE === 0 ? 0 : RATE < 0.25 ? 1 : 2);

export const QUIZ = {
  question:
    'Two classes are taught the same course the same way. One averages 2 points higher on the exam. What should you think first?',
  options: [
    'It could be noise: identical groups still differ by chance',
    'One class has the better teacher',
    'The exam was unfair to one class',
  ],
  correct: 0,
  explanation: 'Identical groups still differ; a gap has to beat what luck makes before it means anything.',
  why: [
    'Right: like an A/A test, two classes taught alike still land a little apart by chance.',
    'The teaching was the same, so a teacher effect is a story told after seeing the gap.',
    'The same exam went to both, so unfairness can’t explain a gap between them.',
  ],
};

interface S {
  ran: boolean;
  p1: number | null;
  many: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'aa',
    focus: 'run',
    visibleControls: ['run'],
    narration:
      'An A/A test splits shoppers between two identical checkouts. Any gap is noise: luck in who happened to buy.',
    act: 'Run the A/A test.',
    say: { block: 'b', text: 'Same as A' },
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A gap of ${pts(FINAL.diff)}. Significant means a gap bigger than luck makes ${IN - 1} times in ${IN}.`,
    act: 'Predict.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'many',
    focus: 'many',
    visibleControls: ['p1', 'many'],
    narration: 'Your pick is locked.',
    act: `Run ${N} A/A tests.`,
    predicate: s => s.many,
  },
  {
    id: 'tally',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: 'Each red square is a false win: a significant result with nothing behind it.',
    act: 'Open the Result tab.',
    say: { block: 'scoreboard', text: 'Just luck' },
    predicate: s => s.view === 'chart',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'The interval spans zero: luck makes gaps this size. A test calls a gap real only when it’s bigger.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Were the two classes taught differently at all?',
  },
];

export default function Luck() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, p1: null, many: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <AbStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            scene: splitAt(RUN, PLAN, state.ran ? END : -1, { name: 'A again' }),
            chart: state.ran ? { run: RUN, name: 'A again' } : undefined,
            at: END,
            caption: state.ran
              ? `Two identical checkouts, ${pts(FINAL.diff)} apart.`
              : 'The same checkout on both sides.',
          }}
        />
      )}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.ran} onClick={() => apply({ ...state, ran: true })}>
            Run the A/A test
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        many: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.many} onClick={() => apply({ ...state, many: true })}>
            {`Run ${N} A/A tests`}
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Tally verdicts={verdicts(AA, 'fixed')} label="A/A tests called a winner" />
            <Fact id="aa-test" />
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
