// Chapter 5: back it out. The saved-cards change moved card data into a new table. The reader predicts whether the
// lever can bring the old version back, pulls it and is refused, switches on expand and contract (the old table kept
// beside the new), and the same pull now rolls back.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, changeOf, clock, plural, runOf, tickOf, type Event } from '../../lib/releases/sim';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, ReleasesStage, SimNote, type View } from './kit';

const MODULE = 'releases',
  ID = '05-back-it-out';
export const PARTS = SIGNAL_PARTS;
export const CARDS = changeOf(SCENES.migration.change);
export const OPEN = SCENES.migration.start + 2;
export const runFor = (events: Event[], expand: boolean) => runOf({ ...SCENES.migration, events, expand });

export const P1 = {
  question: 'Card data now lives in a new table. Can the rollback lever bring the old version back?',
  options: [
    'Yes, in the usual minutes',
    'No: the old version can’t read the moved data',
    'Yes, but every saved card is lost',
  ],
};
export const outcomeOf = () => (runFor([{ t: OPEN, kind: 'back' }], false).refusedAt !== null ? 1 : 0);

export const QUIZ = {
  question:
    'A team renames a database column and ships code that reads only the new name. What would have kept a way back?',
  options: [
    'Add the new column beside the old, use both, remove the old one later',
    'Rename it at night, when fewer people use the site',
    'Skip the rollback plan and ship a fix instead',
  ],
  correct: 0,
  explanation: 'Expand and contract keeps the old version working until everyone has moved.',
  why: [
    'Right: while both columns exist, the old code still works, so rolling back is safe.',
    'Fewer users at night still meet the broken old code if you roll back.',
    'Shipping a fix means customers wait for it to be written; a rollback is faster.',
  ],
};

interface S {
  t: number;
  events: Event[];
  expand: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}
const pulled = (s: S) => s.events.some(e => e.kind === 'back');

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The ${CARDS.short} change also moved card data into a new table: a migration.`,
    act: 'Predict whether the lever can undo it.',
    say: { block: 'new', text: 'New table' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'lever',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. Failures are climbing.',
    act: 'Pull the rollback lever.',
    say: { block: 'box', text: 'The lever' },
    predicate: pulled,
    solution: s => ({ ...s, events: [...s.events, { t: s.t, kind: 'back' }] }),
  },
  {
    id: 'expand',
    focus: 'expand',
    visibleControls: ['out1', 'expand'],
    narration: 'Refused. Expand and contract fixes it: keep the old table beside the new one, and write to both.',
    act: 'Switch on expand and contract.',
    say: { block: 'box', text: 'Refused' },
    predicate: s => s.expand,
  },
  {
    id: 'back',
    focus: 'stage',
    visibleControls: ['expand'],
    narration: 'The old version still finds its data, so the same pull now rolls back.',
    act: 'Step until the new track is empty.',
    predicate: s => {
      const r = runFor(s.events, s.expand);
      return s.expand && r.safeAt !== null && s.t >= r.safeAt;
    },
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Contract, removing the old table, waits until no version needs it. Plan the way back before you ship.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which answer keeps the old code working?',
  },
];

export default function BackItOut() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: OPEN, events: [], expand: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => {
        const r = runFor(state.events, state.expand);
        return (
          <ReleasesStage
            run={r}
            t={state.t}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            // the clock waits for the pull, so the refusal lands at the minute the chapter opens on
            {...(pulled(state) ? { onTick: (t: number) => sync({ ...state, t }) } : {})}
            {...(state.p1 !== null && !pulled(state)
              ? { onBack: () => apply({ ...state, events: [...state.events, { t: state.t, kind: 'back' }] }) }
              : {})}
            caption={`${clock(state.t)}. ${plural(tickOf(r, state.t).hurtSoFar, 'customer')} hurt so far.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        expand: ({ state, apply }) => (
          <>
            <label className="rl-row">
              <input
                type="checkbox"
                checked={state.expand}
                onChange={e => apply({ ...state, expand: e.target.checked })}
              />{' '}
              Expand and contract: keep the old table too
            </label>
            <Fact id="parallel-change" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <SimNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
