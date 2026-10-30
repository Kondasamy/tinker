// Chapter 7: tune the search box, the workbench. One native control per setting (cleaning, how much a repeat helps,
// how much a long page counts against it, how much meaning counts); a row per test search with its precision, recall
// and what it missed; a live total against the best. The puzzle accepts every plan tied for the best (WINNERS, pinned
// and recomputed by a unit test); Show me applies one of them.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { BS, K1S, QUERIES, TOP, blend, fmt, pageName, ranked, scores, type B } from '../../lib/search/engine';
import type { Clean } from '../../lib/search/stem';
import {
  BEST,
  LENGTH_NAMES,
  MEANINGS,
  MEANING_NAMES,
  REPEAT_NAMES,
  RIGHT,
  START,
  WINNERS,
  benchPlan,
  planOf,
  rowOf,
  wins,
  type Meanings,
  type Plan,
} from '../../lib/search/workbench';
import { CABINET_PARTS, cabinetAt } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, MeaningGate, SearchStage, SimNote, useMeanings } from './kit';

const MODULE = 'search',
  ID = '07-tune-the-search-box';
export const PARTS = CABINET_PARTS;
const ways = (n: number) => (n === 1 ? 'the one plan that works' : `one of ${n} plans that work`);
const CLEAN_NAMES: [keyof Clean, string][] = [
  ['lower', 'Lower case'],
  ['stem', 'Stemmer'],
  ['stop', 'Drop stop words'],
];

export const QUIZ = {
  question: 'A team tunes its search on the three searches they happened to try by hand. What is the risk?',
  options: [
    'Settings that suit three searches can fail the rest: score many labelled searches',
    'None: three good results prove the settings',
    'The index grows too big to search',
  ],
  correct: 0,
  explanation: 'A set of labelled test searches is what tells a better setting from a lucky one.',
  why: [
    'Right: as on the bench, a change that helps one search can push another’s answer out of the top five.',
    'Three searches can all be the kind one setting suits, while most real searches are worded differently.',
    'Settings change how pages are scored, not how big the index is.',
  ],
};

interface S {
  plan: Plan;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `${QUERIES.length} test searches with ${RIGHT} right pages. Precision and recall score each search’s top ${TOP}.`,
    act: 'Find the best settings.',
    say: { block: 'podium', text: 'Worst search' },
    predicate: s => wins(benchPlan(s.plan)),
    hint: 'Keywords and meaning each miss different searches. Try blending them, with cleaning on.',
    solution: s => ({ ...s, plan: planOf(WINNERS[0]) }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST} of ${RIGHT} right pages is the best; your settings are ${ways(WINNERS.length)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Would three searches show a setting that fails a fourth?',
  },
];

/** Every test search under a plan, or null while meaning loads. */
const rowsOf = (p: Plan, m: Meanings | null) =>
  p.meaning > 0 && !m ? null : QUERIES.map((q, qi) => ({ q, r: rowOf(p, qi, m) }));

function Score({ s, meanings }: { s: S; meanings: Meanings | null }) {
  const p = benchPlan(s.plan),
    rows = rowsOf(p, meanings),
    best = wins(p);
  if (!rows) return <p className="note">Scoring waits for the embeddings.</p>;
  const n = rows.reduce((a, x) => a + x.r.hits, 0);
  return (
    <div role="status" data-right={n} data-best={best ? '1' : '0'}>
      <p className="sx-headline">
        <strong>{n}</strong>
        {` of ${RIGHT} right pages in the top ${TOP} `}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${BEST}`}</span>
      </p>
      {best && <p className="tc-status">{`This is ${ways(WINNERS.length)}.`}</p>}
    </div>
  );
}

function Radios<T extends number>({
  name,
  legend,
  values,
  names,
  value,
  set,
}: {
  name: string;
  legend: string;
  values: readonly T[];
  names: Record<T, string>;
  value: T;
  set: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {values.map(v => (
        <label key={v} className="chip">
          <input type="radio" name={name} checked={value === v} onChange={() => set(v)} /> {names[v]}
        </label>
      ))}
    </fieldset>
  );
}

function Bench({
  s,
  put,
  meanings,
  failed,
  retry,
}: {
  s: S;
  put: (s: S) => void;
  meanings: Meanings | null;
  failed: boolean;
  retry: () => void;
}) {
  const p = benchPlan(s.plan),
    set = (x: Partial<Plan>) => put({ ...s, plan: { ...p, ...x } }),
    rows = rowsOf(p, meanings);
  return (
    <div className="tc-bench">
      <div className="sx-controls">
        <fieldset>
          <legend>Word cleaning</legend>
          {CLEAN_NAMES.map(([k, name]) => (
            <label key={k} className="chip">
              <input
                type="checkbox"
                checked={p.clean[k]}
                onChange={() => set({ clean: { ...p.clean, [k]: !p.clean[k] } })}
              />{' '}
              {name}
            </label>
          ))}
        </fieldset>
        <Radios
          name="sx-k1"
          legend="How much a repeat helps"
          values={K1S}
          names={REPEAT_NAMES}
          value={p.k1}
          set={k1 => set({ k1 })}
        />
        <Radios<B>
          name="sx-b"
          legend="How much a long page counts against it"
          values={BS}
          names={LENGTH_NAMES}
          value={p.b}
          set={b => set({ b })}
        />
        <Radios
          name="sx-meaning"
          legend="How much meaning counts"
          values={MEANINGS}
          names={MEANING_NAMES}
          value={p.meaning}
          set={meaning => set({ meaning })}
        />
      </div>
      {rows ? (
        <div className="sx-wide" tabIndex={0} role="region" aria-label="Test searches, scrolls">
          <table className="tc-ledger">
            <caption>The test searches</caption>
            <thead>
              <tr>
                <th scope="col">Search</th>
                <th scope="col">{`Right in top ${TOP}`}</th>
                <th scope="col">Precision</th>
                <th scope="col">Recall</th>
                <th scope="col">Why</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ q, r }) => (
                <tr key={q.id} data-query={q.id}>
                  <th scope="row">{q.text}</th>
                  <td className={r.missed === undefined ? 'ok' : 'bad'}>{`${r.hits} of ${q.right.length}`}</td>
                  <td>{`${Math.round(r.precision * 100)}%`}</td>
                  <td>{`${Math.round(r.recall * 100)}%`}</td>
                  <td>
                    {r.missed === undefined
                      ? 'All found'
                      : `Missed ${pageName(r.missed)}: ${r.missedAt ? `ranked ${fmt(r.missedAt)}` : 'no word matched'}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MeaningGate failed={failed} retry={retry} />
      )}
      <SimNote />
    </div>
  );
}

export default function TuneTheSearchBox() {
  const { meanings, failed, retry } = useMeanings();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ plan: START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const p = benchPlan(state.plan),
          rows = rowsOf(p, meanings);
        // the picture shows the search this plan serves worst (the first, while meaning loads)
        const worst = rows ? rows.reduce((a, x) => (x.r.recall < a.r.recall ? x : a)) : null;
        const q = worst?.q ?? QUERIES[0];
        const s = { clean: p.clean, weighting: 'bm25' as const, k1: p.k1, b: p.b };
        const kw = scores(q.text, s),
          hits = ranked(p.meaning > 0 && meanings ? blend(kw, meanings[QUERIES.indexOf(q)], p.meaning) : kw);
        return (
          <SearchStage
            say={say}
            show={{
              scene: {
                ...cabinetAt(q.text, s),
                podium: hits.slice(0, 3).map(h => ({ name: pageName(h.id), score: h.score })),
              },
              postings: { query: q.text, settings: s },
              caption: worst
                ? `Worst search: “${q.text}”, ${worst.r.hits} of ${q.right.length} right pages in the top ${TOP}.`
                : 'Loading the embeddings…',
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} meanings={meanings} />,
        // changing the plan is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => (
          <Bench s={state} put={focused ? apply : sync} meanings={meanings} failed={failed} retry={retry} />
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="precision-recall" />
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
