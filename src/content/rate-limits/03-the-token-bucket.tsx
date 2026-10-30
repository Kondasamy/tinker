// Chapter 3: the token bucket, live. The reader floods the barrel (hold to flood, or Send 10): each request spends a
// token, an empty barrel shuts the tap and turns couriers away with 429, and the drip refills it at a steady pace. The
// barrel's size sets the burst; the drip (refill rate) sets the pace.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { LIVE } from '../../lib/rate-limits/sim';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, NO_LIVE, RateStage, liveCounts, type Live } from './kit';

const MODULE = 'rate-limits',
  ID = '03-the-token-bucket';
export const PARTS = BARREL_PARTS;
export const FAST = LIVE.drips.at(-1)!;

export const P1 = {
  question: `The barrel is empty, dripping ${LIVE.drip} tokens a second. You send 10 more at once. What happens?`,
  options: [
    'Most get a 429: only dripped-in tokens get through',
    'All 10 get through, a little slower',
    'All 10 wait in line until tokens drip in',
  ],
};
/** true by construction: the step before ends only once a request met an empty barrel */
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'An API’s bucket holds 100 tokens and refills 10 a second. A client has been quiet for a minute. What can it send?',
  options: ['100 at once, then 10 a second', '10 a second, never more', '600 at once: a minute of refills'],
  correct: 0,
  explanation: 'A full bucket allows a burst of its size, then the refill rate.',
  why: [
    'Right: the bucket is full at 100, so a burst of 100, then the drip of 10 a second.',
    'The bucket saved tokens while the client was quiet, so a burst of up to 100 is allowed.',
    'The bucket never holds more than its size; refills past 100 spill over.',
  ],
};

interface S {
  live: Live;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'fill',
    focus: 'stage',
    visibleControls: [],
    narration: `A token bucket: each request spends one token from the barrel, and tokens drip back. This one holds ${LIVE.size}.`,
    act: 'Press Send 10.',
    say: { block: 'barrel', text: `Holds ${LIVE.size}` },
    predicate: s => liveCounts(s.live).sent >= LIVE.size,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'That burst emptied the barrel.',
    act: 'Predict the next 10.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'flood',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Send 10 again, or hold to flood.',
    say: { block: 'tap', text: 'Tap shut' },
    predicate: s => s.p1 !== null && liveCounts(s.live).limited > 0,
  },
  {
    id: 'pace',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'The empty barrel said 429. Size sets the burst; the refill rate sets the steady pace.',
    act: `Set the drip to ${FAST} a second.`,
    say: { block: 'drip', text: 'The pace' },
    predicate: s => s.live.drip === FAST,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Now ${FAST} tokens drip back each second: a faster steady pace, the same burst of ${LIVE.size}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many tokens can the bucket hold at most?',
  },
];

export default function TheTokenBucket() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ live: NO_LIVE, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RateStage
          say={say}
          live={state.live}
          onLive={live => sync({ ...state, live })}
          show={{ caption: 'Your requests at Larkspur’s barrel, live.' }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="token-bucket" />
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
