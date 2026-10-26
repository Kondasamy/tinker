// Chapter 6: the job that never works. One order's address can't be read, so its job fails every try. Retried at once
// with no limit, it keeps coming back all morning; the reader predicts the count, watches it, then sets the most tries,
// and the job moves to the dead-letter shelf for a person.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POISON, SCENES, clock, resultOf, runOf } from '../../lib/queues/sim';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '06-the-job-that-never-works';
export const PARTS = RAIL_PARTS;
export const runFor = (limit: boolean) => runOf(limit ? SCENES.shelf : SCENES.forever);
export const LIMIT = SCENES.shelf.maxTries;
export const FIRST = POISON.t + 4,
  LOOK = 40;
/** tries Moe's job has had by minute t */
export const triesAt = (limit: boolean, t: number) =>
  Math.max(
    0,
    ...runFor(limit)
      .ticks.slice(0, t + 1)
      .flatMap(k => k.workers.filter(w => w.job === POISON.id).map(w => w.tries ?? 0)),
  );
const WHO = POISON.who;

export const P1 = {
  question: `By ${clock(LOOK)}, how many tries will ${WHO}’s job have had?`,
  options: ['Dozens, and it is still coming back', 'One: the queue drops a failed job', 'A few, then it goes through'],
};
export const outcomeOf = () => (resultOf(runFor(false), POISON.id).tries > 12 ? 0 : 2);

export const QUIZ = {
  question: 'A newsletter job fails for one address that doesn’t exist. What should the queue do with it?',
  options: [
    'Retry a few times, then set it aside for a person',
    'Retry forever: it might work one day',
    'Delete the whole newsletter',
  ],
  correct: 0,
  explanation: 'A job that can never succeed gets a few tries, then waits on the dead-letter queue for a person.',
  why: [
    'Right: retries cover passing failures; a person fixes or drops what can’t ever work.',
    'An address that doesn’t exist never will, so forever just wastes workers.',
    'One bad address shouldn’t cost every other reader their newsletter.',
  ],
};

interface S {
  t: number;
  limit: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'poison',
    focus: 'stage',
    visibleControls: [],
    narration: `${WHO}’s job is a poison job: the courier can’t read the address. It retries at once, with no limit.`,
    act: `Step to ${clock(FIRST)}.`,
    say: { block: 'workers', text: 'Fails again' },
    predicate: s => s.t >= FIRST,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Every try takes a worker away from the good orders for a minute.',
    act: `Predict ${WHO}’s tries.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Play to ${clock(LOOK)}.`,
    predicate: s => s.p1 !== null && s.t >= LOOK,
  },
  {
    id: 'limit',
    focus: 'limit',
    visibleControls: ['out1', 'limit'],
    narration: `${triesAt(false, LOOK)} tries, and it will never work. Stop at ${LIMIT}, then move it to the dead-letter queue.`,
    act: `Limit it to ${LIMIT} tries.`,
    say: { block: 'shelf', text: 'Dead letters' },
    predicate: s => s.limit,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['limit', 'quiz'],
    narration: `${WHO}’s order waits on the shelf for a person to fix the address.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Will a missing address ever start working?',
  },
];

export default function TheJobThatNeverWorks() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: POISON.t, limit: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.limit);
        return (
          <QueuesStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t, view: 'scene' })}
            show={{
              scene: railAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}. ${WHO}’s job: ${triesAt(state.limit, state.t)} tries${r.ticks[state.t].dead.includes(POISON.id) ? ', on the dead-letter shelf' : ''}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        limit: ({ state, apply }) => (
          <>
            <label className="qu-row">
              <input
                type="checkbox"
                checked={state.limit}
                onChange={e => apply({ ...state, limit: e.target.checked })}
              />{' '}
              {`At most ${LIMIT} tries, then the dead-letter shelf`}
            </label>
            <Fact id="dead-letter" />
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
