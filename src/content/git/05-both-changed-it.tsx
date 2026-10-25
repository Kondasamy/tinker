// Chapter 5: both changed it. Tom raised the drill press price on main while the sale branch cut it. The reader
// predicts, merges, meets the conflict crate (lid off, both sides' papers showing), and resolves it by choosing the
// sale's line, the owner's call; the merge commit is made with that choice.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BRANCHES, NAME, tip } from '../../lib/git/graph';
import type { Side } from '../../lib/git/merge';
import { BEFORE_CONFLICT, conflictMerge } from '../../lib/git/story';
import { YARD_PARTS, yardOf } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, Fact, GitStage, PageText, type View } from './kit';

const MODULE = 'git',
  ID = '05-both-changed-it';
export const PARTS = YARD_PARTS;
const TOM = NAME[BRANCHES.rise.by];
/** the merge before anyone chooses: its one conflict hunk */
export const PENDING = conflictMerge('theirs');
export const HUNK = PENDING.merged!.conflicts[0];
const line = (l: string[]) => l.join('').trim();
/** the owner's call: the sale runs this week, so the sale branch's line */
export const RIGHT: Side = 'theirs';
export const SIDES: [Side, string][] = [
  ['ours', `Keep main’s line: ${line(HUNK.ours)}`],
  ['theirs', `Keep sale’s line: ${line(HUNK.theirs)}`],
  ['both', 'Keep both lines'],
];

export const P1 = {
  question: 'Both changed the same line, differently. What does Git do?',
  options: ['Stops, and a person chooses', 'Keeps the newer change', 'Keeps main’s change'],
};
export const outcomeOf = () => (PENDING.merged!.conflicts.length > 0 ? 0 : 1);

export const QUIZ = {
  question: 'Two editors change the same headline differently on two branches. What happens when they merge?',
  options: [
    'Git stops, and a person picks the headline',
    'Git keeps the headline saved last',
    'Git quietly keeps both headlines and moves on',
  ],
  correct: 0,
  explanation: 'The same part changed two ways gives Git no rule to follow, so it marks both and waits.',
  why: [
    'Right: Git marks the clash with both sides and the base, and a person decides.',
    'Git doesn’t pick by time; a later save isn’t a better answer.',
    'Keeping both is a choice a person can make, but Git never makes it on its own.',
  ],
};

interface S {
  p1: number | null;
  tried: boolean;
  pick: Side | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${TOM} raised the drill press on main; the sale branch cut it. Same line, two answers.`,
    act: 'Predict what the merge does.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'try',
    focus: 'try',
    visibleControls: ['p1', 'try'],
    narration: 'Your pick is locked.',
    act: 'Merge sale into main.',
    say: { block: 'base', text: 'Merge base' },
    predicate: s => s.p1 !== null && s.tried,
  },
  {
    id: 'resolve',
    focus: 'sides',
    visibleControls: ['out1', 'hunk', 'sides'],
    narration: 'A conflict: the crate stays open until a person chooses. The owner says the sale runs this week.',
    act: 'Keep the right line.',
    say: { block: 'tip', text: 'Conflict' },
    predicate: s => s.pick === RIGHT,
    hint: 'The sale branch holds the sale price.',
    solution: s => ({ ...s, pick: RIGHT }),
  },
  {
    id: 'resolved',
    focus: 'tab',
    visibleControls: ['page', 'tab'],
    narration: 'Resolved: the merge commit keeps the sale price, with both lines of history behind it.',
    act: 'Open the Graph tab.',
    say: { block: 'tip', text: 'Resolved' },
    predicate: s => s.view === 'graph',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Git merges what it can tell apart, and asks about the rest.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can Git tell which headline is right?',
  },
];

export default function BothChangedIt() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, tried: false, pick: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const done = state.pick !== null && state.pick === RIGHT,
          r = !state.tried ? BEFORE_CONFLICT : conflictMerge(state.pick ?? 'theirs').repo;
        const o = {
          base: PENDING.base,
          ...(state.tried && !done ? { conflict: r.refs.main } : {}),
          ...(done ? { lit: [r.refs.main] } : {}),
        };
        return (
          <GitStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              yard: yardOf(r, o),
              repo: r,
              graph: o,
              caption: done
                ? 'The conflict resolved: the merge crate sealed.'
                : state.tried
                  ? 'A conflict: the crate waits, lid off.'
                  : 'Main and sale, both changed the drill press.',
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        try: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, tried: true, view: 'scene' })}>
            Merge sale into main
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        hunk: () => <PageText merged={PENDING.merged} names={['main', 'sale']} />,
        sides: ({ state, apply }) => (
          <div className="gt-row" role="group" aria-label="Resolve the conflict">
            {SIDES.map(([side, label]) => (
              <button
                key={side}
                type="button"
                className="chip"
                aria-pressed={state.pick === side}
                onClick={() => apply({ ...state, pick: side })}
              >
                {label}
              </button>
            ))}
          </div>
        ),
        page: () => <PageText text={tip(conflictMerge(RIGHT).repo).text} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'graph' })}>
            Open the Graph tab
          </button>
        ),
        fact: () => (
          <>
            <Fact id="conflict" />
            <Commands lines={['git merge sale', '# edit prices.txt, then', 'git add prices.txt', 'git commit']} />
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
