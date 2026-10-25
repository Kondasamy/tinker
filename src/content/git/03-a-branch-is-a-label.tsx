// Chapter 3: a branch is a label. The reader predicts what making a branch copies, makes Mira's sale branch (a new
// flag on the same crate, the HEAD lantern moving to it), commits the sale and watches only the sale flag move.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BRANCHES } from '../../lib/git/graph';
import { BASE, BRANCHED, SALE } from '../../lib/git/story';
import { YARD_PARTS, yardOf } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, DiffText, Fact, GitStage, type View } from './kit';

const MODULE = 'git',
  ID = '03-a-branch-is-a-label';
export const PARTS = YARD_PARTS;
const SALE_COMMIT = BRANCHES.sale.commits[0];

export const P1 = {
  question: 'How many new crates does making the branch add?',
  options: ['None: it is a new name on a crate that exists', 'One copy of the newest crate', 'A copy of every crate'],
};
export const added = () => BRANCHED.order.length - BASE.order.length;
export const outcomeOf = () => (added() === 0 ? 0 : added() === 1 ? 1 : 2);

export const QUIZ = {
  question: 'A teammate deletes a branch whose work was merged into main last week. What happens to those commits?',
  options: [
    'Nothing: main still reaches them; only the label is gone',
    'They are deleted from main too',
    'Main goes back to before the merge',
  ],
  correct: 0,
  explanation: 'A branch is a label; deleting it removes the label, not the commits main reaches.',
  why: [
    'Right: the commits are part of main’s chain, whatever labels point at them.',
    'Main’s history is the chain behind main’s commit, and nothing in it changed.',
    'Main still points at the same commit; another label just went away.',
  ],
};

interface S {
  p1: number | null;
  branched: boolean;
  committed: boolean;
  view: View;
  quiz: number | null;
}

const repoOf = (s: S) => (s.committed ? SALE : s.branched ? BRANCHED : BASE);

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'To try the sale safely, a new branch, a separate line of work, starts from main’s newest crate.',
    act: 'Predict what making it adds.',
    say: { block: 'tip', text: 'Main is here' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'branch',
    focus: 'branch',
    visibleControls: ['p1', 'branch'],
    narration: 'Your pick is locked.',
    act: 'Make the sale branch.',
    predicate: s => s.p1 !== null && s.branched,
  },
  {
    id: 'label',
    focus: 'commit',
    visibleControls: ['out1', 'fact', 'change', 'commit'],
    narration: 'No new crate: a branch is just a flag. HEAD, the lantern, marks the branch you are on.',
    act: 'Commit the sale.',
    say: { block: 'head', text: 'HEAD' },
    predicate: s => s.committed,
  },
  {
    id: 'moved',
    focus: 'tab',
    visibleControls: ['tab'],
    narration: 'The sale flag moved up to the new crate; main’s flag stayed. The live page keeps the old price.',
    act: 'Open the Graph tab.',
    say: { block: 'tip', text: 'Flag moved' },
    predicate: s => s.view === 'graph',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Making, moving or deleting a branch moves a label, never the crates.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does main’s chain of crates depend on the label?',
  },
];

export default function ABranchIsALabel() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, branched: false, committed: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = repoOf(state),
          lit = state.committed ? [r.refs.sale] : [];
        return (
          <GitStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              yard: yardOf(r, { lit }),
              repo: r,
              graph: { lit },
              caption: state.committed
                ? 'The sale committed on its branch; main unchanged.'
                : state.branched
                  ? 'A new flag on the same crate, HEAD with it.'
                  : 'Main, three commits.',
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        branch: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, branched: true, view: 'scene' })}>
            Make the sale branch
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => (
          <>
            <Fact id="branch-41" />
            <Commands lines={['git switch -c sale']} />
          </>
        ),
        change: () => <DiffText from={BASE.commits[BASE.refs.main].text} to={SALE_COMMIT.text} />,
        commit: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, committed: true, view: 'scene' })}>
            {`Commit “${SALE_COMMIT.message}”`}
          </button>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'graph' })}>
            Open the Graph tab
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
