// Chapter 1: waiting at the till. The till does each order's work inside the request, two customers at a time; the
// reader steps into the sale, predicts how long the slowest page has waited, sees the line at the till, then the jobs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, SERVICE, clock, runOf, type Run } from '../../lib/queues/sim';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '01-waiting-at-the-till';
export const PARTS = RAIL_PARTS;
export const RUN = runOf(SCENES.inline);
/** the first minute of the flood the reader steps to, and the minute the prediction is about */
export const FLOOD = 10,
  LOOK = 16;
/** The longest any customer's page has waited by minute t: done orders to their answer, the rest until now. */
export const pageWaitAt = (r: Run, t: number) =>
  Math.max(
    0,
    ...r.jobs
      .filter(j => j.job.t <= t)
      .map(j => (j.doneAt !== undefined && j.doneAt <= t ? j.doneAt : t) + 1 - j.job.t),
  );

export const P1 = {
  question: `At ${clock(LOOK)}, how long has the slowest customer stared at their page?`,
  options: [
    'Under a minute: the till is quick',
    `About ${SERVICE.parcel} minutes: one order’s work`,
    'Many minutes: they wait for everyone ahead',
  ],
};
export const outcomeOf = () => (pageWaitAt(RUN, LOOK) > SERVICE.parcel + 1 ? 2 : pageWaitAt(RUN, LOOK) > 1 ? 1 : 0);

export const QUIZ = {
  question:
    'A photo site resizes every upload before the page says “Uploaded”. On a busy evening, what do its users see?',
  options: [
    'Uploads that hang, longer the busier it gets',
    'Faster uploads, since the server is warmed up',
    'No change: resizing is quick',
  ],
  correct: 0,
  explanation: 'Work done inside the request makes every user wait for it, and for everyone ahead of them.',
  why: [
    'Right: each page waits for its own resize and for the uploads queued before it.',
    'A busy server has more to do, so each request waits longer, not shorter.',
    'Quick alone is not quick in a crowd: the waits add up behind each other.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'flood',
    focus: 'stage',
    visibleControls: [],
    narration: 'Each order is a request. The till books the courier, prints and emails inline, then answers.',
    act: `Press Step or Play to ${clock(FLOOD)}.`,
    say: { block: 'till', text: 'Does it all' },
    predicate: s => s.t >= FLOOD,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The till serves ${RUN.policy.workers} customers at a time; the rest wait in line, pages spinning.`,
    act: 'Predict the slowest wait.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Step to ${clock(LOOK)}.`,
    say: { block: 'till', text: 'In line' },
    predicate: s => s.p1 !== null && s.t >= LOOK,
  },
  {
    id: 'reveal',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `The slowest page has waited ${pageWaitAt(RUN, LOOK)} minutes: its own work, plus everyone’s ahead of it.`,
    act: 'Open the Jobs tab.',
    predicate: s => s.view === 'jobs',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Nothing was lost, but every customer paid for everyone else’s slow work.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a crowd make each request faster or slower?',
  },
];

export default function WaitingAtTheTill() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <QueuesStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTick={t => sync({ ...state, t, view: 'scene' })}
          show={{
            scene: railAt(RUN, state.t),
            result: RUN,
            tick: state.t,
            caption: `${clock(state.t)}. Slowest page so far: ${pageWaitAt(RUN, state.t)} min.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'jobs' })}>
            Open the Jobs tab
          </button>
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
