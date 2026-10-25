// Chapter 7: set Larkspur's cache policy, the workbench. The reader sets a TTL per kind of content, purge and versioned
// names; the simulator runs the day with coalescing on, and each kind is checked against the owner's staleness limit.
// The puzzle accepts every passing policy tied for the best hit rate (WINNERS, computed over the whole domain).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { KINDS, MOMENTS, TTLS, clock, runOf, ttlName, type Kind } from '../../lib/caching/sim';
import {
  BEST,
  LIMITS,
  START,
  WINNERS,
  benchPolicy,
  passes,
  staleShare,
  wins,
  type Bench,
} from '../../lib/caching/workbench';
import { DEPOT_PARTS, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, SimNote, pct, type View } from './kit';

const MODULE = 'caching',
  ID = '07-cache-policy';
export const PARTS = DEPOT_PARTS;
const KIND_NAME: Record<Kind, string> = { price: 'Prices', photo: 'Photos', stock: 'Stock counts' };
/** the quarter hour the picture shows: the sale's last surge, when the shelves have the most to do */
const AT = MOMENTS.sale + 2;

export const QUIZ = {
  question:
    'A theatre’s site has prices that change weekly, trailers that never change once posted, and live seat counts. Which plan matches what you found?',
  options: [
    'Long TTLs with a purge for prices, long TTLs with new names for trailers, a short TTL for seat counts',
    'One short TTL for everything, to be safe',
    'Long TTLs for everything: customers can refresh',
    'No caching for anything that ever changes',
  ],
  correct: 0,
  explanation: 'Each kind changes in its own way, so each gets its own TTL and its own way back.',
  why: [
    'Right: purges and new names let prices and trailers keep long TTLs, and only the counts that change constantly need a short one.',
    'A short TTL everywhere sends trailers that never change back to the origin over and over.',
    'Long TTLs alone leave stale prices on the shelves for as long as the TTL.',
    'Prices and trailers change rarely and predictably, so purges and new names let them be cached safely.',
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
    narration: `The owner’s limits: no stale prices or photos, and stock stale on at most ${pct(LIMITS.stock)} of reads.`,
    act: 'Set the best cache policy.',
    say: { block: 'depot', text: 'Fewer trips' },
    predicate: s => wins(benchPolicy(s)),
    hint: 'Start with how changes reach the shelves; then find the longest stock TTL inside its limit.',
    solution: s => ({ ...s, ttl: { ...WINNERS[0].ttl }, purge: WINNERS[0].purge, versioned: WINNERS[0].versioned }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${pct(BEST)} is the best hit rate; yours is one of ${WINNERS.length} policies that work.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which kinds change rarely, and which change all the time?',
  },
];

function Score({ s }: { s: S }) {
  const p = benchPolicy(s),
    r = runOf(p),
    best = wins(p),
    ok = KINDS.every(k => passes(p, k));
  return (
    <div role="status" data-score={Math.round(r.hitRate * 1000)} data-best={best ? '1' : '0'}>
      <p className="ca-headline">
        <strong>{pct(r.hitRate)}</strong>
        {' hit rate '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `BEST IS ${pct(BEST)}` : 'OVER A LIMIT'}
        </span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} policies that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPolicy(s),
    r = runOf(p);
  return (
    <div className="tc-bench">
      {KINDS.map(k => {
        const id = `ca-w${k}`;
        return (
          <div key={k} className="ca-range">
            <label htmlFor={id}>{`${KIND_NAME[k]} TTL: ${ttlName(p.ttl[k])}`}</label>
            <input
              id={id}
              type="range"
              min={0}
              max={TTLS.length - 1}
              step={1}
              value={(TTLS as readonly number[]).indexOf(p.ttl[k])}
              aria-valuetext={ttlName(p.ttl[k])}
              onChange={e => set({ ...s, ttl: { ...p.ttl, [k]: TTLS[Number(e.target.value)] } })}
            />
          </div>
        );
      })}
      <div className="ca-row" role="group" aria-label="How changes reach the shelves">
        <button type="button" className="chip" aria-pressed={p.purge} onClick={() => set({ ...s, purge: !p.purge })}>
          Purge on change
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={p.versioned}
          onClick={() => set({ ...s, versioned: !p.versioned })}
        >
          Versioned photo names
        </button>
      </div>
      <table className="tc-ledger">
        <caption>Each kind against the owner’s limit</caption>
        <thead>
          <tr>
            <th scope="col">Kind</th>
            <th scope="col">Hit rate</th>
            <th scope="col">Stale reads</th>
            <th scope="col">Limit</th>
          </tr>
        </thead>
        <tbody>
          {KINDS.map(k => (
            <tr key={k} data-kind={k} data-ok={passes(p, k) ? 1 : 0}>
              <th scope="row">{KIND_NAME[k]}</th>
              <td>{pct(r.hitsBy[k] / r.readsBy[k])}</td>
              <td className={passes(p, k) ? 'ok' : 'bad'}>{pct(staleShare(p, k))}</td>
              <td>{pct(LIMITS[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note ca-note">Request coalescing stays on, from chapter 5.</p>
      <SimNote />
    </div>
  );
}

export default function CachePolicy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, ttl: { ...START.ttl }, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const p = benchPolicy(state),
          r = runOf(p);
        return (
          <CachingStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: depotAt(r, AT),
              result: r,
              tick: AT,
              caption: `${clock(AT)}, mid-sale. Today: ${pct(r.hitRate)} hit rate, ${r.trips} trips, ${r.stale} stale reads.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the policy is an attempt only while it is the puzzle
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
