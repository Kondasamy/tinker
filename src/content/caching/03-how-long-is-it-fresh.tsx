// Chapter 3: how long is it fresh? Copies are kept all day; at the price rise the shelves serve the old price. The
// reader predicts what a 15-minute TTL on prices does, sets it, and sees fewer stale prices for more trips.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { MOMENTS, TTLS, clock, policyOf, runOf, ttlName } from '../../lib/caching/sim';
import { DEPOT_PARTS, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, Clock, Fact, SimNote, pct } from './kit';

const MODULE = 'caching',
  ID = '03-how-long-is-it-fresh';
export const PARTS = DEPOT_PARTS;
const DAY = TTLS.at(-1)!;
export const SHORT = TTLS[1];
/** prices kept for `ttl`, everything else all day */
export const policyAt = (ttl: number) => policyOf({ ttl: { price: ttl, photo: DAY, stock: DAY } });
export const runAt = (ttl: number) => runOf(policyAt(ttl));
const RISE = MOMENTS.priceRise;

export const P1 = {
  question: `With a ${ttlName(SHORT)} TTL on prices, how many stale price reads will the day have?`,
  options: [
    'None: copies expire before they can go stale',
    'Far fewer, but some: a copy made just before the change is still fresh',
    'The same: the price still changed',
  ],
};
export function outcomeOf(): number {
  const short = runAt(SHORT).staleBy.price,
    long = runAt(DAY).staleBy.price;
  return short === 0 ? 0 : short < long ? 1 : 2;
}

export const QUIZ = {
  question:
    'A cinema’s site keeps copies of its showtimes for 6 hours. At noon the 7 pm showing is cancelled. What do customers see?',
  options: [
    'Some still see the 7 pm showing until their copy expires, up to 6 hours later',
    'Everyone sees the change at once, because a cache asks the cinema first',
    'Nobody sees the change until the next day',
  ],
  correct: 0,
  explanation: 'A fresh copy is served without asking the origin, so a change shows only once each copy expires.',
  why: [
    'Right: a copy stays fresh for its TTL whatever happens at the origin, so the change lags by up to 6 hours.',
    'A cache serves a fresh copy without asking; that is the whole saving, and the reason it can be stale.',
    'Copies expire after their 6-hour TTL, not at midnight, so the change shows by the evening.',
  ],
};

interface S {
  t: number;
  ttl: number;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'rise',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: `At ${clock(RISE)} the depot raises the hinge price. Shelves still hold the old one, now stale.`,
    act: `Move the clock to ${clock(RISE)}.`,
    say: { block: 'west', text: 'Old price' },
    predicate: s => s.t === RISE,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A TTL, time to live, says how long a copy stays fresh: here, ${ttlName(DAY)}.`,
    act: `Predict a ${ttlName(SHORT)} TTL.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ttl',
    focus: 'ttl',
    visibleControls: ['p1', 'ttl'],
    narration: 'Your pick is locked.',
    act: `Set the price TTL to ${ttlName(SHORT)}.`,
    predicate: s => s.ttl === SHORT && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'table', 'quiz'],
    narration: `Expired copies go back to the depot: trips rose from ${runAt(DAY).trips} to ${runAt(SHORT).trips}. Fresh and right pull against each other.`,
    act: 'One question to finish.',
    say: { block: 'depot', text: 'More trips' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a cache ask the origin before serving a copy that is still fresh?',
  },
];

function Table({ ttl }: { ttl: number }) {
  return (
    <table className="tc-ledger">
      <caption>Larkspur’s day, simulated</caption>
      <thead>
        <tr>
          <th scope="col">Price TTL</th>
          <th scope="col">Stale price reads</th>
          <th scope="col">Trips</th>
          <th scope="col">Hit rate</th>
        </tr>
      </thead>
      <tbody>
        {[DAY, ttl]
          .filter((x, i, a) => a.indexOf(x) === i)
          .map(x => (
            <tr key={x} data-ttl={x}>
              <th scope="row">{ttlName(x)}</th>
              <td>{runAt(x).staleBy.price}</td>
              <td>{runAt(x).trips}</td>
              <td>{pct(runAt(x).hitRate)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default function HowLongIsItFresh() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, ttl: DAY, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runAt(state.ttl);
        return (
          <CachingStage
            say={say}
            show={{
              scene: depotAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}, prices kept ${ttlName(state.ttl)}: ${r.staleBy.price} stale price reads today.`,
            }}
          />
        );
      }}
      controls={{
        clock: ({ state, sync }) => <Clock id="ca-clock3" t={state.t} onTick={t => sync({ ...state, t })} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ttl: ({ state, sync }) => {
          const i = (TTLS as readonly number[]).indexOf(state.ttl);
          return (
            <div className="ca-range">
              <label htmlFor="ca-ttl3">{`Price TTL: ${ttlName(state.ttl)}`}</label>
              <input
                id="ca-ttl3"
                type="range"
                min={1}
                max={TTLS.length - 1}
                step={1}
                value={i}
                aria-valuetext={ttlName(state.ttl)}
                onChange={e => sync({ ...state, ttl: TTLS[Number(e.target.value)] })}
              />
            </div>
          );
        },
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="fresh" />
            <Fact id="max-age" />
          </>
        ),
        table: ({ state }) => (
          <>
            <Table ttl={state.ttl} />
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
