// Chapter 5: ran twice. The chapter opens mid-sale with both workers mid-job. The reader knocks one over (the crash
// bar over the rail; Show me knocks over the first), predicts what happens to the dropped job, steps until its lease
// runs out and it runs again (the courier booked twice), then makes the job idempotent. Payments' idempotency key is
// the same idea, one link away.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CRASH_AT, SCENES, SHOWN_CRASH, clock, jobOf, runOf, type Crash } from '../../lib/queues/sim';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '05-ran-twice';
export const PARTS = RAIL_PARTS;
export const LEASE = SCENES.crash.lease;
export const runFor = (crashes: Crash[], idempotent: boolean) => runOf({ ...SCENES.crash, crashes, idempotent });
const CALM = runFor([], false);
/** The job a crash drops: whatever that worker had in hand in that minute. */
export const droppedBy = (c: Crash) => CALM.ticks[c.tick].workers[c.worker].job!;
/** the minute the dropped job is booked a second time (the run counts it) */
export const twiceAt = (crashes: Crash[]) => runFor(crashes, false).ticks.findIndex(k => k.twice > 0);

export const P1 = {
  question: 'Its courier is already booked, but it never said done. What happens to the job?',
  options: [
    'It comes back when the lease runs out, and runs again',
    'It is lost: nobody ever finishes it',
    'Another worker takes it straight away',
  ],
};
export const outcomeOf = (crashes: Crash[] = [SHOWN_CRASH]) => {
  const r = runFor(crashes, false),
    id = droppedBy(crashes[0]);
  return r.jobs.find(j => j.job.id === id)!.runs > 1 ? 0 : 1;
};

export const QUIZ = {
  question:
    'A worker emails a receipt, then crashes before marking the job done. The queue delivers the job again. How do you stop a second email?',
  options: [
    'Record “receipt sent” for the order, and check it first',
    'Make the lease longer, so the job never comes back',
    'Run fewer workers, so crashes are rarer',
  ],
  correct: 0,
  explanation: 'A queue may deliver any job twice, so the job itself must make a second run harmless.',
  why: [
    'Right: the second run sees the receipt was sent and does nothing: the job is idempotent.',
    'A longer lease only delays the second delivery; the crashed job still comes back.',
    'Fewer crashes is still some crashes, and at-least-once delivery can repeat a job anyway.',
  ],
};

interface S {
  t: number;
  crashes: Crash[];
  idempotent: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'crash',
    focus: 'stage',
    visibleControls: [],
    narration: `Both workers are mid-job. A taken job’s lease hides it from the others for ${LEASE} minutes.`,
    act: 'Knock over a busy worker.',
    say: { block: 'workers', text: 'Mid-job' },
    predicate: s => s.crashes.length > 0,
    solution: s => ({ ...s, crashes: [SHOWN_CRASH] }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The worker booked the courier first, then fell before saying done.',
    act: 'Predict what happens to the job.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. The ticket hangs greyed on the rail, hidden by its lease.',
    act: 'Step until the job runs again.',
    say: { block: 'rail', text: 'Hidden' },
    predicate: s => s.p1 !== null && s.crashes.length > 0 && s.t >= twiceAt(s.crashes),
    hint: `The lease runs out ${LEASE} minutes after the job was taken.`,
  },
  {
    id: 'twice',
    focus: 'safe',
    visibleControls: ['out1', 'safe'],
    narration: 'It ran again: at least once, never exactly once. The courier is booked twice.',
    act: 'Make the job idempotent.',
    say: { block: 'courier', text: 'Booked twice' },
    predicate: s => s.idempotent,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['safe', 'quiz'],
    narration: 'Idempotent: the second run checks the order, finds it booked, and books nothing.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which answer makes a second run harmless, rather than rarer?',
  },
];

export default function RanTwice() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: CRASH_AT, crashes: [], idempotent: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => {
        const r = runFor(state.crashes, state.idempotent),
          c = state.crashes[0];
        return (
          <QueuesStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            {...(c
              ? { onTick: (t: number) => sync({ ...state, t, view: 'scene' }) }
              : { onCrash: (worker: number) => apply({ ...state, crashes: [{ worker, tick: state.t }] }) })}
            show={{
              scene: railAt(r, state.t),
              result: r,
              tick: state.t,
              caption: c
                ? `${clock(state.t)}. ${jobOf(droppedBy(c)).who}’s order: ${r.jobs.find(j => j.job.id === droppedBy(c))!.runs} run${r.jobs.find(j => j.job.id === droppedBy(c))!.runs === 1 ? '' : 's'} so far.`
                : `${clock(state.t)}. Both workers are mid-job.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.crashes)} />
            <Fact id="lease-crash" />
          </>
        ),
        safe: ({ state, apply }) => (
          <>
            <label className="qu-row">
              <input
                type="checkbox"
                checked={state.idempotent}
                onChange={e => apply({ ...state, idempotent: e.target.checked })}
              />{' '}
              Idempotent: check the order before booking
            </label>
            <Fact id="at-least-once" />
            <p className="note qu-note">
              Same idea as the key that makes{' '}
              <a href="/payments/04-pressed-pay-twice/">pressing Pay twice safe, in Card payments</a>.
            </p>
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
