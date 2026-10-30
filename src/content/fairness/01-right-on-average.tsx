// Chapter 1: right on average. The reader slides the linked bar from 0.70 to the shared 0.50, no worse than any bar
// overall, predicts how the regions compare inside that one number, then opens the Bars tab: close in total, not in
// kind (chapter 2). Links Calibration, which asks whether a score is honest.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import type { Bars } from '../../lib/fairness/metrics';
import { BARS, REGION_NAMES, runOf, SHARED } from '../../lib/fairness/story';
import { Outcome } from '../tool-calling/kit';
import { ApplicantsNote, Caveat, Fact, GateStage, bar2, pct, type View } from './kit';

const MODULE = 'fairness',
  ID = '01-right-on-average';
export const PARTS = GATE_PARTS;
const { A, B } = REGION_NAMES;
const both = (t: number): Bars => ({ A: t, B: t });
const errorAt = (t: number) => runOf('all', 'none', both(t)).all.error;
/** Where the step starts: a strict bar. */
export const FROM = 0.7;
/** The fewest wrong decisions any shared bar makes, and the bars that make it (the test checks SHARED is one). */
export const LEAST = Math.min(...BARS.map(errorAt));
export const BEST = BARS.filter(t => errorAt(t) === LEAST);
const M = runOf();

export interface S {
  bars: Bars;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `${A} is wrong for ${pct(M.A.error)} of its applicants. And ${B}?`,
  options: ['About as often', 'About twice as often', 'About half as often'],
};
/** the ratio of the two regions' error rates decides it (the chapter test checks the band) */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A model is right for 95% of all customers. What does that tell you about one group of them?',
  options: [
    'Little: a group can fare far worse inside a good average',
    'That the group is served about 95% right too',
    'That the group is too small to matter',
  ],
  correct: 0,
  explanation: 'An average blends groups; only measuring each group shows how each one fares.',
  why: [
    'Right: a big group doing well can hide a small group doing badly.',
    'The average blends every group, so one group can sit well below it.',
    'A small group’s errors still land on real people, and the average hides them most easily.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'slide',
    focus: 'bars',
    visibleControls: [],
    narration: 'Each hand-made applicant gets a score for repaying; the check approves any at or above the bar.',
    act: `Slide the bar to ${bar2(SHARED)}, watching wrong decisions.`,
    say: { block: 'check', text: 'The check' },
    predicate: s => s.bars.A === SHARED && s.bars.B === SHARED,
    hint: 'Either region’s bar moves both while they are linked.',
    solution: s => ({ ...s, bars: both(SHARED) }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${pct(LEAST)} wrong: no shared bar does better. Right on average, but two regions hide inside that number.`,
    act: 'Predict first.',
    say: { block: 'counter', text: 'Approved' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'bars',
    focus: 'view',
    visibleControls: ['out1', 'fact'],
    narration: `${A} ${pct(M.A.error)}, ${B} ${pct(M.B.error)}: close. The Bars tab splits each region’s mistakes by kind.`,
    act: 'Open Bars.',
    predicate: s => s.view === 'bars',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['link', 'quiz'],
    narration: 'Close in total, not in kind: look at the first two pairs of bars. Chapter 2 starts there.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can an average show you who carries the errors?',
  },
];

export default function RightOnAverage() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bars: both(FROM), view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <GateStage
          bars={state.bars}
          linked
          onBars={bars => (focus === 'bars' ? apply : sync)({ ...state, bars })}
          view={state.view}
          onView={view => (focus === 'view' ? apply : sync)({ ...state, view })}
          say={say}
          step={focus}
          caption={`Bar ${bar2(state.bars.A)} for both regions: ${pct(runOf('all', 'none', state.bars).all.error)} wrong decisions overall.`}
        >
          <ApplicantsNote />
        </GateStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => (
          <>
            <Fact id="gender-shades" />
            <p className="note">
              {`In that real test the totals split by group; here the made-up regions’ totals sit close, and the split hides inside them.`}
            </p>
          </>
        ),
        link: () => (
          <>
            <p className="note">
              <a href="/calibration/01-what-70-should-mean/">
                Calibration asks whether a score’s 70% means 70%. This module asks who its errors land on.
              </a>
            </p>
            <Caveat />
          </>
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
