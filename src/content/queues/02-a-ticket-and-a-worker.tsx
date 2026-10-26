// Chapter 2: a ticket and a worker. The till only hangs a ticket on the rail and answers at once; one worker takes the
// jobs off the rail one at a time. The reader predicts when the second customer's page answers, then sees the job done
// later, in the back.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { JOBS, SCENES, WORKER_NAMES, clock, resultOf, runOf } from '../../lib/queues/sim';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '02-a-ticket-and-a-worker';
export const PARTS = RAIL_PARTS;
export const RUN = runOf(SCENES.one);
/** the second order of the morning: whose page the reader predicts */
export const BEN = JOBS[1];
export const DONE = resultOf(RUN, BEN.id).doneAt! + 1;
const WORKER = WORKER_NAMES[0];

export const P1 = {
  question: `${BEN.who} orders at ${clock(BEN.t)}. When does the page say “Order received”?`,
  options: [
    `At once, at ${clock(BEN.t)}`,
    `At ${clock(DONE)}, when the parcel is packed`,
    `Whenever ${WORKER} is free`,
  ],
};
export const outcomeOf = () => (RUN.jobs.every(j => j.pageWait === undefined) ? 0 : 1);

export const QUIZ = {
  question: 'A clinic’s website books an appointment, then sends a reminder text. Where should sending the text go?',
  options: [
    'On a queue, so the booking page answers at once',
    'Inside the request, so the page waits for the text',
    'Nowhere: skip the text when the site is busy',
  ],
  correct: 0,
  explanation: 'Slow work that the person doesn’t need to wait for goes on a queue; the page answers at once.',
  why: [
    'Right: the booking is saved, the page answers, and a worker sends the text a moment later.',
    'Then every patient waits for the text service, and a slow one hangs the booking page.',
    'A queue keeps the job until a worker is free, so busy times delay the text instead of losing it.',
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
    id: 'ticket',
    focus: 'stage',
    visibleControls: [],
    narration: 'Now the till hangs each order’s job on a queue, the rail, and answers the customer straight away.',
    act: `Step to ${clock(1)}.`,
    say: { block: 'rail', text: 'The queue' },
    predicate: s => s.t >= 1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${WORKER}, the one worker, takes jobs off the rail one at a time.`,
    act: `Predict ${BEN.who}’s page.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Step to ${clock(DONE)}.`,
    say: { block: 'workers', text: 'One at a time' },
    predicate: s => s.p1 !== null && s.t >= DONE,
  },
  {
    id: 'reveal',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `${BEN.who}’s page answered at once; ${WORKER} finished the parcel by ${clock(DONE)}. The wait moved off the customer.`,
    act: 'Open the Jobs tab.',
    predicate: s => s.view === 'jobs',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Every order is a row: on the rail, being packed, or done.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the patient need to wait for the text to be sent?',
  },
];

export default function ATicketAndAWorker() {
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
            caption: `${clock(state.t)}. The till answers every order at once.`,
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
