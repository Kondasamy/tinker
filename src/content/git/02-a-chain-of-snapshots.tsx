// Chapter 2: a chain of snapshots. The reader commits Mira's bracket change and sees a new crate chained to its parent,
// predicts what rewording the first commit's message does, rewords it, and watches every crate re-stamped.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { NAME, REPO, tip } from '../../lib/git/graph';
import { short } from '../../lib/git/objects';
import { BASE, NEXT, REWORDED } from '../../lib/git/story';
import { YARD_PARTS, yardOf } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, DiffText, Fact, GitStage, RepoNote, type View } from './kit';

const MODULE = 'git',
  ID = '02-a-chain-of-snapshots';
export const PARTS = YARD_PARTS;
const BY = NAME[REPO.next.by as 'mira'];

export const P1 = {
  question: 'You reword the first commit’s message. Which crates get new names?',
  options: ['Every crate, the first to the newest', 'Only the first crate', 'None: a message isn’t part of the name'],
};
/** crates whose name changed when the first message was reworded */
export const renamed = () => NEXT.order.filter((id, i) => id !== REWORDED.order[i]).length;
export const outcomeOf = () => (renamed() === NEXT.order.length ? 0 : renamed() === 1 ? 1 : 2);

export const QUIZ = {
  question:
    'A teammate edits a commit from last month in their own copy and says nobody will notice. What gives it away?',
  options: [
    'Every later commit’s name changes, so their newest name no longer matches yours',
    'Nothing: Git only checks the newest commit',
    'Only the old commit’s date',
  ],
  correct: 0,
  explanation: 'Each commit holds its parent’s name, so a changed past changes every name after it.',
  why: [
    'Right: the names chain, so comparing the newest names is enough to see the past differs.',
    'The newest name covers its parent’s name, which covers its parent’s, all the way back.',
    'The date is one field among many; the change shows up in every later name.',
  ],
};

interface S {
  committed: boolean;
  p1: number | null;
  reworded: boolean;
  view: View;
  quiz: number | null;
}

const repoOf = (s: S) => (s.reworded ? REWORDED : s.committed ? NEXT : BASE);

export const STEPS: Step<S>[] = [
  {
    id: 'commit',
    focus: 'commit',
    visibleControls: ['change', 'commit'],
    narration: 'A commit seals a snapshot of the whole page with its parent’s name, who, when and why.',
    act: `Commit ${BY}’s bracket price.`,
    say: { block: 'tip', text: 'Newest crate' },
    predicate: s => s.committed,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The new crate names its parent, ${short(tip(BASE).id)}, inside it. Each crate chains to the one before.`,
    act: 'Predict what rewording the first message does.',
    say: { block: 'tip', text: 'New crate' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reword',
    focus: 'reword',
    visibleControls: ['p1', 'reword'],
    narration: 'Your pick is locked.',
    act: 'Reword the first commit’s message.',
    say: { block: 'root', text: 'First commit' },
    predicate: s => s.p1 !== null && s.reworded,
  },
  {
    id: 'ripple',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `All ${renamed()} names changed: each commit holds its parent’s name, so one change ripples down the chain.`,
    act: 'Open the Graph tab.',
    say: { block: 'tip', text: 'Renamed too' },
    predicate: s => s.view === 'graph',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'To change the past unnoticed, you would have to forge every name after it.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does each commit carry about the one before it?',
  },
];

export default function AChainOfSnapshots() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ committed: false, p1: null, reworded: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = repoOf(state);
        const lit = state.reworded ? r.order : state.committed ? [r.refs.main] : [];
        return (
          <GitStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              yard: yardOf(r, { lit }),
              repo: r,
              graph: { lit },
              caption: state.reworded
                ? 'The first message reworded: every crate re-stamped.'
                : state.committed
                  ? `${BY}’s commit, chained to its parent.`
                  : 'Three commits on main.',
            }}
          />
        );
      }}
      controls={{
        change: () => <DiffText from={REPO.history.at(-1)!.text} to={REPO.next.text} />,
        commit: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, committed: true })}>
            Commit it
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reword: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, reworded: true, view: 'scene' })}>
            {`Reword “${REPO.history[0].message}” to “${REPO.reword}”`}
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
            <Fact id="commit" />
            <Commands lines={['git commit -m "…"', 'git cat-file -p HEAD']} />
            <RepoNote />
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
