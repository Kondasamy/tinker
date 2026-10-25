// Chapter 7: make the page fast for everyone, the workbench. The reader sets Larkspur's DNS TTL, the HTTP version and
// session resumption; every customer's page loads with lossy lines on, and each is checked against the owner's budget,
// with the TTL checked against the move rule. The puzzle accepts every policy that meets both (WINNERS, pinned).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { CUSTOMERS, HTTPS, TTLS, ttlName } from '../../lib/web-requests/sim';
import {
  BUDGET,
  MOVE,
  REASONS,
  START,
  WINNERS,
  benchOf,
  inBudget,
  loadOf,
  slowest,
  ttlOk,
  wins,
  type Bench,
} from '../../lib/web-requests/workbench';
import { TOWN_PARTS, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { num } from '../../lib/format';
import { SimNote, WebStage, msOf, type View } from './kit';

const MODULE = 'web-requests',
  ID = '07-make-it-fast';
export const PARTS = TOWN_PARTS;

export const QUIZ = {
  question:
    'A shop wants pages fast for customers worldwide, and plans to move to a new host next month. Which plan fits what you found?',
  options: [
    'HTTP/3 with session resumption, and a DNS TTL short enough for the move',
    'A week-long DNS TTL, to skip every lookup',
    'HTTP/1.1 with more connections per customer',
  ],
  correct: 0,
  explanation: 'Cut round trips where you can, but keep the TTL as short as the next move needs.',
  why: [
    'Right: HTTP/3 and resumption each save a round trip, and a short enough TTL lets the move be found.',
    'A week-long TTL would keep some customers on the old host for up to a week after the move.',
    'Every extra HTTP/1.1 connection costs its own handshakes, so far customers still wait.',
  ],
};

interface S extends Bench {
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The owner’s budget: every page within ${msOf(BUDGET)}, even on a lossy line, and a moved shop found within ${MOVE} minutes.`,
    act: 'Find settings that meet both.',
    say: { block: 'road', text: 'Fewer trips' },
    predicate: s => wins(benchOf(s)),
    hint: 'The farthest customer decides: count his round trips, then cut each one you can.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} settings that work. A copy of the page nearer the customer would cut the distance itself.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which settings save a round trip, and which one has a cost after a move?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    worst = slowest(b),
    ok = wins(b);
  return (
    <div role="status" data-slowest={Math.round(worst)} data-best={ok ? '1' : '0'}>
      <p className="wr-headline">
        <strong>{msOf(worst)}</strong>
        {' slowest page '}
        <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>
          {ok ? 'MEETS THE RULES' : !ttlOk(b) ? 'TTL TOO LONG' : `OVER ${msOf(BUDGET).toUpperCase()}`}
        </span>
      </p>
      {ok && <p className="tc-status">{`One of ${WINNERS.length} settings that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s);
  return (
    <div className="tc-bench">
      <div className="wr-range">
        <label htmlFor="wr-wttl">{`DNS TTL: ${ttlName(b.ttl)}`}</label>
        <input
          id="wr-wttl"
          type="range"
          min={0}
          max={TTLS.length - 1}
          step={1}
          value={(TTLS as readonly number[]).indexOf(b.ttl)}
          aria-valuetext={ttlName(b.ttl)}
          onChange={e => set({ ...s, ttl: TTLS[Number(e.target.value)] })}
        />
      </div>
      <div className="wr-row" role="group" aria-label="HTTP version">
        {HTTPS.map(h => (
          <button
            key={h}
            type="button"
            className="chip"
            aria-pressed={b.http === h}
            onClick={() => set({ ...s, http: h })}
          >
            {`HTTP/${h}`}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={b.resume} onClick={() => set({ ...s, resume: !b.resume })}>
          Session resumption
        </button>
      </div>
      <table className="tc-ledger">
        <caption>Every customer’s page, lossy lines on</caption>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Distance</th>
            <th scope="col">Page</th>
          </tr>
        </thead>
        <tbody>
          {CUSTOMERS.map(c => (
            <tr key={c.id} data-customer={c.id} data-ok={inBudget(b, c.id) ? 1 : 0}>
              <th scope="row">{`${c.name}, ${c.town}`}</th>
              <td>{`${num(c.km)} km`}</td>
              <td className={inBudget(b, c.id) ? 'ok' : 'bad'}>{msOf(loadOf(b, c.id).total)}</td>
            </tr>
          ))}
          <tr data-customer="move" data-ok={ttlOk(b) ? 1 : 0}>
            <th scope="row">A moved shop found within</th>
            <td>{`${MOVE} min`}</td>
            <td className={ttlOk(b) ? 'ok' : 'bad'}>{ttlName(b.ttl)}</td>
          </tr>
        </tbody>
      </table>
      <p className="note wr-note">{`${REASONS.budget} ${REASONS.move}`}</p>
      <p className="note wr-note">
        A copy near each customer shortens the road itself: see <a href="/caching/">Caching &amp; CDNs</a>.
      </p>
      <SimNote />
    </div>
  );
}

export default function MakeItFast() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state),
          id = CUSTOMERS.reduce((a, c) => (loadOf(b, c.id).total > loadOf(b, a.id).total ? c : a)).id,
          r = loadOf(b, id);
        return (
          <WebStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              town: townAt(r),
              run: r,
              caption: `The slowest page: ${r.customer.name} in ${r.customer.town}, ${msOf(r.total)}.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
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
