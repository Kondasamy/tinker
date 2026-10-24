// Chapter 5: everyone at once. Prices and photos are kept all day with a purge; stock for 15 minutes. At the noon flash
// sale the purge empties every shelf and the whole rush misses together: a stampede. The reader predicts what request
// coalescing does, turns it on, then turns on stale-while-revalidate, and weighs the wait against stale stock counts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, EDGES, MOMENTS, TTLS, clock, policyOf, runOf, tripsAt } from '../../lib/caching/sim';
import { DEPOT_PARTS, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, Clock, Fact, SimNote, msOf, type View } from './kit';

const MODULE = 'caching',
  ID = '05-everyone-at-once';
export const PARTS = DEPOT_PARTS;
const DAY = TTLS.at(-1)!,
  SALE = MOMENTS.sale;
/** chapter 4's fix for prices and photos, stock kept 15 minutes */
export const RUSH = policyOf({ ttl: { price: DAY, photo: DAY, stock: TTLS[1] }, purge: true });
export const runWith = (coalesce: boolean, swr: boolean) => runOf({ ...RUSH, coalesce, swr });
const BASE = runWith(false, false),
  COAL = runWith(true, false),
  SWR = runWith(true, true);
/** items asked for in the sale's first quarter hour */
const ITEMS = new Set(BASE.served.filter(s => s.t === SALE).map(s => s.key)).size;
const saleMean = (r: typeof BASE) => {
  const at = r.served.filter(s => s.t === SALE);
  return at.reduce((a, s) => a + s.ms, 0) / at.length;
};

export const P1 = {
  question: `With request coalescing on, how many trips leave for the depot at ${clock(SALE)}?`,
  options: [
    'About one per item per warehouse',
    'The same: every customer still needs an answer',
    'None: the shelves answer everyone',
  ],
};
export function outcomeOf(): number {
  const n = tripsAt(COAL, SALE);
  return n === 0 ? 2 : n <= ITEMS * EDGES.length ? 0 : 1;
}

export const QUIZ = {
  question:
    'A concert site keeps its ticket page for one minute. Sales open at 10:00, the copy expires a moment later, and 50,000 fans are refreshing. Which setting stops them all reaching the origin together?',
  options: [
    'Request coalescing: one fetch goes out, and everyone else waits on its reply',
    'A shorter TTL, so the copy is always fresh',
    'A purge at 10:00',
  ],
  correct: 0,
  explanation: 'A stampede is many misses for one item at once; coalescing turns them into one trip.',
  why: [
    'Right: the fans asking at the same moment share one trip, so the origin sees one request, not 50,000.',
    'A shorter TTL means more expiries, and each expiry under load is another stampede.',
    'A purge empties the shelf, which makes every fan miss at once: it starts a stampede rather than stopping one.',
  ],
};

interface S {
  t: number;
  coalesce: boolean;
  swr: boolean;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'sale',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: `At ${clock(SALE)} the sale price is purged everywhere, and the whole rush misses at the same moment: a stampede.`,
    act: `Move the clock to ${clock(SALE)}.`,
    say: { block: 'depot', text: 'Stampede' },
    predicate: s => s.t === SALE,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${BASE.ticks[SALE].trips} trips reach a depot built for ${ASSUMPTIONS.capacity}. Request coalescing lets requests for one item share a trip.`,
    act: 'Predict the trips.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'coalesce',
    focus: 'coalesce',
    visibleControls: ['p1', 'coalesce'],
    narration: 'Your pick is locked.',
    act: 'Turn on request coalescing.',
    predicate: s => s.coalesce && s.p1 !== null,
  },
  {
    id: 'swr',
    focus: 'swr',
    visibleControls: ['out1', 'coalesce', 'swr'],
    narration:
      'Expiring stock copies still make customers wait. Stale-while-revalidate serves the expired copy while one trip fetches a new one.',
    act: 'Turn it on.',
    say: { block: 'depot', text: 'Calm' },
    predicate: s => s.swr,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['table', 'quiz'],
    narration: `Mean wait fell from ${msOf(COAL.meanMs)} to ${msOf(SWR.meanMs)}, but stale stock reads rose from ${COAL.staleBy.stock} to ${SWR.staleBy.stock}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which setting turns many misses for the same thing into one trip?',
  },
];

function Table() {
  const rows: [string, typeof BASE][] = [
    ['Neither', BASE],
    ['Coalescing', COAL],
    ['Coalescing and stale-while-revalidate', SWR],
  ];
  return (
    <table className="tc-ledger">
      <caption>{`The sale, simulated: the depot takes ${ASSUMPTIONS.capacity} trips a quarter hour`}</caption>
      <thead>
        <tr>
          <th scope="col">Setting</th>
          <th scope="col">{`Trips at ${clock(SALE)}`}</th>
          <th scope="col">{`Wait at ${clock(SALE)}`}</th>
          <th scope="col">Stale stock reads</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, r]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td className={r.ticks[SALE].overloaded ? 'bad' : 'ok'}>{r.ticks[SALE].trips}</td>
            <td>{msOf(saleMean(r))}</td>
            <td>{r.staleBy.stock}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Toggle = ({ on, label, set }: { on: boolean; label: string; set: (v: boolean) => void }) => (
  <button type="button" className="chip" aria-pressed={on} onClick={() => set(!on)}>
    {label}
  </button>
);

export default function EveryoneAtOnce() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, coalesce: false, swr: false, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runWith(state.coalesce, state.swr);
        return (
          <CachingStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: depotAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}${state.coalesce ? ', coalescing' : ''}${state.swr ? ', stale-while-revalidate' : ''}: ${r.ticks[state.t].trips} trips${r.ticks[state.t].overloaded ? ', depot overloaded' : ''}.`,
            }}
          />
        );
      }}
      controls={{
        clock: ({ state, sync }) => <Clock id="ca-clock5" t={state.t} onTick={t => sync({ ...state, t })} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        coalesce: ({ state, apply }) => (
          <Toggle on={state.coalesce} label="Request coalescing" set={coalesce => apply({ ...state, coalesce })} />
        ),
        swr: ({ state, apply }) => (
          <Toggle on={state.swr} label="Stale-while-revalidate" set={swr => apply({ ...state, swr })} />
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="collapse-rfc" />
            <Fact id="collapse-cdn" />
          </>
        ),
        table: () => (
          <>
            <Table />
            <Fact id="swr" />
            <SimNote />
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
