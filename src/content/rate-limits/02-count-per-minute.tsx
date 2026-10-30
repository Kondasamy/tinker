// Chapter 2: count per minute. A fixed window allows Quickfix 40 requests a minute, the barrel topped up all at once as
// each minute starts. The script sends 40 just before 1:00 and 40 just after: all 80 get through in two seconds.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, clock, runOf, tally } from '../../lib/rate-limits/sim';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RateStage, SimNote, type View } from './kit';

const MODULE = 'rate-limits',
  ID = '02-count-per-minute';
export const PARTS = BARREL_PARTS;
export const RUN = runOf(SCENES.edge);
export const LIMIT = SCENES.edge.limiter.limit;
export const EDGE = SCENES.edge.limiter.ms;
export const BEFORE = EDGE - 1000,
  AFTER = EDGE + 1000;
export const THROUGH = tally(RUN, BEFORE, AFTER).ok;

export const P1 = {
  question: `Limit: ${LIMIT} a minute. How many of the ${2 * LIMIT} get through between ${clock(BEFORE)} and ${clock(AFTER)}?`,
  options: [
    `All ${2 * LIMIT}: each minute’s ${LIMIT} is fresh`,
    `${LIMIT}: the limit is ${LIMIT} a minute`,
    'None: it sent too many',
  ],
};
export const outcomeOf = () => (THROUGH === 2 * LIMIT ? 0 : THROUGH === LIMIT ? 1 : 2);

export const QUIZ = {
  question:
    'A login page allows 5 tries a minute, counted per clock minute. How many can an attacker try in 2 seconds?',
  options: ['10, across a minute’s edge', '5, the limit', 'None: the count stops them'],
  correct: 0,
  explanation: 'A fixed window starts its count again at each edge, so two full windows meet there.',
  why: [
    'Right: 5 at 0:59 and 5 more at 1:00, each window within its limit.',
    'Each clock minute is counted on its own, so the 5 before the edge don’t count after it.',
    'The count allows 5 in each minute; it never stops a client that stays under it per window.',
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
    id: 'window',
    focus: 'stage',
    visibleControls: [],
    narration: `A rate limit caps requests in a stretch of time. This fixed window allows ${LIMIT} a minute.`,
    act: `Slide to ${clock(BEFORE)}.`,
    say: { block: 'barrel', text: `Up to ${LIMIT}` },
    predicate: s => s.t >= BEFORE,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Quickfix’s script sends ${LIMIT} just before ${clock(EDGE)}, then ${LIMIT} just after.`,
    act: 'Predict how many get through.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Slide to ${clock(AFTER)}.`,
    say: { block: 'barrel', text: 'Full again' },
    predicate: s => s.p1 !== null && s.t >= AFTER,
  },
  {
    id: 'reveal',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `${THROUGH} served in two seconds: twice the limit, because the count starts again at ${clock(EDGE)}.`,
    act: 'Open the Requests tab.',
    predicate: s => s.view === 'requests',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Each minute kept the rule; together they made one double burst.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When does a per-minute count start again?',
  },
];

export default function CountPerMinute() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RateStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTime={t => sync({ ...state, t, view: 'scene' })}
          step={500}
          show={{ run: RUN, t: state.t, caption: `${clock(state.t)}. ${LIMIT} a minute, counted per minute.` }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'requests' })}>
            Open the Requests tab
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
