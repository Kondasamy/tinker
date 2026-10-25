// Chapter 2: keep a copy nearby. The reader turns on the warehouses' shelves (every kind kept all day), predicts the
// first request of the morning, sees it miss on the timeline, then moves the clock through a day of hits.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { EDGES, MOMENTS, OFF, TTLS, clock, policyOf, runOf } from '../../lib/caching/sim';
import { DEPOT_PARTS, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, Clock, SimNote, msOf, pct, type View } from './kit';

const MODULE = 'caching',
  ID = '02-keep-a-copy';
export const PARTS = DEPOT_PARTS;
const DAY = TTLS.at(-1)!;
export const MORNING = MOMENTS.morning;
/** every kind kept on the shelf all day */
export const KEEP = policyOf({ ttl: { price: DAY, photo: DAY, stock: DAY } });
export const RUNS = { off: runOf(OFF), on: runOf(KEEP) };

export const P1 = {
  question: 'At 08:00 the shelves are empty. What happens to the first request at each warehouse?',
  options: [
    'A hit: the warehouse has a copy ready',
    'A miss: it makes the trip, and the shelf keeps the reply',
    'It waits until the depot fills every shelf',
  ],
};
export const outcomeOf = () => (EDGES.every(e => RUNS.on.ticks[0].edges[e].misses > 0) ? 1 : 0);

export const QUIZ = {
  question:
    'A news site keeps copies of its front page in 50 cities. A reader in Lima opens it first thing in the morning, before anyone else there. What happens?',
  options: [
    'A miss: Lima’s copy is fetched from the origin, and later Lima readers get hits',
    'A hit: every city gets a copy the moment the page is published',
    'Every Lima reader goes to the origin, since caches only help the second city',
  ],
  correct: 0,
  explanation:
    'A shelf fills on demand: the first request misses and fetches, and the copy serves the requests after it.',
  why: [
    'Right: the first request in a city misses and fills that shelf, so the next ones hit.',
    'An edge cache fills when someone asks, not when the origin publishes; until then it holds nothing.',
    'Each city has its own shelf, so after the first miss Lima’s later readers are served right there.',
  ],
};

interface S {
  cached: boolean;
  p1: number | null;
  view: View;
  t: number;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'shelves',
    focus: 'cache',
    visibleControls: ['cache'],
    narration: 'Each warehouse can keep a copy on its shelf: an edge cache. A request answered from there is a hit.',
    act: 'Turn on the shelves.',
    predicate: s => s.cached,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The shelves keep every copy all day, but they open empty.',
    act: 'Predict the morning’s first request.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'timeline',
    focus: 'tab',
    visibleControls: ['p1', 'tab'],
    narration: 'Your pick is locked. Each column is a quarter hour: mustard when a request went to the depot.',
    act: 'Open the Timeline tab.',
    predicate: s => s.p1 !== null && s.view === 'timeline',
  },
  {
    id: 'clock',
    focus: 'clock',
    visibleControls: ['out1', 'clock'],
    narration: 'A miss makes the trip once, and its copy turns later requests into hits.',
    act: `Move the clock to ${clock(MORNING)}.`,
    say: { block: 'north', text: 'Copy on shelf' },
    predicate: s => s.t >= MORNING && s.view === 'scene',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['rate', 'quiz'],
    narration: `Hit rate for the day: ${pct(RUNS.on.hitRate)}. The mean wait fell from ${msOf(RUNS.off.meanMs)} to ${msOf(RUNS.on.meanMs)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the shelf fill when the depot publishes, or when someone asks?',
  },
];

export default function KeepACopy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ cached: false, p1: null, view: 'scene', t: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = state.cached ? RUNS.on : RUNS.off;
        return (
          <CachingStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: depotAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}, ${state.cached ? 'shelves on, copies kept all day' : 'no shelves'}.`,
            }}
          />
        );
      }}
      controls={{
        cache: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, cached: true })}>
            Turn on the shelves
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'timeline' })}>
            Open the Timeline tab
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        clock: ({ state, sync }) => (
          <Clock id="ca-clock2" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        rate: () => (
          <table className="tc-ledger">
            <caption>Larkspur’s day, simulated</caption>
            <thead>
              <tr>
                <th scope="col">Shelves</th>
                <th scope="col">Hit rate</th>
                <th scope="col">Trips</th>
                <th scope="col">Mean wait</th>
              </tr>
            </thead>
            <tbody>
              {(['off', 'on'] as const).map(k => (
                <tr key={k}>
                  <th scope="row">{k === 'off' ? 'Off' : 'On'}</th>
                  <td>{pct(RUNS[k].hitRate)}</td>
                  <td>{RUNS[k].trips}</td>
                  <td>{msOf(RUNS[k].meanMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
