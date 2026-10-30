// Chapter 3: when the line grows. The sale opens and orders arrive faster than one worker finishes them: the backlog
// grows every minute. The reader predicts it, watches it, then adds workers until it drains (any count that drains it
// in time passes). Inference engineering's batching chapter, where a GPU serves requests together, gets one line.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { JOBS, SCENES, SERVICE, clock, runOf } from '../../lib/queues/sim';
import { WORKERS } from '../../lib/queues/workbench';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Pick, QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '03-when-the-line-grows';
export const PARTS = RAIL_PARTS;
export const runFor = (workers: number) => runOf({ ...SCENES.one, workers });
/** the sale opens at OPEN; the reader watches to LOOK; the backlog must be gone by DRAIN */
export const OPEN = Math.min(...JOBS.filter(j => JOBS.filter(k => k.t === j.t).length > 1).map(j => j.t));
export const RATE = JOBS.filter(j => j.t === OPEN).length;
export const STEP_TO = OPEN + 6,
  LOOK = 20,
  DRAIN = 30;
export const backlogAt = (workers: number, t: number) => runFor(workers).ticks[t].waiting.length;
export const drains = (workers: number) => backlogAt(workers, DRAIN) === 0;
export const FEWEST = WORKERS.find(drains)!;

export const P1 = {
  question: `With one worker, what happens to the backlog by ${clock(LOOK)}?`,
  options: [
    'It keeps growing while the sale lasts',
    'It levels off at a few tickets',
    'It drains: the worker catches up',
  ],
};
export const outcomeOf = () => (backlogAt(1, LOOK) > backlogAt(1, STEP_TO) ? 0 : 1);

export const QUIZ = {
  question:
    'A bakery takes 30 orders an hour, and each baker finishes 10 an hour. How many bakers keep the line from growing?',
  options: ['At least 3', '1, if they hurry at busy times', '2: lines shrink on their own'],
  correct: 0,
  explanation: 'A line stays short only while the service rate keeps up with the arrival rate.',
  why: [
    'Right: 3 bakers finish 30 an hour, as fast as orders come in.',
    'One baker finishes 10 of the 30, so the line grows by 20 every hour.',
    'Two bakers finish 20 of 30; the extra 10 an hour pile up and never shrink.',
  ],
};

interface S {
  t: number;
  workers: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'flood',
    focus: 'stage',
    visibleControls: [],
    narration: `From ${clock(OPEN)}, ${RATE} orders arrive each minute: the arrival rate. One worker’s service rate is one every ${SERVICE.parcel} minutes.`,
    act: `Step to ${clock(STEP_TO)}.`,
    say: { block: 'till', text: 'Sale opens' },
    predicate: s => s.t >= STEP_TO,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The tickets no worker has started are the backlog.',
    act: `Predict the backlog at ${clock(LOOK)}.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Play or step to ${clock(LOOK)}.`,
    say: { block: 'rail', text: 'Backlog' },
    predicate: s => s.p1 !== null && s.t >= LOOK,
  },
  {
    id: 'workers',
    focus: 'workers',
    visibleControls: ['out1', 'workers'],
    narration: `${backlogAt(1, LOOK)} tickets wait at ${clock(LOOK)}. Arrivals beat service, so the line only grows.`,
    act: `Add workers until the rail is empty by ${clock(DRAIN)}.`,
    say: { block: 'workers', text: 'More hands' },
    predicate: s => drains(s.workers),
    hint: `Each worker finishes one order every ${SERVICE.parcel} minutes; ${RATE} arrive each minute.`,
    solution: s => ({ ...s, workers: FEWEST, t: DRAIN }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `With ${FEWEST} workers the service rate nearly matches the arrival rate, so the backlog drains after the rush.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many orders an hour can each baker finish?',
  },
];

export default function WhenTheLineGrows() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, workers: 1, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.workers);
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
              caption: `${clock(state.t)}, ${state.workers} worker${state.workers === 1 ? '' : 's'}: the line at the rail.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        workers: ({ state, apply }) => (
          <>
            <Pick
              id="qu-workers3"
              name="Workers"
              value={state.workers}
              values={WORKERS}
              unit="worker"
              onChange={workers => apply({ ...state, workers, t: DRAIN })}
            />
            <p className="note qu-note">
              {`Rail at ${clock(DRAIN)}: ${backlogAt(state.workers, DRAIN)} waiting. `}An AI chip serves many requests
              in one go instead: see <a href="/inference/03-batching/">Batching</a>.
            </p>
            <Fact id="littles-law" />
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
