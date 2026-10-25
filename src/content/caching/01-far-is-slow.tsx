// Chapter 1: far is slow. Caching is off; the reader sends a request from the North warehouse, predicts West's wait, sends
// one from West, then sees the whole day on the timeline: every request makes the round trip to the depot.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, MOMENTS, OFF, clock, runOf, tripMs, type Edge } from '../../lib/caching/sim';
import { DEPOT_PARTS, EDGE_NAME, IDLE, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, SimNote, msOf, type View } from './kit';

const MODULE = 'caching',
  ID = '01-far-is-slow';
export const PARTS = DEPOT_PARTS;
export const RUN = runOf(OFF);
/** One request's wait with no copies anywhere and a calm depot: to the warehouse, the round trip, and back. */
export const waitOf = (e: Edge) => ASSUMPTIONS.edgeMs + tripMs(e);
const km = (e: Edge) => `${ASSUMPTIONS.distanceKm[e].toLocaleString('en-US')} km`;

export const P1 = {
  question: `North’s request waited ${msOf(waitOf('north'))}. How will West’s compare?`,
  options: [
    'About the same: the depot does the same work for both',
    'Longer: the round trip grows with the distance',
    'Shorter: the West warehouse is bigger',
  ],
};
export const outcomeOf = () => (waitOf('west') > waitOf('north') * 1.2 ? 1 : 0);

export const QUIZ = {
  question:
    'A bakery’s website runs on one server in Paris. Customers in Sydney say it is slow; customers in Paris don’t. What explains it best?',
  options: [
    'Each Sydney request crosses the world and back, so its round trip is long',
    'The server works harder for customers who are far away',
    'Sydney customers ask for bigger pages',
  ],
  correct: 0,
  explanation: 'With no copy nearby, every request makes the whole round trip, and the trip grows with distance.',
  why: [
    'Right: the server’s work is the same for both, but the trip to Sydney and back adds to every wait.',
    'The server builds the same page for everyone; the extra wait is on the road, not in the server.',
    'Both cities load the same pages, so page size can’t explain the gap between them.',
  ],
};

interface S {
  sent: Edge | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'north',
    focus: 'send',
    visibleControls: ['send'],
    narration: 'Every request travels to the depot, the origin, and back: a round trip. The wait is its latency.',
    act: 'Send one from North.',
    say: { block: 'north', text: 'Short trip' },
    predicate: s => s.sent === 'north',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `North is ${km('north')} from the depot; West is ${km('west')}.`,
    act: 'Predict West’s wait.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'west',
    focus: 'send',
    visibleControls: ['p1', 'send'],
    narration: 'Your pick is locked.',
    act: 'Send one from West.',
    predicate: s => s.sent === 'west',
  },
  {
    id: 'day',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `No copies anywhere: all ${RUN.requests} of today’s requests make the trip, ${RUN.peakTrips} of them in the ${clock(MOMENTS.sale)} sale.`,
    act: 'Open the Timeline tab.',
    say: { block: 'depot', text: 'Every trip here' },
    predicate: s => s.view === 'timeline',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Distance sets a floor under every wait. To go faster, stop making the trip.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the server do more work for a far customer, or does the reply travel further?',
  },
];

/** The map with one request on its way from a warehouse. */
export function oneTrip(e: Edge | null) {
  if (!e) return IDLE;
  return { ...IDLE, edges: { ...IDLE.edges, [e]: { hits: 0, misses: 1, stale: 0, trips: 1, shelf: [] } }, trips: 1 };
}

export default function FarIsSlow() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ sent: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const whole = state.view === 'timeline';
        return (
          <CachingStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={
              whole
                ? {
                    scene: depotAt(RUN, MOMENTS.sale),
                    result: RUN,
                    tick: MOMENTS.sale,
                    caption: 'No copies: every request of the day goes to the depot.',
                  }
                : {
                    scene: oneTrip(state.sent),
                    result: RUN,
                    caption: state.sent
                      ? `A request from ${EDGE_NAME[state.sent]} waited ${msOf(waitOf(state.sent))}.`
                      : 'No request sent yet.',
                  }
            }
          />
        );
      }}
      controls={{
        send: ({ state, apply }) => (
          <div className="ca-row" role="group" aria-label="Send a request">
            {(['north', 'west'] as const).map(e => (
              <button
                key={e}
                type="button"
                className="chip"
                aria-pressed={state.sent === e}
                onClick={() => apply({ ...state, sent: e })}
              >
                {`Send one from ${EDGE_NAME[e]}`}
              </button>
            ))}
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`West waited ${msOf(waitOf('west'))}, North ${msOf(waitOf('north'))}.`}</p>
            <SimNote />
            <p className="note ca-note">
              What one round trip holds, from the name to the last file: <a href="/web-requests/">Opening a web page</a>
              .
            </p>
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'timeline' })}>
            Open the Timeline tab
          </button>
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
