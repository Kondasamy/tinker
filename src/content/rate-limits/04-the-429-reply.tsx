// Chapter 4: the 429 reply. Quickfix's script sends 20 at once into a barrel of 10 that drips a token every 2 seconds;
// the ten turned away get 429 with Retry-After. A script that retries every 0.2 seconds earns hundreds more 429s for
// the same orders served; one that listens to Retry-After earns a few dozen.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { AT_ONCE_MS, SCENES, clock, runOf, tally } from '../../lib/rate-limits/sim';
import { retryAfterS } from '../../lib/rate-limits/bucket';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RateStage, SimNote, type View } from './kit';

const MODULE = 'rate-limits',
  ID = '04-the-429-reply';
export const PARTS = BARREL_PARTS;
export const IGNORE = runOf(SCENES.ignore),
  LISTEN = runOf(SCENES.listen);
const L = SCENES.ignore.limiter;
const burst = IGNORE.hits.filter(h => h.n === 1);
export const AT = burst[0].at,
  SENT = burst.length,
  AFTER = burst.at(-1)!.at + 10;
const firstNo = IGNORE.hits.find(h => h.verdict === 'limited')!;
export const WAIT = retryAfterS(firstNo.waitMs!);
export const IGN = tally(IGNORE),
  LIS = tally(LISTEN);

export const P1 = {
  question: `Quickfix’s script ignores Retry-After and tries again every ${AT_ONCE_MS / 1000} seconds. What do those retries get?`,
  options: ['Mostly more 429s: no token drips in sooner', 'Their orders served sooner', 'A fuller barrel'],
};
export const outcomeOf = () => (IGN.ok <= LIS.ok && IGN.limited > LIS.limited ? 0 : 1);

export const QUIZ = {
  question: 'Your app gets 429 with Retry-After: 30 from a payment API. What should it do?',
  options: [
    'Wait 30 seconds, then try again',
    'Try again at once until it works',
    'Give up and show an error for good',
  ],
  correct: 0,
  explanation: 'Retry-After says when a token will be there; asking sooner only earns more 429s.',
  why: [
    'Right: the server said when to come back, and coming back then finds room.',
    'Each early retry is refused again, and some APIs ban clients that keep pushing.',
    'A 429 is a “not now”, not a “never”: the request can succeed after the wait.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  listen: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'burst',
    focus: 'stage',
    visibleControls: [],
    narration: `Quickfix’s script sends ${SENT} at once. The barrel holds ${L.size} and drips one token every ${1 / L.refill} seconds.`,
    act: `Slide to ${clock(AFTER)}.`,
    say: { block: 'away', text: 'Turned away' },
    predicate: s => s.t >= AFTER,
  },
  {
    id: 'reply',
    focus: 'p1',
    visibleControls: ['reply', 'p1'],
    narration: `${L.size} got tokens. The rest got a 429 reply saying Retry-After: ${WAIT}, wait ${WAIT} seconds.`,
    act: 'Read the reply, then predict.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Slide to ${clock(IGNORE.ms)}.`,
    say: { block: 'away', text: '429 again' },
    predicate: s => s.p1 !== null && s.t >= IGNORE.ms,
  },
  {
    id: 'listen',
    focus: 'listen',
    visibleControls: ['out1', 'listen'],
    narration: `Ignoring it: ${IGN.limited} refusals for ${IGN.ok} served. A client that listens waits as told.`,
    act: 'Tick Listen to Retry-After.',
    predicate: s => s.listen,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Listening: ${LIS.limited} refusals, and the same ${LIS.ok} served by ${clock(LISTEN.ms)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does asking sooner make a token drip in sooner?',
  },
];

export default function The429Reply() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, listen: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RateStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTime={t => sync({ ...state, t, view: 'scene' })}
          show={{
            run: state.listen ? LISTEN : IGNORE,
            t: state.t,
            caption: `${clock(state.t)}. The script ${state.listen ? 'waits for Retry-After' : `retries every ${AT_ONCE_MS / 1000} s`}.`,
          }}
        />
      )}
      controls={{
        reply: () => (
          <>
            <pre className="rl-reply">{`HTTP/1.1 429 Too Many Requests\nRetry-After: ${WAIT}`}</pre>
            <Fact id="429" />
            <Fact id="retry-after" />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        listen: ({ state, apply }) => (
          <>
            <label className="rl-row">
              <input
                type="checkbox"
                checked={state.listen}
                onChange={e => apply({ ...state, listen: e.target.checked })}
              />{' '}
              Listen to Retry-After
            </label>
            <Fact id="listen" />
            <p className="note rl-note">
              Every reply starts with a number like 429: <a href="/web-requests/">Web requests</a>.
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
