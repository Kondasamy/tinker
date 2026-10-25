// Chapter 4: three-way merge. Main has Tom's hinge change and the sale branch Mira's drill press change, on different
// lines. The reader predicts whether Git can combine them, sees the merge base, merges, and gets a merge crate on two
// rails holding both changes.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BRANCHES, NAME, tip } from '../../lib/git/graph';
import { BEFORE_CLEAN, CLEAN } from '../../lib/git/story';
import { YARD_PARTS, yardOf } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, Fact, GitStage, PageText, type View } from './kit';

const MODULE = 'git',
  ID = '04-three-way-merge';
export const PARTS = YARD_PARTS;
const TOM = NAME[BRANCHES.hinge.by],
  MIRA = NAME[BRANCHES.sale.by];

export const P1 = {
  question: 'Both changed the page since they split. Can Git merge them on its own?',
  options: [
    'Yes: they changed different lines',
    'No: both changed the same file, so a person must choose',
    'Only by dropping one of the two changes',
  ],
};
export const outcomeOf = () => (CLEAN.merged!.conflicts.length === 0 ? 0 : 1);

export const QUIZ = {
  question:
    'Two writers share a report: one fixes the introduction, the other the conclusion, on separate branches. Why can Git merge it without asking?',
  options: [
    'Against their shared starting version, each part changed on one side only',
    'Git keeps the longer version',
    'Git keeps whichever version was saved last',
  ],
  correct: 0,
  explanation: 'The merge base shows which side changed each part, so each one-sided change is simply taken.',
  why: [
    'Right: with the base to compare against, each edit belongs to one side, and Git takes it.',
    'Git never picks a whole version by length; it combines changes line by line.',
    'Time doesn’t decide a merge; the base comparison does.',
  ],
};

interface S {
  p1: number | null;
  merged: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${TOM} raised the hinge price on main; ${MIRA}’s sale changed the drill press line.`,
    act: 'Predict whether Git can combine them.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'merge',
    focus: 'merge',
    visibleControls: ['p1', 'merge'],
    narration: 'Your pick is locked. Git compares both sides with their merge base, the newest crate both share.',
    act: 'Merge sale into main.',
    say: { block: 'base', text: 'Merge base' },
    predicate: s => s.p1 !== null && s.merged,
  },
  {
    id: 'two-parents',
    focus: 'tab',
    visibleControls: ['out1', 'page', 'tab'],
    narration:
      'Each line changed on one side only, so this three-way merge took both. The merge commit has two parents.',
    act: 'Open the Graph tab.',
    say: { block: 'tip', text: 'Two parents' },
    predicate: s => s.view === 'graph',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Without the base, Git couldn’t tell an edit from an untouched line.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does comparing with the shared starting version tell Git?',
  },
];

export default function ThreeWayMerge() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, merged: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = state.merged ? CLEAN.repo : BEFORE_CLEAN,
          o = { base: CLEAN.base, ...(state.merged ? { lit: [r.refs.main] } : {}) };
        return (
          <GitStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              yard: yardOf(r, o),
              repo: r,
              graph: o,
              caption: state.merged ? 'The merge crate, on two rails.' : 'Main and sale, split at the merge base.',
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        merge: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, merged: true, view: 'scene' })}>
            Merge sale into main
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        page: () => <PageText text={tip(CLEAN.repo).text} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'graph' })}>
            Open the Graph tab
          </button>
        ),
        fact: () => (
          <>
            <Fact id="three-way" />
            <Commands lines={['git switch main', 'git merge sale']} />
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
