// Chapter 6: rewriting history. Tom's shelf branch started before main took the hinge change. The reader predicts
// whether his commits keep their names, rebases shelf onto main, and sees new crates with new stamps on top of main and
// the old ones left behind, pale; then the rule: never rebase commits others have.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BRANCHES, NAME } from '../../lib/git/graph';
import { BEFORE_REBASE, REBASED } from '../../lib/git/story';
import { YARD_PARTS, yardOf } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, Fact, GitStage, type View } from './kit';

const MODULE = 'git',
  ID = '06-rewriting-history';
export const PARTS = YARD_PARTS;
const TOM = NAME[BRANCHES.shelf.by];
const N = BRANCHES.shelf.commits.length;

export const P1 = {
  question: `After the rebase, do ${TOM}’s ${N} commits keep their names?`,
  options: ['No: they all get new names', 'Yes: their changes are the same', 'Only the first one gets a new name'],
};
/** replayed commits whose name changed */
export const renamed = () => REBASED.rewritten.filter(([a, b]) => a !== b).length;
export const outcomeOf = () => (renamed() === N ? 0 : renamed() === 0 ? 1 : 2);

export const QUIZ = {
  question: 'You shared a branch yesterday and two colleagues built on it. Should you rebase it today?',
  options: [
    'No: their work builds on commits the rebase would replace',
    'Yes: a rebase keeps the same commits',
    'Yes, as long as the changes are small',
  ],
  correct: 0,
  explanation: 'A rebase makes new commits; work built on the old ones is left pointing at commits no branch has.',
  why: [
    'Right: leave shared commits alone, and merge instead.',
    'A rebase replaces the commits with new ones, new names and all.',
    'Size doesn’t matter: even a one-line commit gets a new name when it moves.',
  ],
};

interface S {
  p1: number | null;
  rebased: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A rebase would move ${TOM}’s shelf work on top of today’s main, as if he started it now.`,
    act: 'Predict what happens to his crates.',
    say: { block: 'tip', text: 'Main moved on' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'rebase',
    focus: 'rebase',
    visibleControls: ['p1', 'rebase'],
    narration: 'Your pick is locked. A rebase will replay each shelf commit, one at a time, on main’s newest crate.',
    act: 'Rebase shelf onto main.',
    predicate: s => s.p1 !== null && s.rebased,
  },
  {
    id: 'new-crates',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: 'New parents, new names: the same changes in new crates. The old crates are left behind, pale.',
    act: 'Open the Graph tab.',
    predicate: s => s.view === 'graph',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Anyone who built on the old crates now holds commits no branch has. Rebase only work nobody else has.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What do your colleagues’ commits point at after the rebase?',
  },
];

export default function RewritingHistory() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, rebased: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = state.rebased ? REBASED.repo : BEFORE_REBASE,
          o = state.rebased ? { lit: REBASED.rewritten.map(([, n]) => n) } : {};
        return (
          <GitStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              yard: yardOf(r, o),
              repo: r,
              graph: o,
              caption: state.rebased
                ? 'Shelf replayed on main: new crates, the old ones left behind.'
                : 'Shelf split from main before the hinge change.',
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        rebase: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, rebased: true, view: 'scene' })}>
            Rebase shelf onto main
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'graph' })}>
            Open the Graph tab
          </button>
        ),
        fact: () => (
          <>
            <Fact id="rebase-rule" />
            <Commands lines={['git switch shelf', 'git rebase main']} />
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
