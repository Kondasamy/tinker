// Chapter 2: errors group by group. The reader predicts whose repayers are turned down more at the shared bar, opens
// the Bars tab (B's false declines are about three times A's), then lowers the shared bar: the gap narrows, wrong
// decisions rise. Links A/B testing on how big a gap luck alone makes in a small group.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import { gapOf, type Bars } from '../../lib/fairness/metrics';
import { REGION_NAMES, runOf, SHARED } from '../../lib/fairness/story';
import { Outcome } from '../tool-calling/kit';
import { ApplicantsNote, Fact, GateStage, START_BARS, bar2, pct, type View } from './kit';

const MODULE = 'fairness',
  ID = '02-errors-by-group';
export const PARTS = GATE_PARTS;
const { A, B } = REGION_NAMES;
const M = runOf();
/** the lower shared bar the reader tries */
export const LOW = 0.3;
const L = runOf('all', 'none', { A: LOW, B: LOW });
const pts = (x: number) => Math.round(x * 100);

export interface S {
  bars: Bars;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Of the builders who would have repaid, whose are turned down more often at ${bar2(SHARED)}?`,
  options: [`${B}’s, about three times as often`, 'About the same in both', `${A}’s, about twice as often`],
};
/** B's false-decline rate over A's (the chapter test checks it is about three) */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A screening model passes 80% of all applicants. What should the team check next?',
  options: [
    'How often qualified people in each group are screened out',
    'Whether the 80% can be pushed higher',
    'How quickly the model runs',
  ],
  correct: 0,
  explanation: 'The overall pass rate says nothing about who is wrongly screened out; each group’s error rates do.',
  why: [
    'Right: wrongly turning away people who qualify is the error that lands on them, and it can differ by group.',
    'A higher pass rate can still turn away one group’s qualified people more often.',
    'Speed matters to the team, but says nothing about who the model gets wrong.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A dropped bag is a false decline: a builder who would have repaid, turned down.',
    act: 'Predict first.',
    say: { block: 'out-b', text: 'Dropped bags' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'bars',
    focus: 'view',
    visibleControls: ['out1', 'fact'],
    narration: `${B}’s repayers are turned down ${pct(M.B.falseDecline)} of the time, ${A}’s ${pct(M.A.falseDecline)}.`,
    act: 'Open Bars to see every kind.',
    say: { block: 'out-a', text: 'Fewer bags' },
    predicate: s => s.view === 'bars',
  },
  {
    id: 'lower',
    focus: 'bars',
    visibleControls: [],
    narration: `A false approval runs the other way: ${A} ${pct(M.A.falseApprove)}, ${B} ${pct(M.B.falseApprove)}. A lower bar turns fewer down.`,
    act: `Slide the bar down to ${bar2(LOW)}.`,
    predicate: s => s.bars.A === LOW && s.bars.B === LOW,
    hint: 'Either region’s bar moves both while they are linked.',
    solution: s => ({ ...s, bars: { A: LOW, B: LOW } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['luck', 'quiz'],
    narration: `The gap narrows to ${pts(gapOf(L))} points, but wrong decisions rise to ${pct(L.all.error)}. One bar moves both regions together.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which number shows who is turned away wrongly?',
  },
];

export default function ErrorsByGroup() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bars: START_BARS, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const m = runOf('all', 'none', state.bars);
        return (
          <GateStage
            bars={state.bars}
            linked
            onBars={bars => (focus === 'bars' ? apply : sync)({ ...state, bars })}
            view={state.view}
            onView={view => (focus === 'view' ? apply : sync)({ ...state, view })}
            say={say}
            step={focus}
            caption={`Bar ${bar2(state.bars.A)}: repayers turned down, ${A} ${pct(m.A.falseDecline)}, ${B} ${pct(m.B.falseDecline)}.`}
          >
            <ApplicantsNote />
          </GateStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => (
          <>
            <Fact id="nist-frvt" />
            <p className="note">
              {`In these made-up regions, false declines sit about ${Math.round(M.B.falseDecline / M.A.falseDecline)} times apart at one bar while false approvals run the other way: one kind can hide another, so measure both.`}
            </p>
          </>
        ),
        luck: () => (
          <p className="note">
            {`${B} is the smaller region, and a small group’s rates swing with luck. `}
            <a href="/ab-testing/02-luck/">A/B testing’s Luck chapter shows how big a gap luck alone makes.</a>
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
