// Chapter 4: take it back. Copies are kept all day. The reader predicts what a purge at each change does to stale
// prices, turns it on, then switches to versioned names and sees the new photo served fresh while prices go stale again.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { MOMENTS, TTLS, clock, policyOf, runOf } from '../../lib/caching/sim';
import { DEPOT_PARTS, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, Fact, SimNote, pct } from './kit';

const MODULE = 'caching',
  ID = '04-take-it-back';
export const PARTS = DEPOT_PARTS;
const DAY = TTLS.at(-1)!;
export type Way = 'wait' | 'purge' | 'versioned';
export const WAYS: Way[] = ['wait', 'purge', 'versioned'];
const WAY_NAME: Record<Way, string> = { wait: 'Wait for the TTL', purge: 'Purge', versioned: 'Versioned names' };
export const runOfWay = (w: Way) =>
  runOf(policyOf({ ttl: { price: DAY, photo: DAY, stock: DAY }, purge: w === 'purge', versioned: w === 'versioned' }));
/** the moment each way is shown at: the price rise, or the new photo */
const tickOf = (w: Way) => (w === 'versioned' ? MOMENTS.newPhoto : MOMENTS.priceRise);

export const P1 = {
  question: 'With a purge at every price change and a TTL of a whole day, how many stale price reads?',
  options: [
    'None: the old copy is gone the moment the price changes',
    'A few, until the next request refreshes each shelf',
    'As many as before: the TTL is still a day',
  ],
};
export function outcomeOf(): number {
  const n = runOfWay('purge').staleBy.price;
  return n === 0 ? 0 : n < runOfWay('wait').staleBy.price ? 1 : 2;
}

export const QUIZ = {
  question:
    'A game studio swaps in a new logo.png each season, and players see the old logo for days. What is the simplest lasting fix?',
  options: [
    'Link the new logo under a new name, like logo-v2.png, so every cache treats it as new',
    'Set the logo’s TTL to zero, so it is fetched every time',
    'Ask players to clear their browser caches',
  ],
  correct: 0,
  explanation:
    'A new name is a new item: no cache holds it, so the first request fetches it fresh, and the old one can keep its long TTL.',
  why: [
    'Right: a versioned name can’t be stale, and the logo keeps its long TTL.',
    'That works, but every player’s every page view then makes the trip, for a file that changes four times a year.',
    'Players’ browsers aren’t the only caches; copies sit in caches between them and the studio, out of players’ reach.',
  ],
};

interface S {
  way: Way;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Short TTLs cost trips. Instead, staff can send a purge when they change a price: every warehouse drops its copy.',
    act: 'Predict the stale prices.',
    say: { block: 'west', text: 'Stale price' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'purge',
    focus: 'way',
    visibleControls: ['p1', 'way'],
    narration: 'Your pick is locked.',
    act: 'Turn on Purge.',
    predicate: s => s.way === 'purge' && s.p1 !== null,
  },
  {
    id: 'photo',
    focus: 'way',
    visibleControls: ['out1', 'way'],
    narration: `At ${clock(MOMENTS.newPhoto)} a new hinge photo goes up. A versioned name gives it a new address, hinge-2.jpg, that no shelf holds.`,
    act: 'Switch to Versioned names.',
    say: { block: 'north', text: 'Fetched fresh' },
    predicate: s => s.way === 'versioned',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['table', 'quiz'],
    narration: 'Versioned names suit files a page links to; prices need a purge. Each kind gets its own way back.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a cache do with a name it has never seen?',
  },
];

function Table() {
  return (
    <table className="tc-ledger">
      <caption>A whole-day TTL, simulated</caption>
      <thead>
        <tr>
          <th scope="col">Changes reach the shelves by</th>
          <th scope="col">Stale prices</th>
          <th scope="col">Stale photos</th>
          <th scope="col">Hit rate</th>
        </tr>
      </thead>
      <tbody>
        {WAYS.map(w => (
          <tr key={w} data-way={w}>
            <th scope="row">{WAY_NAME[w]}</th>
            <td className={runOfWay(w).staleBy.price ? 'bad' : 'ok'}>{runOfWay(w).staleBy.price}</td>
            <td className={runOfWay(w).staleBy.photo ? 'bad' : 'ok'}>{runOfWay(w).staleBy.photo}</td>
            <td>{pct(runOfWay(w).hitRate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TakeItBack() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ way: 'wait', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runOfWay(state.way),
          t = tickOf(state.way);
        return (
          <CachingStage
            say={say}
            show={{
              scene: depotAt(r, t),
              result: r,
              tick: t,
              caption: `${clock(t)}, ${WAY_NAME[state.way].toLowerCase()}: ${r.staleBy.price} stale prices and ${r.staleBy.photo} stale photos today.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        way: ({ state, apply }) => (
          <div className="ca-row" role="group" aria-label="How changes reach the shelves">
            {WAYS.map(w => (
              <button
                key={w}
                type="button"
                className="chip"
                aria-pressed={state.way === w}
                onClick={() => apply({ ...state, way: w })}
              >
                {WAY_NAME[w]}
              </button>
            ))}
          </div>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="purge" />
          </>
        ),
        table: () => (
          <>
            <Table />
            <Fact id="cache-busting" />
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
