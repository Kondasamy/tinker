// Chapter 5: back off with jitter. Thirty shop tablets reconnect at once against a barrel of 10; the 20 refused all
// retry a second later, a stampede, again and again. Backoff alone still sends them back in clumps; jitter spreads
// them, so the most retries landing in any tenth of a second falls (pinned).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { clock, crowdOf, peakRetries, runOf, tally } from '../../lib/rate-limits/sim';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RateStage, SimNote, type View } from './kit';

const MODULE = 'rate-limits',
  ID = '05-back-off-with-jitter';
export const PARTS = BARREL_PARTS;
export const runFor = (backoff: boolean, jitter: boolean) => runOf(crowdOf({ backoff, jitter }));
const FIXED = runFor(false, false);
export const TABLETS = FIXED.hits.filter(h => h.n === 1).length;
export const SIZE = FIXED.scene.limiter.kind === 'bucket' ? FIXED.scene.limiter.size : 0;
export const PEAK = {
  fixed: peakRetries(FIXED),
  backoff: peakRetries(runFor(true, false)),
  jitter: peakRetries(runFor(true, true)),
};
const LOOK = 1000;

export const P1 = {
  question: `All ${TABLETS - SIZE} refused tablets come back at ${clock(LOOK)}. What happens?`,
  options: ['Another stampede: most are refused again', `All ${TABLETS - SIZE} are served`, 'They queue up politely'],
};
export const outcomeOf = () => (tally(FIXED, LOOK, LOOK + 1).limited > 0 ? 0 : 1);

export const QUIZ = {
  question: 'A million phones lose signal in a tunnel and reconnect together. How should the app retry?',
  options: [
    'Wait a random, growing time before each retry',
    'Retry every second until it works',
    'Retry at once, as fast as it can',
  ],
  correct: 0,
  explanation: 'Backoff with jitter spreads the retries so they never arrive as one wave.',
  why: [
    'Right: growing waits ease the load, and the random part keeps the phones from returning together.',
    'A fixed wait sends every refused phone back at the same moment, wave after wave.',
    'Retrying at once is the stampede itself, and it keeps the server saying no.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  backoff: boolean;
  jitter: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'crowd',
    focus: 'stage',
    visibleControls: [],
    narration: `${TABLETS} tablets ask at once; ${SIZE} tokens serve ${SIZE}. Every refused tablet waits exactly one second.`,
    act: `Slide to ${clock(LOOK)}.`,
    say: { block: 'couriers', text: 'All at once' },
    predicate: s => s.t >= LOOK,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The ${TABLETS - SIZE} refused tablets all waited the same second.`,
    act: 'Predict their retries.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'requests',
    focus: 'tab',
    visibleControls: ['p1', 'tab'],
    narration: 'Your pick is locked.',
    act: 'Open the Requests tab.',
    predicate: s => s.p1 !== null && s.view === 'requests',
  },
  {
    id: 'backoff',
    focus: 'retry',
    visibleControls: ['out1', 'retry'],
    narration: `A stampede: ${PEAK.fixed} retries in the same tenth of a second, wave after wave. Backoff waits longer each time.`,
    act: 'Tick Back off.',
    predicate: s => s.backoff,
  },
  {
    id: 'jitter',
    focus: 'retry',
    visibleControls: ['retry'],
    narration: `Backoff alone: still ${PEAK.backoff} at once, just less often. Jitter adds a random part to each wait.`,
    act: 'Tick Jitter.',
    predicate: s => s.backoff && s.jitter,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `With jitter, at most ${PEAK.jitter} arrive at once. The last tablet waits longer, but nothing piles in.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What keeps refused clients from coming back at the same moment?',
  },
];

export default function BackOffWithJitter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, backoff: false, jitter: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.backoff, state.jitter);
        return (
          <RateStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTime={t => sync({ ...state, t, view: 'scene' })}
            show={{
              run: r,
              t: state.t,
              whole: true,
              caption: `${clock(state.t)}. Most retries in a tenth of a second: ${peakRetries(r)}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'requests' })}>
            Open the Requests tab
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        retry: ({ state, apply }) => (
          <>
            <label className="rl-row">
              <input
                type="checkbox"
                checked={state.backoff}
                onChange={e => apply({ ...state, backoff: e.target.checked })}
              />{' '}
              Back off: 1, 2, 4 seconds…
            </label>
            <label className="rl-row">
              <input
                type="checkbox"
                checked={state.jitter}
                onChange={e => apply({ ...state, jitter: e.target.checked })}
              />{' '}
              Jitter: a random part of each wait
            </label>
            <Fact id="jitter" />
            <p className="note rl-note">
              The same fix for jobs that fail and retry:{' '}
              <a href="/queues/04-try-again-later/">Queues, try again later</a>.
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
