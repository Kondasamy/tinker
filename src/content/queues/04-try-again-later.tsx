// Chapter 4: try again later. The courier's site goes down mid-sale; failed jobs retry at once and some use up every
// try before it is back. The reader predicts that, watches it, turns on backoff (no order lost), then jitter (fewer
// retries due in the same minute).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { OUTAGE, SCENES, clock, policyOf, runOf, type Backoff } from '../../lib/queues/sim';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '04-try-again-later';
export const PARTS = RAIL_PARTS;
export const runFor = (backoff: Backoff, jitter: boolean) => runOf(policyOf({ ...SCENES.noBackoff, backoff, jitter }));
export const NONE = runFor('none', false),
  EXP = runFor('exp', false),
  JIT = runFor('exp', true);
export const TRIES = SCENES.noBackoff.maxTries;
export const WATCH = OUTAGE.to + 5;

export const P1 = {
  question: 'Retrying at once, what happens to the orders that fail during the outage?',
  options: [
    'Some use up every try and are given up on',
    'They all go through once the site is back',
    'They wait quietly until the site is back',
  ],
};
export const outcomeOf = () => (NONE.deadLettered > 0 ? 0 : 1);

export const QUIZ = {
  question:
    'Ten thousand phones lose the server at the same moment. What retry plan helps it come back instead of falling over again?',
  options: [
    'Wait longer after each failure, with a random part',
    'Retry every second until it works',
    'Retry once, then delete what was being sent',
  ],
  correct: 0,
  explanation: 'Backoff gives the server room to recover; jitter stops the phones retrying in step.',
  why: [
    'Right: growing waits thin the retries out, and the random part spreads them across time.',
    'Every phone hammering each second keeps the server down: the retries are the overload.',
    'Giving up after one try loses the work for a short outage that backoff would have ridden out.',
  ],
};

interface S {
  t: number;
  backoff: Backoff;
  jitter: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'outage',
    focus: 'stage',
    visibleControls: [],
    narration: `At ${clock(OUTAGE.from)} the courier’s site goes down. A failed job gets a retry at once, up to ${TRIES} tries.`,
    act: `Step to ${clock(OUTAGE.from + 2)}.`,
    say: { block: 'courier', text: 'Site down' },
    predicate: s => s.t >= OUTAGE.from + 2,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The site stays down until ${clock(OUTAGE.to)}.`,
    act: 'Predict what happens to the failed orders.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Play or step to ${clock(WATCH)}.`,
    say: { block: 'shelf', text: 'Out of tries' },
    predicate: s => s.p1 !== null && s.t >= WATCH,
  },
  {
    id: 'backoff',
    focus: 'retry',
    visibleControls: ['out1', 'retry'],
    narration: `${NONE.deadLettered} orders used up their tries before ${clock(OUTAGE.to)}. Backoff doubles the wait after each failure.`,
    act: 'Turn on backoff.',
    predicate: s => s.backoff === 'exp',
  },
  {
    id: 'jitter',
    focus: 'retry',
    visibleControls: ['retry'],
    narration: `No order is lost now. But up to ${EXP.bunch} retries come due in one minute, all hitting the courier together.`,
    act: 'Add jitter.',
    predicate: s => s.backoff === 'exp' && s.jitter,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['retry', 'quiz'],
    narration: `With jitter, each wait has a random part: at most ${JIT.bunch} retries share a minute.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which plan stops the phones all retrying in the same second?',
  },
];

export default function TryAgainLater() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, backoff: 'none', jitter: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.backoff, state.backoff === 'exp' && state.jitter);
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
              caption: `${clock(state.t)}. Today: ${r.deadLettered} given up, ${r.retries} retries, at most ${r.bunch} due in one minute.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        retry: ({ state, apply }) => (
          <>
            <div className="qu-row">
              <label>
                <input
                  type="checkbox"
                  checked={state.backoff === 'exp'}
                  onChange={e => apply({ ...state, backoff: e.target.checked ? 'exp' : 'none', jitter: false })}
                />{' '}
                Back off: wait longer after each failure
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={state.jitter}
                  disabled={state.backoff !== 'exp'}
                  onChange={e => apply({ ...state, jitter: e.target.checked })}
                />{' '}
                Jitter: a random part of each wait
              </label>
            </div>
            <Fact id="jitter" />
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
