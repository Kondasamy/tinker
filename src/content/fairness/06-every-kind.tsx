// Chapter 6: you can't have every kind. From chapter 5's even pair, the reader opens the Bars tab (precision differs),
// predicts whether any bar pair makes precision, false approvals and false declines all match, then runs the search:
// none on the whole grid, except bars so high they approve almost nobody (pinned). Chouldechova and Kleinberg et al.
// proved it holds whenever base rates differ; the search shows it here.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import { GRID, type Bars } from '../../lib/fairness/metrics';
import { REGION_NAMES, runOf } from '../../lib/fairness/story';
import pinned from '../../../data/fairness/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { ApplicantsNote, Fact, GateStage, bar2, pct, type View } from './kit';

const MODULE = 'fairness',
  ID = '06-every-kind';
export const PARTS = GATE_PARTS;
const { A, B } = REGION_NAMES;
const EVEN = pinned.even.bars as Bars;
const E = runOf('all', 'none', EVEN);
/** every bar pair the search tries */
export const PAIRS = GRID.length ** 2;
/** the search's pinned result: no pair, but for bars that approve at most this share */
export const FOUND = pinned.equal;

export interface S {
  bars: Bars;
  view: View;
  p1: number | null;
  searched: boolean;
  quiz: number | null;
}

export const P1 = {
  question: 'Is there a pair of bars where precision, false approvals and false declines all match within a point?',
  options: ['None that approves more than a few', 'Yes, several', 'Yes, exactly one'],
};
/** none, but the trivial ones (pinned: no non-trivial pairs) */
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'Two groups repay at different rates. A vendor promises a score that is fair by every measure at once. What do you ask?',
  options: [
    'Which measure it gave up, since they can’t all hold',
    'Nothing: a good vendor can manage it',
    'Only for its overall accuracy',
  ],
  correct: 0,
  explanation: 'With different base rates, equal precision and equal error rates of both kinds can’t all hold.',
  why: [
    'Right: something had to give, and the buyer should know which kind of fairness it bought.',
    'No skill gets round it: the clash is arithmetic, proved for any score when base rates differ.',
    'Overall accuracy says nothing about which group carries the errors.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'tab',
    focus: 'view',
    visibleControls: [],
    narration: `At ${bar2(EVEN.A)} and ${bar2(EVEN.B)}, false declines match, but precision doesn’t: ${pct(E.A.precision ?? 0)} of ${A}’s approvals repaid, ${pct(E.B.precision ?? 0)} of ${B}’s.`,
    act: 'Open Bars.',
    say: { block: 'post-a', text: `${A} bar` },
    predicate: s => s.view === 'bars',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Move either bar and watch the four pairs of bars. Then commit.',
    act: 'Predict first.',
    say: { block: 'post-b', text: `${B} bar` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'search',
    focus: 'search',
    visibleControls: ['search'],
    narration: `A search can try every pair of bars from ${bar2(GRID[0])} to ${bar2(GRID[GRID.length - 1])}, a hundredth apart.`,
    act: 'Search every pair.',
    predicate: s => s.searched,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'found', 'quiz'],
    narration: `None of ${PAIRS.toLocaleString('en-US')} pairs, except bars so high they approve ${pct(FOUND.trivialMaxApproved)} or fewer. Proofs call this an impossibility result.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can every kind hold at once when the groups repay at different rates?',
  },
];

export default function EveryKind() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bars: EVEN, view: 'scene', p1: null, searched: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const m = runOf('all', 'none', state.bars);
        const prec = (x: number | null) => (x === null ? 'none approved' : pct(x));
        return (
          <GateStage
            bars={state.bars}
            linked={false}
            onBars={bars => sync({ ...state, bars })}
            view={state.view}
            onView={view => (focus === 'view' ? apply : sync)({ ...state, view })}
            say={say}
            step={focus}
            caption={`Approved who repaid: ${A} ${prec(m.A.precision)}, ${B} ${prec(m.B.precision)}.`}
          >
            <ApplicantsNote />
          </GateStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        search: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, searched: true })}>
            Search every pair
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        found: () => (
          <>
            <p className="note">
              {`Only ${FOUND.trivialPairs} pairs pass, and each approves ${pct(FOUND.trivialMaxApproved)} or fewer of all applicants: bars so high that no approval goes unrepaid. The proofs below say why this holds whenever base rates differ; the search shows it here.`}
            </p>
            <Fact id="chouldechova" />
            <Fact id="kleinberg" />
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
